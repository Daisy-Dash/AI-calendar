"""消息模型 - 群聊消息 + 私聊消息"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from database import Base


class GroupMessage(Base):
    """群聊消息"""
    __tablename__ = "group_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL = AI agent
    content = Column(Text, nullable=False)
    msg_type = Column(String(20), default="text")  # text / file / system / ai / task_card
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(200), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)  # 附加数据（如任务卡片信息）
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PrivateMessage(Base):
    """私聊消息（用户与AI）"""
    __tablename__ = "private_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(10), default="user")  # user / ai
    content = Column(Text, nullable=False)
    msg_type = Column(String(20), default="text")  # text / group_card / task_info
    related_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgeFile(Base):
    """知识库文件"""
    __tablename__ = "knowledge_files"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String(200), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), default="")  # pdf, docx, image, etc.
    file_size = Column(Integer, default=0)  # bytes
    summary = Column(Text, default="")  # AI生成的摘要
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
