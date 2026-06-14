"""AI服务模块 - Claude/GPT API适配器"""
from config import settings
from typing import Optional
import json
import re
import httpx

# 彻底禁用代理 — 你的系统有 127.0.0.1:1080 代理拦截
import os
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)
os.environ.pop("ALL_PROXY", None)
os.environ.pop("NO_PROXY", None)

_http_client = httpx.Client(proxy=None, trust_env=False, timeout=60, follow_redirects=True)


def _extract_json(text: str) -> dict | None:
    """从AI回复中鲁棒地提取JSON"""
    if not text:
        return None

    text = text.strip()

    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 尝试提取 markdown 代码块中的 JSON
    fence_patterns = [
        r'```(?:json)?\s*\n?(.*?)\n?```',
        r'```(?:json)?\s*(.*?)\s*```',
    ]
    for pattern in fence_patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue

    # 尝试找到第一个 { 和最后一个 } 之间的内容
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    # 尝试找到第一个 [ 和最后一个 ] 之间的内容（数组）
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None


class AIService:
    """AI服务适配器，支持 Claude / GPT / DeepSeek"""

    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.claude_api_key = settings.CLAUDE_API_KEY
        self.gpt_api_key = settings.GPT_API_KEY
        self.deepseek_api_key = settings.DEEPSEEK_API_KEY
        self._has_real_api = bool(
            self.claude_api_key or self.gpt_api_key or self.deepseek_api_key
        )

    @property
    def is_available(self) -> bool:
        return self._has_real_api

    def chat(self, message: str, context: str = "") -> str:
        """发送对话消息并获取回复"""
        if self.provider == "claude" and self.claude_api_key:
            return self._call_claude(message, context)
        elif self.provider == "gpt" and self.gpt_api_key:
            return self._call_gpt(message, context)
        elif self.provider == "deepseek" and self.deepseek_api_key:
            return self._call_deepseek(message, context)
        # 尝试任何可用的 provider
        elif self.claude_api_key:
            return self._call_claude(message, context)
        elif self.gpt_api_key:
            return self._call_gpt(message, context)
        elif self.deepseek_api_key:
            return self._call_deepseek(message, context)
        else:
            return self._smart_mock_reply(message, context)

    def chat_with_search(self, message: str, context: str = "") -> dict:
        """带联网搜索能力的对话 — 使用 DeepSeek Function Calling

        Returns:
            {
                "reply": "AI 最终回复文本",
                "search_results": [...],  # 搜索到的结果(如果触发了搜索)
                "tool_calls": [...]       # 工具调用记录
            }
        """
        from services.web_search import SEARCH_TOOLS, execute_tool_call

        if not self._has_real_api:
            return {
                "reply": self._smart_mock_reply(message, context),
                "search_results": [],
                "tool_calls": [],
            }

        # 构建带搜索系统提示
        system_prompt = self._get_search_system_prompt()
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "user", "content": context})
            messages.append({"role": "assistant", "content": "好的，我了解了以上背景信息。"})
        messages.append({"role": "user", "content": message})

        all_search_results = []
        tool_call_log = []

        # 选择 API — 优先 DeepSeek（function calling 兼容性最好）
        api_key = self.deepseek_api_key or self.gpt_api_key
        api_url = (
            "https://api.deepseek.com/v1/chat/completions"
            if self.deepseek_api_key
            else "https://api.openai.com/v1/chat/completions"
        )
        model = (
            settings.DEEPSEEK_API_MODEL
            if self.deepseek_api_key
            else settings.GPT_API_MODEL
        )

        if not api_key:
            # Claude 不支持 OpenAI 风格 function calling，降级为普通对话
            return {
                "reply": self._call_claude(message, context),
                "search_results": [],
                "tool_calls": [],
            }

        # 最多 2 轮：第 1 轮允许调工具，第 2 轮强制出文本
        for round_idx in range(2):
            try:
                request_body = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": 2048,
                    "temperature": 0.7,
                }

                # 只在第 1 轮提供工具；第 2 轮不传 tools，强制 AI 直接回复
                if round_idx == 0:
                    request_body["tools"] = SEARCH_TOOLS
                    request_body["tool_choice"] = "auto"

                resp = _http_client.post(
                    api_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "content-type": "application/json",
                    },
                    json=request_body,
                )
                resp.raise_for_status()
                data = resp.json()

                choice = data["choices"][0]
                msg = choice["message"]

                # 如果 AI 不需要调用工具，直接返回
                if choice.get("finish_reason") == "stop" or not msg.get("tool_calls"):
                    return {
                        "reply": msg.get("content", ""),
                        "search_results": all_search_results,
                        "tool_calls": tool_call_log,
                    }

                # AI 请求调用工具 — 执行搜索
                messages.append(msg)  # 把 assistant 的 tool_calls 消息加入上下文

                for tool_call in msg["tool_calls"]:
                    func_name = tool_call["function"]["name"]
                    func_args = json.loads(tool_call["function"]["arguments"])

                    print(f"[AI Search] 工具调用: {func_name}({func_args})")
                    tool_call_log.append({"tool": func_name, "args": func_args})

                    # 执行搜索
                    result_str = execute_tool_call(func_name, func_args)
                    try:
                        parsed = json.loads(result_str)
                        seen_urls = {r.get("url") for r in all_search_results}
                        new_items = []
                        if isinstance(parsed, list):
                            new_items = parsed
                        elif isinstance(parsed, dict):
                            for v in parsed.values():
                                if isinstance(v, list):
                                    new_items.extend(v)
                        for item in new_items:
                            if item.get("url") not in seen_urls:
                                all_search_results.append(item)
                                seen_urls.add(item.get("url"))
                    except Exception:
                        pass

                    # 把工具结果返回给 AI
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": result_str,
                    })

            except Exception as e:
                print(f"[AI Search] 第 {round_idx+1} 轮出错: {e}")
                # 出错时降级为普通对话
                fallback = self.chat(message, context)
                return {
                    "reply": fallback,
                    "search_results": all_search_results,
                    "tool_calls": tool_call_log,
                }

        # 工具调用循环用尽 — 基于已收集的搜索结果给出简要总结
        if all_search_results:
            summary_parts = ["根据搜索结果，我找到了以下相关信息：\n"]
            for i, r in enumerate(all_search_results[:5], 1):
                title = r.get("title", "未知")
                snippet = r.get("snippet", "")[:100]
                url = r.get("url", "")
                summary_parts.append(f"{i}. **{title}**\n   {snippet}\n   🔗 {url}\n")
            return {
                "reply": "\n".join(summary_parts),
                "search_results": all_search_results,
                "tool_calls": tool_call_log,
            }

        return {
            "reply": "抱歉，搜索过程中遇到问题，请稍后重试。",
            "search_results": [],
            "tool_calls": tool_call_log,
        }

    def build_group_knowledge(self, group_id: int, db) -> str:
        """为群组构建AI知识库 — 归纳项目定位、方案和用户期待"""
        from models import Group
        from models.message import GroupMessage, KnowledgeFile

        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            return ""

        # 收集所有上下文素材
        parts = []

        # 1. 项目概述
        brief = group.project_brief or group.description or group.name
        parts.append(f"【项目名称】{group.name}")
        parts.append(f"【项目概述】{brief}")

        # 2. 知识库文件摘要
        files = db.query(KnowledgeFile).filter(
            KnowledgeFile.group_id == group_id,
        ).order_by(KnowledgeFile.created_at).all()
        if files:
            file_texts = []
            for f in files:
                if f.summary and f.summary.strip():
                    file_texts.append(f"- {f.file_name}：{f.summary[:300]}")
            if file_texts:
                parts.append(f"【上传文件内容摘要】\n" + "\n".join(file_texts))

        # 3. 讨论方案
        proposals = db.query(GroupMessage).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.msg_type == "proposal",
        ).order_by(GroupMessage.created_at).all()
        if proposals:
            prop_texts = [f"- {p.content[:400]}" for p in proposals]
            parts.append(f"【小组讨论方案】\n" + "\n".join(prop_texts))

        # 4. 关键对话（AI理解、用户重要消息）
        key_msgs = db.query(GroupMessage).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.msg_type.in_(["ai", "text"]),
        ).order_by(GroupMessage.created_at.desc()).limit(20).all()
        if key_msgs:
            chat_texts = []
            for m in reversed(key_msgs):
                role = "AI" if m.sender_id is None else "成员"
                chat_texts.append(f"{role}: {m.content[:200]}")
            parts.append(f"【近期讨论记录】\n" + "\n".join(chat_texts))

        raw_context = "\n\n".join(parts)

        # 调用AI归纳
        prompt = f"""请根据以下项目的所有信息，生成一份结构化的项目知识库摘要。

{raw_context}

请严格按以下格式输出（不要加其他内容）：

## 项目定位
用2-3句话概括项目是什么、解决什么问题、面向什么用户群体。

## 核心方案
列出项目的核心功能/模块/方向（3-5点），如有讨论方案则以讨论方案为准。

## 技术/设计要点
从文件和讨论中提取的关键技术栈、设计风格、参考方向等。

## 用户期待
团队想要达成的具体目标和交付物，以及隐含的质量要求。

## 搜索关键词建议
基于以上分析，推荐5-8个最适合搜索参考案例的中文关键词组合，每行一个。"""

        knowledge = ""
        if self._has_real_api:
            try:
                knowledge = self.chat(
                    message=prompt,
                    context="你是项目分析师，请客观归纳项目信息，不要添加无关内容。"
                )
            except Exception as e:
                print(f"[Knowledge] AI build failed: {e}")

        if not knowledge:
            knowledge = f"## 项目定位\n{brief[:300]}\n\n## 搜索关键词建议\n{group.name}"

        # 保存到数据库
        from datetime import datetime
        group.ai_knowledge = knowledge
        group.knowledge_updated_at = datetime.now()
        db.commit()
        print(f"[Knowledge] Built for group {group_id}, {len(knowledge)} chars")
        return knowledge

    def split_task(
        self, task_title: str, task_description: str = "", total_days: Optional[int] = None
    ) -> list[dict]:
        """分解任务为子任务"""
        if self._has_real_api:
            prompt = self._build_split_prompt(task_title, task_description, total_days)
            result = self._call_ai_structured(prompt, is_array=True)
            if result:
                return result
        return self._smart_mock_split(task_title, task_description, total_days)

    def smart_assign(self, task_title: str, members: list[dict]) -> list[dict]:
        """智能分配任务给团队成员"""
        if self._has_real_api:
            prompt = self._build_assign_prompt(task_title, members)
            result = self._call_ai_structured(prompt, is_array=True)
            if result:
                return result
        return self._smart_mock_assign(task_title, members)

    # ─── API 调用层 ───────────────────────────────────────

    def _call_claude(self, message: str, context: str) -> str:
        """调用 Claude API"""
        system_prompt = self._get_system_prompt()
        messages = []
        if context:
            messages.append({"role": "user", "content": context})
            messages.append({"role": "assistant", "content": "好的，我了解了以上背景信息。"})
        messages.append({"role": "user", "content": message})

        try:
            resp = _http_client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.claude_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.CLAUDE_API_MODEL,
                    "max_tokens": 2048,
                    "system": system_prompt,
                    "messages": messages,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
        except Exception as e:
            return f"AI服务暂时不可用（{str(e)[:100]}），请稍后再试"

    def _call_gpt(self, message: str, context: str) -> str:
        """调用 GPT API"""
        system_prompt = self._get_system_prompt()
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "user", "content": context})
            messages.append({"role": "assistant", "content": "好的，我了解了以上背景信息。"})
        messages.append({"role": "user", "content": message})

        try:
            resp = _http_client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.gpt_api_key}",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.GPT_API_MODEL,
                    "messages": messages,
                    "max_tokens": 2048,
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"AI服务暂时不可用（{str(e)[:100]}），请稍后再试"

    def _call_deepseek(self, message: str, context: str) -> str:
        """调用 DeepSeek API (OpenAI 兼容接口)"""
        system_prompt = self._get_system_prompt()
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "user", "content": context})
            messages.append({"role": "assistant", "content": "好的，我了解了以上背景信息。"})
        messages.append({"role": "user", "content": message})

        try:
            resp = _http_client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.deepseek_api_key}",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_API_MODEL,
                    "messages": messages,
                    "max_tokens": 2048,
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"AI服务暂时不可用（{str(e)[:100]}），请稍后再试"

    def _call_ai_structured(self, prompt: str, is_array: bool = False) -> list[dict] | None:
        """调用AI API并鲁棒解析JSON响应"""
        import httpx

        # 收集所有可用的 API keys
        api_configs = []
        if self.claude_api_key:
            api_configs.append(("claude", self.claude_api_key))
        if self.gpt_api_key:
            api_configs.append(("gpt", self.gpt_api_key))
        if self.deepseek_api_key:
            api_configs.append(("deepseek", self.deepseek_api_key))

        for provider_name, api_key in api_configs:
            try:
                if provider_name == "claude":
                    resp = httpx.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json",
                        },
                        json={
                            "model": settings.CLAUDE_API_MODEL,
                            "max_tokens": 2048,
                            "system": "你是一个JSON API。你必须只返回有效的JSON，不要包含任何其他文字或markdown格式。",
                            "messages": [{"role": "user", "content": prompt}],
                        },
                        timeout=60,
                    )
                    resp.raise_for_status()
                    text = resp.json()["content"][0]["text"]

                elif provider_name == "gpt":
                    resp = httpx.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "content-type": "application/json",
                        },
                        json={
                            "model": settings.GPT_API_MODEL,
                            "messages": [
                                {"role": "system", "content": "你是一个JSON API。你必须只返回有效的JSON，不要包含任何其他文字或markdown格式。"},
                                {"role": "user", "content": prompt},
                            ],
                            "max_tokens": 2048,
                            "temperature": 0.7,
                            "response_format": {"type": "json_object"},
                        },
                        timeout=60,
                    )
                    resp.raise_for_status()
                    text = resp.json()["choices"][0]["message"]["content"]

                elif provider_name == "deepseek":
                    resp = httpx.post(
                        "https://api.deepseek.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "content-type": "application/json",
                        },
                        json={
                            "model": settings.DEEPSEEK_API_MODEL,
                            "messages": [
                                {"role": "system", "content": "你是一个JSON API。你必须只返回有效的JSON，不要包含任何其他文字或markdown格式。"},
                                {"role": "user", "content": prompt},
                            ],
                            "max_tokens": 2048,
                            "temperature": 0.7,
                        },
                        timeout=60,
                    )
                    resp.raise_for_status()
                    text = resp.json()["choices"][0]["message"]["content"]

                result = _extract_json(text)
                if result:
                    if is_array and isinstance(result, dict):
                        for v in result.values():
                            if isinstance(v, list):
                                return v
                        return [result]
                    return result if is_array else result
            except Exception:
                continue

        return None

    # ─── Prompt 构建层 ────────────────────────────────────

    def _get_system_prompt(self) -> str:
        return """你是 AI 日程协作者，一个专注于帮助用户管理时间、任务和日程的智能助手。

你的能力：
1. 📋 任务分解 — 将大型任务拆分为可执行的子步骤
2. 📅 日程规划 — 帮用户合理安排时间和优先级
3. 📊 效率分析 — 分析任务完成情况，给出改进建议
4. 💡 学习方法 — 提供番茄工作法、GTD等效率方法建议
5. 👥 团队协作 — 根据成员技能合理分配任务

回复风格：
- 温暖友好，使用适当的 emoji
- 给出具体可操作的建议，而非泛泛而谈
- 使用结构化格式（列表、表格）使信息清晰
- 了解用户的上下文后提供个性化建议"""

    def _get_search_system_prompt(self) -> str:
        return """你是 AI 统筹组长，帮大学生团队搜索**已上线的真实产品、优秀设计案例和竞品**作为参考。

⚠️ 最重要的原则 — 你搜的必须是"案例"，即**真实存在的产品/作品/项目**：
- ✅ 正确："日程管理 APP 推荐"  → 找到 Forest、Timo、Todoist 等真实产品
- ✅ 正确："手绘风 UI设计 Dribbble"  → 找到设计作品
- ❌ 错误："手绘风 是什么"  → 这是词义解释，不是案例
- ❌ 错误："手绘教程"  → 这是教学内容，不是案例

⚠️ 搜索词必须简洁（3-5个核心词）！绝对不要把所有项目特征塞进一个搜索词！
错误示范："手绘风格 AI 日程协作 APP 推荐 案例" — 词太多太杂，搜索引擎会混乱
正确做法：拆成多个短搜索词，每个词只关注一个角度

必须使用 multi_search，按以下 4 个角度各出一个**简短**搜索词：
  · 角度1（同类产品）: "[项目核心类型] APP 推荐"
    例: "日程管理 APP 推荐" 或 "协作工具 APP 推荐"
    注意: 不要加风格词！这里只找产品类型。
  · 角度2（竞品分析）: "[项目类型] 竞品 对比 测评"
    例: "日程管理软件 竞品分析 对比"
  · 角度3（设计参考）: "[风格词] UI设计 Dribbble"
    例: "手绘风 APP UI设计 Dribbble" 或 "卡通风格 界面设计 作品"
    注意: 这里只搜设计风格，不要加产品类型！
  · 角度4（具体产品）: "[已知竞品名] 功能 测评"
    例: "Forest APP 功能测评" 或 "Todoist 使用体验"
    如果不知道竞品名，搜 "[项目类型] 最佳 排行榜"

⚠️ 角度1和角度3绝不能合并！"产品类型"和"视觉风格"是两个独立的搜索维度。

回复要求：
- 只推荐真实产品/作品，忽略教程、词义解释、百科、广告
- 每个案例说明：产品名、核心功能、与本项目的借鉴点
- 最后总结可借鉴的方向"""

    def _build_split_prompt(self, title: str, description: str, total_days: Optional[int]) -> str:
        days_hint = f"，总时长约{total_days}天" if total_days else ""
        return f"""请将以下任务分解为具体的子任务，以JSON数组格式返回。

任务名称：{title}
任务描述：{description}{days_hint}

JSON格式要求：
[
  {{"title": "子任务名称", "estimated_hours": 2.5, "description": "具体执行步骤", "priority": "high"}},
  {{"title": "子任务名称", "estimated_hours": 1.0, "description": "具体执行步骤", "priority": "mid"}}
]

分解原则：
- 每个子任务应该是一个可独立完成的工作单元
- 总共分解为3-5个子任务
- 预估时间应该合理（每个子任务0.5-8小时）
- 优先级：high=必须先做, mid=可以稍后, low=非必须
- 按执行顺序排列"""

    def _build_assign_prompt(self, title: str, members: list[dict]) -> str:
        members_str = "\n".join([
            f"- ID:{m['id']} {m['name']}: 技能={', '.join(m.get('skills', []))}"
            for m in members
        ])
        return f"""请根据团队成员技能，将以下任务分配给最合适的人。

任务：{title}

团队成员及技能：
{members_str}

请以JSON数组格式返回分配方案：
[
  {{"user_id": 1, "username": "成员名", "subtask": "负责的具体部分", "reason": "分配理由"}}
]

分配原则：
- 优先匹配技能标签
- 考虑负载均衡，避免集中给一人
- 为每个人分配与其技能最匹配的部分"""

    # ─── 智能回退层（无API Key时）─────────────────────────

    def _smart_mock_reply(self, message: str, context: str) -> str:
        """智能模拟回复 - 根据用户意图分类响应"""
        msg_lower = message.lower()

        # 任务分解意图
        if any(kw in message for kw in ["分解", "拆分", "子任务", "拆解", "分步骤", "怎么做"]):
            return (
                f"好的！让我帮你分析「{message[:40]}...」\n\n"
                "📋 **建议分解方案：**\n\n"
                "1. 📌 **明确目标与范围** — 确定任务的边界和验收标准\n"
                "2. 📊 **信息收集** — 搜集完成该任务所需的所有资料\n"
                "3. 🔨 **分步执行** — 将核心工作拆为2-3个可执行步骤\n"
                "4. ✅ **检查完善** — 完成后进行自检和优化\n\n"
                "💡 **提示：** 配置 Claude 或 GPT API Key 后，我可以生成更精确的子任务列表。\n"
                "请在 .env 文件中设置 CLAUDE_API_KEY 或 GPT_API_KEY。"
            )

        # 时间规划意图
        if any(kw in message for kw in ["计划", "安排", "规划", "时间表", "日程", "方案"]):
            days = 5
            import re as _re
            m = _re.search(r'(\d+)\s*天', message)
            if m:
                days = int(m.group(1))
            return (
                f"📅 **{days}天执行方案：**\n\n"
                + "\n".join([
                    f"• **Day {i+1}**：{'前期准备与调研' if i==0 else '核心执行' if i<days-1 else '检查与收尾'} — {'收集资料、确定方向' if i==0 else '按计划逐步推进' if i<days-1 else '最终检查、交付成果'}"
                    for i in range(min(days, 7))
                ])
                + "\n\n💡 配置 AI API Key 后可获得更个性化的时间规划。"
            )

        # 效率建议意图
        if any(kw in message for kw in ["效率", "提高", "改进", "优化", "建议", "帮助"]):
            return (
                "🚀 **效率提升建议：**\n\n"
                "1. 🍅 **番茄工作法** — 25分钟专注 + 5分钟休息，4轮后长休\n"
                "2. 📋 **吃青蛙法** — 每天早上先完成最困难的任务\n"
                "3. ⏰ **时间块管理** — 将相似任务归类到同一时间块\n"
                "4. 📊 **二八法则** — 20%的任务产出80%的成果，优先处理\n"
                "5. 🔄 **定期回顾** — 每周末花15分钟回顾和调整计划\n\n"
                "有什么具体问题我可以帮你分析吗？"
            )

        # 默认回复
        return (
            f"你好！我是AI日程助手 👋\n\n"
            f"我可以帮你：\n"
            f"1. 📋 **任务分解** — 说「帮我分解XXX任务」\n"
            f"2. 📅 **制定计划** — 说「帮我做N天的XXX方案」\n"
            f"3. 📊 **进度分析** — 说「分析我的效率」\n"
            f"4. 💡 **效率建议** — 说「怎么提高效率」\n"
            f"5. 🔨 **任务拆解** — 去「AI分解」页面一键拆分\n\n"
            f"💬 试试首页右下角的 ✨ 按钮，输入自然语言快速创建日程！\n\n"
            f"🔧 配置 Claude API Key 可获得更智能的AI体验。"
        )

    def _smart_mock_split(self, title: str, description: str, total_days: Optional[int]) -> list[dict]:
        """智能模拟任务分解 — 根据任务特征生成更有意义的子任务"""
        # 关键词匹配
        task_lower = title.lower() + description.lower()

        if any(kw in task_lower for kw in ["毕业", "论文", "设计", "毕设"]):
            return [
                {"title": "选题与开题报告", "estimated_hours": 8.0, "description": "确定选题方向，撰写开题报告", "priority": "high"},
                {"title": "文献调研与综述", "estimated_hours": 12.0, "description": "查阅相关文献，撰写文献综述", "priority": "high"},
                {"title": "方案设计与技术选型", "estimated_hours": 6.0, "description": "设计系统架构，选择技术方案", "priority": "high"},
                {"title": "核心功能实现", "estimated_hours": total_days * 2 if total_days else 30.0, "description": "按设计方案逐步实现核心功能", "priority": "mid"},
                {"title": "测试与优化", "estimated_hours": 8.0, "description": "全面测试，修复Bug，优化性能", "priority": "mid"},
                {"title": "文档撰写与答辩准备", "estimated_hours": 10.0, "description": "撰写论文/文档，准备答辩PPT", "priority": "high"},
            ]

        if any(kw in task_lower for kw in ["ppt", "汇报", "演示", "演讲", "展示"]):
            return [
                {"title": "内容大纲设计", "estimated_hours": 2.0, "description": "确定汇报的结构和核心要点", "priority": "high"},
                {"title": "资料收集与整理", "estimated_hours": 3.0, "description": "收集数据、图表、案例等素材", "priority": "high"},
                {"title": "幻灯片制作", "estimated_hours": 4.0, "description": "按大纲制作PPT页面", "priority": "mid"},
                {"title": "排练与优化", "estimated_hours": 1.5, "description": "试讲排练，调整内容和时间", "priority": "mid"},
            ]

        if any(kw in task_lower for kw in ["代码", "编程", "开发", "前端", "后端", "react", "vue"]):
            return [
                {"title": "需求分析与技术选型", "estimated_hours": 3.0, "description": "明确功能需求，选择技术栈", "priority": "high"},
                {"title": "项目搭建与配置", "estimated_hours": 2.0, "description": "初始化项目，配置开发环境", "priority": "high"},
                {"title": "核心功能开发", "estimated_hours": total_days * 2 if total_days else 16.0, "description": "实现主要业务逻辑", "priority": "mid"},
                {"title": "测试与调试", "estimated_hours": 4.0, "description": "编写测试用例，修复Bug", "priority": "mid"},
                {"title": "部署上线", "estimated_hours": 2.0, "description": "部署到服务器，验证线上环境", "priority": "low"},
            ]

        # 通用分解
        return [
            {"title": "调研与资料收集", "estimated_hours": 3.0, "description": f"收集「{title}」相关的背景资料和信息", "priority": "high"},
            {"title": "方案设计与规划", "estimated_hours": 2.0, "description": "制定详细的执行方案和时间计划", "priority": "high"},
            {"title": "核心执行", "estimated_hours": total_days * 1.5 if total_days else 5.0, "description": "按照方案逐步执行核心工作", "priority": "mid"},
            {"title": "检查与完善", "estimated_hours": 2.0, "description": "完成后的质量检查和细节完善", "priority": "mid"},
            {"title": "总结归档", "estimated_hours": 1.0, "description": "总结经验，归档相关资料", "priority": "low"},
        ]

    def _smart_mock_assign(self, title: str, members: list[dict]) -> list[dict]:
        """智能模拟分配 — 基于技能关键词匹配"""
        result = []
        remaining = list(members)

        for member in members:
            skills = [s.lower() for s in member.get("skills", [])]
            reason = "综合能力匹配"
            task_lower = title.lower()

            # 技能匹配打分
            if any(s in task_lower for s in skills):
                reason = f"技能标签「{member.get('skills', [])}」与任务高度匹配"

            result.append({
                "user_id": member["id"],
                "username": member["name"],
                "subtask": f"负责「{title}」相关任务",
                "reason": reason,
            })

        return result
