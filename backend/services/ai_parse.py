"""AI 自然语言解析服务 — 从用户消息中提取任务/日程信息"""
from services.ai_service import AIService, _extract_json


def parse_user_message(text: str, deep: bool = False) -> dict:
    """
    解析用户输入的自然语言消息。

    Args:
        text: 用户输入（可以是任务描述、聊天记录片段等）
        deep: 是否深度分析（提取多个任务、子步骤、画像标签）

    Returns:
        {
            "tasks": [{"title": "", "deadline": "", "start_time": "", "end_time": "",
                        "description": "", "priority": 3, "tags": [], "subtasks": []}],
            "summary": "分析摘要",
            "skill_tags": ["标签1", "标签2"]
        }
    """
    ai = AIService()

    if not ai._has_real_api:
        return _local_fallback(text)

    if deep:
        prompt = f"""你是一个智能任务分析助手。请分析用户的消息，提取其中提到的所有任务和活动。

用户消息：
{text}

请以JSON格式返回（只返回JSON，不要其他文字）：
{{
  "tasks": [
    {{
      "title": "任务标题（简洁明确）",
      "deadline": "YYYY-MM-DD格式的截止日期，如果没有则填null",
      "start_time": "HH:MM格式的开始时间，没有则null",
      "end_time": "HH:MM格式的结束时间，没有则null",
      "description": "任务细节和上下文",
      "priority": 1-4的优先级（1低2中3高4紧急）,
      "estimated_hours": 预估小时数,
      "tags": ["相关标签"],
      "subtasks": ["子步骤1", "子步骤2"]
    }}
  ],
  "summary": "用一句话总结用户的主要工作",
  "skill_tags": ["用户提到的技能标签，如Python/设计/写作等"]
}}

提取规则：
- 每条提到的事情都看作一个任务
- 从消息中提取所有时间线索（明天、下周、具体日期等）
- 判断任务的紧急程度
- 识别用户涉及的技能领域"""
    else:
        prompt = f"""分析这条消息，提取任务信息。只返回JSON：

{text}

返回格式：
{{"title":"任务标题","deadline":"YYYY-MM-DD或null","start_time":"HH:MM或null","end_time":"HH:MM或null","description":"细节","priority":1-4,"tags":[],"subtasks":[],"summary":""}}"""

    try:
        reply = ai.chat(prompt)
        result = _extract_json(reply)
        if result:
            # 确保 tasks 字段是列表
            if "tasks" not in result:
                # 浅层解析：单个任务 — 复制一份避免循环引用
                if result.get("title"):
                    task_item = {k: v for k, v in result.items() if k not in ("summary", "skill_tags")}
                    result["tasks"] = [task_item]
                else:
                    result["tasks"] = []
            if "summary" not in result:
                result["summary"] = text[:100]
            if "skill_tags" not in result:
                result["skill_tags"] = []
            return result
    except Exception:
        pass

    return _local_fallback(text)


def _local_fallback(text: str) -> dict:
    """本地回退 — 从 schedule router 的 _local_parse 逻辑简化而来"""
    import re
    from datetime import date, timedelta

    today = date.today()
    day_map = {"今天": 0, "明天": 1, "后天": 2, "昨天": -1}
    target_date = today

    for key, offset in day_map.items():
        if key in text:
            target_date = today + timedelta(days=offset)
            break

    m = re.search(r"(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]", text)
    if m:
        target_date = date(today.year, int(m.group(1)), int(m.group(2)))

    m = re.search(r"(下午|晚上)\s*(\d{1,2})\s*点", text)
    start_time = f"{int(m.group(2))+12:02d}:00" if m else ""

    # 清理标题
    title = text
    for key in day_map: title = title.replace(key, "")
    title = re.sub(r"\d{1,2}[：:]\d{2}", "", title)
    title = re.sub(r"\d{1,2}\s*点", "", title)
    title = re.sub(r"\d{1,2}\s*月\s*\d{1,2}\s*[日号]", "", title)
    title = title.strip().rstrip("，。,.， ")
    if not title: title = text[:30]

    return {
        "tasks": [{"title": title, "deadline": target_date.strftime("%Y-%m-%d"),
                    "start_time": start_time, "end_time": "", "description": text,
                    "priority": 2, "estimated_hours": None, "tags": [], "subtasks": []}],
        "summary": title,
        "skill_tags": [],
    }
