"""任务相关路由"""
import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime
from database import get_db
from models import User, Task, GroupMember, TaskStatus, Schedule, Group
from schemas import TaskCreate, TaskUpdate, TaskResponse, ProgressUpdate
from auth import get_current_user
import asyncio

router = APIRouter(prefix="/api/tasks", tags=["任务"])


def _sync_task_to_schedule(db: Session, task: Task):
    """将任务DDL同步到日历日程"""
    if not task.deadline:
        return
    # 查找是否已有该任务的日程
    existing = db.query(Schedule).filter(Schedule.task_id == task.id).first()
    if existing:
        # 更新已有日程
        existing.title = task.title
        existing.date = task.deadline
        existing.color = _get_task_color(task.priority)
        existing.note = f"优先级: {['低','中','高','紧急'][task.priority-1]} | 进度: {task.progress}%"
    else:
        # 创建新日程
        schedule = Schedule(
            user_id=task.user_id,
            task_id=task.id,
            title=task.title,
            date=task.deadline,
            color=_get_task_color(task.priority),
            note=f"优先级: {['低','中','高','紧急'][task.priority-1]} | 进度: {task.progress}%",
        )
        db.add(schedule)


def _remove_task_schedule(db: Session, task_id: int):
    """删除任务对应的日程"""
    db.query(Schedule).filter(Schedule.task_id == task_id).delete()


def _get_task_color(priority: int) -> str:
    """根据优先级返回颜色"""
    colors = {1: "#9E9E9E", 2: "#2196F3", 3: "#FF9800", 4: "#F44336"}
    return colors.get(priority, "#FF9F43")


@router.get("/export/csv")
def export_tasks_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出任务为CSV文件"""
    from fastapi.responses import Response
    import csv
    import io

    tasks = db.query(Task).filter(
        Task.user_id == current_user.id
    ).order_by(Task.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "标题", "描述", "优先级", "状态", "进度(%)", "预估时间(h)", "截止日期", "标签", "创建时间"])
    for t in tasks:
        writer.writerow([
            t.id, t.title, t.description or "", t.priority,
            t.status, t.progress, t.estimated_hours or "",
            t.deadline.strftime("%Y-%m-%d") if t.deadline else "",
            ",".join(t.tags) if t.tags else "",
            t.created_at.strftime("%Y-%m-%d %H:%M") if t.created_at else "",
        ])

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": "attachment; filename=ai_calendar_tasks.csv"},
    )


def _broadcast_task_change(user_id: int, event: str, task_data: dict):
    """异步广播任务变更（非阻塞）"""
    try:
        from services.ws_manager import manager
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.send_to_user(user_id, {
                "type": "task_update",
                "event": event,
                "data": task_data,
            }))
    except Exception:
        pass  # 静默失败，不影响主流程


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = None,
    priority: Optional[int] = None,
    group_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务列表（支持筛选）"""
    # 如果指定了群组ID，显示群组所有任务（需检查成员身份）
    if group_id:
        membership = db.query(GroupMember).filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="您不是该群组成员")

        query = db.query(Task).filter(Task.group_id == group_id)
    else:
        # 只返回团队任务（有group_id的），包含自己创建或被分配的
        from sqlalchemy import or_
        query = db.query(Task).filter(
            Task.group_id.isnot(None),
            or_(Task.user_id == current_user.id, Task.assigned_to == current_user.id),
        )

    if status_filter:
        query = query.filter(Task.status == status_filter)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.contains(search))

    query = query.order_by(Task.created_at.desc())
    return query.all()


@router.post("", response_model=TaskResponse, status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建任务"""
    task = Task(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        estimated_hours=data.estimated_hours,
        tags=data.tags or [],
        group_id=data.group_id,
        parent_id=data.parent_id,
    )
    if data.deadline:
        task.deadline = datetime.fromisoformat(data.deadline.replace("Z", "+00:00"))
    if data.start_time:
        task.start_time = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
    if data.end_time:
        task.end_time = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))

    db.add(task)
    db.commit()
    db.refresh(task)

    # 同步到日历日程
    if task.deadline:
        _sync_task_to_schedule(db, task)
        db.commit()

    # 广播变更
    _broadcast_task_change(current_user.id, "created", {
        "id": task.id, "title": task.title, "status": task.status,
    })

    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务详情"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新任务"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    update_data = data.model_dump(exclude_unset=True)
    for time_field in ("deadline", "start_time", "end_time"):
        if time_field in update_data and update_data[time_field]:
            update_data[time_field] = datetime.fromisoformat(update_data[time_field].replace("Z", "+00:00"))

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # 同步DDL到日历
    _sync_task_to_schedule(db, task)
    db.commit()

    _broadcast_task_change(current_user.id, "updated", {
        "id": task.id, "title": task.title, "status": task.status, "progress": task.progress,
    })

    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除任务"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    # 同时删除对应日程
    _remove_task_schedule(db, task_id)
    db.commit()

    _broadcast_task_change(current_user.id, "deleted", {"id": task_id})


@router.put("/{task_id}/progress", response_model=TaskResponse)
def update_progress(
    task_id: int,
    data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新任务进度"""
    if data.progress < 0 or data.progress > 100:
        raise HTTPException(status_code=400, detail="进度值必须在0-100之间")

    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    task.progress = data.progress
    if data.progress == 100:
        task.status = TaskStatus.COMPLETED.value
    elif data.progress > 0:
        task.status = TaskStatus.IN_PROGRESS.value

    db.commit()
    db.refresh(task)

    _broadcast_task_change(current_user.id, "progress", {
        "id": task.id, "title": task.title, "progress": task.progress, "status": task.status,
    })

    return task


# ─── 任务专属AI聊天 ───────────────────────────────
@router.post("/{task_id}/chat")
def task_chat(
    task_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """任务专属AI聊天 — 带任务上下文的智能对话"""
    task = db.query(Task).filter(
        Task.id == task_id,
        or_(Task.user_id == current_user.id, Task.assigned_to == current_user.id),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权限")

    message = data.get("message", "").strip()
    use_search = data.get("use_search", False)
    if not message:
        raise HTTPException(status_code=400, detail="消息不能为空")

    # 构建任务上下文
    context_parts = [
        f"用户：{current_user.username}",
        f"当前任务：{task.title}",
        f"任务描述：{task.description or '无'}",
        f"任务状态：{task.status}",
        f"任务进度：{task.progress}%",
    ]
    if task.deadline:
        context_parts.append(f"截止日期：{task.deadline.strftime('%Y-%m-%d')}")
        try:
            remaining = (task.deadline.replace(tzinfo=None) - datetime.now()).days
            if remaining < 0:
                context_parts.append(f"⚠️ 已逾期 {abs(remaining)} 天！")
            else:
                context_parts.append(f"剩余 {remaining} 天")
        except Exception:
            pass

    subtasks = db.query(Task).filter(Task.parent_id == task_id).all()
    if subtasks:
        st_list = "\n".join([
            f"  - {st.title}（{st.status}，进度{st.progress}%）"
            for st in subtasks
        ])
        context_parts.append(f"子任务：\n{st_list}")

    if task.group_id:
        group = db.query(Group).filter(Group.id == task.group_id).first()
        if group:
            context_parts.append(f"所属项目：{group.name}")

    context = "\n".join(context_parts)

    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            if use_search:
                result = ai.chat_with_search(message=message, context=context)
                reply = result.get("reply", "")
            else:
                reply = ai.chat(message=message, context=context)
        else:
            reply = _fallback_task_reply(message, task, subtasks)
    except Exception as e:
        print(f"[Task Chat] Error: {e}")
        reply = _fallback_task_reply(message, task, subtasks)

    return {"reply": reply, "task_id": task_id}


def _fallback_task_reply(message: str, task, subtasks):
    """无API Key时的回退回复"""
    lower = message.lower()
    if "进度" in lower or "状态" in lower:
        content = f"📊 任务「{task.title}」进度报告：\n\n状态：{task.status}\n进度：{task.progress}%\n"
        if subtasks:
            completed = sum(1 for s in subtasks if s.status == "已完成")
            content += f"子任务：{completed}/{len(subtasks)} 完成\n"
        return content
    elif "拆分" in lower or "分解" in lower:
        return f"📋 任务「{task.title}」可以这样拆分：\n\n1. 调研准备\n2. 初步方案\n3. 深化完善\n4. 最终检查\n\n💡 配置 AI API Key 可获得更精准的拆分。"
    elif "ddl" in lower or "截止" in lower:
        if task.deadline:
            return f"⏰ 截止日期：{task.deadline.strftime('%Y-%m-%d')}"
        return f"📌 暂无截止日期。"
    else:
        return f"收到！我是任务「{task.title}」的AI助手。\n\n我可以：\n📋 拆分子任务\n🔍 搜索资料\n📊 分析进度"


@router.post("/{task_id}/upload-proof")
async def upload_task_proof(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传任务完成凭证 — AI自动评估进度"""
    task = db.query(Task).filter(
        Task.id == task_id,
        or_(Task.user_id == current_user.id, Task.assigned_to == current_user.id),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权限")

    from routers.upload import ALLOWED_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE
    from routers.upload import _detect_file_type, extract_text_from_file

    ext = os.path.splitext(file.filename or "")[1].lower()
    real_type = _detect_file_type(file.filename or "", file.content_type)

    if real_type not in ALLOWED_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件过大，最大10MB")

    # 保存文件
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = f"proof_{task_id}_{timestamp}_{file.filename}"
    filepath = os.path.join(upload_dir, safe_name)

    with open(filepath, "wb") as f_out:
        f_out.write(contents)

    file_url = f"/uploads/{safe_name}"

    # 提取文本（如果是文档类型）
    extracted_text = ""
    try:
        extracted_text = extract_text_from_file(filepath, real_type, file.filename)
    except Exception:
        pass

    # AI评估进度
    subtasks = db.query(Task).filter(Task.parent_id == task_id).all()
    total_nodes = max(len(subtasks), 1)

    ai_feedback = ""
    new_progress = task.progress
    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            eval_context = (
                f"任务：{task.title}\n"
                f"描述：{task.description or '无'}\n"
                f"当前进度：{task.progress}%\n"
                f"子任务数：{total_nodes}\n"
            )
            if subtasks:
                st_list = "\n".join([
                    f"  - {st.title}（{st.status}，{st.progress}%）"
                    for st in subtasks
                ])
                eval_context += f"子任务明细：\n{st_list}\n"
            if extracted_text:
                eval_context += f"上传文件内容摘要：{extracted_text[:300]}\n"

            eval_prompt = (
                f"用户为任务「{task.title}」上传了凭证「{file.filename}」。"
                f"请评估当前任务进度百分比(0-100)，并给出简要反馈。"
                f"回复格式：第一行只写数字(进度百分比)，第二行开始写反馈。"
            )
            reply = ai.chat(message=eval_prompt, context=eval_context)
            lines = reply.strip().split("\n", 1)
            try:
                digits = "".join(c for c in lines[0] if c.isdigit())[:3]
                if digits:
                    parsed = int(digits)
                    if 0 <= parsed <= 100:
                        new_progress = parsed
            except (ValueError, IndexError):
                pass
            ai_feedback = lines[1].strip() if len(lines) > 1 else "已收到凭证，请继续加油！"
        else:
            increment = max(10, int(100 / total_nodes))
            new_progress = min(100, task.progress + increment)
            ai_feedback = f"✅ 已收到「{file.filename}」，进度更新为 {new_progress}%。"
    except Exception as e:
        print(f"[Proof Eval] Error: {e}")
        increment = max(10, int(100 / total_nodes))
        new_progress = min(100, task.progress + increment)
        ai_feedback = f"✅ 已收到「{file.filename}」，进度更新为 {new_progress}%。"

    # 更新任务进度
    old_progress = task.progress
    task.progress = new_progress
    if new_progress >= 100:
        task.status = TaskStatus.COMPLETED.value
    elif new_progress > 0 and task.status == TaskStatus.PENDING.value:
        task.status = TaskStatus.IN_PROGRESS.value
    db.commit()
    db.refresh(task)

    _broadcast_task_change(current_user.id, "progress", {
        "id": task.id, "title": task.title, "progress": task.progress, "status": task.status,
    })

    # 同步到所属群聊（任务进度对全员可见，群聊里同步显示凭证和进度变化）
    if task.group_id:
        from models.message import GroupMessage
        sync_file_msg = GroupMessage(
            group_id=task.group_id,
            sender_id=current_user.id,
            content=f"📎 为任务「{task.title}」上传了节点凭证：{file.filename}",
            msg_type="file",
            file_url=file_url,
            file_name=file.filename,
            metadata_={"type": "proof", "task_id": task.id, "task_title": task.title},
        )
        db.add(sync_file_msg)
        progress_msg = GroupMessage(
            group_id=task.group_id,
            sender_id=None,
            content=(
                f"📈 {current_user.username} 完成了任务「{task.title}」的一个节点\n"
                f"进度更新：{old_progress}% → {new_progress}%"
                f"{'  🎉 任务已完成！' if new_progress >= 100 else ''}\n\n"
                f"{ai_feedback}"
            ),
            msg_type="ai",
            metadata_={
                "type": "task_progress",
                "task_id": task.id,
                "task_title": task.title,
                "old_progress": old_progress,
                "new_progress": new_progress,
                "uploader": current_user.username,
            },
        )
        db.add(progress_msg)
        db.commit()

    return {
        "file_url": file_url,
        "file_name": file.filename,
        "new_progress": new_progress,
        "ai_feedback": ai_feedback,
        "task_status": task.status,
    }


@router.post("/{task_id}/split")
def ai_split_task(
    task_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI拆分子任务"""
    task = db.query(Task).filter(
        Task.id == task_id,
        or_(Task.user_id == current_user.id, Task.assigned_to == current_user.id),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在或无权限")

    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            prompt = f"请将任务「{task.title}」拆分为3-5个子任务节点。"
            if task.description:
                prompt += f"\n任务描述：{task.description}"
            if task.deadline:
                prompt += f"\n截止日期：{task.deadline.strftime('%Y-%m-%d')}"
            prompt += '\n\n只返回JSON数组：[{"title":"子任务名","description":"描述","days":天数}]'

            reply = ai.chat(message=prompt, context="你是任务拆分助手。只返回JSON数组，不要其他内容。")
            import json
            import re
            json_match = re.search(r'\[.*\]', reply, re.DOTALL)
            if json_match:
                subtasks_data = json.loads(json_match.group())
            else:
                subtasks_data = _default_split(task.title)
        else:
            subtasks_data = _default_split(task.title)
    except Exception as e:
        print(f"[Split Task] Error: {e}")
        subtasks_data = _default_split(task.title)

    # 创建子任务
    from datetime import timedelta
    created = []
    total_days = sum(st.get("days", 2) for st in subtasks_data)
    accumulated = 0
    for st in subtasks_data:
        sub = Task(
            user_id=current_user.id,
            group_id=task.group_id,
            parent_id=task.id,
            title=st.get("title", "子任务"),
            description=st.get("description", ""),
            priority=task.priority,
            assigned_to=task.assigned_to or current_user.id,
            is_subtask=True,
        )
        accumulated += st.get("days", 2)
        if task.deadline and total_days > 0:
            sub.deadline = task.deadline - timedelta(days=max(0, total_days - accumulated))
        db.add(sub)
        db.commit()
        db.refresh(sub)
        created.append({
            "id": sub.id,
            "title": sub.title,
            "description": sub.description,
            "status": sub.status,
            "progress": sub.progress,
            "deadline": sub.deadline.isoformat() if sub.deadline else None,
        })

    return {"subtasks": created, "count": len(created)}


def _default_split(title: str):
    return [
        {"title": f"{title} - 调研阶段", "description": "收集资料和调研", "days": 2},
        {"title": f"{title} - 执行阶段", "description": "核心工作执行", "days": 3},
        {"title": f"{title} - 完善阶段", "description": "检查和完善", "days": 2},
    ]

