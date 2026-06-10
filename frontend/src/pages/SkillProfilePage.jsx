import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { userAPI } from '../utils/api'

const MAJOR_OPTIONS = ['设计', '计算机', '商科', '文学', '工程', '理学', '医学', '教育', '艺术', '传媒']
const TOOL_OPTIONS = ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'PPT', 'Excel', 'Word', 'Python', 'JavaScript', 'React', 'Vue', 'Premiere', 'After Effects', 'Blender', 'AutoCAD', 'MATLAB', 'SPSS', 'Tableau', 'Notion', 'Markdown']
const SKILL_OPTIONS = ['UI设计', '视觉设计', '交互设计', '用户研究', '前端开发', '后端开发', '数据分析', '文案撰写', '演讲汇报', '项目管理', '调研分析', '视频剪辑', '3D建模', '产品设计', '市场分析', '统计分析', '算法设计', '测试']

// 蛋糕切角头像选项 - 不同颜色/形状
const AVATAR_OPTIONS = [
  { emoji: '🍰', label: '草莓蛋糕' },
  { emoji: '🧁', label: '杯子蛋糕' },
  { emoji: '🎂', label: '生日蛋糕' },
  { emoji: '🍩', label: '甜甜圈' },
  { emoji: '🍪', label: '曲奇饼' },
  { emoji: '🍫', label: '巧克力' },
  { emoji: '🍬', label: '糖果' },
  { emoji: '🍭', label: '棒棒糖' },
  { emoji: '🧇', label: '华夫饼' },
  { emoji: '🍮', label: '布丁' },
  { emoji: '🍡', label: '团子' },
  { emoji: '🥐', label: '可颂' },
]

export default function SkillProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuth()
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('🍪')
  const [selectedMajors, setSelectedMajors] = useState([])
  const [selectedTools, setSelectedTools] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // profile | skills

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setSelectedAvatar(user.avatar || '🍪')
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
    <div className="px-4 pt-6 pb-24 fade-in-up">
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-rosa-400 text-lg">←</button>
        <h1 className="text-xl font-hand text-choco-600">我的</h1>
      </div>

      {/* 个人信息卡片 */}
      <div className="hand-card mb-4 bg-gradient-to-r from-rosa-50 to-lilac-50 border-rosa-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white border-2 border-rosa-200 flex items-center justify-center text-3xl shadow-sm">
            {selectedAvatar}
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
      <div className="flex mb-4 bg-cream-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-white text-rosa-400 shadow-sm' : 'text-choco-300'
          }`}
        >
          个人资料
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'skills' ? 'bg-white text-rosa-400 shadow-sm' : 'text-choco-300'
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
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map(opt => (
                <button
                  key={opt.emoji}
                  onClick={() => { setSelectedAvatar(opt.emoji); setSaved(false) }}
                  className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
                    selectedAvatar === opt.emoji
                      ? 'bg-gradient-to-br from-rosa-200 to-rosa-300 border-2 border-rosa-400 scale-105 shadow-sm'
                      : 'bg-cream-50 border border-cream-200 hover:bg-rosa-50'
                  }`}
                  title={opt.label}
                >
                  {opt.emoji}
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
          <div className="hand-card mb-4 bg-gradient-to-r from-rosa-50 to-cream-200">
            <div className="flex items-center gap-2">
              <span className="text-lg">🍬</span>
              <span className="text-sm text-rosa-500">AI 会根据你的技能为你匹配最合适的任务</span>
            </div>
          </div>

          {/* 专业方向 */}
          <div className="hand-card mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-rosa-300" />
              <h3 className="text-sm font-medium text-choco-500">
                你的专业方向 <span className="text-rosa-400">*</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {MAJOR_OPTIONS.map(major => (
                <button
                  key={major}
                  onClick={() => toggleItem(selectedMajors, setSelectedMajors, major)}
                  className={`skill-tag ${selectedMajors.includes(major) ? 'skill-tag-selected-rosa' : ''}`}
                >
                  {major}
                </button>
              ))}
            </div>
          </div>

          {/* 工具 */}
          <div className="hand-card mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-dusty-300" />
              <h3 className="text-sm font-medium text-choco-500">你熟练的工具</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOOL_OPTIONS.map(tool => (
                <button
                  key={tool}
                  onClick={() => toggleItem(selectedTools, setSelectedTools, tool)}
                  className={`skill-tag ${selectedTools.includes(tool) ? 'skill-tag-selected-dusty' : ''}`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          {/* 技能 */}
          <div className="hand-card mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-lilac-300" />
              <h3 className="text-sm font-medium text-choco-500">你擅长的技能</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(skill => (
                <button
                  key={skill}
                  onClick={() => toggleItem(selectedSkills, setSelectedSkills, skill)}
                  className={`skill-tag ${selectedSkills.includes(skill) ? 'skill-tag-selected-lilac' : ''}`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* 保存技能 */}
          <button
            onClick={handleSave}
            className="hand-btn w-full text-sm py-3"
            disabled={saving || selectedMajors.length === 0}
            style={saved ? { background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66' } : {}}
          >
            {saving ? '保存中...' : saved ? '已保存 ✓' : '保存技能名片'}
          </button>
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
