import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupAPI } from '../utils/api'

function CakieCreateGroupAsset({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`cakie-create-group-asset-fallback ${className}`}>蛋糕图标</span>
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}

export default function CreateGroupPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('') // create / join
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { setError('请输入项目名称'); return }
    setLoading(true)
    setError('')
    try {
      const res = await groupAPI.create({ name: name.trim(), description: description.trim() })
      navigate(`/group-chat/${res.data.id}`)
    } catch (e) {
      setError(e.response?.data?.detail || '创建失败')
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('请输入群号'); return }
    setLoading(true)
    setError('')
    try {
      await groupAPI.join(joinCode.trim().toUpperCase())
      // 获取群组列表找到刚加入的群
      const groups = await groupAPI.list()
      const joined = groups.data.find(g => g.invite_code === joinCode.trim().toUpperCase())
      if (joined) {
        navigate(`/group-chat/${joined.id}`)
      } else {
        navigate('/')
      }
    } catch (e) {
      setError(e.response?.data?.detail || '加入失败，请检查群号')
    }
    setLoading(false)
  }

  if (!mode) {
    return (
      <div className="min-h-screen px-4 pt-12 pb-24">
        <button onClick={() => navigate(-1)} className="text-rosa-400 text-sm mb-6 flex items-center gap-1"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-4 h-4" alt="" />返回</button>

        <div className="text-center mb-8">
          <CakieCreateGroupAsset
            src="/assets/cakie/AI小蛋糕拿菜单_agent-menu.png"
            alt="Team CAKIE 小蛋糕拿菜单"
            className="cakie-create-group-hero mb-3"
          />
          <h1 className="text-xl font-medium text-choco-600">团队项目</h1>
          <p className="text-sm text-choco-200 mt-1">创建或加入一个团队</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setMode('create')}
            className="hand-card w-full text-left hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="cakie-create-group-icon-wrap is-create">
                <CakieCreateGroupAsset
                  src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
                  alt="创建团队项目"
                  className="cakie-create-group-icon"
                />
              </div>
              <div>
                <p className="text-base font-medium text-choco-600">新建团队项目</p>
                <p className="text-xs text-choco-200 mt-0.5">发起群聊，邀请组员加入</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('join')}
            className="hand-card w-full text-left hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="cakie-create-group-icon-wrap is-join">
                <CakieCreateGroupAsset
                  src="/assets/cakie/搜索图标_icon-search.png"
                  alt="加入已有项目"
                  className="cakie-create-group-icon"
                />
              </div>
              <div>
                <p className="text-base font-medium text-choco-600">加入已有项目</p>
                <p className="text-xs text-choco-200 mt-0.5">输入群号或邀请码加入</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 pt-8 pb-24">
      <button onClick={() => setMode('')} className="text-rosa-400 text-sm mb-6 flex items-center gap-1"><img src="/assets/cakie/返回箭头_icon-back.png" className="inline-block w-4 h-4" alt="" />返回</button>

      {mode === 'create' ? (
        <>
          <div className="text-center mb-6">
            <CakieCreateGroupAsset
              src="/assets/cakie/AI小蛋糕助手_agent-cake.png"
              alt="创建团队项目"
              className="cakie-create-group-form-icon mb-2"
            />
            <h2 className="text-lg font-medium text-choco-600">新建团队项目</h2>
            <p className="text-xs text-choco-200 mt-1">创建后可以拉好友入群</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-choco-400 font-medium mb-1.5 block">项目名称 *</label>
              <input
                className="hand-input text-sm"
                placeholder="例如：信息设计课程大作业"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-choco-400 font-medium mb-1.5 block">项目简介</label>
              <textarea
                className="hand-input text-sm min-h-[80px] resize-none"
                placeholder="简单描述你们的作业要求..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-xs text-rosa-400 text-center">{error}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="hand-btn w-full py-3 text-sm"
            >
              {loading ? '创建中...' : '创建项目并开始群聊'}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center mb-6">
            <CakieCreateGroupAsset
              src="/assets/cakie/搜索图标_icon-search.png"
              alt="加入团队"
              className="cakie-create-group-form-icon mb-2"
            />
            <h2 className="text-lg font-medium text-choco-600">加入团队</h2>
            <p className="text-xs text-choco-200 mt-1">输入好友分享的群号</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-choco-400 font-medium mb-1.5 block">群号（邀请码）</label>
              <input
                className="hand-input text-sm text-center text-lg font-mono tracking-[0.3em] uppercase"
                placeholder="输入6位群号"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            {error && <p className="text-xs text-rosa-400 text-center">{error}</p>}

            <button
              onClick={handleJoin}
              disabled={loading || joinCode.length < 4}
              className="hand-btn w-full py-3 text-sm"
              style={{ background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66, 0 6px 16px rgba(168,191,160,0.25)' }}
            >
              {loading ? '加入中...' : '加入团队'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
