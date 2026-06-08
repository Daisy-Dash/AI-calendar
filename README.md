# 🤖 AI 统筹组长 (AI Calendar)

> 用 AI 统筹你的团队 — 自然语言驱动的智能日程与协作平台

[![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev/)
[![UI](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![AI](https://img.shields.io/badge/AI-DeepSeek-4B32C3)](https://www.deepseek.com/)
[![DB](https://img.shields.io/badge/DB-SQLite-003B57?logo=sqlite)](https://www.sqlite.org/)

---

## 项目简介

AI 统筹组长是一款面向大学生团队的智能协作应用。核心理念是 **AI 担任组长角色**：用户组建团队后，AI 自动分解项目任务、按成员技能分配工作、实时追踪进度，并在群聊中以自然语言提供指导。

### 设计理念

- 🎨 **莫兰迪手绘风** — 温暖低饱和配色 + 圆角卡片，降低工具感
- 📱 **移动端优先** — 430px 手机壳容器，模拟真实 App 体验
- 🤖 **AI 原生** — 自然语言是核心交互方式，不是附属功能
- 👥 **组长即 AI** — AI 自动拆任务、分工、跟进，成员只需确认和执行

---

## 核心功能

### 👥 团队协作（核心流程）

```
创建群组 → 邀请好友 → 群主点击「人齐了」
                            ↓
                 📝 输入项目需求（支持上传 PDF/Word/PPT/图片）
                            ↓
                 🤖 AI 自动分解任务 + 按技能分配
                            ↓
                 ✋ 成员确认/打回任务
                            ↓
                 🚀 进入执行阶段，看板追踪进度
```

| 功能 | 说明 |
|------|------|
| 群组创建与邀请 | 创建群组 → 生成 6 位邀请码 → 拉好友入群 |
| AI 工作流启动 | 群主上传需求文档，AI 分解任务并智能分配 |
| 任务确认机制 | 成员可接受或打回重分，确保分工合理 |
| 群聊 + @ai | 群内自然语言提问，AI 结合项目上下文回复 |
| 看板视图 | 待办 / 进行中 / 已完成三栏看板 |

### 🤖 AI 能力

| 功能 | 说明 |
|------|------|
| 自然语言对话 | 群聊 @ai 任意提问，AI 了解团队上下文后智能回复 |
| 任务分解 | 将大型项目拆分为 3-6 个可执行子任务 |
| 智能分配 | 根据成员技能标签 + 负载均衡自动分工 |
| AI 私人助手 | 底部导航 AI 标签页，转发群名片获取个人任务指导 |
| 多 Provider | DeepSeek / Claude / GPT 可插拔切换 |
| 智能回退 | 无 API Key 时使用本地关键词引擎 |

### 📋 任务管理

| 功能 | 说明 |
|------|------|
| 任务 CRUD | 创建、查看、编辑、删除 |
| 优先级 / 标签 | 4 级优先级 + 自定义技能标签 |
| 进度追踪 | 0-100% 滑块 + 状态流转（待办→进行中→已完成） |
| 子任务 | AI 分解或手动创建子任务 |
| DDL 提醒 | 后台每 30 分钟检查，截止前 3 天自动通知 |

### 👫 好友系统

| 功能 | 说明 |
|------|------|
| 搜索用户 | 按昵称或邮箱搜索 |
| 好友请求 | 发送 / 接受 / 拒绝好友请求 |
| 好友列表 | 管理好友，一键邀请入群 |

### 📊 数据与分析

| 功能 | 说明 |
|------|------|
| 用户统计 | 完成率、连续打卡天数、逾期任务数 |
| 能力画像 | 基于已完成任务分析核心技能、准时率 |
| 群组统计 | 团队任务完成率、成员贡献排行 |
| 技能名片 | 专业 / 技能 / 工具标签体系 |

### 📎 文件上传

| 功能 | 说明 |
|------|------|
| 多格式支持 | PDF / Word (.docx) / PPT (.pptx) / 图片 / TXT |
| 自动提取 | 上传后自动提取文本内容，供 AI 分析 |
| 项目需求附件 | 启动工作流时可上传需求文档辅助 AI 理解 |

---

## 技术架构

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

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | FastAPI | 异步 Python Web 框架 |
| ORM | SQLAlchemy 2.0 | 数据库模型 |
| 认证 | python-jose + passlib | JWT Token + bcrypt 密码哈希 |
| AI 客户端 | httpx | 调用 DeepSeek/Claude/GPT API |
| 文件解析 | PyPDF2 / python-docx / python-pptx | 提取文档文本 |
| 前端框架 | React 18 | 组件化 UI |
| 构建工具 | Vite 6 | 快速 HMR 开发 |
| CSS | Tailwind CSS 3 | 原子化样式 |
| 路由 | React Router 6 | 前端路由 |
| HTTP | Axios | API 请求 |

---

## 快速开始

### 前置要求

- **Python** >= 3.10
- **Node.js** >= 18
- **npm** >= 9

### 1. 克隆项目

```bash
git clone https://github.com/Daisy-Dash/AI-calendar.git
cd AI-calendar
```

### 2. 启动后端

```bash
cd backend

# 安装依赖（已包含 PyPDF2/python-docx/python-pptx）
pip install -r requirements.txt

# 配置 AI（可选但推荐）
# 在 backend 目录下创建 .env 文件，写入以下内容：
#   AI_PROVIDER=deepseek
#   DEEPSEEK_API_KEY=你的API密钥
# Windows PowerShell 可用：
echo "AI_PROVIDER=deepseek`nDEEPSEEK_API_KEY=你的API密钥" | Out-File -Encoding utf8 .env
# 或手动用记事本新建 .env 文件，粘贴上述两行即可

# 启动
python main.py
# 或：uvicorn main:app --reload --port 8000
```

后端运行在 `http://localhost:8000`，API 文档在 `http://localhost:8000/docs`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`

### 4. 开始使用

1. 打开 `http://localhost:5173` → 注册账户
2. 添加好友 → 创建群组 → 邀请好友
3. 群主点击「人齐了，开始吧！」→ 输入项目需求
4. AI 自动分解任务并分配 → 成员确认
5. 在群聊中 @ai 随时提问

---

## 项目结构

```
AI-calendar/
├── backend/
│   ├── main.py                  # 应用入口 + 路由注册 + 生命周期
│   ├── config.py                # 配置管理（.env 加载）
│   ├── database.py              # SQLAlchemy 引擎
│   ├── auth.py                  # JWT 认证
│   ├── safe_migrate.py          # 安全列迁移（自动补缺失列）
│   ├── db_backup.py             # 启动时自动备份数据库
│   ├── .env                     # 环境变量（API Key 等，不提交）
│   │
│   ├── models/
│   │   ├── __init__.py          # User 模型 + 聚合导出
│   │   ├── task.py              # Task（任务）
│   │   ├── schedule.py          # Schedule（日程）
│   │   ├── group.py             # Group / GroupMember / GroupInvitation
│   │   ├── notification.py      # Notification（通知）
│   │   ├── friendship.py        # Friendship（好友关系）
│   │   └── message.py           # GroupMessage / PrivateMessage / KnowledgeFile
│   │
│   ├── routers/
│   │   ├── auth.py              # 注册 / 登录
│   │   ├── users.py             # 用户信息 / 设置 / 统计 / 能力画像
│   │   ├── tasks.py             # 任务 CRUD
│   │   ├── schedule.py          # 日程 CRUD + 自然语言解析
│   │   ├── groups.py            # 群组管理 + 工作流 + 任务确认
│   │   ├── friends.py           # 好友搜索 / 请求 / 管理
│   │   ├── messages.py          # 群聊消息 + AI 回复 + 私聊 AI
│   │   ├── ai.py                # AI 对话 / 任务分解 / 智能分配
│   │   ├── upload.py            # 文件上传 + 文本提取
│   │   ├── notifications.py     # 通知列表 / 已读
│   │   └── ws.py                # WebSocket
│   │
│   ├── services/
│   │   ├── ai_service.py        # AI 多 Provider 适配器
│   │   ├── ai_split.py          # 任务分解引擎
│   │   ├── ai_parse.py          # 自然语言解析引擎
│   │   ├── smart_assign.py      # 智能分配引擎
│   │   └── ddl_reminder.py      # DDL 提醒调度器
│   │
│   └── schemas/
│       └── __init__.py          # 所有 Pydantic Schema
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js           # Vite 配置（代理 /api → :8000）
│   ├── tailwind.config.js       # 莫兰迪色系配置
│   │
│   └── src/
│       ├── main.jsx             # React 入口 + 全局错误捕获
│       ├── App.jsx              # 路由配置（14 个路由）
│       ├── index.css            # 莫兰迪手绘风全局样式
│       │
│       ├── components/
│       │   ├── NavBar.jsx       # 底部导航（首页/好友/AI/看板/我的）
│       │   └── InvitationPopup.jsx  # 邀请弹窗（含 AI 任务预分配）
│       │
│       ├── contexts/
│       │   └── AuthContext.jsx  # 认证状态管理
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx        # 登录
│       │   ├── RegisterPage.jsx     # 注册（含技能选择）
│       │   ├── ProjectListPage.jsx  # 首页（群组列表 + 任务概览）
│       │   ├── FriendsPage.jsx      # 好友管理
│       │   ├── AIChatPage.jsx       # AI 私人助手（群名片转发）
│       │   ├── CreateGroupPage.jsx  # 创建群组
│       │   ├── GroupChatPage.jsx    # 群聊（@ai + 文件上传 + 工作流）
│       │   ├── KanbanPage.jsx       # 任务看板
│       │   ├── TaskDetailPage.jsx   # 任务详情
│       │   ├── SkillProfilePage.jsx # 个人中心 / 技能名片
│       │   ├── StatsPage.jsx        # 数据统计
│       │   ├── DiscussionPage.jsx   # 项目讨论
│       │   └── AuthorizePage.jsx    # 授权页
│       │
│       └── utils/
│           ├── api.js           # Axios 实例 + 全部 API 函数
│           └── store.js         # localStorage 工具
│
└── data/
    └── major_tags_database.json # 专业 / 技能标签库
```

---

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 Swagger 文档。

### API 概览（40+ 端点）

```
认证 (2)
  POST   /api/auth/register              注册
  POST   /api/auth/login                 登录

用户 (6)
  GET    /api/users/me                   当前用户
  PUT    /api/users/me                   更新资料（含技能名片）
  GET    /api/users/search?q=            搜索用户
  GET    /api/users/me/settings          偏好设置
  PUT    /api/users/me/settings          更新设置
  GET    /api/users/me/stats             用户统计（完成率/连续天数/逾期）
  GET    /api/users/me/ability-profile   能力画像

任务 (7)
  GET    /api/tasks                      任务列表（支持筛选）
  POST   /api/tasks                      创建任务
  GET    /api/tasks/{id}                 任务详情
  PUT    /api/tasks/{id}                 更新任务
  DELETE /api/tasks/{id}                 删除任务
  PUT    /api/tasks/{id}/progress        更新进度

AI (4)
  POST   /api/ai/chat                   AI 对话
  POST   /api/ai/parse                  自然语言解析
  POST   /api/tasks/split               AI 任务分解
  POST   /api/tasks/assign              AI 智能分配

群组 (10)
  GET    /api/groups                     我的群组
  POST   /api/groups                     创建群组
  GET    /api/groups/{id}                群组详情
  POST   /api/groups/invite              获取邀请码
  POST   /api/groups/invite-by-email     邮箱邀请
  POST   /api/groups/respond             响应邀请
  GET    /api/groups/invitations/pending  待处理邀请
  POST   /api/groups/{id}/start-workflow 启动 AI 工作流
  POST   /api/groups/{id}/tasks/{tid}/confirm  确认任务
  GET    /api/groups/{id}/pending-tasks  待确认任务

好友 (5)
  GET    /api/friends/search?q=          搜索用户
  GET    /api/friends                    好友列表
  POST   /api/friends/request            发送好友请求
  GET    /api/friends/requests           好友请求列表
  PUT    /api/friends/requests/{id}      接受/拒绝请求

消息 (5)
  GET    /api/messages/group/{gid}       群聊消息
  POST   /api/messages/group/{gid}       发送群消息（@ai 触发 AI 回复）
  GET    /api/messages/private           AI 私聊消息
  POST   /api/messages/private           发送私聊（支持关联群组）
  GET    /api/messages/knowledge/{gid}   群知识库文件

文件上传 (2)
  POST   /api/upload/file                单文件上传 + 文本提取
  POST   /api/upload/files               批量上传 + 文本提取

日程 (5)
  GET    /api/schedule                   周日程
  POST   /api/schedule                   创建日程
  PUT    /api/schedule/{id}              更新日程
  DELETE /api/schedule/{id}              删除日程
  GET    /api/schedule/month             月日程

通知 (4)
  GET    /api/notifications              通知列表
  GET    /api/notifications/unread-count 未读数
  PUT    /api/notifications/{id}/read    标记已读
  PUT    /api/notifications/read-all     全部已读
```

### 认证

所有 `/api/*` 端点（除注册/登录外）需在请求头携带：

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 环境配置

### 后端 `.env`

```env
# 基础配置
DEBUG=True
DATABASE_URL=sqlite:///./data/ai_calendar.db
SECRET_KEY=your-secret-key

# AI 配置（三选一）
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_MODEL=deepseek-chat

# 或使用 Claude
# AI_PROVIDER=claude
# CLAUDE_API_KEY=sk-ant-xxx
# CLAUDE_API_MODEL=claude-sonnet-4-20250514

# 或使用 GPT
# AI_PROVIDER=gpt
# GPT_API_KEY=sk-xxx
# GPT_API_MODEL=gpt-4o
```

> **不配置 API Key 也可运行** — AI 功能会使用本地关键词引擎作为回退。

---

## 数据安全

| 机制 | 说明 |
|------|------|
| 自动备份 | 每次启动后端时自动备份 SQLite，保留在 `backend/backups/` |
| 安全迁移 | `safe_migrate.py` 自动检测并添加缺失列，不影响已有数据 |
| 密码哈希 | bcrypt 加密存储，不可逆 |
| JWT 认证 | Token 有效期 7 天，自动续期 |
| .env 隔离 | API Key 在 `.gitignore` 中，不会提交到仓库 |

---

## 莫兰迪设计系统

### 色彩

| 色系 | 用途 | 示例值 |
|------|------|--------|
| cream | 背景/卡片 | `#FAF6F1` `#E8DDD2` |
| rosa | 主色/按钮 | `#D4A5A5` `#B37474` |
| sage | 成功/确认 | `#A8BFA0` `#6F8F66` |
| lilac | 辅助/AI | `#B8A9CA` `#9A88B5` |
| dusty | 信息 | `#9FB5C4` `#7A9AB0` |
| choco | 文字 | `#7D6B5D` `#4D4038` |
| caramel | 强调 | `#C9A87C` `#B08F60` |

### 字体

- **标题**: LXGW WenKai（霞鹜文楷）
- **正文**: Noto Sans SC

### 组件规范

- 卡片圆角: `20px`，边框 `1.5px solid cream-300`
- 按钮: 圆角 `999px`（胶囊形），rosa 渐变
- 容器: 最大宽度 `430px`，居中显示

---

## 故障排除

### 白屏问题
1. 按 `Ctrl + Shift + R` 强制刷新（清除缓存）
2. 确认后端在运行（`http://localhost:8000` 可访问）
3. 按 `F12` 查看控制台错误信息

### AI 回复不智能 / 提示配置 API Key
**原因**: 后端启动时没有加载 `.env` 文件
**解决**: 重启后端（`Ctrl+C` 然后 `python main.py`）

### 端口被占用
```bash
# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# macOS/Linux
lsof -i :8000 && kill -9 <PID>
```

### pip 安装报错（Python 3.14）
```bash
pip install --no-cache-dir pydantic pydantic-settings
```

---

## 许可证

MIT License

---

## 贡献者

- 设计 & 开发: Daisy Dash 团队
- AI 功能: Claude (Anthropic)

<p align="center">
  <sub>Built with FastAPI + React + Tailwind CSS + DeepSeek AI</sub>
</p>
