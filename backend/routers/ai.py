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


@router.post("/ai/parse")
def ai_parse_message(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 解析用户消息 — 提取任务、时间、标签"""
    import json
    text = data.get("text", "")
    deep = data.get("deep", False)

    from services.ai_parse import parse_user_message
    result = parse_user_message(text, deep=deep)

    # 如果用户已登录，用解析结果更新画像
    if result.get("skill_tags"):
        existing_skills = set(current_user.skills or [])
        new_skills = set(result["skill_tags"])
        merged = list(existing_skills | new_skills)
        if merged != (current_user.skills or []):
            current_user.skills = merged
            db.commit()

    # 确保返回的是可序列化的 dict（防止循环引用）
    return json.loads(json.dumps(result, ensure_ascii=False, default=str))


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


@router.post("/ai/search-chat")
def ai_search_chat(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """带联网搜索能力的AI对话 — Function Calling + Web Search

    请求体:
        {"message": "帮我找日程管理APP的竞品", "context": "可选上下文"}

    返回:
        {"reply": "AI回复", "search_results": [...], "tool_calls": [...]}
    """
    import json as _json
    from services.ai_service import AIService

    message = data.get("message", "")
    context = data.get("context", "")

    if not message:
        raise HTTPException(status_code=400, detail="message 不能为空")

    ai_service = AIService()
    result = ai_service.chat_with_search(message=message, context=context)

    # 安全序列化
    return _json.loads(_json.dumps(result, ensure_ascii=False, default=str))
