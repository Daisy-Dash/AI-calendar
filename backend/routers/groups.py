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

    # 统计
    total_tasks = db.query(Task).filter(Task.group_id == group_id).count()
    completed_tasks = db.query(Task).filter(
        Task.group_id == group_id,
        Task.status == "已完成",
    ).count()

    # 成员统计
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_stats = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            user_tasks = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
            ).count()
            user_completed = db.query(Task).filter(
                Task.group_id == group_id,
                Task.assigned_to == user.id,
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
    """群主点击「人齐了，开始吧」触发AI分解任务"""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="群组不存在")

    # 只有群主能触发
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="只有群主可以启动工作流程")

    # 更新项目简介（如果提供）
    if data and data.get("project_brief"):
        group.project_brief = data["project_brief"]

    # 获取成员信息
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    member_info = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            member_info.append({
                "id": user.id,
                "name": user.username,
                "skills": user.skills or [],
                "major": user.major or [],
                "role": m.role,
            })

    # AI 分解任务并分配
    project_desc = group.project_brief or group.description or group.name
    tasks_data = _ai_decompose_tasks(project_desc, member_info)

    # 创建任务
    created_tasks = []
    for t in tasks_data:
        task = Task(
            title=t["title"],
            description=t.get("description", ""),
            user_id=t.get("assigned_to") or current_user.id,
            group_id=group_id,
            assigned_to=t.get("assigned_to"),
            status="待确认",
            priority=_parse_priority(t.get("priority", "中")),
            deadline=None,
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
        })

    # 更新群组状态
    group.status = "confirming"
    db.commit()

    # 发送系统消息到群聊
    from models.message import GroupMessage
    task_summary = "📋 AI已完成任务分解和分配：\n\n"
    for ct in created_tasks:
        task_summary += f"• {ct['title']} → {ct['assigned_name']}\n"
        if ct.get('reason'):
            task_summary += f"  理由: {ct['reason']}\n"
    task_summary += "\n⚡ 请各位组员确认自己的任务，如有异议可以打回重新分配。"

    ai_msg = GroupMessage(
        group_id=group_id,
        sender_id=None,
        content=task_summary,
        msg_type="ai",
    )
    db.add(ai_msg)
    db.commit()

    return {
        "message": "AI已完成任务分解和分配",
        "tasks": created_tasks,
        "status": "confirming",
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

    if accept:
        task.status = "待处理"
        db.commit()

        # 检查所有任务是否都已确认
        pending = db.query(Task).filter(
            Task.group_id == group_id,
            Task.status == "待确认",
        ).count()

        if pending == 0:
            # 所有任务已确认，更新群组状态
            group = db.query(Group).filter(Group.id == group_id).first()
            if group:
                group.status = "in_progress"
                db.commit()

                # 发送系统消息
                from models.message import GroupMessage
                msg = GroupMessage(
                    group_id=group_id,
                    sender_id=None,
                    content="🎉 所有成员已确认任务！项目正式开始，大家加油！\n\n可以在看板中查看和更新你的任务进度。",
                    msg_type="ai",
                )
                db.add(msg)
                db.commit()

        return {"message": "已确认任务", "status": "待处理"}
    else:
        # 打回任务
        task.status = "已打回"
        task.assigned_to = None
        db.commit()

        # 通知群主
        group = db.query(Group).filter(Group.id == group_id).first()
        from models.message import GroupMessage
        msg = GroupMessage(
            group_id=group_id,
            sender_id=None,
            content=f"⚠️ {current_user.username} 对任务「{task.title}」提出异议：{reason or '未说明原因'}\n\n该任务已退回，等待重新分配。群主可以发送 @ai 重新分配 来让AI重新调整。",
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
        })
    return result


def _ai_decompose_tasks(project_desc: str, members: list) -> list:
    """AI智能分解任务并根据技能分配"""
    # 简单的任务分解逻辑
    # 在实际产品中可接入真实的AI API
    import re

    base_tasks = [
        {"title": "需求分析与文档整理", "description": "整理项目需求，编写需求文档", "priority": 3},
        {"title": "方案设计与架构规划", "description": "设计整体方案和技术架构", "priority": 3},
        {"title": "核心功能开发", "description": "实现项目核心功能模块", "priority": 3},
        {"title": "UI/UX设计", "description": "设计用户界面和交互体验", "priority": 2},
        {"title": "测试与质量保证", "description": "编写测试用例，执行测试", "priority": 2},
        {"title": "文档撰写与汇报准备", "description": "准备项目报告和展示材料", "priority": 2},
    ]

    # 根据成员数量调整任务数量
    num_members = len(members)
    if num_members <= 2:
        tasks = base_tasks[:4]
    elif num_members <= 4:
        tasks = base_tasks[:5]
    else:
        tasks = base_tasks

    # 技能关键词匹配分配
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

        # 找出最匹配的成员
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

        # 如果没找到最佳匹配，分配给第一个未分配的成员
        if not best_member:
            for member in members:
                if member["id"] not in assigned:
                    best_member = member
                    best_reason = "均衡分配"
                    break

        if best_member:
            assigned.add(best_member["id"])
            result.append({
                **task,
                "assigned_to": best_member["id"],
                "assigned_name": best_member["name"],
                "reason": best_reason,
            })
        else:
            # 所有成员都已分配，循环分配
            member = members[len(result) % len(members)]
            result.append({
                **task,
                "assigned_to": member["id"],
                "assigned_name": member["name"],
                "reason": "均衡分配",
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
