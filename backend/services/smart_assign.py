"""智能任务分配服务"""
from sqlalchemy.orm import Session
from models import Group, GroupMember, Task, User
from services.ai_service import AIService
import json


class SmartAssigner:
    """智能分配器 - 根据成员技能和负载均衡分配任务"""

    def __init__(self):
        self.ai_service = AIService()

    def assign(self, task_id: int, group_id: int, db: Session) -> list[dict]:
        """
        智能分配任务给群组成员

        Args:
            task_id: 任务ID
            group_id: 群组ID
            db: 数据库会话

        Returns:
            分配方案列表
        """
        # 获取任务信息
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return []

        # 获取群组成员
        members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
        if not members:
            return []

        member_list = []
        for m in members:
            user = db.query(User).filter(User.id == m.user_id).first()
            if user:
                skills = json.loads(m.skills) if m.skills else []
                member_list.append({
                    "id": user.id,
                    "name": user.username,
                    "skills": skills,
                })

        # 尝试AI分配，失败则使用本地算法
        ai_result = self.ai_service.smart_assign(task.title, member_list)
        if ai_result:
            return ai_result

        return self._local_assign(task, member_list)

    def _local_assign(self, task: Task, members: list[dict]) -> list[dict]:
        """本地分配算法 - 轮询分配"""
        result = []
        for i, member in enumerate(members):
            result.append({
                "user_id": member["id"],
                "username": member["name"],
                "subtask": f"参与'{task.title}'任务",
                "reason": "系统自动分配",
            })
        return result
