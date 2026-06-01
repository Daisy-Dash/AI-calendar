"""日程相关路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from datetime import datetime, timedelta
from database import get_db
from models import User, Schedule
from schemas import ScheduleCreate, ScheduleResponse
from auth import get_current_user

router = APIRouter(prefix="/api/schedule", tags=["日程"])


@router.get("", response_model=list[ScheduleResponse])
def get_week_schedule(
    week: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取周日程"""
    query = db.query(Schedule).filter(Schedule.user_id == current_user.id)

    if date:
        # 获取指定日期所在周
        dt = datetime.fromisoformat(date.replace("Z", "+00:00"))
        start_of_week = dt - timedelta(days=dt.weekday())
        end_of_week = start_of_week + timedelta(days=7)
        query = query.filter(Schedule.date >= start_of_week, Schedule.date < end_of_week)

    return query.order_by(Schedule.date).all()


@router.post("", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建日程"""
    schedule = Schedule(
        user_id=current_user.id,
        task_id=data.task_id,
        title=data.title,
        date=datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        color=data.color,
        note=data.note or "",
    )
    if data.start_time:
        schedule.start_time = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
    if data.end_time:
        schedule.end_time = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))

    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/parse", response_model=dict)
def parse_schedule(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI解析日程（接收自然语言描述，返回解析结果）"""
    # 这个端点将由AI服务处理
    # 目前返回占位响应，真正的AI解析由services/ai_service.py实现
    text = data.get("text", "")
    return {
        "original": text,
        "parsed": True,
        "suggestions": [
            {"title": "解析后的任务", "date": datetime.now().isoformat()}
        ],
    }
