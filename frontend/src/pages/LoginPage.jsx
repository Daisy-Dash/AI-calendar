<<<<<<< HEAD
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
=======
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function LoginPage() {
<<<<<<< HEAD
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
=======
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState(1) // 1=表单, 2=专业技能(仅注册)
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    major: '', skills: [],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [majorsData, setMajorsData] = useState(null)
  const { login, register } = useAuth()
  const navigate = useNavigate()
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b

  useEffect(() => {
    axios.get(`${API_BASE.replace(/\/api$/, '')}/api/data/majors`)
      .then(res => setMajorsData(res.data))
      .catch(() => {})
  }, [])

  const handleNextStep = (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
<<<<<<< HEAD
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败，请检查邮箱和密码')
=======
    if (form.password !== form.confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    if (form.password.length < 6) {
      setError('密码至少6位')
      return
    }
    setStep(2)
  }

  const handleRegister = async () => {
    setError('')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password, form.major, form.skills)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '注册失败，请重试')
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const selectedMajor = majorsData?.majors?.find(m => m.name === form.major)

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col items-center justify-center px-6 fade-in-up">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float">🧁</div>
          <h1 className="text-3xl font-hand text-choco-600 mb-1">AI 统筹组长</h1>
          <p className="text-sm text-choco-300">团队协作，从这里开始</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">邮箱</label>
            <input
              type="email"
              className="hand-input text-sm w-full"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="hand-card">
            <label className="block text-sm font-medium text-choco-500 mb-2">密码</label>
            <input
              type="password"
              className="hand-input text-sm w-full"
              placeholder="输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-center text-sm text-rosa-500 bg-rosa-50 py-2 px-4 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="hand-btn w-full py-3.5 text-base font-medium"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                登录中...
              </span>
            ) : '登录'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-choco-300">
          还没有账号？
          <Link to="/register" className="text-rosa-400 font-medium ml-1 hover:text-rosa-500">
            注册一个
          </Link>
        </p>
=======
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-warm-100 to-warm-50">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="text-6xl mb-3 animate-float">📅</div>
        <h1 className="text-3xl font-hand text-warm-700 mb-1">AI日程协作者</h1>
        <p className="text-warm-500 text-sm">智能管理你的每一天</p>
      </div>

      <div className="hand-card w-full max-w-sm">
        {/* 登录/注册切换 */}
        {isLogin ? (
          <>
            {/* === 登录 === */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">邮箱</label>
                <input type="email" className="hand-input" placeholder="输入邮箱"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input type="password" className="hand-input" placeholder="输入密码"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
              <button type="submit" className="hand-btn w-full" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
            <p className="text-center text-sm text-gray-400 mt-4">
              还没有账号？
              <button onClick={() => { setIsLogin(false); setStep(1); setError('') }}
                className="text-warm-500 font-medium ml-1">注册</button>
            </p>
          </>
        ) : (
          <>
            {/* === 注册 === */}
            {step === 1 ? (
              <form onSubmit={handleNextStep} className="space-y-3">
                <input type="text" className="hand-input" placeholder="用户名 *"
                  value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                <input type="email" className="hand-input" placeholder="邮箱 *"
                  value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                <input type="password" className="hand-input" placeholder="密码 (至少6位) *"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                <input type="password" className="hand-input" placeholder="确认密码 *"
                  value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required />
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
                <button type="submit" className="hand-btn w-full">下一步：选择专业与技能</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📚</span>
                  <span className="text-sm text-gray-500">步骤 2/2: 选择专业和技能</span>
                </div>

                {/* 专业选择 */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2">你的专业</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(majorsData?.majors || [
                      { name: '设计类' }, { name: '计算机类' }, { name: '产品类' }, { name: '市场类' }
                    ]).map(m => (
                      <button key={m.name} type="button"
                        onClick={() => setForm({...form, major: m.name, skills: []})}
                        className={`py-2.5 px-3 text-sm rounded-xl border-2 transition-all ${
                          form.major === m.name
                            ? 'border-warm-500 bg-warm-50 text-warm-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-warm-300'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 技能标签选择 */}
                {selectedMajor && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      擅长技能 (多选，可选)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {selectedMajor.recommended_tags.map(tag => (
                        <button key={tag} type="button"
                          onClick={() => toggleSkill(tag)}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                            form.skills.includes(tag)
                              ? 'bg-warm-500 text-white border-warm-500'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-warm-300'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {/* 常见作业模板提示 */}
                    {selectedMajor.common_assignments && (
                      <p className="text-xs text-gray-400 mt-2">
                        常见任务: {selectedMajor.common_assignments.slice(0,4).join('、')}
                      </p>
                    )}
                  </div>
                )}

                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}

                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="hand-btn-outline flex-1 text-sm">
                    ← 返回
                  </button>
                  <button onClick={handleRegister} className="hand-btn flex-1 text-sm" disabled={loading}>
                    {loading ? '注册中...' : '完成注册'}
                  </button>
                </div>
              </div>
            )}
            <p className="text-center text-sm text-gray-400 mt-4">
              已有账号？
              <button onClick={() => { setIsLogin(true); setError('') }}
                className="text-warm-500 font-medium ml-1">登录</button>
            </p>
          </>
        )}
>>>>>>> 85652a8d7910558fefa90e8ec9562240eff85d5b
      </div>
    </div>
  )
}
