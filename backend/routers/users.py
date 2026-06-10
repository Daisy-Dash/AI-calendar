"""用户相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
from models import User, Task, Schedule, GroupMember
from schemas import UserResponse, UserProfileUpdate, UserSettingsUpdate, UserSettingsResponse, UserStatsResponse, AbilityProfileResponse
from auth import get_current_user
from collections import Counter

router = APIRouter(prefix="/api/users", tags=["用户"])


# 默认偏好设置
DEFAULT_PREFERENCES = {
    "theme": "light",
    "notifications": True,
    "ddlReminder": True,
    "aiSuggestion": True,
    "sound": False,
}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新当前用户信息（含技能名片）"""
    update_data = data.model_dump(exclude_unset=True)
    if "username" in update_data:
        existing = db.query(User).filter(
            User.username == update_data["username"],
            User.id != current_user.id,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="该昵称已被使用")
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search", response_model=list[UserResponse])
def search_users(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """通过昵称或邮箱搜索用户"""
    if len(q) < 2:
        return []
    results = db.query(User).filter(
        User.id != current_user.id,
        (User.username.contains(q) | User.email.contains(q)),
    ).limit(20).all()
    return results


@router.get("/me/settings", response_model=UserSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户偏好设置"""
    prefs = current_user.preferences or {}
    settings = {**DEFAULT_PREFERENCES, **prefs}
    return UserSettingsResponse(**settings)


@router.put("/me/settings", response_model=UserSettingsResponse)
def update_settings(
    data: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新用户偏好设置"""
    current_prefs = current_user.preferences or {}
    update_data = data.model_dump(exclude_unset=True)
    current_prefs.update(update_data)
    current_user.preferences = current_prefs
    db.commit()
    db.refresh(current_user)

    settings = {**DEFAULT_PREFERENCES, **current_prefs}
    return UserSettingsResponse(**settings)


@router.get("/me/stats", response_model=UserStatsResponse)
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户统计数据"""
    total_tasks = db.query(Task).filter(Task.user_id == current_user.id).count()
    completed_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "已完成",
    ).count()
    in_progress_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "进行中",
    ).count()
    pending_tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "待办",
    ).count()

    completion_rate = round((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

    now = datetime.now()
    urgent_deadline = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != "已完成",
        Task.deadline.isnot(None),
        Task.deadline <= now + timedelta(days=3),
        Task.deadline >= now,
    ).count()

    overdue = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != "已完成",
        Task.deadline.isnot(None),
        Task.deadline < now,
    ).count()

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_schedules = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= month_start,
    ).count()

    group_count = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
    ).count()

    streak = 0
    check_date = now.date()
    while True:
        day_start = datetime(check_date.year, check_date.month, check_date.day)
        day_end = day_start + timedelta(days=1)
        has_activity = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.status == "已完成",
            Task.updated_at >= day_start,
            Task.updated_at < day_end,
        ).count() > 0
        if has_activity:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return UserStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        in_progress_tasks=in_progress_tasks,
        pending_tasks=pending_tasks,
        completion_rate=completion_rate,
        urgent_deadline=urgent_deadline,
        overdue_tasks=overdue,
        month_schedules=month_schedules,
        group_count=group_count,
        streak_days=streak,
    )


@router.delete("/me", response_model=dict)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """注销当前账号 - 删除所有关联数据"""
    from models.message import GroupMessage, PrivateMessage
    from models.notification import Notification
    from models.friendship import Friendship

    # 删除用户的任务
    db.query(Task).filter(Task.user_id == current_user.id).delete()
    # 删除用户的日程
    db.query(Schedule).filter(Schedule.user_id == current_user.id).delete()
    # 删除群组成员身份
    db.query(GroupMember).filter(GroupMember.user_id == current_user.id).delete()
    # 删除通知
    db.query(Notification).filter(Notification.user_id == current_user.id).delete()
    # 删除好友关系
    db.query(Friendship).filter(
        (Friendship.user_id == current_user.id) | (Friendship.friend_id == current_user.id)
    ).delete(synchronize_session=False)
    # 删除私聊消息
    db.query(PrivateMessage).filter(PrivateMessage.user_id == current_user.id).delete()
    # 删除用户
    db.delete(current_user)
    db.commit()

    return {"message": "账号已注销"}


@router.get("/me/ability-profile", response_model=AbilityProfileResponse)
def get_ability_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """分析用户能力画像"""
    completed = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status == "已完成",
    ).all()

    total_completed = len(completed)
    if total_completed == 0:
        return AbilityProfileResponse(analysis="还没有完成任务，开始创建任务吧！")

    tag_counter = Counter()
    type_counter = Counter()
    on_time = 0

    for task in completed:
        tags = task.tags or []
        for tag in tags:
            tag_counter[tag] += 1

        title = task.title.lower()
        for kw, category in [("设计", "设计"), ("开发", "开发"), ("写", "写作"), ("ppt", "演示"),
                             ("汇报", "演示"), ("数据", "数据"), ("调研", "调研"), ("学习", "学习")]:
            if kw in title:
                type_counter[category] += 1
                break
        else:
            type_counter["其他"] += 1

        if task.deadline and task.updated_at:
            if task.updated_at <= task.deadline:
                on_time += 1

    top_skills = [{"name": tag, "count": cnt, "level": "expert" if cnt >= 5 else "熟练" if cnt >= 3 else "了解"}
                  for tag, cnt in tag_counter.most_common(10)]
    task_types = [{"type": t, "count": c} for t, c in type_counter.most_common(6)]
    on_time_rate = round(on_time / total_completed * 100) if total_completed > 0 else 0

    skill_names = [s["name"] for s in top_skills[:5]]
    analysis = f"共完成 {total_completed} 个任务，核心技能: {', '.join(skill_names) if skill_names else '待积累'}。" \
               f"准时率 {on_time_rate}%。" + \
               ("继续保持!" if on_time_rate >= 80 else "注意按时完成任务!" if on_time_rate >= 50 else "需要提升时间管理!")

    return AbilityProfileResponse(
        top_skills=top_skills,
        task_types=task_types,
        on_time_rate=on_time_rate,
        total_completed=total_completed,
        analysis=analysis,
    )
