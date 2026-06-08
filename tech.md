# AI 统筹组长 — 技术文档

> 版本: 3.0 | 日期: 2026-06-08

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
│   DeepSeek API (主) / Claude / GPT / 本地回退     │
├─────────────────────────────────────────────────┤
│              SQLite + Auto Backup                │
│       启动时自动备份 · 安全列迁移 · 零丢数据       │
└─────────────────────────────────────────────────┘
```

### 1.1 架构特点

- **前后端分离**: 前端 SPA 通过 Vite Proxy 转发 API 请求到后端
- **AI 多 Provider**: 支持 DeepSeek/Claude/GPT 可插拔切换，无 Key 时本地回退
- **数据安全**: SQLite 启动时自动备份 + 安全列迁移（自动检测并添加缺失列）
- **JWT 认证**: 无状态 Token 认证，7天有效期

---

## 2. 技术栈

### 2.1 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.10+ | 后端运行时 |
| FastAPI | 0.100+ | Web 框架 |
| SQLAlchemy | 2.0 | ORM |
| python-jose | - | JWT Token 生成/验证 |
| passlib[bcrypt] | - | 密码哈希 |
| Uvicorn | - | ASGI 服务器 |
| httpx | - | AI API 请求 |
| PyPDF2 | - | PDF 文本提取 |
| python-docx | - | Word 文本提取 |
| python-pptx | - | PPT 文本提取 |
| pydantic | v2 | 数据验证（Schema） |
| python-dotenv | - | 环境变量管理 |

### 2.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| Vite | 6.4 | 构建工具 + HMR + Proxy |
| Tailwind CSS | 3.4 | 原子化样式 |
| React Router | 6.28 | 前端路由（14条） |
| Axios | - | HTTP 请求 |

### 2.3 数据存储

| 方案 | 用途 |
|------|------|
| SQLite | 后端主数据库（用户/任务/群组/消息等） |
| localStorage | 前端 JWT Token + 用户缓存 |

### 2.4 AI 服务

| Provider | 说明 |
|----------|------|
| DeepSeek | 主力 — 通过 OpenAI 兼容接口调用 |
| Claude | 可选 — Anthropic API |
| GPT | 可选 — OpenAI API |
| 本地回退 | 无 API Key 时使用关键词匹配引擎 |

---

## 3. 数据模型

### 3.1 数据库表结构

```
users              — 用户（含技能名片）
tasks              — 任务（含AI分配字段）
schedules          — 日程
groups             — 群组
group_members      — 群组成员关系
group_invitations  — 群邀请
group_messages     — 群聊消息
private_messages   — 私聊消息
notifications      — 通知
friendships        — 好友关系
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
    major: list         # 专业方向 ["CS", "设计"]
    skills: list        # 技能 ["Python", "Figma"]
    tools: list         # 工具
    preferences: dict   # 偏好设置
    is_active: bool
    created_at: datetime

# 任务
class Task:
    id: int
    user_id: int        # 创建者
    group_id: int?      # 所属群组
    parent_id: int?     # 父任务
    title: str
    description: str
    deadline: datetime?
    start_time: datetime?
    end_time: datetime?
    priority: int       # 1低 2中 3高 4紧急
    status: str         # 待办/进行中/已完成/待确认
    progress: int       # 0-100
    estimated_hours: float?
    tags: list
    assigned_to: int?   # AI 分配给谁
    is_subtask: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

# 群组
class Group:
    id: int
    name: str
    description: str
    owner_id: int
    invite_code: str    # 6位邀请码
    status: str         # gathering/confirming/working/completed
    project_brief: str  # 项目需求描述
    created_at: datetime

# 群聊消息
class GroupMessage:
    id: int
    group_id: int
    sender_id: int?
    content: str
    msg_type: str       # text/system/file
    is_ai: bool         # 是否AI消息
    created_at: datetime
```

### 3.3 状态流转

```
群组状态:
  gathering → confirming → working → completed
  (集合中)    (确认任务)   (执行中)   (已完成)

任务状态:
  待办 → 进行中 → 已完成
            ↑
  待确认 ──┘（AI分配后需确认）
```

---

## 4. 文件结构

```
ai calendar/
├── backend/
│   ├── main.py                  # 应用入口 + 路由注册 + 生命周期
│   ├── config.py                # 配置管理（.env 加载）
│   ├── database.py              # SQLAlchemy 引擎 + Session
│   ├── auth.py                  # JWT 认证（get_current_user）
│   ├── safe_migrate.py          # 安全列迁移
│   ├── db_backup.py             # 启动时自动备份
│   ├── requirements.txt         # Python 依赖清单
│   ├── .env                     # 环境变量（不提交）
│   │
│   ├── models/
│   │   ├── __init__.py          # User + 聚合导出
│   │   ├── task.py              # Task / TaskStatus
│   │   ├── schedule.py          # Schedule
│   │   ├── group.py             # Group / GroupMember / GroupInvitation
│   │   ├── notification.py      # Notification
│   │   ├── friendship.py        # Friendship
│   │   └── message.py           # GroupMessage / PrivateMessage / KnowledgeFile
│   │
│   ├── routers/                 # 11个路由模块
│   │   ├── auth.py              # POST /register, /login
│   │   ├── users.py             # 用户信息 / 设置 / 统计 / 画像
│   │   ├── tasks.py             # 任务 CRUD + CSV导出
│   │   ├── schedule.py          # 日程 CRUD + NLP解析
│   │   ├── groups.py            # 群组管理 + AI工作流 + 任务确认
│   │   ├── friends.py           # 好友搜索 / 请求 / 管理
│   │   ├── messages.py          # 群聊(@ai) + 私聊AI
│   │   ├── ai.py                # AI 对话 / 解析 / 分解 / 分配
│   │   ├── upload.py            # 文件上传 + 文本提取
│   │   ├── notifications.py     # 通知 CRUD
│   │   └── ws.py                # WebSocket 实时推送
│   │
│   ├── services/
│   │   ├── ai_service.py        # AI 多 Provider 适配器
│   │   ├── ai_split.py          # 任务分解引擎
│   │   ├── ai_parse.py          # 自然语言解析（提取任务/时间/标签）
│   │   ├── smart_assign.py      # 智能分配引擎
│   │   ├── ddl_reminder.py      # DDL 提醒后台调度
│   │   └── ws_manager.py        # WebSocket 连接管理
│   │
│   ├── schemas/
│   │   └── __init__.py          # 全部 Pydantic v2 Schema
│   │
│   └── backups/                 # 数据库自动备份目录
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           # Vite 配置（proxy /api → :8000）
│   ├── tailwind.config.js       # 莫兰迪色系 + 自定义字体
│   │
│   └── src/
│       ├── main.jsx             # React 入口 + 全局错误捕获
│       ├── App.jsx              # 路由配置（14 条路由）
│       ├── index.css            # 莫兰迪手绘风全局样式 + 动画
│       │
│       ├── components/
│       │   ├── NavBar.jsx       # 底部导航（5标签）
│       │   └── InvitationPopup.jsx
│       │
│       ├── contexts/
│       │   └── AuthContext.jsx  # 认证状态管理（login/register/logout）
│       │
│       ├── pages/               # 14 个页面
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ProjectListPage.jsx  # 首页
│       │   ├── FriendsPage.jsx
│       │   ├── AIChatPage.jsx       # AI私聊（群名片转发）
│       │   ├── CreateGroupPage.jsx
│       │   ├── GroupChatPage.jsx    # 群聊(@ai + 文件上传 + 工作流)
│       │   ├── KanbanPage.jsx
│       │   ├── TaskDetailPage.jsx
│       │   ├── SkillProfilePage.jsx
│       │   ├── StatsPage.jsx
│       │   ├── DiscussionPage.jsx
│       │   ├── AuthorizePage.jsx
│       │   └── GroupManagePage.jsx
│       │
│       └── utils/
│           ├── api.js           # Axios 实例 + 全部 API 模块
│           ├── store.js         # localStorage 工具
│           └── mockAI.js        # AI 模拟响应（离线备用）
│
├── data/
│   └── major_tags_database.json # 专业/技能标签数据库
│
├── PRD.md                       # 产品需求文档
├── design.md                    # 设计方案文档
├── tech.md                      # 技术文档（本文件）
└── README.md                    # 快速开始指南
```

---

## 5. API 架构

### 5.1 API 概览（40+ 端点）

| 模块 | 端点数 | 前缀 |
|------|:---:|------|
| 认证 | 2 | /api/auth |
| 用户 | 7 | /api/users |
| 任务 | 7 | /api/tasks |
| AI | 4 | /api/ai + /api/tasks |
| 群组 | 10 | /api/groups |
| 好友 | 5 | /api/friends |
| 消息 | 5 | /api/messages |
| 上传 | 2 | /api/upload |
| 日程 | 5 | /api/schedule |
| 通知 | 4 | /api/notifications |

### 5.2 认证方式

```http
Authorization: Bearer <JWT_TOKEN>
```

- 注册/登录返回 `access_token`
- 前端存入 localStorage
- Axios 拦截器自动附加 Header
- 401 响应自动跳转登录页

---

## 6. 关键技术实现

### 6.1 AI 多 Provider 适配

```python
class AIService:
    def __init__(self):
        provider = os.getenv("AI_PROVIDER", "deepseek")
        # 根据 provider 选择不同的 API endpoint 和 key
        # 无 key 时 _has_real_api = False，使用本地回退

    def chat(self, message, context=""):
        if not self._has_real_api:
            return self._local_reply(message)
        # 调用真实 AI API（OpenAI 兼容格式）
```

### 6.2 群组 AI 工作流

```
1. 群主启动工作流 → 携带 project_brief + 附件文本
2. 后端获取群组成员列表（含技能标签）
3. AI 分析需求 → 拆分为子任务 → 按技能分配
4. 创建 Task 记录（status=待确认, assigned_to=成员ID）
5. 发送系统消息到群聊通知分配结果
6. 成员确认/打回 → 全部确认后群组进入 working 状态
```

### 6.3 @AI 群聊处理

```python
# routers/messages.py
def send_group_message(content, ...):
    # 1. 保存用户消息
    # 2. 检测 @ai 关键字
    if "@ai" in content.lower():
        # 3. 收集群组上下文（成员/任务/历史消息）
        # 4. 调用 AI 生成回复
        # 5. 保存 AI 消息（is_ai=True）
        # 6. 返回 { message, ai_reply }
```

### 6.4 文件上传 + 文本提取

```python
# routers/upload.py
@router.post("/file")
def upload_file(file: UploadFile):
    # 1. 保存文件到 uploads/
    # 2. 根据后缀名提取文本:
    #    .pdf → PyPDF2
    #    .docx → python-docx
    #    .pptx → python-pptx
    #    图片 → 仅保存，不提取
    # 3. 返回 { url, filename, extracted_text }
```

### 6.5 安全列迁移

```python
# safe_migrate.py — 启动时自动运行
MIGRATIONS = [
    ("users", "major", "JSON", "'[]'"),
    ("users", "skills", "JSON", "'[]'"),
    ("tasks", "group_id", "INTEGER", "NULL"),
    ("tasks", "assigned_to", "INTEGER", "NULL"),
    ("schedules", "repeat_type", "VARCHAR(20)", "NULL"),
    # ... 新增字段只需加一行
]
```

### 6.6 前端认证管理

```jsx
// AuthContext.jsx
// 提供: user, loading, login, register, logout, updateUser
// Axios 拦截器: 自动附加 Token + 401 跳转登录
```

---

## 7. 开发环境

### 7.1 启动后端

```bash
cd backend
pip install -r requirements.txt
# 配置 .env（AI_PROVIDER + API_KEY）
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
npm run build    # 输出到 dist/
npm run preview  # 预览生产构建
```

---

## 8. 关键设计决策

### 8.1 为什么选择 FastAPI + SQLite？

- FastAPI 性能优秀，自带 Swagger 文档
- SQLite 零配置、单文件、便于演示和迁移
- 自动备份机制保证数据安全

### 8.2 为什么用 Vite Proxy 而不是 CORS？

- 开发环境下前后端同源，避免跨域问题
- 生产部署时可用 Nginx 反代实现相同效果
- 简化前端 API 调用（相对路径 `/api/...`）

### 8.3 为什么 AI 用本地回退？

- 演示稳定性：不受网络/限额影响
- 有 API Key 时自动切换到真实 AI
- 关键词引擎覆盖基本场景，保证功能可用

### 8.4 为什么用 safe_migrate 而不是 Alembic？

- 项目初期快速迭代，避免生成大量迁移文件
- 新增字段只需加一行配置
- 启动时自动检测并添加缺失列，不影响已有数据
