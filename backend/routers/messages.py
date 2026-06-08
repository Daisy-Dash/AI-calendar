"""消息路由 - 群聊 + 私聊AI"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Group, GroupMember, Task
from models.message import GroupMessage, PrivateMessage, KnowledgeFile
from auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["消息"])


# ─── 群聊消息 ───────────────────────────────────────

@router.get("/group/{group_id}")
def get_group_messages(
    group_id: int,
    limit: int = Query(50, ge=1, le=200),
    before_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取群聊消息"""
    # 验证成员身份
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    query = db.query(GroupMessage).filter(GroupMessage.group_id == group_id)
    if before_id:
        query = query.filter(GroupMessage.id < before_id)
    messages = query.order_by(GroupMessage.id.desc()).limit(limit).all()
    messages.reverse()  # 按时间正序返回

    result = []
    for m in messages:
        sender = None
        if m.sender_id:
            user = db.query(User).filter(User.id == m.sender_id).first()
            sender = {
                "id": user.id,
                "username": user.username,
                "avatar": user.avatar or "",
            } if user else None

        result.append({
            "id": m.id,
            "group_id": m.group_id,
            "sender": sender,
            "is_ai": m.sender_id is None,
            "content": m.content,
            "msg_type": m.msg_type,
            "file_url": m.file_url,
            "file_name": m.file_name,
            "metadata": m.metadata_,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        })
    return result


@router.post("/group/{group_id}")
def send_group_message(
    group_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """发送群聊消息"""
    # 验证成员身份
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    content = data.get("content", "").strip()
    msg_type = data.get("msg_type", "text")
    if not content:
        raise HTTPException(status_code=400, detail="消息内容不能为空")

    # 保存用户消息
    user_msg = GroupMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=content,
        msg_type=msg_type,
        file_url=data.get("file_url"),
        file_name=data.get("file_name"),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 如果消息中@了AI或是特定指令，生成AI回复
    ai_reply = None
    if "@ai" in content.lower() or content.startswith("/") or msg_type == "ai_request":
        ai_reply = _generate_group_ai_reply(db, group_id, content, current_user)

    sender = {
        "id": current_user.id,
        "username": current_user.username,
        "avatar": current_user.avatar or "",
    }

    response = {
        "message": {
            "id": user_msg.id,
            "group_id": group_id,
            "sender": sender,
            "is_ai": False,
            "content": content,
            "msg_type": msg_type,
            "created_at": user_msg.created_at.isoformat() if user_msg.created_at else "",
        }
    }

    if ai_reply:
        response["ai_reply"] = ai_reply

    return response


def _generate_group_ai_reply(db: Session, group_id: int, user_message: str, user: User):
    """生成AI在群聊中的回复 — 优先调用真实AI API"""
    group = db.query(Group).filter(Group.id == group_id).first()
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    tasks = db.query(Task).filter(Task.group_id == group_id).all()

    member_count = len(members)
    task_count = len(tasks)
    completed = sum(1 for t in tasks if t.status == "已完成")

    # 构建项目上下文
    context_parts = []
    context_parts.append(f"当前群组：{group.name if group else '未知'}")
    context_parts.append(f"团队成员：{member_count} 人")
    context_parts.append(f"任务总数：{task_count}，已完成：{completed}")

    if tasks:
        pending = [t for t in tasks if t.status != "已完成"]
        if pending:
            task_list = "\n".join([
                f"  - {t.title}（{t.status}，{'负责人: ' + (db.query(User).filter(User.id == t.assigned_to).first().username if t.assigned_to and db.query(User).filter(User.id == t.assigned_to).first() else '未分配')}）"
                for t in pending[:8]
            ])
            context_parts.append(f"待完成任务：\n{task_list}")

    member_info = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            skills = ", ".join(u.skills[:5]) if u.skills else "未填写"
            member_info.append(f"  - {u.username}（技能：{skills}）")
    if member_info:
        context_parts.append(f"成员信息：\n" + "\n".join(member_info))

    context = "\n".join(context_parts)

    # 去掉 @ai 前缀，提取真正的问题
    clean_message = user_message.replace("@ai", "").replace("@AI", "").strip()
    if not clean_message:
        clean_message = "你好，介绍一下你能做什么"

    # 调用真实AI API — 检测是否需要联网搜索
    _search_keywords = ["竞品", "搜索", "搜一下", "查一下", "找一下", "推荐", "有哪些",
                        "市场", "调研", "对比", "比较", "最新", "趋势", "热门"]
    need_search = any(kw in clean_message for kw in _search_keywords)

    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            if need_search:
                # 使用带搜索的对话
                result = ai.chat_with_search(message=clean_message, context=context)
                content = result.get("reply", "")
            else:
                content = ai.chat(message=clean_message, context=context)
        else:
            content = _fallback_group_reply(clean_message, member_count, task_count, completed, tasks, db)
    except Exception as e:
        print(f"[AI Reply] Error: {e}")
        content = _fallback_group_reply(clean_message, member_count, task_count, completed, tasks, db)

    # 保存AI消息
    ai_msg = GroupMessage(
        group_id=group_id,
        sender_id=None,  # AI消息
        content=content,
        msg_type="ai",
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "id": ai_msg.id,
        "group_id": group_id,
        "sender": None,
        "is_ai": True,
        "content": content,
        "msg_type": "ai",
        "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else "",
    }


def _fallback_group_reply(message: str, member_count: int, task_count: int, completed: int, tasks, db):
    """无API Key时的关键词匹配回退"""
    lower = message.lower()
    if "进度" in lower or "状态" in lower:
        content = f"📊 项目进度报告：\n\n"
        content += f"👥 团队成员：{member_count} 人\n"
        content += f"📋 总任务数：{task_count}\n"
        content += f"✅ 已完成：{completed}\n"
        content += f"📈 完成率：{(completed/task_count*100) if task_count else 0:.0f}%\n"
    elif "分配" in lower or "拆解" in lower or "任务" in lower:
        content = f"🤖 当前团队有 {member_count} 人，"
        if task_count == 0:
            content += "还没有创建任务。请先告诉我项目要求，我会帮你们拆解并分配。"
        else:
            content += f"已有 {task_count} 个任务。告诉我具体需求，我来帮忙调整。"
    else:
        content = f"收到！我是AI助手。\n\n💡 配置 DeepSeek/Claude API Key 后可获得智能回复。\n"
        content += "当前支持的指令：@ai 进度 / @ai 分配任务 / @ai 建议"
    return content


# ─── 私聊AI ───────────────────────────────────────

@router.get("/private")
def get_private_messages(
    group_id: int = Query(None, description="关联的群组ID，为空则获取通用私聊"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取与AI的私聊消息"""
    query = db.query(PrivateMessage).filter(
        PrivateMessage.user_id == current_user.id,
    )
    if group_id:
        query = query.filter(PrivateMessage.related_group_id == group_id)

    messages = query.order_by(PrivateMessage.id.desc()).limit(limit).all()
    messages.reverse()

    return [{
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "msg_type": m.msg_type,
        "related_group_id": m.related_group_id,
        "metadata": m.metadata_,
        "created_at": m.created_at.isoformat() if m.created_at else "",
    } for m in messages]


@router.post("/private")
def send_private_message(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """发送私聊消息并获取AI回复"""
    content = data.get("content", "").strip()
    group_id = data.get("group_id")  # 关联的群组
    msg_type = data.get("msg_type", "text")

    if not content:
        raise HTTPException(status_code=400, detail="消息内容不能为空")

    # 保存用户消息
    user_msg = PrivateMessage(
        user_id=current_user.id,
        role="user",
        content=content,
        msg_type=msg_type,
        related_group_id=group_id,
    )
    db.add(user_msg)
    db.commit()

    # 生成AI回复
    ai_content = _generate_private_ai_reply(db, current_user, content, group_id)

    ai_msg = PrivateMessage(
        user_id=current_user.id,
        role="ai",
        content=ai_content,
        msg_type="text",
        related_group_id=group_id,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return {
        "user_message": {
            "id": user_msg.id,
            "role": "user",
            "content": content,
            "created_at": user_msg.created_at.isoformat() if user_msg.created_at else "",
        },
        "ai_reply": {
            "id": ai_msg.id,
            "role": "ai",
            "content": ai_content,
            "related_group_id": group_id,
            "created_at": ai_msg.created_at.isoformat() if ai_msg.created_at else "",
        }
    }


def _generate_private_ai_reply(db: Session, user: User, message: str, group_id: int = None):
    """生成私聊AI回复 — 优先调用真实AI API"""

    # 构建用户上下文
    context_parts = [f"用户：{user.username}"]

    if group_id:
        group = db.query(Group).filter(Group.id == group_id).first()
        my_tasks = db.query(Task).filter(
            Task.group_id == group_id,
            Task.assigned_to == user.id,
        ).all()
        group_name = group.name if group else "未知群组"
        context_parts.append(f"关联群组：{group_name}")
        if my_tasks:
            task_list = "\n".join([
                f"  - {t.title}（{t.status}{'，截止：' + t.deadline.strftime('%m/%d') if t.deadline else ''}）"
                for t in my_tasks
            ])
            context_parts.append(f"该用户在此群组的任务：\n{task_list}")
    else:
        # 获取用户所有群组信息
        memberships = db.query(GroupMember).filter(GroupMember.user_id == user.id).all()
        if memberships:
            groups_info = []
            for m in memberships:
                g = db.query(Group).filter(Group.id == m.group_id).first()
                if g:
                    tc = db.query(Task).filter(Task.group_id == g.id, Task.assigned_to == user.id).count()
                    groups_info.append(f"  - {g.name}（{tc}个任务）")
            if groups_info:
                context_parts.append(f"参与的团队：\n" + "\n".join(groups_info))

    # 用户技能
    if user.skills:
        context_parts.append(f"用户技能：{', '.join(user.skills[:8])}")

    context = "\n".join(context_parts)

    # 调用真实AI API — 检测是否需要联网搜索
    _search_keywords = ["竞品", "搜索", "搜一下", "查一下", "找一下", "推荐", "有哪些",
                        "市场", "调研", "对比", "比较", "最新", "趋势", "热门"]
    need_search = any(kw in message for kw in _search_keywords)

    try:
        from services.ai_service import AIService
        ai = AIService()
        if ai.is_available:
            if need_search:
                result = ai.chat_with_search(message=message, context=context)
                return result.get("reply", "")
            return ai.chat(message=message, context=context)
    except Exception as e:
        print(f"[Private AI] Error: {e}")

    # 回退到简单回复
    return (
        f"你好 {user.username}！我是AI助手。\n\n"
        f"我可以帮你管理任务、规划时间、提供建议。\n"
        f"有什么需要帮忙的？"
    )


# ─── 知识库 ───────────────────────────────────────

@router.get("/knowledge/{group_id}")
def get_knowledge_files(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取群组知识库文件列表"""
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="您不是该群组成员")

    files = db.query(KnowledgeFile).filter(
        KnowledgeFile.group_id == group_id,
    ).order_by(KnowledgeFile.created_at.desc()).all()

    result = []
    for f in files:
        uploader = db.query(User).filter(User.id == f.uploaded_by).first()
        result.append({
            "id": f.id,
            "file_name": f.file_name,
            "file_url": f.file_url,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "summary": f.summary,
            "tags": f.tags or [],
            "uploaded_by": uploader.username if uploader else "未知",
            "created_at": f.created_at.isoformat() if f.created_at else "",
        })
    return result
