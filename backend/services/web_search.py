"""网络搜索服务 - 使用 DuckDuckGo 免费搜索"""
import json
from typing import Optional


def search_web(query: str, max_results: int = 5, region: str = "cn-zh") -> list[dict]:
    """
    执行网络搜索，返回结果列表

    Args:
        query: 搜索关键词
        max_results: 最大结果数
        region: 搜索区域 (cn-zh 中文)

    Returns:
        [{"title": "...", "url": "...", "snippet": "..."}]
    """
    try:
        # 优先使用新版 ddgs，向后兼容旧版
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS(proxy=None) as ddgs:
            results = []
            for r in ddgs.text(query, region=region, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", r.get("link", "")),
                    "snippet": r.get("body", r.get("snippet", "")),
                })
            return results
    except Exception as e:
        print(f"[WebSearch] 搜索失败: {e}")
        return []


def search_news(query: str, max_results: int = 5) -> list[dict]:
    """搜索新闻"""
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS(proxy=None) as ddgs:
            results = []
            for r in ddgs.news(query, region="cn-zh", max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("url", ""),
                    "snippet": r.get("body", ""),
                    "source": r.get("source", ""),
                    "date": r.get("date", ""),
                })
            return results
    except Exception as e:
        print(f"[WebSearch] 新闻搜索失败: {e}")
        return []


# DeepSeek Function Calling 工具定义
SEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "搜索互联网获取最新信息。当用户询问竞品分析、市场调研、最新资讯、具体产品信息等需要实时数据的问题时使用此工具。",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "搜索关键词，尽量具体精确。例如：'2024年最佳日程管理APP推荐' 而非 '日程APP'"
                    },
                    "search_type": {
                        "type": "string",
                        "enum": ["general", "news"],
                        "description": "搜索类型：general=通用搜索，news=新闻搜索"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "multi_search",
            "description": "执行多次搜索以获取全面信息。当需要从多个角度了解一个话题时使用（如竞品分析需要搜索多个竞品）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "多个搜索关键词列表，每个会独立搜索"
                    }
                },
                "required": ["queries"]
            }
        }
    }
]


def execute_tool_call(tool_name: str, arguments: dict) -> str:
    """执行工具调用并返回结果字符串"""
    if tool_name == "web_search":
        query = arguments.get("query", "")
        search_type = arguments.get("search_type", "general")

        if search_type == "news":
            results = search_news(query, max_results=5)
        else:
            results = search_web(query, max_results=5)

        if not results:
            return json.dumps({"error": "搜索无结果，请尝试换个关键词"}, ensure_ascii=False)

        return json.dumps(results, ensure_ascii=False)

    elif tool_name == "multi_search":
        queries = arguments.get("queries", [])
        all_results = {}
        for q in queries[:4]:  # 最多4个搜索
            results = search_web(q, max_results=3)
            all_results[q] = results

        return json.dumps(all_results, ensure_ascii=False)

    return json.dumps({"error": f"未知工具: {tool_name}"}, ensure_ascii=False)
