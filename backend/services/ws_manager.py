"""WebSocket 连接管理器 - 实时推送协作更新"""
from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio


class ConnectionManager:
    """管理 WebSocket 连接，支持按用户广播"""

    def __init__(self):
        # user_id -> set of WebSocket connections
        self._connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        """接受新连接"""
        await ws.accept()
        if user_id not in self._connections:
            self._connections[user_id] = set()
        self._connections[user_id].add(ws)

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        """断开连接"""
        if user_id in self._connections:
            self._connections[user_id].discard(ws)
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def send_to_user(self, user_id: int, data: dict) -> None:
        """向指定用户发送消息"""
        if user_id not in self._connections:
            return

        message = json.dumps(data, ensure_ascii=False, default=str)
        dead: list[WebSocket] = []

        for ws in self._connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast(self, data: dict) -> None:
        """向所有连接用户广播"""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, data)

    async def send_to_group(self, group_id: int, data: dict, exclude_user_id: int = None) -> None:
        """向群组所有成员广播（需要额外查询群组成员）"""
        # 这里需要注入数据库会话，简化处理使用 broadcast 替代
        await self.broadcast(data)

    @property
    def active_connections(self) -> int:
        """活跃连接总数"""
        return sum(len(conns) for conns in self._connections.values())

    @property
    def active_users(self) -> int:
        """活跃用户数"""
        return len(self._connections)


# 全局单例
manager = ConnectionManager()
