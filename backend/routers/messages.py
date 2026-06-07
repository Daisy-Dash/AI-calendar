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
    """生成AI在群聊中的回复"""
    group = db.query(Group).filter(Group.id == group_id).first()
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    tasks = db.query(Task).filter(Task.group_id == group_id).all()

    member_count = len(members)
    task_count = len(tasks)
    completed = sum(1 for t in tasks if t.status == "已完成")

    # 简单的AI回复逻辑（可接入真实AI API）
    lower = user_message.lower()

    if "进度" in lower or "状态" in lower:
        content = f"📊 项目进度报告：\n\n"
        content += f"👥 团队成员：{member_count} 人\n"
        content += f"📋 总任务数：{task_count}\n"
        content += f"✅ 已完成：{completed}\n"
        content += f"📈 完成率：{(completed/task_count*100) if task_count else 0:.0f}%\n\n"
        if task_count > completed:
            pending_tasks = [t for t in tasks if t.status != "已完成"]
            content += "⏳ 待完成任务：\n"
            for t in pending_tasks[:5]:
                assignee = db.query(User).filter(User.id == t.assigned_to).first() if t.assigned_to else None
                name = assignee.username if assignee else "未分配"
                content += f"  · {t.title} ({name})\n"
    elif "分配" in lower or "拆解" in lower or "任务" in lower:
        content = f"🤖 收到！我来帮大家分析任务。\n\n"
        content += f"当前团队有 {member_count} 人，"
        if task_count == 0:
            content += "还没有创建任务。请先告诉我你们的大作业/项目要求，我会帮你们拆解成具体的子任务并分配。"
        else:
            content += f"已有 {task_count} 个任务。如果需要重新分配或添加新任务，告诉我具体需求。"
    elif "建议" in lower or "怎么" in lower or "如何" in lower:
        content = f"💡 基于团队当前情况，我有以下建议：\n\n"
        content += "1. 每位成员先确认自己的任务理解无误\n"
        content += "2. 设置明确的阶段性目标和截止时间\n"
        content += "3. 遇到问题及时在群里沟通，我会帮忙协调\n"
        content += "4. 完成的部分可以上传到知识库，方便大家参考\n\n"
        content += "有具体问题随时 @ai 问我！"
    else:
        content = f"收到！关于「{user_message[:30]}{'...' if len(user_message) > 30 else ''}」，"
        content += "我已记录。如果需要我帮忙分析或分配任务，随时 @ai 告诉我。\n\n"
        content += "💡 小提示：你可以发送以下指令：\n"
        content += "· @ai 进度 — 查看项目进度\n"
        content += "· @ai 分配任务 — AI智能分配\n"
        content += "· @ai 建议 — 获取AI建议"

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
    """生成私聊AI回复"""
    lower = message.lower()

    # 如果关联了群组，读取任务信息
    if group_id:
        group = db.query(Group).filter(Group.id == group_id).first()
        my_tasks = db.query(Task).filter(
            Task.group_id == group_id,
            Task.assigned_to == user.id,
        ).all()

        group_name = group.name if group else "未知群组"
        task_info = ""
        if my_tasks:
            task_info = f"\n\n📋 你在「{group_name}」的任务：\n"
            for t in my_tasks:
                status_emoji = "✅" if t.status == "已完成" else "🔄" if t.status == "进行中" else "⏳"
                task_info += f"  {status_emoji} {t.title} - {t.status}\n"

        if "我的任务" in lower or "任务" in lower:
            if my_tasks:
                reply = f"在「{group_name}」中，你有 {len(my_tasks)} 个任务：{task_info}\n"
                pending = [t for t in my_tasks if t.status != "已完成"]
                if pending:
                    reply += f"\n建议优先处理：**{pending[0].title}**"
                    if pending[0].deadline:
                        reply += f"（截止：{pending[0].deadline.strftime('%m/%d')}）"
                return reply
            else:
                return f"在「{group_name}」中你暂时没有分配到的任务。可以在群聊里 @ai 请求分配任务。"

        if "怎么做" in lower or "教我" in lower or "指导" in lower:
            if my_tasks:
                current = next((t for t in my_tasks if t.status != "已完成"), None)
                if current:
                    return (
                        f"关于「{current.title}」，这是我的建议：\n\n"
                        f"1️⃣ 先理清任务目标 — {current.description or '参考任务描述'}\n"
                        f"2️⃣ 拆分成小步骤 — 每次只做一个子任务\n"
                        f"3️⃣ 设定时间节点 — 避免拖延\n"
                        f"4️⃣ 有问题及时在群里沟通\n\n"
                        f"需要更详细的指导可以告诉我具体哪一步不明白。"
                    )
            return "告诉我你正在做的具体任务，我来给你详细的指导建议。"

        # 通用回复 + 群组上下文
        return (
            f"你好！我是你在「{group_name}」的AI助手。{task_info}\n\n"
            f"你可以问我：\n"
            f"· 「我的任务」— 查看任务列表\n"
            f"· 「怎么做 XX」— 获取任务指导\n"
            f"· 「帮我总结进度」— 整理进度报告"
        )

    # 无群组关联的通用对话
    # 获取用户的所有群组
    from models import GroupMember
    memberships = db.query(GroupMember).filter(GroupMember.user_id == user.id).all()

    if "群" in lower or "项目" in lower or "团队" in lower:
        if memberships:
            reply = "你参与的团队项目：\n\n"
            for m in memberships:
                group = db.query(Group).filter(Group.id == m.group_id).first()
                if group:
                    task_count = db.query(Task).filter(
                        Task.group_id == group.id,
                        Task.assigned_to == user.id,
                    ).count()
                    reply += f"📁 {group.name} — 你有 {task_count} 个任务\n"
            reply += "\n转发任意群名片给我，我可以帮你查看和管理该群的任务。"
            return reply
        return "你还没有加入任何团队项目。可以创建一个新项目或通过邀请码加入现有项目。"

    return (
        f"你好 {user.username}！我是你的AI统筹助手。\n\n"
        f"我可以帮你：\n"
        f"· 查看各个团队项目的任务进度\n"
        f"· 提供任务执行指导\n"
        f"· 整理和总结项目资料\n\n"
        f"把团队群的群名片转发给我，我就能读取你在那个群的任务信息，随时为你提供帮助。"
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
