"""网络搜索服务 - Bing + DuckDuckGo 双引擎"""
import base64
import html as html_lib
import json
import re
from typing import Optional
from urllib.parse import quote_plus, unquote

import httpx


def _decode_bing_url(href: str) -> str:
    """从 Bing 跳转链接中解码出真实 URL"""
    m = re.search(r'u=a1([^&"]+)', href)
    if m:
        try:
            encoded = m.group(1)
            padding = 4 - len(encoded) % 4
            if padding != 4:
                encoded += "=" * padding
            return base64.b64decode(encoded).decode("utf-8")
        except Exception:
            pass
    return unquote(href)


def _search_bing(query: str, max_results: int = 5) -> list[dict]:
    """通过 Bing 搜索（国内可直接访问）"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    with httpx.Client(follow_redirects=True, timeout=15, headers=headers) as c:
        r = c.get(
            "https://www.bing.com/search",
            params={"q": query, "count": str(max_results), "setlang": "zh-CN", "cc": "CN"},
        )
        text = r.text

    results = []
    blocks = re.findall(r'<li class="b_algo"[^>]*>(.*?)</li>', text, re.DOTALL)

    for b in blocks[:max_results]:
        # Title from <h2> (skip the site-label <a> that Bing prepends)
        h2_m = re.search(r'<h2[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', b, re.DOTALL)
        if not h2_m:
            continue
        raw_url = h2_m.group(1)
        title_raw = h2_m.group(2)

        snippet_m = re.search(r'<p[^>]*>(.*?)</p>', b, re.DOTALL)

        url_val = _decode_bing_url(raw_url)
        title_val = html_lib.unescape(re.sub(r'<[^>]+>', '', title_raw).strip())
        snippet_val = re.sub(r'<[^>]+>', '', snippet_m.group(1)).strip() if snippet_m else ""
        snippet_val = html_lib.unescape(snippet_val)

        if url_val and title_val:
            results.append({
                "title": title_val,
                "url": url_val,
                "snippet": snippet_val,
            })

    return results


def _search_ddg(query: str, max_results: int = 5, region: str = "cn-zh") -> list[dict]:
    """DuckDuckGo 搜索（备用，国内可能不可用）"""
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


def search_web(query: str, max_results: int = 5, region: str = "cn-zh") -> list[dict]:
    """执行网络搜索，优先 Bing，失败则 DuckDuckGo"""
    # Bing 优先（国内稳定）
    try:
        results = _search_bing(query, max_results)
        if results:
            print(f"[WebSearch] Bing 返回 {len(results)} 条结果")
            return results
    except Exception as e:
        print(f"[WebSearch] Bing 搜索失败: {e}")

    # DuckDuckGo 备用
    try:
        results = _search_ddg(query, max_results, region)
        if results:
            print(f"[WebSearch] DuckDuckGo 返回 {len(results)} 条结果")
            return results
    except Exception as e:
        print(f"[WebSearch] DuckDuckGo 搜索失败: {e}")

    print(f"[WebSearch] 所有搜索引擎均无结果: {query}")
    return []


def search_news(query: str, max_results: int = 5) -> list[dict]:
    """搜索新闻（Bing News 优先）"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        with httpx.Client(follow_redirects=True, timeout=15, headers=headers) as c:
            r = c.get(
                "https://www.bing.com/news/search",
                params={"q": query, "count": str(max_results), "setlang": "zh-CN", "cc": "CN"},
            )
            text = r.text

        results = []
        cards = re.findall(r'<div class="news-card[^"]*"[^>]*>(.*?)</div>\s*</div>', text, re.DOTALL)
        for card in cards[:max_results]:
            href_m = re.search(r'<a[^>]+href="([^"]+)"', card)
            title_m = re.search(r'title="([^"]+)"', card)
            snippet_m = re.search(r'<div class="snippet"[^>]*>(.*?)</div>', card, re.DOTALL)
            source_m = re.search(r'<span[^>]*data-author="([^"]*)"', card)

            if href_m and title_m:
                results.append({
                    "title": title_m.group(1),
                    "url": href_m.group(1),
                    "snippet": re.sub(r'<[^>]+>', '', snippet_m.group(1)).strip() if snippet_m else "",
                    "source": source_m.group(1) if source_m else "",
                })
        if results:
            return results
    except Exception as e:
        print(f"[WebSearch] Bing 新闻搜索失败: {e}")

    # DuckDuckGo 新闻备用
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
        print(f"[WebSearch] DuckDuckGo 新闻搜索失败: {e}")

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
