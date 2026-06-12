"""群组相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import secrets
import string
import json
from datetime import datetime
from database import get_db
from models import User, Group, GroupMember, GroupInvitation, Task
from schemas import GroupCreate, GroupInvite, GroupRespond, GroupResponse, GroupDetailResponse, GroupStats
from auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["群组"])


def _parse_priority(val) -> int:
    """将中文或字符串优先级转为整数（1低 2中 3高 4紧急）"""
    if isinstance(val, int):
        return val
    mapping = {"低": 1, "中": 2, "高": 3, "紧急": 4}
    if isinstance(val, str):
        if val in mapping:
            return mapping[val]
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return 2  # default 中



def generate_invite_code():
    """生成6位邀请码"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(6))


def _get_member_count(db: Session, group_id: int) -> int:
    return db.query(GroupMember).filter(GroupMember.group_id == group_id).count()


@router.get("", response_model=list[GroupResponse])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的所有群组"""
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
    ).all()

    if not memberships:
        return []

    group_ids = [m.group_id for m in memberships]
    groups = db.query(Group).filter(Group.id.in_(group_ids)).all()

    result = []
    for g in groups:
        g.member_count = _get_member_count(db, g.id)
        result.append(g)
    return result


@router.post("", response_model=GroupResponse, status_code=201)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建群组"""
    group = Group(
        name=data.name,
        description=data.description or "",
        invite_code=generate_invite_code(),
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()

    # 创建者自动成为owner
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()
    db.refresh(group)

    group.member_count = 1
    return group


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取群组详情（含成员列表）"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 检查成员身份
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    # 获取成员列表
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_list = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            skills = json.loads(m.skills) if m.skills else []
            # 统计该成员的任务
            user_tasks = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
            ).count()
            user_completed = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
                Task.status == "已完成",
            ).count()
            member_list.append({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "avatar": user.avatar,
                "role": m.role,
                "skills": skills,
                "total_tasks": user_tasks,
                "completed_tasks": user_completed,
            })

    group.member_count = len(member_list)
    group.members = member_list
    return group


@router.post("/invite", response_model=dict)
def invite_member(
    data: GroupInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """邀请成员加入群组"""
    group = db.query(Group).filter(Group.id == data.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 检查邀请者是否是群组成员
    member = db.query(GroupMember).filter(
        GroupMember.group_id == data.group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    return {
        "invite_code": group.invite_code,
        "message": f"邀请码: {group.invite_code}，分享给好友即可加入",
    }


@router.post("/respond", response_model=dict)
def respond_invite(
    data: GroupRespond,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """响应群组邀请"""
    group = db.query(Group).filter(Group.invite_code == data.invite_code).first()
    if not group:
        raise HTTPException(status_code=404, detail="邀请码无效")

    if data.accept:
        # 检查是否已经是成员
        existing = db.query(GroupMember).filter(
            GroupMember.group_id == group.id,
            GroupMember.user_id == current_user.id,
        ).first()
        if not existing:
            member = GroupMember(
                group_id=group.id,
                user_id=current_user.id,
                role="member",
            )
            db.add(member)
            db.commit()

            # 通知群主有新成员加入
            from routers.notifications import create_notification
            create_notification(
                db=db,
                user_id=group.created_by,
                type="group",
                title="新成员加入",
                message=f"{current_user.username} 加入了群组「{group.name}」",
                related_group_id=group.id,
            )

    return {"message": "已加入群组" if data.accept else "已拒绝邀请"}


@router.delete("/{group_id}/leave", response_model=dict)
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """退出群组"""
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="您不是该群组成员")

    if membership.role == "owner":
        raise HTTPException(status_code=400, detail="群主不能退出，请先转让群主")

    db.delete(membership)
    db.commit()
    return {"message": "已退出群组"}


@router.delete("/{group_id}/members/{user_id}", response_model=dict)
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """移除成员（仅群主/管理员可操作）"""
    # 检查操作者权限
    operator = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not operator or operator.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="无权限移除成员")

    # 不能移除自己
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能移除自己，请使用退出功能")

    # 检查目标成员
    target = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="成员不存在")

    # 不能移除群主
    if target.role == "owner":
        raise HTTPException(status_code=400, detail="不能移除群主")

    db.delete(target)
    db.commit()
    return {"message": "已移除成员"}


@router.get("/{group_id}/stats", response_model=GroupStats)
def get_group_stats(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取群组统计"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 检查成员身份
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    # 统计（只计父任务，不含子任务）
    total_tasks = db.query(Task).filter(
        Task.group_id == group_id,
        Task.parent_id == None,
    ).count()
    completed_tasks = db.query(Task).filter(
        Task.group_id == group_id,
        Task.parent_id == None,
        Task.status == "已完成",
    ).count()

    # 成员统计（只计父任务）
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_stats = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            user_tasks = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
                Task.parent_id == None,
            ).count()
            user_completed = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
                Task.parent_id == None,
                Task.status == "已完成",
            ).count()
            member_stats.append({
                "user_id": user.id,
                "username": user.username,
                "total_tasks": user_tasks,
                "completed_tasks": user_completed,
            })

    return GroupStats(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_rate=(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
        member_stats=member_stats,
    )


# ─── 人齐启动 & 任务确认 ───────────────────────────────────

@router.post("/{group_id}/start-workflow")
def start_workflow(
    group_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """群主点击「人齐了，开始吧」— AI 解释任务 + 联网搜索参考案例（不直接分配任务）"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="只有群主可以启动工作流程")

    if data and data.get("project_brief"):
        group.project_brief = data["project_brief"]

    project_desc = group.project_brief or group.description or group.name

    from models.message import GroupMessage

    # 1. AI 先做任务理解 + 方向建议
    ai_understanding = ""
    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            prompt = (
                f"项目描述：\n{project_desc}\n\n"
                "请基于以上项目描述，做三件事：\n"
                "1. 用 2-3 句话告诉小组「这个项目到底要做什么」（任务理解）\n"
                "2. 列出 3-5 个值得探索的方向/角度（用编号列表）\n"
                "3. 给出 2-3 个核心提问，提示小组在讨论方案时需要明确什么\n\n"
                "用 Markdown 格式输出，口吻像一个温柔的统筹组长。"
            )
            ai_understanding = ai.chat(message=prompt, context="你是 AI 统筹组长，正在帮一个学生小组启动新项目。")
    except Exception as e:
        print(f"[Start Workflow] AI understanding error: {e}")

    if not ai_understanding:
        ai_understanding = (
            f"📌 我对这个项目的初步理解：\n\n{project_desc[:300]}\n\n"
            "请小组先讨论以下几个问题：\n"
            "1. 我们最想解决什么核心问题？\n"
            "2. 我们要交付的最终成果是什么形式？\n"
            "3. 每位成员希望承担哪部分？"
        )

    explain_msg = GroupMessage(
        group_id=group_id,
        sender_id=None,
        content=f"🤖 收到项目！让我先帮大家梳理一下：\n\n{ai_understanding}\n\n💡 接下来：请小组讨论后，点击顶部「📝 提交方案」让我根据你们的方案来拆分任务、分配到人、设置节点。",
        msg_type="ai",
        metadata_={"type": "project_understanding"},
    )
    db.add(explain_msg)

    # 2. 切换群组状态为 "discussing"（小组讨论中）— 不再创建任务
    group.status = "discussing"
    db.commit()

    return {
        "message": "AI已完成任务理解，等待小组提交讨论方案",
        "status": "discussing",
        "understanding": ai_understanding,
    }


@router.post("/{group_id}/tasks/{task_id}/confirm")
def confirm_task(
    group_id: int,
    task_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """成员确认或拒绝任务分配"""
    accept = data.get("accept", True)
    reason = data.get("reason", "")

    task = db.query(Task).filter(
        Task.id == task_id,
        Task.group_id == group_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="这不是你的任务")

    from models.message import GroupMessage

    if accept:
        task.status = "待处理"
        db.commit()

        # 接受后立即拆分为可提交节点（子任务），并按 DDL 排布
        nodes_summary = _ai_break_down_to_nodes(task, db)

        # 发送确认消息（含节点提示）
        confirm_content = f"✅ {current_user.username} 已确认接受任务「{task.title}」"
        if nodes_summary:
            confirm_content += f"\n\n🪜 AI已将该任务拆分为 {len(nodes_summary)} 个提交节点，每个节点都设置了截止日期和提交要求：\n"
            for i, n in enumerate(nodes_summary, 1):
                confirm_content += f"  {i}. 📌 {n['title']}  ⏰ {n['deadline']}\n"
            confirm_content += "\n💡 点击首页或群聊「📌 我的任务」进入该任务专属AI聊天，可查看每个节点的提交要求并上传凭证。"

        msg = GroupMessage(
            group_id=group_id,
            sender_id=None,
            content=confirm_content,
            msg_type="ai",
            metadata_={
                "type": "task_accepted_with_nodes",
                "task_id": task.id,
                "task_title": task.title,
                "nodes": nodes_summary,
            },
        )
        db.add(msg)
        db.commit()

        # 检查所有任务是否都已确认
        pending = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status == "待确认",
        ).count()
        rejected = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status == "已打回",
        ).count()

        if pending == 0 and rejected == 0:
            # 所有任务已确认，更新群组状态
            group = db.query(Group).filter(Group.id == group_id).first()
            if group:
                group.status = "in_progress"
                db.commit()

                msg2 = GroupMessage(
                    group_id=group_id,
                    sender_id=None,
                    content="🎉 所有成员已确认任务！项目正式进入执行阶段。\n\n📌 点击顶部「📌」按钮可随时查看和更新你的任务状态。",
                    msg_type="ai",
                )
                db.add(msg2)
                db.commit()
        elif pending == 0 and rejected > 0:
            msg3 = GroupMessage(
                group_id=group_id,
                sender_id=None,
                content=f"📋 当前状态：所有成员已完成确认/打回操作。\n\n⚠️ 有 {rejected} 个任务被打回，等待重新分配。\n💡 群主可发送 @ai 重新分配 来让AI重新调整被打回的任务。",
                msg_type="ai",
            )
            db.add(msg3)
            db.commit()

        return {"message": "已确认任务", "status": "待处理"}
    else:
        # 打回任务
        task.status = "已打回"
        db.commit()

        # 统计当前状态
        total = db.query(Task).filter(Task.group_id == group_id).count()
        confirmed = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status.in_(["待处理", "进行中"]),
        ).count()
        still_pending = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status == "待确认",
        ).count()
        rejected_count = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status == "已打回",
        ).count()

        msg = GroupMessage(
            group_id=group_id,
            sender_id=None,
            content=f"⚠️ {current_user.username} 对任务「{task.title}」提出异议{('：' + reason) if reason else ''}。\n\n"
                    f"📋 当前任务状态：\n"
                    f"  ✅ 已确认：{confirmed}/{total}\n"
                    f"  ⏳ 待确认：{still_pending}/{total}\n"
                    f"  🔙 已打回：{rejected_count}/{total}\n\n"
                    f"💡 群主可发送 @ai 重新分配 来让AI重新调整被打回的任务。",
            msg_type="ai",
        )
        db.add(msg)
        db.commit()

        return {"message": "已拒绝任务，等待重新分配", "status": "已打回"}


@router.get("/{group_id}/pending-tasks")
def get_pending_tasks(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户待确认的任务"""
    tasks = db.query(Task).filter(
        Task.group_id == group_id,
        Task.assigned_to == current_user.id,
        Task.status == "待确认",
    ).all()

    result = []
    for t in tasks:
        result.append({
            "id": t.id,
            "title": t.title,
            "description": t.description or "",
            "priority": _parse_priority(t.priority) if t.priority else 2,
            "deadline": t.deadline.strftime("%Y-%m-%d") if t.deadline else None,
        })
    return result


@router.post("/{group_id}/submit-proposal")
def submit_proposal(
    group_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """组员讨论后提交方案 — AI根据方案重新拆解任务"""
    from datetime import datetime, timedelta
    from models.message import GroupMessage

    # 验证成员
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    proposal = (data.get("proposal") or "").strip()
    if not proposal:
        raise HTTPException(status_code=400, detail="方案内容不能为空")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 1. 把方案以"proposal"类型保存到群聊
    proposal_msg = GroupMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=proposal,
        msg_type="proposal",
        metadata_={
            "type": "proposal",
            "submitter": current_user.username,
            "title": "组员讨论方案",
        },
    )
    db.add(proposal_msg)

    # 2. 获取成员信息
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_info = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            member_info.append({
                "id": u.id,
                "name": u.username,
                "skills": u.skills or [],
                "tools": u.tools or [],
                "major": u.major or [],
                "role": m.role,
            })

    # 3. 删除原"待确认"任务（即将被新方案替代）
    old_pending = db.query(Task).filter(
        Task.group_id == group_id,
        Task.status == "待确认",
    ).all()
    for t in old_pending:
        db.delete(t)
    db.flush()

    # 4. 把组员方案作为新项目描述给AI重新拆解
    new_brief = f"【组员讨论方案】\n{proposal}\n\n【原项目描述】\n{group.project_brief or group.description or ''}"
    group.project_brief = new_brief

    tasks_data = _ai_decompose_tasks(new_brief, member_info)

    # 5. 创建新任务
    now = datetime.now()
    created_tasks = []
    for t in tasks_data:
        days = t.get("days_from_now", 7)
        try:
            days = max(1, min(60, int(days)))
        except (ValueError, TypeError):
            days = 7
        deadline = now + timedelta(days=days)

        task = Task(
            title=t["title"],
            description=t.get("description", ""),
            user_id=t.get("assigned_to") or current_user.id,
            group_id=group_id,
            assigned_to=t.get("assigned_to"),
            status="待确认",
            priority=_parse_priority(t.get("priority", "中")),
            deadline=deadline,
        )
        db.add(task)
        db.flush()
        created_tasks.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "assigned_to": task.assigned_to,
            "assigned_name": t.get("assigned_name", ""),
            "priority": task.priority,
            "reason": t.get("reason", ""),
            "deadline": deadline.strftime("%Y-%m-%d"),
            "days_from_now": days,
        })

    # 6. 发送新任务卡片
    tasks_by_member = {}
    for ct in created_tasks:
        name = ct.get('assigned_name', '未分配')
        tasks_by_member.setdefault(name, []).append({
            "id": ct["id"],
            "title": ct["title"],
            "description": ct.get("description", ""),
            "priority": ct.get("priority", 2),
            "reason": ct.get("reason", ""),
            "deadline": ct.get("deadline"),
            "days_from_now": ct.get("days_from_now"),
        })

    task_card_metadata = {
        "type": "task_assignment",
        "total_tasks": len(created_tasks),
        "from_proposal": True,
        "submitter": current_user.username,
        "assignments": [
            {"member_name": name, "tasks": tasks}
            for name, tasks in tasks_by_member.items()
        ],
    }

    ai_msg = GroupMessage(
        group_id=group_id,
        sender_id=None,
        content=f"📝 已收到 {current_user.username} 提交的讨论方案，我根据方案重新调整了任务分解和分配，请各位再次确认。",
        msg_type="task_card",
        metadata_=task_card_metadata,
    )
    db.add(ai_msg)

    group.status = "confirming"
    db.commit()

    return {
        "message": "已根据方案重新拆解任务",
        "tasks": created_tasks,
        "status": "confirming",
    }


@router.post("/{group_id}/knowledge/{file_id}/ask-ai")
def ask_ai_about_file(
    group_id: int,
    file_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """对知识库文件请求 AI 给出使用建议"""
    from models.message import GroupMessage, KnowledgeFile

    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    kf = db.query(KnowledgeFile).filter(
        KnowledgeFile.id == file_id,
        KnowledgeFile.group_id == group_id,
    ).first()
    if not kf:
        raise HTTPException(status_code=404, detail="文件不存在")

    question = (data.get("question") or "").strip() or f"请对文件「{kf.file_name}」给出核心要点和使用建议，并说明如何运用到我们的项目中。"

    group = db.query(Group).filter(Group.id == group_id).first()
    tasks = db.query(Task).filter(Task.group_id == group_id).all()
    task_titles = "、".join([t.title for t in tasks[:8]]) or "暂无"

    context = (
        f"项目：{group.name if group else ''}\n"
        f"项目描述：{group.project_brief or group.description or ''}\n"
        f"当前任务：{task_titles}\n"
        f"文件：{kf.file_name}\n"
        f"文件类型：{kf.file_type}\n"
        f"文件内容摘要：{kf.summary or '（未提取到文本）'}"
    )

    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            reply = ai.chat(message=question, context=context)
        else:
            reply = (
                f"📚 关于「{kf.file_name}」的使用建议：\n\n"
                f"1. 核心内容已自动归档到知识库\n"
                f"2. 文件摘要：{(kf.summary or '')[:100]}...\n"
                f"3. 建议各位组员通读后，结合自己的任务提取要点\n\n"
                f"💡 配置 AI API Key 可获得更深度的分析建议。"
            )
    except Exception as e:
        print(f"[Ask AI About File] Error: {e}")
        reply = f"📚 已收到对「{kf.file_name}」的提问，但 AI 服务暂时不可用，请稍后再试。"

    ai_msg = GroupMessage(
        group_id=group_id,
        sender_id=None,
        content=f"💡 关于文件「{kf.file_name}」的使用建议：\n\n{reply}",
        msg_type="ai",
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "id": ai_msg.id,
        "content": ai_msg.content,
        "msg_type": "ai",
        "is_ai": True,
        "sender": None,
        "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else "",
    }


def _ai_decompose_tasks(project_desc: str, members: list) -> list:
    """AI智能分解任务并根据技能分配 — 优先调用真实AI API分析项目需求

    分配时综合评估每个成员的：专业方向、熟练工具、擅长技能（缺一不可）
    """
    import json as _json

    member_info_str = "\n".join([
        f"  - {m['name']}（专业：{', '.join(m.get('major', [])[:3]) or '未填写'}"
        f"｜工具：{', '.join(m.get('tools', [])[:6]) or '未填写'}"
        f"｜技能：{', '.join(m.get('skills', [])[:6]) or '未填写'}）"
        for m in members
    ])
    num_members = len(members)

    # 尝试用真实 AI 分析需求并分解任务
    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            prompt = f"""你是一个项目管理AI。请仔细阅读以下项目需求和附件内容，分解为具体可执行的子任务，并根据每位成员的**专业方向、熟练工具、擅长技能**三项综合智能分配。

【项目需求与附件内容】
{project_desc[:3000]}

【团队成员信息】（共{num_members}人）
{member_info_str}

请严格按以下JSON格式返回任务列表（返回纯JSON，不要其他文字）：
[
  {{
    "title": "任务标题（简明扼要）",
    "description": "任务详细描述（具体说明做什么、怎么做、交付物是什么）",
    "priority": "高/中/低",
    "assigned_name": "成员姓名",
    "reason": "分配理由（必须明确指出该成员的「专业/工具/技能」中哪些与任务匹配，例如：『TA 的设计专业 + Figma 工具 + UI设计技能 完全对口』）",
    "days_from_now": "提交节点天数（从今天起算的整数天数，根据任务复杂度和优先级合理设置3-30天）"
  }}
]

分配核心原则：
1. 综合评估成员的「专业 + 工具 + 技能」三项，不要只看技能或专业其中一项
2. 任务描述里如果涉及特定工具（如「用 Figma 画原型」「用 Python 分析数据」），优先分配给掌握该工具的成员
3. 任务的专业领域（设计/开发/调研/文案等）要匹配成员的专业方向
4. 同一类型任务可以由专业最对口的成员承担多个，不必强行平均分配
5. 如果成员技能/工具空缺，分配相对通用的任务（如调研、文案、汇报）

其他要求：
- 根据项目需求的实际内容分解任务，不要用通用模板
- 任务数量控制在{max(3, num_members)}到{num_members + 2}个之间
- 任务描述要具体，包含明确的交付物
- 务必为每个任务设置合理的提交节点(days_from_now)：简单任务3-7天，复杂任务10-30天，高优先级任务排前面"""

            reply = ai.chat(message=prompt, context="你是项目任务分解专家，请直接返回JSON数组")

            # 尝试解析AI返回的JSON
            try:
                # 提取JSON部分
                text = reply.strip()
                if "```" in text:
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                    text = text.strip()
                # 找到JSON数组
                start = text.find("[")
                end = text.rfind("]") + 1
                if start >= 0 and end > start:
                    tasks_json = _json.loads(text[start:end])
                    result = []
                    for t in tasks_json:
                        # 匹配成员名到成员ID
                        assigned_name = t.get("assigned_name", "")
                        assigned_to = None
                        for m in members:
                            if m["name"] == assigned_name or assigned_name in m["name"]:
                                assigned_to = m["id"]
                                assigned_name = m["name"]
                                break
                        if not assigned_to and members:
                            # 轮询分配
                            m = members[len(result) % len(members)]
                            assigned_to = m["id"]
                            assigned_name = m["name"]

                        # 解析 days_from_now
                        try:
                            days = int(t.get("days_from_now", 7))
                            days = max(1, min(60, days))
                        except (ValueError, TypeError):
                            days = 7

                        result.append({
                            "title": t.get("title", "未命名任务"),
                            "description": t.get("description", ""),
                            "priority": t.get("priority", "中"),
                            "assigned_to": assigned_to,
                            "assigned_name": assigned_name,
                            "reason": t.get("reason", "AI智能分配"),
                            "days_from_now": days,
                        })
                    if result:
                        return result
            except (_json.JSONDecodeError, Exception) as e:
                print(f"[AI Decompose] JSON parse failed: {e}, using fallback")
    except Exception as e:
        print(f"[AI Decompose] AI call failed: {e}, using fallback")

    # ─── 回退：基于关键词的简单任务分解 ───
    base_tasks = [
        {"title": "需求分析与文档整理", "description": "整理项目需求，编写需求文档", "priority": "高"},
        {"title": "方案设计与架构规划", "description": "设计整体方案和技术架构", "priority": "高"},
        {"title": "核心功能开发/制作", "description": "实现项目核心内容", "priority": "高"},
        {"title": "UI/UX设计", "description": "设计用户界面和交互体验", "priority": "中"},
        {"title": "测试与质量保证", "description": "编写测试用例，执行测试", "priority": "中"},
        {"title": "文档撰写与汇报准备", "description": "准备项目报告和展示材料", "priority": "中"},
    ]

    if num_members <= 2:
        tasks = base_tasks[:4]
    elif num_members <= 4:
        tasks = base_tasks[:5]
    else:
        tasks = base_tasks

    skill_task_map = {
        "需求分析": ["产品", "需求", "文档", "管理", "策划"],
        "方案设计": ["设计", "架构", "规划", "方案"],
        "核心功能": ["开发", "编程", "代码", "python", "java", "前端", "后端"],
        "UI/UX": ["UI", "UX", "设计", "美术", "视觉", "交互", "photoshop", "figma"],
        "测试": ["测试", "QA", "质量"],
        "文档撰写": ["写作", "文档", "PPT", "报告", "word"],
    }

    assigned = set()
    result = []

    for task in tasks:
        best_member = None
        best_score = -1
        best_reason = ""

        task_keywords = []
        for key, keywords in skill_task_map.items():
            if key in task["title"]:
                task_keywords = keywords
                break

        for member in members:
            if member["id"] in assigned:
                continue
            score = 0
            reasons = []
            member_skills = [s.lower() if isinstance(s, str) else "" for s in (member.get("skills") or [])]
            member_majors = [m.lower() if isinstance(m, str) else "" for m in (member.get("major") or [])]
            all_info = member_skills + member_majors

            for keyword in task_keywords:
                for info in all_info:
                    if keyword.lower() in info:
                        score += 1
                        reasons.append(f"擅长{keyword}")
                        break
            if score > best_score:
                best_score = score
                best_member = member
                best_reason = "、".join(reasons[:2]) if reasons else "团队协作需要"

        if not best_member:
            for member in members:
                if member["id"] not in assigned:
                    best_member = member
                    best_reason = "均衡分配"
                    break

        # fallback 路径下根据优先级递增天数：高=5,中=10,低=15，并按顺序累加
        priority_days = {"高": 5, "中": 10, "低": 15}.get(task.get("priority", "中"), 10)
        fallback_days = 3 + len(result) * 4 + priority_days // 2

        if best_member:
            assigned.add(best_member["id"])
            result.append({
                **task,
                "assigned_to": best_member["id"],
                "assigned_name": best_member["name"],
                "reason": best_reason,
                "days_from_now": fallback_days,
            })
        else:
            member = members[len(result) % len(members)]
            result.append({
                **task,
                "assigned_to": member["id"],
                "assigned_name": member["name"],
                "reason": "均衡分配",
                "days_from_now": fallback_days,
            })

    return result


# ─── 邮箱邀请系统 ───────────────────────────────────────

@router.post("/invite-by-email", response_model=dict)
def invite_by_email(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """通过邮箱邀请用户加入群组，AI自动分配任务"""
    group_id = data.get("group_id")
    invitee_email = data.get("email", "").strip()
    message = data.get("message", "")

    # 检查群组
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 检查邀请者权限
    inviter = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not inviter:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    # 查找被邀请用户
    invitee = db.query(User).filter(User.email == invitee_email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail=f"未找到邮箱为 {invitee_email} 的用户，请确认对方已注册")

    # 检查是否已是成员
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == invitee.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该用户已是群组成员")

    # 检查是否有待处理的邀请
    pending = db.query(GroupInvitation).filter(
        GroupInvitation.group_id == group_id,
        GroupInvitation.to_user_id == invitee.id,
        GroupInvitation.status == "pending",
    ).first()
    if pending:
        raise HTTPException(status_code=400, detail="已向该用户发送过邀请，等待回复中")

    # AI 分配任务：获取群组未分配任务
    unassigned = db.query(Task).filter(
        Task.group_id == group_id,
        Task.assigned_to.is_(None),
        Task.status != "已完成",
    ).all()

    assignments = []
    if unassigned:
        # 获取被邀请者信息用于AI分配
        invitee_skills = invitee.skills or []
        from services.smart_assign import SmartAssigner
        assigner = SmartAssigner()
        for task in unassigned[:3]:  # 最多分配3个任务
            member_data = [{
                "id": invitee.id,
                "name": invitee.username,
                "skills": invitee_skills,
            }]
            ai_result = assigner.ai_service.smart_assign(task.title, member_data)
            if ai_result:
                assignments.append({
                    "task_id": task.id,
                    "task_title": task.title,
                    "task_deadline": task.deadline.strftime("%Y-%m-%d") if task.deadline else None,
                    "suggestion": ai_result[0].get("reason", "") if ai_result else "",
                    "subtask": ai_result[0].get("subtask", task.title) if ai_result else task.title,
                })

    # 创建邀请记录
    invitation = GroupInvitation(
        group_id=group_id,
        from_user_id=current_user.id,
        to_user_id=invitee.id,
        status="pending",
        task_assignments=assignments,
        message=message or f"{current_user.username} 邀请你加入群组「{group.name}」",
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    # 发送通知
    from routers.notifications import create_notification
    create_notification(
        db=db,
        user_id=invitee.id,
        type="group",
        title="团队邀请",
        message=f"{current_user.username} 邀请你加入「{group.name}」" +
                (f"，已为你分配 {len(assignments)} 个任务" if assignments else ""),
        related_group_id=group_id,
    )

    return {
        "message": f"已向 {invitee_email} 发送邀请",
        "invitation_id": invitation.id,
        "assignments": assignments,
    }


@router.get("/invitations/pending", response_model=list[dict])
def get_pending_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的待处理邀请"""
    invitations = db.query(GroupInvitation).filter(
        GroupInvitation.to_user_id == current_user.id,
        GroupInvitation.status == "pending",
    ).order_by(GroupInvitation.created_at.desc()).all()

    result = []
    for inv in invitations:
        group = db.query(Group).filter(Group.id == inv.group_id).first()
        from_user = db.query(User).filter(User.id == inv.from_user_id).first()
        result.append({
            "id": inv.id,
            "group_id": inv.group_id,
            "group_name": group.name if group else "未知群组",
            "from_user": from_user.username if from_user else "未知",
            "message": inv.message,
            "task_assignments": inv.task_assignments or [],
            "created_at": inv.created_at.isoformat() if inv.created_at else "",
        })

    return result


@router.put("/invitations/{invitation_id}/respond", response_model=dict)
def respond_invitation(
    invitation_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """接受或拒绝邀请"""
    accept = data.get("accept", False)
    feedback = data.get("feedback", "")

    invitation = db.query(GroupInvitation).filter(
        GroupInvitation.id == invitation_id,
        GroupInvitation.to_user_id == current_user.id,
        GroupInvitation.status == "pending",
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="邀请不存在或已处理")

    if accept:
        # 加入群组
        existing = db.query(GroupMember).filter(
            GroupMember.group_id == invitation.group_id,
            GroupMember.user_id == current_user.id,
        ).first()
        if not existing:
            member = GroupMember(
                group_id=invitation.group_id,
                user_id=current_user.id,
                role="member",
                skills=json.dumps(current_user.skills or []),
            )
            db.add(member)

        # 分配任务
        for assignment in (invitation.task_assignments or []):
            task = db.query(Task).filter(Task.id == assignment.get("task_id")).first()
            if task and not task.assigned_to:
                task.assigned_to = current_user.id

        invitation.status = "accepted"
        # 通知邀请者
        from routers.notifications import create_notification
        create_notification(
            db=db,
            user_id=invitation.from_user_id,
            type="group",
            title="成员已接受邀请",
            message=f"{current_user.username} 已接受邀请，加入群组",
            related_group_id=invitation.group_id,
        )
    else:
        invitation.status = "declined"
        if feedback:
            # 通知邀请者拒绝原因
            from routers.notifications import create_notification
            create_notification(
                db=db,
                user_id=invitation.from_user_id,
                type="group",
                title="成员拒绝了邀请",
                message=f"{current_user.username} 拒绝了邀请。反馈: {feedback}",
                related_group_id=invitation.group_id,
            )

    invitation.responded_at = datetime.now()
    db.commit()

    return {
        "message": "已接受邀请" if accept else "已拒绝邀请",
        "status": invitation.status,
    }


def _ai_break_down_to_nodes(task: Task, db: Session) -> list:
    """把一个大任务自动拆分成 3-5 个可提交节点（子任务），
    每个节点带 description（说明要提交什么）和按比例分布的 deadline。
    返回节点摘要列表，调用方可写入 GroupMessage metadata。"""
    from datetime import datetime, timedelta
    import json as _json
    import re as _re

    # 已经拆过就跳过
    existing = db.query(Task).filter(Task.parent_id == task.id).count()
    if existing > 0:
        subs = db.query(Task).filter(Task.parent_id == task.id).order_by(Task.deadline.asc()).all()
        return [
            {
                "id": s.id,
                "title": s.title,
                "submit_what": s.description or "请提交对应阶段的成果",
                "deadline": s.deadline.strftime("%Y-%m-%d") if s.deadline else "",
            } for s in subs
        ]

    nodes_data = None
    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            days_total = 7
            if task.deadline:
                try:
                    delta = (task.deadline.replace(tzinfo=None) - datetime.now()).days
                    days_total = max(3, delta)
                except Exception:
                    pass
            prompt = (
                f"请把任务「{task.title}」拆成 3-5 个递进的可提交节点。\n"
                f"任务描述：{task.description or '无'}\n"
                f"总工期 {days_total} 天，难度优先级 {['低','中','高','紧急'][(task.priority-1) if task.priority and 1<=task.priority<=4 else 1]}。\n\n"
                "请输出 JSON 数组，每个元素：\n"
                "  - title: 节点名（简短，比如\"调研报告初稿\"）\n"
                "  - submit_what: 该节点需要提交什么（具体到文档/截图/原型链接，让用户清楚知道要交什么）\n"
                "  - days: 占用天数（按难易程度分配）\n"
                "只返回 JSON 数组，不要其他内容。"
            )
            reply = ai.chat(message=prompt, context="你是任务拆分专家。返回严格的 JSON 数组，每项含 title/submit_what/days 字段。")
            m = _re.search(r'\[.*\]', reply, _re.DOTALL)
            if m:
                nodes_data = _json.loads(m.group())
    except Exception as e:
        print(f"[Break Down Task] AI error: {e}")
        nodes_data = None

    if not nodes_data:
        # 兜底：三段式
        nodes_data = [
            {"title": f"{task.title} — 调研与方案", "submit_what": "调研笔记、用户访谈摘要或初步方案文档（Word/PDF/Notion 链接均可）", "days": 2},
            {"title": f"{task.title} — 主体执行", "submit_what": "核心交付物初稿（设计稿/原型/代码截图/文档），可标注未完成部分", "days": 3},
            {"title": f"{task.title} — 完善与定稿", "submit_what": "最终版本交付物 + 自查清单截图", "days": 2},
        ]

    # 计算每个节点的 DDL — 按 days 占比从父任务 DDL 倒推
    now = datetime.now()
    parent_deadline = task.deadline.replace(tzinfo=None) if task.deadline else (now + timedelta(days=7))
    total_days = max(1, sum(int(n.get("days", 2)) for n in nodes_data))
    accumulated = 0
    created = []
    for n in nodes_data:
        day_share = int(n.get("days", 2))
        accumulated += day_share
        # 从开始日期递增到 parent_deadline
        offset_days = max(0, total_days - accumulated)
        node_deadline = parent_deadline - timedelta(days=offset_days)
        if node_deadline < now:
            node_deadline = now + timedelta(hours=24)

        sub = Task(
            user_id=task.user_id,
            group_id=task.group_id,
            parent_id=task.id,
            title=n.get("title", "节点"),
            description=n.get("submit_what", ""),
            priority=task.priority,
            assigned_to=task.assigned_to,
            is_subtask=True,
            deadline=node_deadline,
            status="待处理",
        )
        db.add(sub)
        db.flush()
        created.append({
            "id": sub.id,
            "title": sub.title,
            "submit_what": sub.description,
            "deadline": node_deadline.strftime("%Y-%m-%d"),
        })

    db.commit()
    return created
