"""数据库模型 - 日程"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_ai_generated = Column(Boolean, default=False)
    color = Column(String(7), default="#FF9F43")  # 日历颜色标记
    note = Column(String(500), default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
