"""群组相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import secrets
import string
import json
from database import get_db
from models import User, Group, GroupMember, Task
from schemas import GroupCreate, GroupInvite, GroupRespond, GroupResponse, GroupDetailResponse, GroupStats
from auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["群组"])


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
