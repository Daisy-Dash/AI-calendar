"""数据库模型 - 群组"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.sql import func
from database import Base
import enum


class MemberRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), default="")
    invite_code = Column(String(20), unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(20), default=MemberRole.MEMBER.value)
    skills = Column(String(500), default="")  # JSON array of skill tags
    joined_at = Column(DateTime(timezone=True), server_default=func.now())


class GroupInvitation(Base):
    """群组邀请记录"""
    __tablename__ = "group_invitations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 邀请人
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # 被邀请人
    status = Column(String(20), default="pending")  # pending/accepted/declined
    task_assignments = Column(JSON, default=list)  # AI分配的任务详情
    message = Column(String(500), default="")  # 邀请附言
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
