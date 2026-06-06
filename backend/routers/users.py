"""用户相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
from models import User, Task, Schedule, GroupMember
from schemas import UserResponse, UserProfileUpdate, UserSettingsUpdate, UserSettingsResponse, UserStatsResponse
from auth import get_current_user

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
    # 合并默认值
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
    # 任务统计
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

    # 即将到期的DDL数量
    now = datetime.now()
    urgent_deadline = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != "已完成",
        Task.deadline.isnot(None),
        Task.deadline <= now + timedelta(days=3),
        Task.deadline >= now,
    ).count()

    # 超期任务
    overdue = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != "已完成",
        Task.deadline.isnot(None),
        Task.deadline < now,
    ).count()

    # 本月完成的日程数
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_schedules = db.query(Schedule).filter(
        Schedule.user_id == current_user.id,
        Schedule.date >= month_start,
    ).count()

    # 参与的群组数
    group_count = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
    ).count()

    # 连续打卡天数（根据最近任务完成情况估算）
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
