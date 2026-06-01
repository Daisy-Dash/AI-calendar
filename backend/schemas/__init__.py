"""Pydantic schemas"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Any


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar: str
    bio: str
    is_active: bool
    created_at: Any

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    deadline: Optional[str] = None
    priority: Optional[int] = 1
    estimated_hours: Optional[float] = None
    tags: Optional[list[str]] = []
    group_id: Optional[int] = None
    parent_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    estimated_hours: Optional[float] = None
    tags: Optional[list[str]] = None


class TaskResponse(BaseModel):
    id: int
    user_id: int
    group_id: Optional[int] = None
    parent_id: Optional[int] = None
    title: str
    description: str
    deadline: Optional[Any] = None
    priority: int
    status: str
    progress: int
    estimated_hours: Optional[float] = None
    tags: list
    assigned_to: Optional[int] = None
    is_subtask: bool
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True


class AISplitRequest(BaseModel):
    task_title: str
    task_description: Optional[str] = ""
    total_days: Optional[int] = None


class AISplitResponse(BaseModel):
    subtasks: list[dict]


class AIAssignRequest(BaseModel):
    task_id: int
    group_id: int


class AIAssignResponse(BaseModel):
    assignments: list[dict]


class AIChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""


class AIChatResponse(BaseModel):
    reply: str


class ScheduleCreate(BaseModel):
    task_id: Optional[int] = None
    title: str
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    color: Optional[str] = "#FF9F43"
    note: Optional[str] = ""


class ScheduleResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int] = None
    title: str
    date: Any
    start_time: Any
    end_time: Any
    is_ai_generated: bool
    color: str
    note: str

    class Config:
        from_attributes = True


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = ""


class GroupInvite(BaseModel):
    group_id: int
    invitee_email: str


class GroupRespond(BaseModel):
    invite_code: str
    accept: bool = True


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str
    invite_code: str
    created_by: int
    member_count: Optional[int] = 0
    created_at: Any

    class Config:
        from_attributes = True


class GroupStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    member_stats: list[dict]


class ProgressUpdate(BaseModel):
    progress: int  # 0-100
