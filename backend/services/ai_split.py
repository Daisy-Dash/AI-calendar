"""AI任务分解服务"""
from services.ai_service import AIService
from typing import Optional


class AITaskSplitter:
    """任务分解器"""

    def __init__(self):
        self.ai_service = AIService()

    def split(self, task_title: str, task_description: str = "", total_days: Optional[int] = None) -> list[dict]:
        """
        将大型任务分解为子任务

        Args:
            task_title: 任务标题
            task_description: 任务描述
            total_days: 总天数限制（可选）

        Returns:
            子任务列表 [{"title": str, "estimated_hours": float, "description": str, "priority": str}]
        """
        return self.ai_service.split_task(task_title, task_description, total_days)
