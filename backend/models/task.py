"""数据库模型 - 任务"""
from sqlalchemy import Column, Integer, String, DateTime, Float, Enum, ForeignKey, Boolean, Text, JSON
from sqlalchemy.sql import func
from database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "待办"
    IN_PROGRESS = "进行中"
    COMPLETED = "已完成"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True, index=True)
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    deadline = Column(DateTime(timezone=True), nullable=True)
    priority = Column(Integer, default=1)  # 1-低, 2-中, 3-高, 4-紧急
    status = Column(String(20), default=TaskStatus.PENDING.value)
    progress = Column(Integer, default=0)  # 0-100
    estimated_hours = Column(Float, nullable=True)
    tags = Column(JSON, default=list)  # ["Figma", "PPT"]
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_subtask = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
