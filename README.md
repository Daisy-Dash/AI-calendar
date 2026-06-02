# 🤖 AI 日程协作者 (AI Calendar)

> 智能管理你的每一天 — AI 驱动的日程规划与团队协作应用

[![Tech Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev/)
[![UI](https://img.shields.io/badge/UI-Tailwind_CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![DB](https://img.shields.io/badge/DB-SQLite-003B57?logo=sqlite)](https://www.sqlite.org/)
[![AI](https://img.shields.io/badge/AI-Claude_|_GPT-orange)](https://www.anthropic.com/)

---

## 📑 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [API 文档](#api-文档)
- [环境配置](#环境配置)
- [部署指南](#部署指南)
- [Figma 设计对接](#figma-设计对接)
- [开发路线图](#开发路线图)
- [常见问题](#常见问题)

---

## 项目简介

AI 日程协作者是一款面向大学生的智能日程管理应用。用户可以通过**自然语言**快速创建日程和任务，AI 会自动解析时间、日期并智能分类。支持个人任务管理、团队协作、DDL 追踪、进度统计等功能。

### 设计理念

- 🎨 **手绘风格 UI** — 温暖亲切的视觉体验，降低工具感
- 📱 **移动端优先** — 430px 宽度容器，模拟手机应用体验
- 🤖 **AI 原生** — 自然语言交互是核心，而非辅助功能
- 👥 **协作优先** — 团队任务分配、进度透明化

---

## 核心功能

### 📋 任务管理
| 功能 | 说明 | 状态 |
|------|------|:----:|
| 任务 CRUD | 创建、查看、编辑、删除任务 | ✅ |
| 优先级/标签 | 4 级优先级 + 自定义标签 | ✅ |
| 进度追踪 | 0-100% 滑块 + 状态流转 | ✅ |
| 筛选搜索 | 按状态/优先级/群组/关键词筛选 | ✅ |
| 子任务 | AI 分解大任务为可执行子任务 | ✅ |

### 📅 日历与日程
| 功能 | 说明 | 状态 |
|------|------|:----:|
| 月视图 | 带日程标记点的月历 | ✅ |
| 日程 CRUD | 增删改查 + 颜色标签 | ✅ |
| 自然语言创建 | "明天下午3点开会" → 自动解析 | ✅ |
| 周视图 | 本周日程概览 | ✅ |
| 快速添加 | 首页悬浮按钮一键创建 | ✅ |

### 🤖 AI 功能
| 功能 | 说明 | 状态 |
|------|------|:----:|
| 自然语言解析 | 中文日期/时间智能识别 | ✅ |
| 任务分解 | 大任务 → 子任务（需 API Key） | 🟡 |
| 智能分配 | 按技能匹配分给团队成员 | 🟡 |
| AI 对话 | Claude/GPT 助手 | 🟡 |

### 👥 团队协作
| 功能 | 说明 | 状态 |
|------|------|:----:|
| 群组管理 | 创建/加入（邀请码）/退出/成员管理 | ✅ |
| 团队任务 | 群组任务分配 + 状态追踪 | ✅ |
| 成员统计 | 每个人的任务完成率 | ✅ |
| 通知系统 | 新成员加入/任务分配通知 | ✅ |

### 📊 数据与分析
| 功能 | 说明 | 状态 |
|------|------|:----:|
| 首页概览 | 任务统计 + 即将截止 | ✅ |
| 进度统计页 | 完成率环形图 + 优先级分布 | ✅ |
| DDL 时间线 | 紧急/全部/已完成时间线 | ✅ |
| Profile 统计 | 真实数据面板 | ✅ |
| 设置持久化 | 偏好设置云端存储 | ✅ |

---

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│         React 18 + Vite + Tailwind CSS           │
│               localhost:5173                     │
├─────────────────────────────────────────────────┤
│                  HTTP/REST API                    │
│                  JSON + JWT                      │
├─────────────────────────────────────────────────┤
│                    Backend                       │
│            FastAPI + SQLAlchemy ORM              │
│               localhost:8000                     │
├─────────────────────────────────────────────────┤
│              AI Services (可选)                   │
│      Claude API / GPT API / 本地解析回退         │
├─────────────────────────────────────────────────┤
│                   Database                       │
│              SQLite (开发) / PostgreSQL (生产)    │
└─────────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | FastAPI | 0.115+ |
| ASGI 服务器 | Uvicorn | 0.34+ |
| ORM | SQLAlchemy | 2.0+ |
| 认证 | python-jose (JWT) + passlib (bcrypt) | 3.5+ / 1.7+ |
| 前端框架 | React | 18.3 |
| 构建工具 | Vite | 6.0+ |
| CSS 框架 | Tailwind CSS | 3.4 |
| 路由 | React Router DOM | 6.28 |
| HTTP 客户端 | Axios | 1.7 |

---

## 快速开始

### 前置要求

- **Python** ≥ 3.10
- **Node.js** ≥ 18
- **npm** ≥ 9

### 1. 克隆项目

```bash
git clone https://github.com/Daisy-Dash/AI-calendar.git
cd AI-calendar
```

### 2. 启动后端

```bash
cd backend

# 创建虚拟环境 (推荐)
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务器
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端运行在 `http://localhost:8000`

- API 文档 (Swagger): `http://localhost:8000/docs`
- 健康检查: `http://localhost:8000/`

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:5173`

### 4. 开始使用

1. 打开浏览器访问 `http://localhost:5173`
2. 注册新账户（邮箱 + 用户名 + 密码）
3. 创建你的第一个任务！
4. 试试首页右下角的 ✨ 按钮 — 输入 "明天下午3点开会"

---

## 项目结构

```
AI-calendar/
│
├── backend/                        # FastAPI 后端
│   ├── main.py                     # 应用入口 & 路由注册
│   ├── config.py                   # 配置管理 (环境变量)
│   ├── database.py                 # 数据库连接 & 初始化
│   ├── auth.py                     # JWT 认证 & 密码哈希
│   ├── requirements.txt            # Python 依赖
│   ├── .env                        # 环境变量 (API Key 等)
│   │
│   ├── models/                     # 数据库模型
│   │   ├── __init__.py             # User 模型 + 聚合导出
│   │   ├── task.py                 # Task 模型
│   │   ├── schedule.py             # Schedule 模型
│   │   ├── group.py                # Group & GroupMember 模型
│   │   └── notification.py         # Notification 模型
│   │
│   ├── routers/                    # API 路由
│   │   ├── auth.py                 # POST /api/auth/register, /login
│   │   ├── tasks.py                # CRUD /api/tasks
│   │   ├── schedule.py             # CRUD /api/schedule + 自然语言解析
│   │   ├── groups.py               # CRUD /api/groups + 邀请/成员管理
│   │   ├── users.py                # /api/users/me + 设置 + 统计
│   │   ├── ai.py                   # /api/tasks/split, /api/ai/chat
│   │   └── notifications.py        # /api/notifications
│   │
│   ├── services/                   # 业务服务
│   │   ├── ai_service.py           # Claude/GPT API 适配器
│   │   ├── ai_split.py             # 任务分解服务
│   │   └── smart_assign.py         # 智能分配服务
│   │
│   └── schemas/                    # Pydantic 数据验证
│       └── __init__.py             # 所有 Request/Response Schema
│
├── frontend/                       # React 前端
│   ├── index.html                  # HTML 入口
│   ├── vite.config.js              # Vite 配置
│   ├── tailwind.config.js          # Tailwind 配置
│   ├── package.json                # Node 依赖
│   │
│   └── src/
│       ├── main.jsx                # React 入口
│       ├── App.jsx                 # 路由配置
│       ├── index.css               # 全局样式 + 手绘组件
│       │
│       ├── components/             # 通用组件
│       │   └── NavBar.jsx          # 底部导航栏
│       │
│       ├── contexts/               # React Context
│       │   └── AuthContext.jsx     # 认证状态管理
│       │
│       ├── pages/                  # 14 个页面
│       │   ├── HomePage.jsx        # 首页 (概览 + 快速添加)
│       │   ├── LoginPage.jsx       # 登录/注册
│       │   ├── TaskListPage.jsx    # 任务列表
│       │   ├── CalendarPage.jsx    # 日历视图
│       │   ├── AIChatPage.jsx      # AI 对话
│       │   ├── AISplitPage.jsx     # AI 任务分解
│       │   ├── ProgressPage.jsx    # 进度追踪
│       │   ├── DDLPage.jsx         # DDL 时间线
│       │   ├── StatsPage.jsx       # 数据统计
│       │   ├── GroupPage.jsx       # 团队列表
│       │   ├── GroupManagePage.jsx # 团队管理
│       │   ├── NotificationPage.jsx # 通知中心
│       │   ├── SettingsPage.jsx    # 设置
│       │   └── ProfilePage.jsx     # 个人中心
│       │
│       └── utils/
│           ├── api.js              # Axios 实例 + 所有 API 函数
│           └── helpers.js          # 日期/颜色工具函数
│
└── data/                           # 静态数据
    ├── sample_tasks.json           # 示例任务
    └── major_tags_database.json    # 专业标签库
```

---

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看完整 Swagger 文档。

### API 概览 (共 25+ 端点)

```
认证 (2)
  POST   /api/auth/register          用户注册
  POST   /api/auth/login             用户登录

用户 (4)
  GET    /api/users/me               获取当前用户信息
  PUT    /api/users/me               更新用户信息
  GET    /api/users/me/settings      获取偏好设置
  PUT    /api/users/me/settings      更新偏好设置
  GET    /api/users/me/stats         获取用户统计

任务 (7)
  GET    /api/tasks                  任务列表 (支持筛选)
  POST   /api/tasks                  创建任务
  GET    /api/tasks/{id}             任务详情
  PUT    /api/tasks/{id}             更新任务
  DELETE /api/tasks/{id}             删除任务
  PUT    /api/tasks/{id}/progress    更新进度
  POST   /api/tasks/split            AI 任务分解
  POST   /api/tasks/assign           AI 智能分配

日程 (6)
  GET    /api/schedule               获取周日程
  POST   /api/schedule               创建日程
  PUT    /api/schedule/{id}          更新日程
  DELETE /api/schedule/{id}          删除日程
  GET    /api/schedule/month         获取月日程
  POST   /api/schedule/parse         自然语言解析日程

群组 (7)
  GET    /api/groups                 我的群组列表
  POST   /api/groups                 创建群组
  GET    /api/groups/{id}            群组详情 (含成员)
  POST   /api/groups/invite          获取邀请码
  POST   /api/groups/respond         响应邀请
  GET    /api/groups/{id}/stats      群组统计
  DELETE /api/groups/{id}/leave      退出群组
  DELETE /api/groups/{id}/members/{uid} 移除成员

AI (1)
  POST   /api/ai/chat               AI 助手对话

通知 (4)
  GET    /api/notifications          通知列表
  GET    /api/notifications/unread-count  未读数量
  PUT    /api/notifications/{id}/read     标记已读
  PUT    /api/notifications/read-all      全部已读
```

### 认证说明

所有 `/api/*` 端点（除 `/auth/register` 和 `/auth/login` 外）都需要在请求头携带 JWT Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 环境配置

### 后端 `.env` 文件

在 `backend/.env` 中配置：

```env
# 基础配置
DEBUG=True
DATABASE_URL=sqlite:///./data/ai_calendar.db
SECRET_KEY=your-secret-key-change-in-production

# AI 配置 (可选 - 不配置则使用本地解析)
AI_PROVIDER=claude                    # claude | gpt
CLAUDE_API_KEY=sk-ant-xxx            # Anthropic API Key
CLAUDE_API_MODEL=claude-sonnet-4-20250514
GPT_API_KEY=sk-xxx                   # OpenAI API Key
GPT_API_MODEL=gpt-4o
```

> **不配置 AI API Key 也可以使用** — 自然语言解析使用本地引擎，对话和分解使用 Mock 回退。

### 前端环境变量

创建 `frontend/.env`：

```env
VITE_API_URL=http://localhost:8000/api
```

---

## 部署指南

### 方案一：Vercel (前端) + Railway (后端) — 推荐

#### 前端部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 在 frontend 目录下部署
cd frontend
vercel

# 3. 设置环境变量
# Vercel Dashboard → Settings → Environment Variables
VITE_API_URL = https://your-backend.railway.app/api
```

#### 后端部署到 Railway

```bash
# 1. 安装 Railway CLI
npm i -g @railway/cli

# 2. 在 backend 目录下部署
cd backend
railway login
railway init
railway up

# 3. 设置环境变量
railway variables set DEBUG=False
railway variables set DATABASE_URL=postgresql://...
railway variables set SECRET_KEY=...
```

### 方案二：单机部署 (开发/演示)

```bash
# 1. 构建前端
cd frontend
npm run build

# 2. 复制前端构建产物到后端
cp -r dist ../backend/static/

# 3. 修改 backend/main.py 挂载静态文件
# 添加:
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="static", html=True), name="static")

# 4. 启动
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# 访问 http://your-server:8000
```

### 方案三：Docker 部署

```dockerfile
# Dockerfile (放在项目根目录)
FROM python:3.11-slim AS backend
WORKDIR /app/backend
COPY backend/ .
RUN pip install -r requirements.txt

FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/ .
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY --from=backend /app/backend /app/backend
COPY --from=frontend /app/frontend/dist /app/static
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Figma 设计对接

### 对接流程

```
Figma 设计稿 (14 个页面)
        │
        ▼
  ┌─────────────────┐
  │ Step 1: 设计审查  │ → Figma Dev Mode 查看每个组件的 CSS 属性
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Step 2: Token 导出│ → 使用 Figma Plugin "Design Tokens" 导出品牌变量
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Step 3: 配置映射  │ → 将 Token 写入 tailwind.config.js theme.extend
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Step 4: 组件开发  │ → 按 Figma 组件结构逐页重写前端代码
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ Step 5: 视觉走查  │ → 对比 Figma 截图，调整像素级差异
  └─────────────────┘
```

### 实用工具

| 工具 | 用途 | 链接 |
|------|------|------|
| Figma Dev Mode | 查看 CSS 属性、间距、颜色 | Figma 内置 |
| Design Tokens Plugin | 导出设计变量 JSON | Figma Community |
| Figma to Code | 自动生成 HTML/Tailwind | Figma Community |
| Tailwind Play | 实时预览 Tailwind 样式 | play.tailwindcss.com |

### 页面 → 组件映射

```
Figma 页面               → 前端文件                      → 状态
──────────────────────────────────────────────────────────────
登录/注册页              → LoginPage.jsx                ✅ 已完成 (需视觉校准)
首页 (Dashboard)         → HomePage.jsx                 ✅ 已完成 (需视觉校准)
任务列表                 → TaskListPage.jsx             ✅ 已完成 (需视觉校准)
DDL 时间线               → DDLPage.jsx                  ✅ 已完成 (需视觉校准)
AI 对话                  → AIChatPage.jsx               ✅ 已完成 (需视觉校准)
AI 任务分解              → AISplitPage.jsx              ✅ 已完成 (需视觉校准)
日历视图                 → CalendarPage.jsx             ✅ 已完成 (需视觉校准)
进度追踪                 → ProgressPage.jsx             ✅ 已完成 (需视觉校准)
数据统计                 → StatsPage.jsx                ✅ 已完成 (需视觉校准)
团队列表                 → GroupPage.jsx                ✅ 已完成 (需视觉校准)
团队管理                 → GroupManagePage.jsx          ✅ 已完成 (需视觉校准)
通知中心                 → NotificationPage.jsx         ✅ 已完成 (需视觉校准)
设置                     → SettingsPage.jsx             ✅ 已完成 (需视觉校准)
个人中心                 → ProfilePage.jsx              ✅ 已完成 (需视觉校准)
```

---

## 开发路线图

### ✅ Phase 1: 基础搭建 (已完成)
- [x] 项目初始化、前后端分离架构
- [x] 数据库模型设计
- [x] JWT 认证系统

### ✅ Phase 2: 核心功能 (已完成)
- [x] 任务 CRUD + 筛选搜索
- [x] 日历视图 + 日程管理
- [x] AI 任务分解 + 对话
- [x] 进度追踪 + DDL 时间线
- [x] 群组管理 + 团队协作
- [x] 自然语言创建日程

### ✅ Phase 3: 完善体验 (已完成)
- [x] 通知系统
- [x] 设置持久化
- [x] Profile 真实统计
- [x] 首页自动刷新
- [x] 下拉刷新

### 🔜 Phase 4: Figma 视觉对齐 (待开始)
- [ ] 从 Figma 导出 Design Token
- [ ] 逐页对齐视觉细节
- [ ] 响应式适配 (移动端/平板/桌面)
- [ ] 深色主题完整实现
- [ ] 动画与微交互

### 🔜 Phase 5: AI 强化 (待开始)
- [ ] 配置 Claude/GPT API Key
- [ ] AI 对话上下文记忆
- [ ] 智能排期推荐
- [ ] 学习模式分析

### 🔜 Phase 6: 生产就绪 (待开始)
- [ ] PostgreSQL 迁移
- [ ] 单元测试 + E2E 测试
- [ ] 错误处理完善
- [ ] 日志系统
- [ ] PWA 支持
- [ ] CI/CD 流水线

---

## 常见问题

### Q: 不配置 AI API Key 能使用吗？
**可以。** 自然语言日期解析使用本地引擎（秒级响应）。AI 对话和任务分解会返回 Mock 引导回复，提示配置 API Key。

### Q: 数据库在哪里？
开发环境使用 SQLite，文件位于 `backend/data/ai_calendar.db`。删除此文件即可重置所有数据。

### Q: 如何更换 AI 模型？
在 `backend/.env` 中修改：
```env
AI_PROVIDER=gpt                    # 切换到 GPT
GPT_API_MODEL=gpt-4o-mini          # 使用更便宜的模型
```

### Q: 如何添加新页面？
1. 在 `frontend/src/pages/` 创建新组件
2. 在 `App.jsx` 中添加路由
3. 如需后端数据，在 `backend/routers/` 添加新路由
4. 在 `frontend/src/utils/api.js` 添加 API 调用函数

### Q: 如何自定义手绘风格？
在 `frontend/src/index.css` 中修改 CSS 变量。主要涉及：
- `--warm-*` 色系变量
- `.hand-card` 卡片圆角/阴影
- `.hand-btn` 按钮样式
- `.hand-input` 输入框样式

---

## 许可证

MIT License

---

## 贡献者

- 设计 & 前端 & 后端: Daisy Dash 团队
- AI 功能开发: Claude (Anthropic)

---

<p align="center">
  <sub>Built with ❤️ using FastAPI + React + Tailwind CSS</sub>
</p>
