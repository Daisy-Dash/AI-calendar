# AI 统筹组长 — 技术文档

> 版本: 4.4 | 日期: 2026-06-14

---

## 1. 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│        React 18 + Vite 6 + Tailwind CSS          │
│          莫兰迪配色 · 430px 手机壳容器             │
│              localhost:5173                       │
├──────────────── Vite Proxy ─────────────────────┤
│                  /api → :8000                    │
├─────────────────────────────────────────────────┤
│                   Backend                        │
│      FastAPI + SQLAlchemy + JWT + Uvicorn         │
│              localhost:8000                       │
├─────────────────────────────────────────────────┤
│                AI Services                       │
│   DeepSeek Function Calling + DDG/Tavily/Bing 联网搜索│
│   DeepSeek API (主) / Claude / GPT / 本地回退     │
├─────────────────────────────────────────────────┤
│              SQLite + Auto Backup                │
│       启动时自动备份 · 安全列迁移 · 零丢数据       │
└─────────────────────────────────────────────────┘
```

### 1.1 架构特点

- **前后端分离**：前端 SPA 通过 Vite Proxy 转发 API 请求
- **AI 多 Provider**：DeepSeek / Claude / GPT 可插拔，无 Key 时本地回退
- **数据安全**：SQLite 启动备份 + 安全列迁移
- **JWT 认证**：无状态 Token，7 天有效期
- **三层任务结构**：项目 → 大任务 → 提交节点（通过 `parent_id` 实现）

---

## 2. 技术栈

### 2.1 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.10+ | 后端运行时 |
| FastAPI | 0.100+ | Web 框架 |
| SQLAlchemy | 2.0 | ORM |
| python-jose | - | JWT |
| passlib[bcrypt] | - | 密码哈希 |
| Uvicorn | - | ASGI 服务器 |
| httpx | - | AI API 请求 |
| PyPDF2 | - | PDF 提取 |
| python-docx | - | Word 提取 |
| python-pptx | - | PPT 提取 |
| pydantic | v2 | 数据验证 |
| python-dotenv | - | 环境变量 |
| httpx + DDG HTML | - | DuckDuckGo HTML 搜索（主力，中文效果最佳） |
| httpx + Tavily API | - | Tavily 搜索 API（备用，质量高，有配额限制） |
| httpx + Bing | - | Bing 搜索 HTML 解析（末选兜底） |

### 2.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI |
| Vite | 6.4 | 构建 + HMR + Proxy |
| Tailwind CSS | 3.4 | 原子化样式 |
| React Router | 6.28 | 路由 |
| Axios | - | HTTP（按端点 timeout） |

### 2.3 数据存储

| 方案 | 用途 |
|------|------|
| SQLite | 后端主数据库 |
| localStorage | JWT Token + 折叠展开偏好 + AI 会话历史 |

### 2.4 AI 服务

| Provider | 说明 |
|----------|------|
| DeepSeek | 主力 — OpenAI 兼容接口，支持 Function Calling |
| DuckDuckGo | 联网搜索主引擎 — HTML 直接解析，中文搜索效果最佳 |
| Tavily | 联网搜索备用 — REST API，搜索质量高，有 API 配额限制 |
| Bing | 联网搜索末选 — HTML 解析 + Base64 URL 解码，中文分词效果差 |
| Claude | 可选 |
| GPT | 可选 |
| 本地回退 | 无 Key 时关键词匹配 + 模板 |

---

## 3. 数据模型

### 3.1 数据库表结构

```
users              — 用户（含技能名片）
tasks              — 任务（含 parent_id 实现父任务+子节点）
schedules          — 日程
groups             — 群组（含 status 状态机）
group_members      — 群组成员
group_invitations  — 群邀请
group_messages     — 群聊消息（含 task_card / proposal / file 类型）
private_messages   — 私聊消息（含 related_group_id）
notifications      — 通知
friendships        — 好友
knowledge_files    — 知识库文件
```

### 3.2 核心模型

```python
# 用户
class User:
    id: int
    username: str
    email: str (unique)
    password_hash: str
    avatar: str
    bio: str
    major: list
    skills: list
    tools: list
    preferences: dict
    is_active: bool
    created_at: datetime

# 任务（三层结构）
class Task:
    id: int
    user_id: int          # 创建者
    group_id: int?        # 所属群组
    parent_id: int?       # ⭐ 父任务（实现项目→大任务→节点）
    title: str
    description: str      # 节点级别用作"要提交什么"
    deadline: datetime?
    start_time: datetime?
    end_time: datetime?
    priority: int         # 1低 2中 3高 4紧急
    status: str           # 待办/进行中/已完成/待确认/已打回
    progress: int         # 0-100，凭证上传后 AI 评估自动更新
    estimated_hours: float?
    tags: list
    assigned_to: int?     # AI 分配给谁
    is_subtask: bool      # 是否为子节点
    sort_order: int
    created_at: datetime
    updated_at: datetime

# 群组（6 阶段状态机）
class Group:
    id: int
    name: str
    description: str
    created_by: int       # owner
    invite_code: str
    status: str           # gathering/discussing/confirming/in_progress/completed
    project_brief: str
    search_results: list  # ⭐ v4.3 AI 搜索案例后端持久化，全组共享
    created_at: datetime

# 群聊消息（多类型）
class GroupMessage:
    id: int
    group_id: int
    sender_id: int?       # None = AI
    content: str
    msg_type: str         # text/ai/file/task_card/proposal
    file_url: str?
    file_name: str?
    metadata_: dict?      # 任务卡/方案/文件凭证的结构化数据
    created_at: datetime
```

### 3.3 状态流转

```
群组 6 阶段：
  gathering    召集中（群主邀请成员）
     ↓ start-workflow
  discussing   讨论中（AI 解释 + 搜案例，等待方案）
     ↓ submit-proposal
  confirming   待确认（AI 拆任务 + 分配，等待确认）
     ↓ 所有人 confirm-task accept
  in_progress  执行中（凭证上传 + 进度追踪）
     ↓
  completed    已完成

任务状态：
  待确认 → 待办（接受时 AI 自动 break_down 子节点）→ 进行中 → 已完成
   ↓ reject
  已打回（等待重新分配）

任务进度：
  0% → 凭证上传 → AI 评估 → 自动递增 → 100% 标为已完成
```

---

## 4. 文件结构

```
ai calendar/
├── backend/
│   ├── main.py                  # 应用入口
│   ├── config.py
│   ├── database.py
│   ├── auth.py                  # JWT
│   ├── safe_migrate.py
│   ├── db_backup.py
│   ├── requirements.txt
│   ├── .env                     # 不提交
│   │
│   ├── models/                  # 全部 SQLAlchemy 模型
│   ├── routers/                 # 11 个路由模块
│   ├── services/                # AI / 搜索 / 拆分 / 推送
│   ├── schemas/                 # 全部 Pydantic Schema
│   └── backups/                 # 自动备份
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js           # proxy /api
│   ├── tailwind.config.js       # 莫兰迪
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # 路由（含 /task-chat/:taskId）
│       ├── index.css            # 蒙层 max-w 540
│       │
│       ├── components/
│       │   ├── NavBar.jsx
│       │   └── InvitationPopup.jsx
│       │
│       ├── contexts/
│       │   └── AuthContext.jsx
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ProjectListPage.jsx     # 首页（折叠任务 + DDL 升序）
│       │   ├── FriendsPage.jsx
│       │   ├── AIChatPage.jsx
│       │   ├── CreateGroupPage.jsx
│       │   ├── GroupChatPage.jsx       # 6 阶段工作流 + ⋯ 下拉菜单 + 5 面板带 ✕
│       │   ├── TaskChatPage.jsx        # ⭐ 任务专属 AI 聊天
│       │   ├── KanbanPage.jsx          # ⭐ v4.1 重写 — 项目综述+方案+总进度+任务分工
│       │   ├── TaskDetailPage.jsx
│       │   ├── SkillProfilePage.jsx
│       │   ├── StatsPage.jsx
│       │   ├── DiscussionPage.jsx
│       │   ├── AuthorizePage.jsx
│       │   └── GroupManagePage.jsx
│       │
│       └── utils/
│           ├── api.js              # taskAPI/groupAPI 等
│           ├── store.js
│           └── mockAI.js
│
├── PRD.md
├── design.md
├── tech.md                          # 本文件
└── README.md
```

---

## 5. API 架构

### 5.1 API 概览（50+ 端点）

| 模块 | 端点数 | 前缀 |
|------|:---:|------|
| 认证 | 2 | /api/auth |
| 用户 | 7 | /api/users |
| 任务 | 10 | /api/tasks（新增 chat/upload-proof/split） |
| AI | 5 | /api/ai |
| 群组 | 14 | /api/groups（新增 submit-proposal/ask-ai/search-results） |
| 好友 | 5 | /api/friends |
| 消息 | 5 | /api/messages |
| 上传 | 2 | /api/upload |
| 日程 | 5 | /api/schedule |
| 通知 | 4 | /api/notifications |

### 5.2 任务相关核心 API

```
GET    /api/tasks                          列表（支持 group_id 过滤）
POST   /api/tasks                          创建
GET    /api/tasks/{id}                     详情
PUT    /api/tasks/{id}                     更新
DELETE /api/tasks/{id}                     删除
PUT    /api/tasks/{id}/progress            更新进度
POST   /api/tasks/{id}/chat                ⭐ 任务专属 AI 聊天（含 use_search）
POST   /api/tasks/{id}/upload-proof        ⭐ 上传凭证 + AI 评估 + 同步群聊
POST   /api/tasks/{id}/split               ⭐ AI 拆分子节点
GET    /api/tasks/export/csv               导出 CSV
```

### 5.3 群组工作流核心 API

```
POST   /api/groups                                创建群组
POST   /api/groups/invite-by-email                按邮箱邀请
POST   /api/groups/respond                        通过邀请码加入
POST   /api/groups/{id}/start-workflow            ⭐ AI 解释 + 搜案例（不分任务）
POST   /api/groups/{id}/submit-proposal           ⭐ 组员方案 → AI 拆任务 + 分配
POST   /api/groups/{id}/tasks/{tid}/confirm       ⭐ 确认/打回（accept 时自动 break_down）
GET    /api/groups/{id}/pending-tasks             我的待确认任务
POST   /api/groups/{id}/knowledge/{fid}/ask-ai    ⭐ 文件使用建议
GET    /api/groups/{id}/stats                     团队统计
GET    /api/groups/{id}/search-results            ⭐ 获取搜索案例（后端持久化）
PUT    /api/groups/{id}/search-results            ⭐ 保存搜索案例（全组共享）
```

### 5.4 认证方式

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 6. 关键技术实现

### 6.1 6 阶段工作流（重点）

```python
# Phase 1: start_workflow（gathering → discussing）
#   只做 AI 项目理解 + 联网搜案例，不创建任务
def start_workflow(group_id, data):
    ai_understanding = ai.chat("帮小组梳理项目...")  # 3 段输出
    group.status = "discussing"
    GroupMessage(content=ai_understanding, msg_type="ai")
    # 前端再调 search-chat 拿案例

# Phase 2: submit_proposal（discussing → confirming）
#   组员讨论方案 → AI 拆任务 + 按技能分配 + 设节点
def submit_proposal(group_id, data):
    GroupMessage(content=proposal, msg_type="proposal")
    delete_old_pending_tasks()
    tasks_data = _ai_decompose_tasks(proposal, members)
    for t in tasks_data:
        Task(status="待确认", assigned_to=t.member_id, ...)
    group.status = "confirming"
    GroupMessage(msg_type="task_card", metadata_={"from_proposal": True})

# Phase 3: confirm_task（confirming → in_progress）
#   接受时立即 AI break_down 子节点
def confirm_task(task_id, accept):
    if accept:
        task.status = "待处理"
        nodes = _ai_break_down_to_nodes(task)  # 3-5 个节点
        # 每个节点：title / submit_what / 渐进 DDL
    if all_confirmed:
        group.status = "in_progress"
```

### 6.2 任务专属 AI 聊天（TaskChatPage）

```python
# POST /api/tasks/{id}/chat
# 自动带任务上下文（标题/描述/状态/进度/DDL/子节点/所属群组）
def task_chat(task_id, data):
    context = build_task_context(task)
    if use_search:
        return ai.chat_with_search(message, context)
    return ai.chat(message, context)

# POST /api/tasks/{id}/upload-proof
# AI 评估进度 + 同步到群聊
def upload_task_proof(task_id, file):
    extracted_text = extract_from_file(file)
    eval_prompt = "请评估完成度(0-100)，第一行写数字"
    reply = ai.chat(eval_prompt, context_with_text)
    new_progress = parse_progress(reply)
    task.progress = new_progress

    # ⭐ 同步到群聊：凭证文件 + AI 进度通知
    GroupMessage(msg_type="file", file_url=..., metadata_={"type": "proof"})
    GroupMessage(msg_type="ai", content=f"📈 进度更新：{old}% → {new}%")
```

### 6.3 AI Function Calling 联网搜索（DDG + Tavily + Bing 三引擎）

```python
# services/web_search.py — v4.4 三引擎：DDG 优先 → Tavily 备用 → Bing 末选
# DDG 中文搜索效果最佳，Tavily API 质量高但有配额，Bing 中文分词差仅兜底

def _search_ddg_html(query, max_results=5):
    """DuckDuckGo HTML 搜索（主力）— 直接解析 html.duckduckgo.com"""
    r = httpx.get("https://html.duckduckgo.com/html/",
                  params={"q": query, "kl": "cn-zh"})
    # 从 div.result 提取标题+URL+摘要，解码 uddg= 跳转链接

def _search_tavily(query, max_results=5):
    """Tavily API 搜索（备用）— REST API，质量高"""
    r = httpx.post("https://api.tavily.com/search",
                   json={"api_key": key, "query": query, ...})

def _search_bing(query, max_results=5):
    """Bing HTML 抓取（末选）— Base64 URL 解码"""

def search_web(query, max_results=5):
    """DDG → Tavily → Bing 三级降级，每级过滤后无结果才降级"""

# 搜索结果质量保障
_JUNK_PATTERNS = re.compile(r"教程|百科|新闻|考试|...")  # 20+ 垃圾模式
_GOOD_DOMAINS = re.compile(r"dribbble|behance|woshipm|...")  # 优质域名加分
_GOOD_TITLE_SIGNALS = re.compile(r"APP|推荐|竞品|...")  # 标题信号加分

def _score_result(r, query):
    """评分：垃圾模式-100，无关键词命中-50，好域名+30，好标题+20"""

def _filter_results(results, query):
    """过滤 score<-20 的垃圾，按分数降序排列"""

SEARCH_TOOLS = [
    {"type": "function", "function": {"name": "web_search", ...}},
    {"type": "function", "function": {"name": "multi_search", ...}}
]

# services/ai_service.py — Function Calling 循环 + 4角度搜索策略
# AI 系统提示要求按4角度拆分搜索词：
#   角度1: 同类产品（"[类型] APP 推荐"）
#   角度2: 竞品分析（"[类型] 竞品 对比 测评"）
#   角度3: 设计参考（"[风格词] UI设计 Dribbble"）
#   角度4: 具体产品（"[已知竞品名] 功能 测评"）

def chat_with_search(message, context):
    for round_idx in range(3):
        resp = call_api(messages, tools=SEARCH_TOOLS)
        if no_tool_calls: return {"reply": resp, "search_results": all_results}
        for tool_call in resp.tool_calls:
            result = execute_tool(tool_call)
            # 跨查询 URL 去重
            for item in result:
                if item["url"] not in seen_urls:
                    all_results.append(item)

# 返回字段：title / url / snippet（前端 cards 用）
```

### 6.4 任务节点自动拆分

```python
# 接受任务后自动调用
def _ai_break_down_to_nodes(task, db):
    if existing_subs: return existing_subs  # 幂等

    prompt = f"""
    把任务「{task.title}」拆 3-5 个递进节点。
    返回 JSON [{{"title": "...", "submit_what": "...", "days": N}}]
    """
    nodes_data = ai.chat(prompt) or _default_split()

    # 按 days 占比从父 DDL 倒推每个节点 DDL
    parent_dl = task.deadline
    total_days = sum(n["days"] for n in nodes_data)
    accumulated = 0
    for n in nodes_data:
        accumulated += n["days"]
        offset = total_days - accumulated
        node_dl = parent_dl - timedelta(days=offset)
        Task(parent_id=task.id, deadline=node_dl,
             description=n["submit_what"], is_subtask=True, ...)
```

### 6.5 凭证上传同步群聊

```python
# 上传凭证后 task.group_id 不为空 → 自动写两条群聊消息
if task.group_id:
    GroupMessage(
        msg_type="file", file_url=file_url,
        content=f"📎 为任务「{title}」上传了凭证：{filename}",
        metadata_={"type": "proof", "task_id": task.id}
    )
    GroupMessage(
        msg_type="ai", sender_id=None,
        content=f"📈 {user} 完成节点，进度 {old}% → {new}%\n{ai_feedback}",
        metadata_={"type": "task_progress", "new_progress": new}
    )
```

### 6.6 前端按端点超时

```js
// utils/api.js
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data, { timeout: 60000 }),
  searchChat: (data) => api.post('/ai/search-chat', data, { timeout: 120000 }),
}
export const taskAPI = {
  taskChat: (id, data) => api.post(`/tasks/${id}/chat`, data, { timeout: 120000 }),
  uploadProof: (id, file) => {...},  // 60s
  splitTask: (id, data) => api.post(`/tasks/${id}/split`, data, { timeout: 60000 }),
}
export const groupAPI = {
  startWorkflow: (id, data) => api.post(`/groups/${id}/start-workflow`, data, { timeout: 120000 }),
  submitProposal: (id, data) => api.post(`/groups/${id}/submit-proposal`, data, { timeout: 120000 }),
  askAIAboutFile: (id, fid, data) => api.post(`/groups/${id}/knowledge/${fid}/ask-ai`, data, { timeout: 60000 }),
}
```

### 6.7 折叠展开 + 持久化

```jsx
// ProjectListPage.jsx
const [expandedGroups, setExpandedGroups] = useState(() => {
  try { return JSON.parse(localStorage.getItem('expanded_groups') || '{}') } catch { return {} }
})

const toggleGroupExpanded = (groupId) => {
  setExpandedGroups(prev => {
    const next = { ...prev, [groupId]: !prev[groupId] }
    localStorage.setItem('expanded_groups', JSON.stringify(next))
    return next
  })
}

// 默认逻辑：任务 ≤ 2 默认展开，> 2 默认折叠
const expanded = expandedGroups[g.id] ?? (personalTasks.length <= 2)
```

### 6.8 案例搜索结果持久化（后端 DB）

```python
# models/group.py — Group 模型新增字段
search_results = Column(JSON, default=list)  # AI 搜索案例，全组共享

# routers/groups.py — 两个新端点
GET  /api/groups/{id}/search-results   → 读取
PUT  /api/groups/{id}/search-results   → 更新（body: {results: [...]})
```

```jsx
// GroupChatPage.jsx — v4.3 改为后端持久化
useEffect(() => {
  const loadSearchResults = async () => {
    const res = await groupAPI.getSearchResults(groupId)
    if (res.data?.results?.length) setSearchResults(res.data.results)
  }
  loadSearchResults()
}, [groupId])

// 搜索完成后调用
await groupAPI.saveSearchResults(groupId, newResults)
```

### 6.9 蒙层 + 浮窗 CSS

```css
/* index.css — 蒙层不限制 viewport 一半，浮窗可达 500px */
.app-container .fixed.inset-0 {
  max-width: 540px;
  width: 100%;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}
```

```jsx
// 所有弹窗统一蒙层 + 浮窗规格
<div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent">
  <div className="bg-white rounded-3xl w-full max-w-[500px] max-h-[88vh] shadow-2xl">
    {/* content */}
  </div>
</div>
```

### 6.10 安全列迁移

```python
# safe_migrate.py — 启动时自动运行
MIGRATIONS = [
    ("users", "major", "JSON", "'[]'"),
    ("users", "skills", "JSON", "'[]'"),
    ("tasks", "group_id", "INTEGER", "NULL"),
    ("tasks", "assigned_to", "INTEGER", "NULL"),
    ("tasks", "parent_id", "INTEGER", "NULL"),
    ("tasks", "is_subtask", "BOOLEAN", "0"),
    ("groups", "status", "VARCHAR(20)", "'gathering'"),
    ("groups", "project_brief", "TEXT", "''"),
    ("groups", "search_results", "JSON", "'[]'"),      # v4.3 搜索案例后端持久化
    ("group_messages", "msg_type", "VARCHAR(20)", "'text'"),
    ("group_messages", "metadata_", "JSON", "'{}'"),
    # 新增字段只需加一行
]
```

---

## 7. 开发环境

### 7.1 启动后端

```bash
cd backend
pip install -r requirements.txt
# 配置 .env
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 7.2 启动前端

```bash
cd frontend
npm install
npm run dev    # → http://localhost:5173
```

### 7.3 构建

```bash
cd frontend
npm run build
npm run preview
```

---

## 8. 关键设计决策

### 8.1 为什么把项目理解 + 搜案例 与 任务分配 拆成两阶段？
小组讨论是关键环节。AI 直接拆任务会让组员失去主动权。先让 AI 提供方向 + 案例 → 组员讨论 → 提交方案 → AI 据方案拆任务，符合真实团队协作的"人主导 + AI 辅助"模式。

### 8.2 为什么用 parent_id 而不是独立的"节点"表？
任务和节点本质都是有 DDL 的工作单元，区别只在层级。统一表 + parent_id 让 query / 状态机 / 进度评估都可复用同一套逻辑。

### 8.3 为什么凭证上传要同步群聊？
团队需要透明的进度。个人在 TaskChatPage 上传凭证 → 群聊自动看见"XX 完成了节点 N，进度 X% → Y%"，避免群成员脱节。

### 8.4 为什么用 Vite Proxy 而不是 CORS？
开发环境前后端同源，避免跨域；生产部署 Nginx 反代同效；前端 API 调用都是相对路径 `/api/...`。

### 8.5 为什么用 safe_migrate 而不是 Alembic？
项目快速迭代，避免生成大量迁移文件。新增字段加一行配置，启动时自动检测并补缺失列，零丢数据。

### 8.6 为什么浮窗蒙层用 bg-transparent 而不是黑底？
莫兰迪风格强调温暖低对比。黑底+模糊在该色系下显得突兀。完全透明蒙层 + 浮窗自身 shadow-2xl 提供视觉层级，更符合整体调性。

### 8.7 为什么搜索引擎改用 DDG 优先而不是 Bing？
Bing 的服务端 HTML 抓取对中文分词效果极差——搜索"小组协作 APP 推荐"返回 YouTube 帮助页，搜索"团队任务管理"返回"团队_百度百科"。DuckDuckGo HTML 接口（`html.duckduckgo.com/html/`）对中文搜索效果远优于 Bing，且返回结构稳定易解析。Tavily API 作为备用兼顾质量与配额控制。

### 8.8 为什么搜索要过滤和评分而不是直接返回？
搜索引擎对"手绘风"这类关键词会返回"手绘教程"、"百度百科"等释义内容，不是用户需要的真实产品案例。通过垃圾模式匹配（-100分）、关键词相关性检查（-50分）、好域名加分（+30）、标题信号加分（+20）的评分体系，确保只返回真实案例，零教程零百科。

### 8.9 为什么 AI 搜索要按4个角度拆分搜索词？
把所有项目特征塞进一个搜索词（如"手绘风格 AI 日程协作 APP 推荐 案例"）会导致搜索引擎混乱。拆成4个短搜索词（同类产品/竞品分析/设计参考/具体产品），每个只关注一个维度，搜索精度大幅提升。
