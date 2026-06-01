"""AI相关路由 - 任务分解 / 智能分配 / 对话"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import AISplitRequest, AISplitResponse, AIAssignRequest, AIAssignResponse, AIChatRequest, AIChatResponse
from auth import get_current_user
from services.ai_split import AITaskSplitter
from services.smart_assign import SmartAssigner

router = APIRouter(prefix="/api", tags=["AI"])


@router.post("/tasks/split", response_model=AISplitResponse)
def ai_split_task(
    data: AISplitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI任务分解"""
    splitter = AITaskSplitter()
    subtasks = splitter.split(
        task_title=data.task_title,
        task_description=data.task_description,
        total_days=data.total_days,
    )
    return {"subtasks": subtasks}


@router.post("/tasks/assign", response_model=AIAssignResponse)
def ai_assign_task(
    data: AIAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI智能分配任务"""
    assigner = SmartAssigner()
    assignments = assigner.assign(task_id=data.task_id, group_id=data.group_id, db=db)
    return {"assignments": assignments}


@router.post("/ai/chat", response_model=AIChatResponse)
def ai_chat(
    data: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI助手对话"""
    from services.ai_service import AIService
    ai_service = AIService()
    reply = ai_service.chat(message=data.message, context=data.context)
    return {"reply": reply}
