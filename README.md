# 🤖 AI 统筹组长 (AI Calendar)

> 用 AI 统筹你的团队 — 自然语言驱动的智能任务协作与节点追踪平台

[![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev/)
[![UI](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![AI](https://img.shields.io/badge/AI-DeepSeek-4B32C3)](https://www.deepseek.com/)
[![DB](https://img.shields.io/badge/DB-SQLite-003B57?logo=sqlite)](https://www.sqlite.org/)

---

## 项目简介

AI 统筹组长是一款面向大学生团队的智能协作应用。核心理念是 **AI 担任组长角色**：用户组建团队后，AI 会先帮小组**理解项目方向 + 搜索参考案例**，再根据**组员讨论后的方案**自动拆解大任务、按技能分配、设置提交节点，并在执行阶段**通过凭证上传自动评估进度**。

### 设计理念

- 🎨 **莫兰迪手绘风** — 温暖低饱和配色 + 圆角卡片，降低工具感
- 📱 **移动端优先** — 430px 手机壳容器，模拟真实 App 体验
- 🤖 **AI 原生** — 自然语言是核心交互方式，不是附属功能
- 👥 **组长即 AI** — AI 解释/搜案例/拆任务/分配/拆节点/评进度，全流程覆盖
- 🪜 **三层任务结构** — 项目 → 大任务（人）→ 提交节点（时间 + 要交什么）

---

## 核心流程（6 阶段）

```
召集中 (gathering)
   ↓ 群主点「人齐了，开始吧」+ 输入项目简介 + 附件
讨论中 (discussing)
   ↓ AI 解释方向 + 搜案例（顶部固定可折叠案例栏）
   ↓ 组员讨论 → 点「📝 提交方案」
待确认 (confirming)
   ↓ AI 据方案拆 3-6 个大任务 + 按技能分人 + 设节点
   ↓ 每人居中浮窗确认 / 打回
执行中 (in_progress)
   ↓ 接受任务 → AI 自动拆 3-5 个提交节点（含「要交什么 + DDL」）
   ↓ 任务专属 AI 聊天：进度条 + 节点圆点 + 凭证上传
   ↓ 上传凭证 → AI 评估 → 自动更新进度 → 同步群聊
完成 (completed)
```

---

## 核心功能

### 👥 团队协作（核心流程）

| 功能 | 说明 |
|------|------|
| 群组创建与邀请 | 创建群组 → 自动生成 6 位邀请码 → 按邮箱邀请好友 |
| AI 项目理解 | 启动后 AI 给出 **任务理解 + 方向建议 + 关键提问** 三件套 |
| AI 联网搜案例 | DeepSeek Function Calling + DuckDuckGo，顶部固定**可折叠 + 横滑 + 可点击跳转**案例卡片 |
| 组员讨论方案 | "📝 提交方案"入口，组员讨论后提交，AI 据此重新拆任务 |
| AI 拆任务 + 智能分配 | 根据方案 + 成员技能拆 3-6 个大任务，按能力匹配分人 |
| 任务确认/打回（居中浮窗） | 接受任务时自动 break_down 为 3-5 个提交节点 |
| 任务专属 AI 聊天 | 进度条 + 节点圆点 + 联网搜索/案例/拆分/凭证 |
| 凭证驱动进度 | 上传文件 → AI 评估 → 自动更新进度条 → 同步群聊 |
| 群聊任务清单 | "📋"按钮查看团队全部任务，自己的可点击进 TaskChatPage |
| 知识库 + 问 AI | 群文件自动归档，每个文件"💡 问 AI"获得使用建议 |
| 群聊 @ai | 群内自然语言提问，AI 结合任务/成员/进度回复 |

### 🤖 AI 能力

| 功能 | 说明 |
|------|------|
| 项目理解 | 输入需求 + 附件 → 三段式输出（理解/方向/关键提问） |
| 联网搜索 | Function Calling 调 DuckDuckGo，返回卡片（标题/摘要/host/链接） |
| 任务分解 | 据组员方案 + 成员技能拆 3-6 个大任务 |
| 节点拆分 | 每任务 break down 3-5 个节点（含"要交什么 + 渐进 DDL"） |
| 凭证评估 | 接收文件 → AI 评估完成度（0-100）+ 反馈 |
| 文件使用建议 | 知识库文件结合项目上下文给出核心要点 + 应用建议 |
| AI 私人助手 | 群名片转发，基于该群任务给个人化指导 |
| 多 Provider | DeepSeek / Claude / GPT 可插拔切换 |
| 智能回退 | 无 API Key 时使用本地规则引擎 |

### 📋 任务节点追踪

| 功能 | 说明 |
|------|------|
| 三层任务结构 | 项目 → 大任务 → 提交节点 |
| 进度条 + 节点圆点 | TaskChatPage 进度条上叠加节点圆点 + 下方时间戳 |
| 节点详情面板 | 点击圆点弹出：状态/DDL/要提交什么/进度/上传按钮 |
| DDL 升序排列 | 首页 + 任务清单按 DDL 升序，最近的在上 |
| 逾期提醒 | 红色边框 + animate-pulse + 进入页面弹窗 |
| 凭证同步群聊 | 上传凭证 → 群聊自动出现文件消息 + 进度通知 |

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
| 技能名片 | 头像/昵称/专业/技能/工具标签 |

### 📎 文件上传 + 知识库

| 功能 | 说明 |
|------|------|
| 多格式支持 | PDF / Word (.docx) / PPT (.pptx) / 图片 / TXT |
| 自动文本提取 | 上传后自动解析内容供 AI 使用 |
| 群聊知识库 | 群内上传自动归档 + AI 自动总结 + "💡 问 AI" 按钮 |
| 凭证上传 | 任务节点上传文件 → AI 评估 → 进度自动更新 |

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
│   DeepSeek Function Calling + DuckDuckGo 联网搜索 │
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
| 联网搜索 | ddgs (DuckDuckGo) | Function Calling 工具，无需额外 API Key |
| 文件解析 | PyPDF2 / python-docx / python-pptx | 提取文档文本 |
| 前端框架 | React 18 | 组件化 UI |
| 构建工具 | Vite 6 | 快速 HMR 开发 |
| CSS | Tailwind CSS 3 | 原子化样式 |
| 路由 | React Router 6 | 前端路由 |
| HTTP | Axios | API 请求（按端点超时） |

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

# 安装依赖
pip install -r requirements.txt

# 配置 AI（可选但推荐）
# 在 backend 目录下创建 .env 文件，写入：
#   AI_PROVIDER=deepseek
#   DEEPSEEK_API_KEY=你的API密钥
# Windows PowerShell：
echo "AI_PROVIDER=deepseek`nDEEPSEEK_API_KEY=你的API密钥" | Out-File -Encoding utf8 .env

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

1. 打开 `http://localhost:5173` → 注册账户（邮箱 + 昵称 + 密码）
2. 设置个人技能名片（专业 / 技能 / 工具）
3. 添加好友 → 创建群组 → 邀请好友入群
4. 群主点击「人齐了，开始吧！」→ 输入项目需求（可上传附件）
5. AI 解释项目方向 + 搜索案例
6. 小组讨论后点击「📝 提交方案」→ AI 自动拆任务+分配+设节点
7. 居中浮窗确认任务 → 接受后 AI 自动拆 3-5 个提交节点
8. 进入任务专属 AI 聊天 → 点击进度条节点上传凭证 → 进度自动更新

---

## 项目结构

```
AI-calendar/
├── backend/
│   ├── main.py                  # 应用入口 + 路由注册
│   ├── config.py                # 配置管理（.env 加载）
│   ├── database.py              # SQLAlchemy 引擎
│   ├── auth.py                  # JWT 认证
│   ├── safe_migrate.py          # 安全列迁移
│   ├── db_backup.py             # 启动时自动备份
│   ├── .env                     # 环境变量（不提交）
│   │
│   ├── models/
│   │   ├── __init__.py          # User + 聚合导出
│   │   ├── task.py              # Task（含 parent_id 子节点）
│   │   ├── schedule.py
│   │   ├── group.py             # Group + 状态机
│   │   ├── notification.py
│   │   ├── friendship.py
│   │   └── message.py           # GroupMessage / PrivateMessage / KnowledgeFile
│   │
│   ├── routers/
│   │   ├── auth.py              # 注册 / 登录
│   │   ├── users.py             # 用户/设置/统计/画像
│   │   ├── tasks.py             # 任务 CRUD + chat + upload-proof + split
│   │   ├── schedule.py          # 日程 + 自然语言解析
│   │   ├── groups.py            # 群组 + 6 阶段工作流 + submit-proposal + ask-ai
│   │   ├── friends.py           # 好友
│   │   ├── messages.py          # 群聊 + 私聊 + 知识库
│   │   ├── ai.py                # AI 通用对话 + 任务分解
│   │   ├── upload.py            # 文件上传 + 提取
│   │   ├── notifications.py
│   │   └── ws.py                # WebSocket
│   │
│   ├── services/
│   │   ├── ai_service.py        # 多 Provider + Function Calling
│   │   ├── web_search.py        # DuckDuckGo 工具
│   │   ├── ai_split.py
│   │   ├── ai_parse.py
│   │   ├── smart_assign.py
│   │   └── ddl_reminder.py
│   │
│   └── schemas/
│       └── __init__.py
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js       # 莫兰迪色系
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # 路由 + TaskChatPage 路由
│       ├── index.css            # 全屏蒙层 540 max-width
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
│       │   ├── ProjectListPage.jsx  # 首页 + 折叠任务 + DDL 升序
│       │   ├── FriendsPage.jsx
│       │   ├── AIChatPage.jsx       # 群名片转发
│       │   ├── CreateGroupPage.jsx
│       │   ├── GroupChatPage.jsx    # 6 阶段工作流 + 多面板
│       │   ├── TaskChatPage.jsx     # ⭐ 任务专属 AI 聊天（新）
│       │   ├── KanbanPage.jsx
│       │   ├── TaskDetailPage.jsx
│       │   ├── SkillProfilePage.jsx
│       │   ├── StatsPage.jsx
│       │   ├── DiscussionPage.jsx
│       │   └── GroupManagePage.jsx
│       │
│       └── utils/
│           └── api.js              # axios 封装 + taskAPI/groupAPI 等
│
├── PRD.md       # 产品需求文档
├── README.md    # 本文件
├── design.md    # 设计方案文档
└── tech.md      # 技术文档
```

---

## 核心 API

### 用户认证
- `POST /api/auth/register` — 注册（email + username + password）
- `POST /api/auth/login` — 登录

### 任务
- `GET /api/tasks` — 任务列表（支持 group_id 过滤）
- `POST /api/tasks/{id}/chat` — **任务专属 AI 聊天**（含 use_search）
- `POST /api/tasks/{id}/upload-proof` — **上传凭证 + AI 评估进度 + 同步群聊**
- `POST /api/tasks/{id}/split` — **AI 拆分子任务**

### 群组工作流
- `POST /api/groups` — 创建群组
- `POST /api/groups/{id}/start-workflow` — **AI 解释项目 + 搜案例**（不分任务）
- `POST /api/groups/{id}/submit-proposal` — **组员讨论方案 → AI 拆任务 + 分配**
- `POST /api/groups/{id}/tasks/{taskId}/confirm` — **任务确认/打回**（接受时自动 break_down）
- `POST /api/groups/{id}/knowledge/{fileId}/ask-ai` — **文件使用建议**

### 消息 + 知识库
- `GET/POST /api/messages/group/{groupId}` — 群聊消息（@ai 触发回复）
- `GET/POST /api/messages/knowledge/{groupId}` — 知识库 + 文件上传
- `GET/POST /api/messages/private` — AI 私聊（含群名片转发）

### AI
- `POST /api/ai/chat` — 通用 AI 对话
- `POST /api/ai/search-chat` — 联网搜索对话
- `POST /api/ai/parse` — 自然语言解析

---

## 文档

- [PRD.md](./PRD.md) — 产品需求文档
- [tech.md](./tech.md) — 技术文档
- [design.md](./design.md) — 设计方案文档
