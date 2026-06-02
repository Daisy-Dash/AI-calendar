"""数据库模型"""
from database import Base

# 用户模型
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON
from sqlalchemy.sql import func


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(255), default="")
    bio = Column(String(500), default="")
    is_active = Column(Boolean, default=True)
    preferences = Column(JSON, default=dict)  # 用户偏好设置
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# 任务模型
from models.task import Task, TaskStatus

# 日程模型
from models.schedule import Schedule

# 群组模型
from models.group import Group, GroupMember, MemberRole

# 通知模型
from models.notification import Notification
