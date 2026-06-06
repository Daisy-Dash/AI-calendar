const delay = (ms) => new Promise(r => setTimeout(r, ms))

export async function getAIGreeting(userProfile) {
  await delay(800)
  if (!userProfile) {
    return '你好！我是你的 AI 统筹组长。告诉我你们这次大作业的要求吧，我会先帮你做调研和分析。'
  }
  const major = userProfile.major?.[0] || '跨学科'
  const skill = userProfile.skills?.[0] || ''
  const greetings = {
    '设计': `你好！我看到你是设计方向的同学${skill ? '，擅长' + skill : ''}。我会根据你的专业背景，优先从设计视角帮你分析项目方向。有什么大作业需要我帮忙统筹的吗？`,
    '计算机': `你好！看到你是计算机方向的${skill ? '，擅长' + skill : ''}。技术类项目我很熟悉，我会帮你从技术可行性角度做调研。说说你们的作业要求吧！`,
    '商科': `你好！你是商科方向的同学${skill ? '，擅长' + skill : ''}。我会从商业分析和市场调研的角度帮你梳理项目思路。告诉我你们的课题吧！`,
    '文学': `你好！你是文学方向的同学${skill ? '，擅长' + skill : ''}。我会帮你从内容策划和叙事结构的角度来分析项目。说说你们的任务是什么？`,
  }
  return greetings[major] || `你好！我看到你是${major}方向的同学${skill ? '，擅长' + skill : ''}。我会根据你的专业特点来帮你做项目调研和规划。告诉我你们的大作业要求吧！`
}

export async function getCompetitorResearch(topic) {
  await delay(1500)
  const researchDB = {
    'app': {
      inspirations: [
        { title: 'Notion', description: '全能协作工具，模块化页面设计，支持数据库、看板、文档等多种视图', type: 'APP', tags: ['协作', '模块化'] },
        { title: 'Trello', description: '经典看板工具，以卡片式任务管理著称，简洁直观', type: 'APP', tags: ['看板', '简洁'] },
        { title: 'Linear', description: '新一代项目管理，极致流畅的交互动画，专注软件开发团队', type: 'APP', tags: ['动画', '效率'] },
        { title: 'Figma', description: '协同设计工具，实时多人编辑，组件化设计系统', type: 'APP', tags: ['设计', '协同'] },
      ],
      message: '我搜索了一些相关的产品案例供你参考。这些产品各有特色：Notion 强在灵活性，Trello 强在简洁，Linear 强在交互体验。你们可以讨论一下想往哪个方向靠近，或者结合多个产品的优点。',
    },
    '日程': {
      inspirations: [
        { title: 'Google Calendar', description: '主流日历工具，多视图切换，智能日程建议', type: 'APP', tags: ['日历', '智能'] },
        { title: 'TickTick', description: '任务+日历一体化，番茄钟、习惯追踪等多功能集成', type: 'APP', tags: ['任务管理', '习惯'] },
        { title: 'Fantastical', description: '自然语言输入创建日程，精美的界面设计', type: 'APP', tags: ['自然语言', '设计'] },
        { title: '飞书日历', description: '企业级日程管理，会议室预定，智能排期', type: 'APP', tags: ['企业', '协作'] },
      ],
      message: '这些是日程管理领域的代表性产品。Google Calendar 是行业标杆，TickTick 做了有趣的功能融合，Fantastical 的自然语言交互很值得借鉴。你们觉得哪些特点值得参考？',
    },
    '设计': {
      inspirations: [
        { title: 'Dribbble', description: '设计师社区，展示和发现创意作品，是设计灵感的重要来源', type: '网站', tags: ['灵感', '社区'] },
        { title: 'Behance', description: 'Adobe 旗下创意平台，展示完整项目案例，注重作品集展示', type: '网站', tags: ['作品集', '案例'] },
        { title: 'Material Design 3', description: 'Google 最新设计系统，动态颜色、自适应布局', type: '设计系统', tags: ['规范', '组件'] },
        { title: 'Apple HIG', description: 'Apple 人机界面指南，定义了 iOS 生态的交互标准', type: '设计系统', tags: ['规范', '交互'] },
      ],
      message: '设计类项目可以从这些平台获取灵感。建议先确定你们的设计方向（APP/网页/品牌），我再帮你做更精准的竞品分析。',
    },
  }

  const lowerTopic = topic.toLowerCase()
  for (const [key, value] of Object.entries(researchDB)) {
    if (lowerTopic.includes(key)) return value
  }

  return {
    inspirations: [
      { title: '相关案例 A', description: `基于"${topic}"的方向，这是一个在功能设计上值得参考的案例，注重用户体验和流程设计`, type: 'APP', tags: ['参考', '用户体验'] },
      { title: '相关案例 B', description: '另一个相关领域的产品，在视觉风格和交互细节上做得很出色', type: '网站', tags: ['视觉', '交互'] },
      { title: '学术参考', description: '相关领域的研究论文或设计理论，可以为你们的方案提供理论支撑', type: '论文', tags: ['理论', '支撑'] },
      { title: '开源项目', description: '类似方向的开源实现，可以参考其技术架构和功能设计', type: '开源项目', tags: ['技术', '架构'] },
    ],
    message: `关于"${topic}"，我找到了一些参考资料。这些案例覆盖了产品设计、学术理论和技术实现三个维度。你们可以先浏览一下，讨论后告诉我想往哪个方向深入。`,
  }
}

export async function getChatResponse(message, context) {
  await delay(1000)
  const lower = message.toLowerCase()

  if (lower.includes('确定') || lower.includes('就这个') || lower.includes('方案') || lower.includes('开始')) {
    return {
      type: 'authorize',
      content: `好的！看起来你们已经有了明确的方向。在我开始拆解任务之前，需要你正式确认这个方案。点击下方的"确认方案"按钮，我就会开始智能拆解任务。`,
    }
  }

  if (lower.includes('怎么做') || lower.includes('如何') || lower.includes('建议')) {
    return {
      type: 'text',
      content: `基于你们目前的讨论，我建议分几个阶段来推进：\n\n1. 先做竞品调研，了解市场上已有的方案\n2. 确定你们的差异化定位\n3. 制定功能清单和优先级\n4. 拆分为可执行的子任务\n\n你们觉得这个思路怎么样？或者有其他想法也可以告诉我。`,
    }
  }

  if (lower.includes('不知道') || lower.includes('没想法') || lower.includes('迷茫')) {
    return {
      type: 'text',
      content: '没关系，很多优秀的项目都是从"没想法"开始的！我建议你先告诉我大作业的基本要求（课程名、交付物类型、截止日期），我来帮你搜索一些往届优秀案例和灵感方向。',
    }
  }

  return {
    type: 'text',
    content: `我理解了。关于"${message.slice(0, 20)}${message.length > 20 ? '...' : ''}"，让我从几个角度来分析：\n\n首先，这个方向有一定的可行性，但需要注意控制范围。建议你们先聚焦核心功能，把MVP做扎实。\n\n你们团队里有几个人？各自擅长什么？这样我可以更好地帮你们规划分工。`,
  }
}

export async function decomposeTask(goal, userProfile) {
  await delay(2000)
  const userSkills = userProfile?.skills || []
  const taskTemplates = [
    {
      title: '需求分析与方案设计',
      description: '整理项目需求，撰写功能清单和方案设计文档，确定技术路线',
      difficulty: 2,
      skills_required: ['文案撰写', '需求分析', '产品设计'],
      estimated_days: 2,
      guide_steps: [
        { title: '梳理核心需求', description: '列出项目必须实现的3-5个核心功能，区分"必做"和"可选"', done: false },
        { title: '画流程图', description: '用 Figma/draw.io 画出用户使用流程，从"打开App"到"完成任务"', done: false },
        { title: '撰写方案文档', description: '用 Word/Markdown 整理需求清单、功能描述、技术选型', done: false },
      ],
    },
    {
      title: 'UI/UX 界面设计',
      description: '设计高保真界面原型，包含配色方案、组件库、交互动效设计',
      difficulty: 3,
      skills_required: ['UI设计', 'Figma', '视觉设计'],
      estimated_days: 3,
      guide_steps: [
        { title: '确定设计风格', description: '选择配色方案（推荐暖色调）、字体搭配、圆角风格', done: false },
        { title: '设计组件库', description: '在 Figma 中创建按钮、卡片、输入框等可复用组件', done: false },
        { title: '绘制高保真页面', description: '按页面流程逐一设计每个界面，注意一致性', done: false },
        { title: '标注与切图', description: '为开发者标注间距、字号、颜色值，导出切图素材', done: false },
      ],
    },
    {
      title: '前端页面开发',
      description: '基于设计稿实现前端界面，包含页面布局、组件交互、手势支持',
      difficulty: 4,
      skills_required: ['前端开发', 'React', 'CSS'],
      estimated_days: 4,
      guide_steps: [
        { title: '搭建项目框架', description: '使用 Vite + React 初始化项目，配置 Tailwind CSS', done: false },
        { title: '实现页面布局', description: '按照设计稿逐页实现 HTML 结构和 CSS 样式', done: false },
        { title: '添加交互逻辑', description: '实现按钮点击、表单提交、页面跳转等交互', done: false },
        { title: '手势与动画', description: '实现侧滑删除、长按编辑等手势，添加转场动画', done: false },
        { title: '数据持久化', description: '使用 localStorage 存储数据，确保App重启不丢失', done: false },
      ],
    },
    {
      title: '竞品调研报告',
      description: '搜集并分析3-5个同类产品，总结优劣势，提炼可借鉴的设计点',
      difficulty: 2,
      skills_required: ['调研分析', '文案撰写', 'PPT'],
      estimated_days: 2,
      guide_steps: [
        { title: '筛选竞品', description: '在应用商店/网页搜索3-5个相关产品，下载体验', done: false },
        { title: '功能对比', description: '列表对比各竞品的核心功能、交互方式、视觉风格', done: false },
        { title: '撰写报告', description: '总结分析结论，提出可借鉴的设计建议', done: false },
      ],
    },
    {
      title: '演示材料准备',
      description: '制作演示 PPT、录制功能演示视频、撰写分工说明书',
      difficulty: 2,
      skills_required: ['PPT', '视频剪辑', '演讲'],
      estimated_days: 2,
      guide_steps: [
        { title: '制作 PPT', description: '包含项目背景、功能介绍、技术亮点、团队分工等', done: false },
        { title: '录制演示视频', description: '操作App完整走一遍核心流程，确保流畅无Bug', done: false },
        { title: '撰写分工说明', description: '明确标注每个组员的具体贡献和负责模块', done: false },
      ],
    },
  ]

  return taskTemplates.map((t, i) => {
    const matchingSkills = t.skills_required.filter(s =>
      userSkills.some(us => us.includes(s) || s.includes(us))
    )
    const matchScore = t.skills_required.length > 0
      ? Math.round((matchingSkills.length / t.skills_required.length) * 100)
      : 50

    return {
      id: `task_${Date.now()}_${i}`,
      ...t,
      status: 'unclaimed',
      assigned_to: null,
      match_score: matchScore,
      guide_steps: t.guide_steps.map(s => ({ ...s, done: false })),
    }
  })
}

export function calculateMatchScore(task, userProfile) {
  if (!userProfile || !task.skills_required) return 50
  const userSkills = [...(userProfile.skills || []), ...(userProfile.tools || [])]
  const matchCount = task.skills_required.filter(req =>
    userSkills.some(us => us.includes(req) || req.includes(us))
  ).length
  return Math.round((matchCount / Math.max(task.skills_required.length, 1)) * 100)
}
