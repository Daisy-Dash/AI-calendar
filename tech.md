# AI 日程协作者 — 技术文档

> 版本: 1.0 | 日期: 2026-06-03

---

## 1. 技术架构

```
┌──────────────────────────────────────────────────┐
│                    用户浏览器                      │
│          React 18 + Tailwind CSS (PWA)            │
│               localhost:5173 / Vercel             │
├──────────────────────────────────────────────────┤
│                HTTP REST + WebSocket               │
│                JSON / JWT Bearer                   │
├──────────────────────────────────────────────────┤
│                  FastAPI 后端                      │
│              Uvicorn ASGI Server                   │
│               localhost:8000 / Railway             │
│  ┌──────────┬──────────┬──────────┬──────────┐   │
│  │  Auth    │  Tasks   │ Schedule │ Groups   │   │
│  │  Router  │  Router  │  Router  │  Router  │   │
│  ├──────────┼──────────┼──────────┼──────────┤   │
│  │   AI     │  Users   │  Notify  │    WS    │   │
│  │  Router  │  Router  │  Router  │  Router  │   │
│  └──────────┴──────────┴──────────┴──────────┘   │
├──────────────────────────────────────────────────┤
│              AI Services (可插拔)                  │
│     Claude API  │  GPT API  │  DeepSeek API       │
│         本地解析引擎 (中文日期/时间)                │
├──────────────────────────────────────────────────┤
│                 数据存储层                         │
│         SQLite (开发) / PostgreSQL (生产)          │
│            SQLAlchemy ORM 2.0+                    │
└──────────────────────────────────────────────────┘
```

---

## 2. 技术栈

### 2.1 后端

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| Python | 3.10+ | 运行环境 | 团队熟悉 + AI/数据科学生态 |
| FastAPI | 0.115+ | Web 框架 | 高性能异步、自动生成 API 文档、Pydantic 集成 |
| Uvicorn | 0.34+ | ASGI 服务器 | FastAPI 官方推荐 |
| SQLAlchemy | 2.0+ | ORM | Python 最成熟的 ORM |
| python-jose | 3.5+ | JWT 认证 | 标准 JWT 实现 |
| passlib | 1.7+ | 密码哈希 | bcrypt 支持 |
| httpx | 0.28+ | HTTP 客户端 | 异步支持、AI API 调用 |
| Pydantic | 2.10+ | 数据验证 | FastAPI 原生支持 |

### 2.2 前端

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| React | 18.3 | UI 框架 | 生态丰富、团队熟悉 |
| Vite | 6.0+ | 构建工具 | 极快 HMR、ESM 原生 |
| Tailwind CSS | 3.4 | 样式框架 | 原子化 CSS、dark mode 支持 |
| React Router | 6.28 | 路由 | 标准 SPA 路由方案 |
| Axios | 1.7 | HTTP 客户端 | 拦截器、错误处理 |

### 2.3 AI 服务

| Provider | 模型 | API 端点 | 用途 |
|----------|------|---------|------|
| DeepSeek | deepseek-chat | api.deepseek.com/v1 | **当前主力** — 任务分解/分配/对话 |
| Claude | claude-sonnet-4 | api.anthropic.com/v1 | 备选 — 复杂推理 |
| GPT | gpt-4o | api.openai.com/v1 | 备选 — JSON 结构化输出 |
| 本地引擎 | — | 内置 | 中文日期解析（毫秒级，无需API） |

### 2.4 数据库

| 环境 | 数据库 | 连接 |
|------|--------|------|
| 开发 | SQLite | `sqlite:///./data/ai_calendar.db` |
| 生产 | PostgreSQL (推荐) | 通过 Railway/ Supabase 提供 |

### 2.5 部署

| 组件 | 平台 | URL |
|------|------|-----|
| 前端 | Vercel | `https://ai-calendar.vercel.app` |
| 后端 | Railway | `https://ai-calendar-api.railway.app` |
| 数据库 | Railway Postgres | 内网连接 |

---

## 3. 数据库设计

### 3.1 ER 图（简化）

```
users ──1:N──> tasks ──N:1──> groups
  │              │               │
  │              │               │
  ├──1:N──> schedules        group_members (关联表)
  │                     
  ├──1:N──> notifications
  │
  └── (preferences JSON)
```

### 3.2 核心表

| 表名 | 主要字段 | 索引 |
|------|---------|------|
| `users` | id, username, email, password_hash, preferences(JSON) | email(unique), username(unique) |
| `tasks` | id, user_id(FK), group_id(FK), title, deadline, priority(1-4), status, progress(0-100), tags(JSON), assigned_to(FK) | user_id, group_id, parent_id |
| `schedules` | id, user_id(FK), task_id(FK), title, date, start_time, end_time, color, note | user_id, date |
| `groups` | id, name, invite_code(6位), created_by(FK) | invite_code(unique) |
| `group_members` | id, group_id(FK), user_id(FK), role(owner/admin/member), skills | group_id, user_id |
| `notifications` | id, user_id(FK), type, title, message, is_read | user_id, is_read |

### 3.3 任务状态机

```
待办 (PENDING) ──进度>0──> 进行中 (IN_PROGRESS) ──进度100──> 已完成 (COMPLETED)
     ↑                                                          │
     └──────────────── 进度归零 ←───────────────────────────────┘
```

---

## 4. API 设计

### 4.1 认证方案

```
POST /api/auth/register  → JWT Token (7天有效)
POST /api/auth/login     → JWT Token

所有后续请求携带:
Authorization: Bearer <token>
```

### 4.2 端点规范

- **命名**: RESTful，复数名词
- **版本**: 通过 `/api/` 前缀
- **分页**: 暂未实现，数据量小时全量返回
- **筛选**: Query 参数 (`?status_filter=待办&priority=3`)
- **错误**: 标准 HTTP 状态码 + `{"detail": "错误描述"}`

### 4.3 WebSocket

```
ws://host:8000/ws?token=<jwt_token>

消息格式:
→ {"type": "ping"}                    # 心跳
← {"type": "pong"}                    # 心跳响应
← {"type": "connected", ...}          # 连接确认
← {"type": "task_update", ...}        # 任务变更
← {"type": "schedule_update", ...}    # 日程变更
← {"type": "notification", ...}       # 新通知

自动重连: 非认证失败时 5s 后重连
```

---

## 5. 关键设计决策

### 5.1 为什么用 SQLite 而不是 PostgreSQL？

- **开发简单**: 零配置，文件即数据库
- **课程项目**: 不需要生产级并发
- **迁移容易**: SQLAlchemy ORM 只需改 URL 即可切换

### 5.2 为什么 AI Provider 设计为可插拔？

三种 AI Provider（Claude/GPT/DeepSeek）共享相同接口，通过 `.env` 中 `AI_PROVIDER` 切换。无 API Key 时自动回退到本地引擎（日期解析）和智能 Mock（对话/分解）。

### 5.3 为什么移动端优先 430px？

- 目标用户主要在手机上使用
- 430px 是 iPhone 14 Pro Max 的逻辑宽度
- 桌面端居中显示，模拟手机体验
- 后续可扩展为响应式

### 5.4 为什么用手绘风格？

- 降低工具感，减少使用焦虑
- 与大学生群体审美匹配
- 差异化视觉记忆点
- 不规则圆角和阴影模拟纸质笔记本

---

## 6. 技术限制

### 6.1 已知限制

| 限制 | 说明 | 解决方案 |
|------|------|---------|
| SQLite 并发 | 不支持高并发写入 | 生产环境切换到 PostgreSQL |
| 无文件上传 | 不支持任务附件 | 后续集成 Supabase Storage |
| 本地解析覆盖 | 中文日期解析只覆盖常用模式 | 持续扩充正则规则 |
| WebSocket 单进程 | 多进程部署时消息丢失 | 使用 Redis Pub/Sub |
| 无端到端加密 | 团队任务数据明文存储 | 生产环境启用 HTTPS |

### 6.2 性能瓶颈

| 场景 | 瓶颈 | 优化方案 |
|------|------|---------|
| AI API 调用 | 3-5s 延迟 | 本地解析优先、缓存常见模式 |
| 月视图日历 | 前端渲染 30+ 日程 | 虚拟滚动（数据量小时不必要） |
| 通知广播 | WebSocket 全量推送 | 按频道订阅（后续优化） |

### 6.3 安全考虑

- `.env` 文件已在 `.gitignore` 中（但历史中曾提交过 Key，需轮换）
- API Key 不应暴露给前端
- 用户密码使用 bcrypt 哈希（12 rounds）
- CORS 限制为 `localhost:5173` 和 `*.vercel.app`

---

## 7. 开发环境

### 7.1 本地启动

```bash
# 后端
cd backend
uvicorn main:app --reload --port 8000

# 前端
cd frontend
npm run dev

# 访问
前端: http://localhost:5173
后端API文档: http://localhost:8000/docs
```

### 7.2 测试

```bash
cd backend
python -m pytest tests/ -v    # 31个测试
```

### 7.3 构建

```bash
cd frontend
npm run build                  # 输出到 dist/

# 预览生产构建
npm run preview
```
