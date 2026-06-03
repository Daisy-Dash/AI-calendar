"""通知相关路由"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Notification
from schemas import NotificationResponse, UnreadCountResponse
from auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["通知"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False, alias="unread_only"),
    type_filter: str = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取通知列表（支持分类筛选）"""
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)
    if type_filter and type_filter != "all":
        query = query.filter(Notification.type == type_filter)

    query = query.order_by(Notification.created_at.desc()).limit(limit)
    return query.all()


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取未读通知数量"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).count()
    return {"count": count}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """标记通知为已读"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="通知不存在")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.put("/read-all", response_model=dict)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """标记所有通知为已读"""
    result = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})

    db.commit()
    return {"message": f"已将 {result} 条通知标记为已读"}


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_task_id: int = None,
    related_group_id: int = None,
) -> Notification:
    """工具函数：创建通知（供其他服务调用）"""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_task_id=related_task_id,
        related_group_id=related_group_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # 通过 WebSocket 实时推送
    try:
        import asyncio
        from services.ws_manager import manager
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(manager.send_to_user(user_id, {
                "type": "notification",
                "data": {
                    "id": notification.id,
                    "type": type,
                    "title": title,
                    "message": message,
                    "is_read": False,
                },
            }))
    except Exception:
        pass  # 静默失败

    return notification
