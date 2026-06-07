"""WebSocket 路由 - 实时通信"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import SessionLocal
from models import User
from config import settings
from services.ws_manager import manager

router = APIRouter()


async def get_user_from_token(token: str) -> User | None:
    """从 token 获取用户"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            return user
        finally:
            db.close()
    except (JWTError, ValueError, TypeError):
        return None


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """WebSocket 实时推送端点"""
    user = await get_user_from_token(token)

    if not user:
        await websocket.close(code=4001, reason="认证失败")
        return

    await manager.connect(user.id, websocket)

    # 发送连接确认
    await manager.send_to_user(user.id, {
        "type": "connected",
        "message": "已连接到实时推送",
        "user_id": user.id,
        "active_users": manager.active_users,
    })

    try:
        while True:
            # 接收客户端消息（心跳/命令）
            data = await websocket.receive_text()
            import json
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}, ensure_ascii=False))
                elif msg_type == "subscribe":
                    # 预留：订阅特定群组
                    pass
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        manager.disconnect(user.id, websocket)
    except Exception:
        manager.disconnect(user.id, websocket)
