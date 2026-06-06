# AI 统筹组长 — 技术文档

> 版本: 2.0 | 日期: 2026-06-06

---

## 1. 技术架构

```
┌──────────────────────────────────────────────┐
│                   用户浏览器                   │
│          React 18 + Tailwind CSS (SPA)        │
│               localhost:5173                   │
├──────────────────────────────────────────────┤
│                  前端应用层                     │
│  ┌──────────┬──────────┬──────────────────┐  │
│  │ 页面组件  │ 自定义组件 │  交互手势/动画   │  │
│  │ 6个核心页 │ TaskCard  │  侧滑/长按      │  │
│  │          │ SkillTag  │  弹跳/转场      │  │
│  │          │ RadarChart│                 │  │
│  └──────────┴──────────┴──────────────────┘  │
├──────────────────────────────────────────────┤
│                  数据持久层                     │
│          localStorage (JSON 序列化)            │
│       store.js — 统一读写接口                   │
├──────────────────────────────────────────────┤
│                AI Mock 服务                    │
│        mockAI.js — 模拟 AI Agent 响应          │
│    (可替换为真实 API: DeepSeek / Claude)        │
└──────────────────────────────────────────────┘
```

**无后端设计**: 本项目为纯前端 SPA，所有数据通过 localStorage 持久化。不需要登录系统、不需要真实后端。AI 交互通过 mockAI.js 模拟，可按需替换为真实 API 调用。

---

## 2. 技术栈

### 2.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| Vite | 6.0+ | 构建工具 |
| Tailwind CSS | 3.4 | 样式框架 |
| React Router | 6.28 | 路由管理 |

### 2.2 数据存储

| 方案 | 用途 |
|------|------|
| localStorage | 项目数据、用户技能、聊天记录 — 持久化 |
| React State | 页面级临时状态 |

### 2.3 AI 服务（Mock / 可选真实接入）

| Provider | 说明 |
|----------|------|
| mockAI.js | 默认 — 预设的模拟 AI 响应，无需 API Key |
| DeepSeek API | 可选 — 通过 VITE_AI_API_KEY 环境变量启用 |

---

## 3. 数据模型

### 3.1 localStorage Keys

```
aical_user_profile   — 用户技能名片
aical_projects       — 项目列表
```

### 3.2 数据结构

```typescript
// 用户技能名片
interface UserProfile {
  name: string
  major: string[]          // 专业方向: ["设计", "计算机"]
  tools: string[]          // 熟练工具: ["Figma", "Python"]
  skills: string[]         // 擅长技能: ["UI设计", "数据分析"]
  created_at: string
}

// 项目
interface Project {
  id: string
  name: string
  description: string
  status: 'discussing' | 'confirmed' | 'in_progress' | 'completed'
  created_at: string
  confirmed_goal: string   // 人工确认的最终方案
  chat_history: ChatMessage[]
  tasks: Task[]
  inspirations: Inspiration[]
}

// 聊天消息
interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: string
  type: 'text' | 'inspiration' | 'authorize'
}

// 子任务
interface Task {
  id: string
  title: string
  description: string
  status: 'unclaimed' | 'in_progress' | 'completed'
  assigned_to: string | null
  difficulty: 1 | 2 | 3 | 4 | 5
  skills_required: string[]
  estimated_days: number
  guide_steps: GuideStep[]
  match_score: number | null   // 技能匹配度 0-100
}

// 操作指南步骤
interface GuideStep {
  title: string
  description: string
  done: boolean
}

// 竞品灵感
interface Inspiration {
  title: string
  description: string
  type: string              // "APP" | "网站" | "论文" | "开源项目"
  tags: string[]
}
```

### 3.3 状态流转

```
项目状态:
  discussing → confirmed → in_progress → completed
                  ↑              |
                  └── 返回修改 ──┘

任务状态:
  unclaimed → in_progress → completed
      ↑                         |
      └──── 取消认领 ────────────┘
```

---

## 4. 文件结构

```
frontend/src/
├── App.jsx                      # 路由配置
├── main.jsx                     # 入口
├── index.css                    # 全局样式 + 手绘风格 + 动画
│
├── components/
│   ├── NavBar.jsx               # 底部导航
│   └── Toast.jsx                # 提示组件
│
├── contexts/
│   └── ThemeContext.jsx          # 主题切换
│
├── pages/
│   ├── ProjectListPage.jsx      # P01 项目列表（首页）
│   ├── SkillProfilePage.jsx     # P02 技能名片
│   ├── DiscussionPage.jsx       # P03 破冰讨论
│   ├── AuthorizePage.jsx        # P04 人工授权
│   ├── KanbanPage.jsx           # P05 任务看板
│   └── TaskDetailPage.jsx       # P06 任务详情
│
├── utils/
│   ├── store.js                 # localStorage 数据管理
│   ├── mockAI.js                # AI 模拟响应
│   └── helpers.js               # 工具函数
│
└── public/
    └── manifest.json            # PWA 配置
```

---

## 5. 关键技术实现

### 5.1 本地数据持久化

使用 `store.js` 封装所有 localStorage 操作，确保数据一致性:
- 每次写入同步序列化为 JSON
- 提供 CRUD 接口
- 支持项目级别的增删改查

### 5.2 手势交互

- **侧滑删除**: 通过 touchstart/touchmove/touchend 事件实现，滑动距离超过阈值显示删除按钮
- **长按编辑**: 通过 setTimeout 检测长按，触发编辑模式

### 5.3 动画系统

- **页面转场**: CSS @keyframes fadeInUp 从底部滑入
- **列表弹跳**: 任务卡片依次出现，使用 staggered animation-delay
- **按钮脉冲**: @keyframes pulse 呼吸发光效果
- **认领成功**: scale + rotate 组合动画

### 5.4 AI 记忆机制

用户技能名片存储在 localStorage 中。新建项目进入讨论页时:
1. 读取 `aical_user_profile`
2. 根据用户专业标签生成定制化问候语
3. 后续 AI 响应基于用户技能调整推荐内容

### 5.5 雷达图

使用纯 SVG 实现五维雷达图，无需额外库。根据用户技能与任务所需技能的交集计算匹配度。

---

## 6. 开发环境

### 6.1 本地启动

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:5173
```

### 6.2 构建

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览生产构建
```

---

## 7. 关键设计决策

### 7.1 为什么纯前端、不需要后端？

- 课程作业演示场景，不需要多用户并发
- localStorage 完全满足数据持久化需求
- 降低部署和环境配置复杂度
- 评委可以直接在浏览器中体验

### 7.2 为什么用 Mock AI 而不是真实 API？

- 避免 API Key 泄露风险
- 演示稳定性：不受网络/限额影响
- Mock 数据可精确控制演示效果
- 代码结构支持随时替换为真实 API

### 7.3 为什么不用拖拽库？

手势交互使用原生 Touch API 实现，避免引入额外依赖，同时满足"手势交互"考核要求的展示效果。
