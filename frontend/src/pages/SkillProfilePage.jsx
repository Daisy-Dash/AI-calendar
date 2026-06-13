import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userAPI } from '../utils/api'

const MAJOR_OPTIONS = ['设计', '计算机', '商科', '文学', '工程', '理学', '医学', '教育', '艺术', '传媒']

// 专业 → 推荐工具 / 技能 映射
const MAJOR_MAP = {
  '设计': {
    tools: ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'PPT', 'After Effects', 'Blender', 'XD', 'InDesign'],
    skills: ['UI设计', '视觉设计', '交互设计', '用户研究', '产品设计', '原型设计', '插画', '海报设计', 'LOGO设计'],
  },
  '计算机': {
    tools: ['Python', 'JavaScript', 'React', 'Vue', 'Git', 'VSCode', 'Docker', 'MySQL', 'MongoDB', 'Linux'],
    skills: ['前端开发', '后端开发', '算法设计', '测试', '数据库设计', '系统架构', 'DevOps', '机器学习'],
  },
  '商科': {
    tools: ['PPT', 'Excel', 'Word', 'Tableau', 'SPSS', 'Power BI', 'Notion'],
    skills: ['市场分析', '调研分析', '统计分析', '文案撰写', '项目管理', '演讲汇报', '商业策划', '财务分析'],
  },
  '文学': {
    tools: ['Word', 'Markdown', 'Notion', 'PPT', 'WPS'],
    skills: ['文案撰写', '演讲汇报', '调研分析', '编辑校对', '内容策划', '翻译'],
  },
  '工程': {
    tools: ['AutoCAD', 'MATLAB', 'SolidWorks', 'Excel', 'Python', 'Origin'],
    skills: ['产品设计', '统计分析', '项目管理', '算法设计', '3D建模', '工程制图', '机械设计'],
  },
  '理学': {
    tools: ['Python', 'MATLAB', 'SPSS', 'Excel', 'R', 'Origin', 'LaTeX'],
    skills: ['数据分析', '统计分析', '算法设计', '调研分析', '文献综述', '实验设计'],
  },
  '医学': {
    tools: ['SPSS', 'Excel', 'Word', 'PPT', 'EndNote', 'R'],
    skills: ['调研分析', '统计分析', '文案撰写', '演讲汇报', '文献综述', '实验设计', '临床研究'],
  },
  '教育': {
    tools: ['PPT', 'Word', 'Notion', 'Excel', 'Canva'],
    skills: ['演讲汇报', '文案撰写', '调研分析', '项目管理', '课程设计', '教学设计'],
  },
  '艺术': {
    tools: ['Photoshop', 'Illustrator', 'Premiere', 'After Effects', 'Blender', 'Procreate'],
    skills: ['视觉设计', 'UI设计', '视频剪辑', '3D建模', '插画', '动画设计', '美术创作'],
  },
  '传媒': {
    tools: ['Premiere', 'After Effects', 'Photoshop', 'Word', 'PPT', 'Final Cut', 'OBS'],
    skills: ['视频剪辑', '文案撰写', '演讲汇报', '视觉设计', '内容策划', '直播运营', '新媒体运营'],
  },
}

// 所有工具/技能（去重后排序），供搜索时全量浏览
const ALL_TOOLS = [...new Set(Object.values(MAJOR_MAP).flatMap(m => m.tools))].sort()
const ALL_SKILLS = [...new Set(Object.values(MAJOR_MAP).flatMap(m => m.skills))].sort()

const DEFAULT_CAKIE_AVATAR = '/assets/cakie/头像_草莓蛋糕_avatar-strawberry.png'

// 蛋糕切角头像选项 - 不同口味
const AVATAR_OPTIONS = [
  { src: '/assets/cakie/头像_草莓蛋糕_avatar-strawberry.png', label: '草莓蛋糕' },
  { src: '/assets/cakie/头像_猕猴桃蛋糕_avatar-kiwi.png', label: '猕猴桃蛋糕' },
  { src: '/assets/cakie/头像_柠檬蛋糕_avatar-lemon.png', label: '柠檬蛋糕' },
  { src: '/assets/cakie/头像_葡萄蛋糕_avatar-grape.png', label: '葡萄蛋糕' },
  { src: '/assets/cakie/头像_蓝莓蛋糕_avatar-blueberry.png', label: '蓝莓蛋糕' },
  { src: '/assets/cakie/头像_蜜桃蛋糕_avatar-peach.png', label: '蜜桃蛋糕' },
  { src: '/assets/cakie/头像_巧克力蛋糕_avatar-chocolate.png', label: '巧克力蛋糕' },
  { src: '/assets/cakie/头像_抹茶蛋糕_avatar-matcha.png', label: '抹茶蛋糕' },
]

function CakieProfileAvatar({ src, className = '', alt = '蛋糕头像' }) {
  const [failed, setFailed] = useState(false)
  const imageSrc = typeof src === 'string' && src.startsWith('/assets/cakie/') ? src : DEFAULT_CAKIE_AVATAR

  if (failed) {
    return <span className={`cakie-avatar-image-fallback ${className}`}>蛋糕头像</span>
  }

  return <img src={imageSrc} alt={alt} className={className} onError={() => setFailed(true)} />
}

function CakieMenuAssistant() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className="cakie-skill-agent cakie-placeholder">CAKIE 小蛋糕助手</span>
  }

  return (
    <img
      src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
      alt="Team CAKIE AI 小蛋糕助手"
      className="cakie-skill-agent"
      onError={() => setFailed(true)}
    />
  )
}

export default function SkillProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_CAKIE_AVATAR)
  const [selectedMajors, setSelectedMajors] = useState([])
  const [selectedTools, setSelectedTools] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('skills') // profile | skills
  const [toolSearch, setToolSearch] = useState('')
  const [skillSearch, setSkillSearch] = useState('')
  const [showAllTools, setShowAllTools] = useState(false)
  const [showAllSkills, setShowAllSkills] = useState(false)

  // 根据已选专业计算推荐
  const recommendedTools = [...new Set(selectedMajors.flatMap(m => MAJOR_MAP[m]?.tools || []))]
  const recommendedSkills = [...new Set(selectedMajors.flatMap(m => MAJOR_MAP[m]?.skills || []))]

  // 搜索过滤
  const filteredTools = toolSearch.trim()
    ? ALL_TOOLS.filter(t => t.toLowerCase().includes(toolSearch.trim().toLowerCase()))
    : (showAllTools ? ALL_TOOLS : recommendedTools)
  const filteredSkills = skillSearch.trim()
    ? ALL_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.trim().toLowerCase()))
    : (showAllSkills ? ALL_SKILLS : recommendedSkills)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setSelectedAvatar(typeof user.avatar === 'string' && user.avatar.startsWith('/assets/cakie/') ? user.avatar : DEFAULT_CAKIE_AVATAR)
      setSelectedMajors(user.major || [])
      setSelectedTools(user.tools || [])
      setSelectedSkills(user.skills || [])
    }
  }, [user])

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await userAPI.updateProfile({
        username: username.trim() || undefined,
        avatar: selectedAvatar,
        major: selectedMajors,
        tools: selectedTools,
        skills: selectedSkills,
      })
      updateUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(e.response?.data?.detail || '保存失败')
    }
    setSaving(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount()
      logout()
      navigate('/login')
    } catch (e) {
      alert(e.response?.data?.detail || '注销失败，请稍后重试')
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div className="cakie-skill-page px-4 pt-6 pb-24 fade-in-up">
      {/* 头部 */}
      <div className="cakie-skill-header flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="cakie-skill-back text-rosa-400 text-lg flex items-center"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-5 h-5" alt="" /></button>
        <div>
          <p className="cakie-skill-kicker">TEAM CAKIE · MENU CARD</p>
          <h1 className="text-xl font-hand text-choco-600">来完善你的 CAKIE 菜单卡</h1>
        </div>
      </div>

      {/* 个人信息卡片 */}
      <div className="hand-card mb-4 bg-gradient-to-r from-rosa-50 to-lilac-50 border-rosa-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="cakie-profile-avatar">
            <CakieProfileAvatar src={selectedAvatar} className="cakie-avatar-image" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-medium text-choco-600 truncate">{user?.username || '未设置昵称'}</p>
            <p className="text-xs text-choco-300 mt-0.5">📧 {user?.email || ''}</p>
            <div className="flex items-center gap-2 mt-1">
              {selectedMajors.slice(0, 2).map(m => (
                <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-rosa-400 border border-rosa-100">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="cakie-skill-tabs flex mb-4 p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'is-active text-rosa-400' : 'text-choco-300'
          }`}
        >
          个人资料
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'skills' ? 'is-active text-rosa-400' : 'text-choco-300'
          }`}
        >
          技能名片
        </button>
      </div>

      {activeTab === 'profile' ? (
        <>
          {/* 头像选择 */}
          <div className="hand-card mb-4">
            <h3 className="text-sm font-medium text-choco-500 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rosa-300" />
              选择头像
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_OPTIONS.map(opt => (
                <button
                  key={opt.src}
                  onClick={() => { setSelectedAvatar(opt.src); setSaved(false) }}
                  className={`cakie-avatar-option transition-all ${
                    selectedAvatar === opt.src ? 'is-selected' : ''
                  }`}
                  title={opt.label}
                >
                  <CakieProfileAvatar src={opt.src} className="cakie-avatar-image" alt={opt.label} />
                </button>
              ))}
            </div>
          </div>

          {/* 昵称 */}
          <div className="hand-card mb-4">
            <h3 className="text-sm font-medium text-choco-500 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-dusty-300" />
              昵称
            </h3>
            <input
              className="hand-input text-sm"
              placeholder="输入你的昵称"
              value={username}
              onChange={e => { setUsername(e.target.value); setSaved(false) }}
            />
          </div>

          {/* 账号信息 */}
          <div className="hand-card mb-4">
            <h3 className="text-sm font-medium text-choco-500 mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lilac-300" />
              账号信息
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-xl">
                <span className="text-xs text-choco-400">邮箱</span>
                <span className="text-xs text-choco-300">{user?.email || '-'}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-cream-50 rounded-xl">
                <span className="text-xs text-choco-400">注册时间</span>
                <span className="text-xs text-choco-300">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="hand-btn w-full text-sm py-3 mb-4"
            disabled={saving}
            style={saved ? { background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66' } : {}}
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存修改'}
          </button>

          {/* 退出登录 & 注销 */}
          <div className="space-y-3 mt-6">
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-xl text-sm text-choco-400 bg-cream-100 border border-cream-200 hover:bg-cream-200 transition-all active:scale-[0.98]"
            >
              退出登录
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl text-sm text-rosa-400 bg-white border border-rosa-100 hover:bg-rosa-50 transition-all active:scale-[0.98]"
            >
              注销账号
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 技能名片提示 */}
          <div className="cakie-skill-intro mb-5">
            <CakieMenuAssistant />
            <div className="cakie-skill-intro-bubble">
              <p className="text-sm font-medium text-choco-600">先抽出你的专业菜单牌吧～</p>
              <p className="text-[11px] text-choco-300 mt-1">选好后，我会为你摊开合适的工具与技能配料。</p>
            </div>
          </div>

          {/* 专业方向 */}
          <div className="cakie-major-section mb-5">
            <div className="text-center mb-4">
              <p className="cakie-skill-step">MENU STEP 01</p>
              <h3 className="text-lg font-hand text-choco-600">
                你的专业？ <span className="text-rosa-400">*</span>
              </h3>
              <p className="text-[10px] text-choco-300 mt-1">点击菜单牌，把你的方向抽出来</p>
            </div>
            <div className="cakie-major-deck">
              {MAJOR_OPTIONS.map((major, index) => (
                <button
                  key={major}
                  onClick={() => toggleItem(selectedMajors, setSelectedMajors, major)}
                  className={`cakie-major-card ${selectedMajors.includes(major) ? 'is-selected' : ''}`}
                  style={{ '--card-tilt': `${[-4, -2, 1, 3, -3, 2, 4, -1, 2, -2][index]}deg`, '--card-delay': `${index * 35}ms` }}
                >
                  <span className="cakie-major-card-number">{String(index + 1).padStart(2, '0')}</span>
                  {major}
                  <span className="cakie-major-card-mark">CAKIE</span>
                </button>
              ))}
            </div>
          </div>

          {selectedMajors.length > 0 && (
          <div className="cakie-ingredients-stage">
          <div className="cakie-dashed-divider mb-5" />
          <div className="text-center mb-4">
            <p className="cakie-skill-step">MENU STEP 02</p>
            <h3 className="text-lg font-hand text-choco-600">你的拿手配料？</h3>
            <p className="text-[10px] text-choco-300 mt-1">挑选工具和技能贴纸，组合你的专属菜单</p>
          </div>

          {/* 工具 */}
          <div className="cakie-ingredient-card mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-dusty-300" />
              <h3 className="text-sm font-medium text-choco-500 flex-1">工具配料</h3>
              {selectedMajors.length > 0 && !toolSearch && (
                <button
                  onClick={() => setShowAllTools(!showAllTools)}
                  className="cakie-ingredient-toggle text-[10px] px-2 py-0.5 text-choco-400 transition-all"
                >
                  {showAllTools ? '看推荐' : '看全部'}
                </button>
              )}
            </div>
            {/* 搜索框 */}
            <div className="relative mb-3">
              <input
                value={toolSearch}
                onChange={e => setToolSearch(e.target.value)}
                placeholder="🔍 搜索工具（找不到心仪的 tag？）"
                className="cakie-ingredient-search w-full px-3 py-2 text-xs focus:outline-none transition-all"
              />
              {toolSearch && (
                <button
                  onClick={() => setToolSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-choco-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {/* 已选状态提示 */}
            {selectedMajors.length === 0 && !toolSearch && (
              <p className="text-[10px] text-choco-300 mb-2">💡 选择专业后会推荐对口工具，或用搜索框找特定工具</p>
            )}
            {selectedMajors.length > 0 && !toolSearch && !showAllTools && recommendedTools.length > 0 && (
              <p className="text-[10px] text-dusty-500 mb-2">
                🍡 根据「{selectedMajors.join('、')}」专业推荐 {recommendedTools.length} 个工具
              </p>
            )}
            <div className="cakie-sticker-flow">
              {filteredTools.length === 0 ? (
                <p className="text-xs text-choco-200 py-2">
                  {toolSearch ? `未找到含「${toolSearch}」的工具` : '请先选择专业方向'}
                </p>
              ) : (
                filteredTools.map(tool => (
                  <button
                    key={tool}
                    onClick={() => toggleItem(selectedTools, setSelectedTools, tool)}
                    className={`cakie-ingredient-sticker is-tool ${selectedTools.includes(tool) ? 'is-selected' : ''}`}
                  >
                    {tool}
                  </button>
                ))
              )}
            </div>
            {/* 已选工具汇总（如果有不在当前过滤结果里的） */}
            {selectedTools.some(t => !filteredTools.includes(t)) && (
              <div className="mt-3 pt-3 border-t border-cream-200">
                <p className="text-[10px] text-choco-300 mb-1.5">已选其他工具：</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTools.filter(t => !filteredTools.includes(t)).map(tool => (
                    <button
                      key={tool}
                      onClick={() => toggleItem(selectedTools, setSelectedTools, tool)}
                      className="skill-tag skill-tag-selected-dusty"
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 技能 */}
          <div className="cakie-ingredient-card mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-lilac-300" />
              <h3 className="text-sm font-medium text-choco-500 flex-1">技能配料</h3>
              {selectedMajors.length > 0 && !skillSearch && (
                <button
                  onClick={() => setShowAllSkills(!showAllSkills)}
                  className="cakie-ingredient-toggle text-[10px] px-2 py-0.5 text-choco-400 transition-all"
                >
                  {showAllSkills ? '看推荐' : '看全部'}
                </button>
              )}
            </div>
            <div className="relative mb-3">
              <input
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                placeholder="🔍 搜索技能（找不到心仪的 tag？）"
                className="cakie-ingredient-search w-full px-3 py-2 text-xs focus:outline-none transition-all"
              />
              {skillSearch && (
                <button
                  onClick={() => setSkillSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-choco-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {selectedMajors.length === 0 && !skillSearch && (
              <p className="text-[10px] text-choco-300 mb-2">💡 选择专业后会推荐对口技能，或用搜索框找特定技能</p>
            )}
            {selectedMajors.length > 0 && !skillSearch && !showAllSkills && recommendedSkills.length > 0 && (
              <p className="text-[10px] text-lilac-500 mb-2">
                🍡 根据「{selectedMajors.join('、')}」专业推荐 {recommendedSkills.length} 个技能
              </p>
            )}
            <div className="cakie-sticker-flow">
              {filteredSkills.length === 0 ? (
                <p className="text-xs text-choco-200 py-2">
                  {skillSearch ? `未找到含「${skillSearch}」的技能` : '请先选择专业方向'}
                </p>
              ) : (
                filteredSkills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleItem(selectedSkills, setSelectedSkills, skill)}
                    className={`cakie-ingredient-sticker is-skill ${selectedSkills.includes(skill) ? 'is-selected' : ''}`}
                  >
                    {skill}
                  </button>
                ))
              )}
            </div>
            {selectedSkills.some(s => !filteredSkills.includes(s)) && (
              <div className="mt-3 pt-3 border-t border-cream-200">
                <p className="text-[10px] text-choco-300 mb-1.5">已选其他技能：</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkills.filter(s => !filteredSkills.includes(s)).map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleItem(selectedSkills, setSelectedSkills, skill)}
                      className="skill-tag skill-tag-selected-lilac"
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 保存技能 */}
          <button
            onClick={handleSave}
            className="hand-btn cakie-menu-save w-full text-sm py-3"
            disabled={saving || selectedMajors.length === 0}
            style={saved ? { background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66' } : {}}
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存我的菜单'}
          </button>
          </div>
          )}
        </>
      )}

      {/* 注销确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 bg-transparent" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-[340px] p-5 fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-base font-medium text-choco-600 mt-2">确定注销账号？</h3>
              <p className="text-xs text-choco-300 mt-1">注销后所有数据将被删除，无法恢复</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-choco-400 bg-cream-100 border border-cream-200"
              >
                取消
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 rounded-xl text-sm text-white bg-rosa-400"
                style={{ boxShadow: '0 2px 0 #B37474' }}
              >
                确认注销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
