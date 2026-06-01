"""AI服务模块 - Claude/GPT API适配器"""
from config import settings
from typing import Optional


class AIService:
    """AI服务适配器，支持 Claude 和 GPT"""

    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.claude_api_key = settings.CLAUDE_API_KEY
        self.gpt_api_key = settings.GPT_API_KEY

    def chat(self, message: str, context: str = "") -> str:
        """发送对话消息并获取回复"""
        # 如果有真实的API密钥，调用对应API
        if self.provider == "claude" and self.claude_api_key:
            return self._call_claude(message, context)
        elif self.provider == "gpt" and self.gpt_api_key:
            return self._call_gpt(message, context)
        else:
            return self._mock_reply(message, context)

    def split_task(self, task_title: str, task_description: str = "", total_days: Optional[int] = None) -> list[dict]:
        """分解任务为子任务"""
        if self.claude_api_key or self.gpt_api_key:
            prompt = self._build_split_prompt(task_title, task_description, total_days)
            return self._call_ai_api(prompt)
        return self._mock_split(task_title, task_description, total_days)

    def smart_assign(self, task_title: str, members: list[dict]) -> list[dict]:
        """智能分配任务给团队成员"""
        if self.claude_api_key or self.gpt_api_key:
            prompt = self._build_assign_prompt(task_title, members)
            return self._call_ai_api(prompt)
        return self._mock_assign(task_title, members)

    def _call_claude(self, message: str, context: str) -> str:
        """调用 Claude API"""
        import httpx
        headers = {
            "x-api-key": self.claude_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        payload = {
            "model": settings.CLAUDE_API_MODEL,
            "max_tokens": 1024,
            "messages": [{"role": "user", "content": f"{context}\n\n{message}"}],
        }
        try:
            resp = httpx.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except Exception as e:
            return f"AI服务暂时不可用（{str(e)}），请稍后再试"

    def _call_gpt(self, message: str, context: str) -> str:
        """调用 GPT API"""
        import httpx
        headers = {
            "Authorization": f"Bearer {self.gpt_api_key}",
            "content-type": "application/json",
        }
        payload = {
            "model": settings.GPT_API_MODEL,
            "messages": [{"role": "user", "content": f"{context}\n\n{message}"}],
        }
        try:
            resp = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"AI服务暂时不可用（{str(e)}），请稍后再试"

    def _call_ai_api(self, prompt: str) -> list[dict]:
        """调用AI API并解析JSON响应"""
        import json
        import httpx

        if self.provider == "claude" and self.claude_api_key:
            headers = {
                "x-api-key": self.claude_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": settings.CLAUDE_API_MODEL,
                "max_tokens": 2048,
                "messages": [{"role": "user", "content": prompt}],
            }
            try:
                resp = httpx.post(
                    "https://api.anthropic.com/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=30,
                )
                resp.raise_for_status()
                text = resp.json()["content"][0]["text"]
                return json.loads(text)
            except Exception:
                return []

        elif self.provider == "gpt" and self.gpt_api_key:
            headers = {
                "Authorization": f"Bearer {self.gpt_api_key}",
                "content-type": "application/json",
            }
            payload = {
                "model": settings.GPT_API_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            }
            try:
                resp = httpx.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30,
                )
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"]
                return json.loads(text)
            except Exception:
                return []

        return []

    def _build_split_prompt(self, title: str, description: str, total_days: Optional[int]) -> str:
        """构建任务分解的Prompt"""
        days_hint = f"，总时长{total_days}天" if total_days else ""
        return f"""你是一个AI任务分解助手。请将以下任务分解为具体的子任务，返回JSON数组。

任务：{title}
描述：{description}{days_hint}

请按以下JSON格式返回：
[
  {{"title": "子任务名称", "estimated_hours": 2.5, "description": "具体步骤", "priority": "high/mid/low"}},
  ...
]

要求：
- 分解为2-4个可执行的子任务
- 每个子任务有合理的预估时间
- 按优先级排序"""

    def _build_assign_prompt(self, title: str, members: list[dict]) -> str:
        """构建智能分配的Prompt"""
        members_str = "\n".join([f"- {m['name']}: 技能={', '.join(m['skills'])}" for m in members])
        return f"""你是一个团队任务分配助手。请根据成员技能将以下任务分配给最合适的人。

任务：{title}

团队成员：
{members_str}

请按以下JSON格式返回分配方案：
[
  {{"user_id": 1, "username": "成员名", "subtask": "负责的子任务", "reason": "分配理由"}},
  ...
]

要求：
- 根据技能匹配度分配
- 避免过度集中给一个人"""

    def _mock_reply(self, message: str, context: str) -> str:
        """模拟AI回复（无API密钥时）"""
        return f"你好！我是AI助手。我收到了你的消息：'{message[:50]}...'\n\n我是你的智能日程协作者，可以帮助你：\n1. 📋 任务分解 - 将大任务拆分为可执行的子任务\n2. 📅 自动排期 - 根据DDL智能安排时间\n3. 📊 进度追踪 - 实时追踪任务完成情况\n4. 👥 团队协作 - 智能分配任务给团队成员\n\n请在 .env 文件中配置有效的 Claude API 或 GPT API 密钥以启用完整AI功能。"

    def _mock_split(self, title: str, description: str, total_days: Optional[int]) -> list[dict]:
        """模拟任务分解"""
        return [
            {"title": f"调研与资料收集", "estimated_hours": 3.0, "description": f"收集'{title}'相关的资料和信息", "priority": "high"},
            {"title": "方案设计与规划", "estimated_hours": 2.0, "description": "制定详细的实施方案", "priority": "high"},
            {"title": "执行与跟进", "estimated_hours": 4.0, "description": "按照方案逐步执行", "priority": "mid"},
            {"title": "检查与总结", "estimated_hours": 1.0, "description": "完成后的检查和总结", "priority": "mid"},
        ]

    def _mock_assign(self, title: str, members: list[dict]) -> list[dict]:
        """模拟智能分配"""
        result = []
        for i, member in enumerate(members):
            result.append({
                "user_id": member.get("id", i + 1),
                "username": member.get("name", f"成员{i+1}"),
                "subtask": f"负责'{title}'的相关部分",
                "reason": f"根据技能标签和当前负载均衡分配",
            })
        return result
