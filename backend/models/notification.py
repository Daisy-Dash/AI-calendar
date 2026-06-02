"""数据库模型 - 通知"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(20), default="system")  # ddl / ai / group / progress / system / task
    title = Column(String(200), nullable=False)
    message = Column(Text, default="")
    related_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    related_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
