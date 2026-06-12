import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendAPI } from '../utils/api'

function CakieAsset({ src, alt, fallback, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return <span className={`cakie-friends-asset-fallback ${className}`}>{fallback}</span>
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('friends') // friends / search / requests
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadFriends()
    loadRequests()
  }, [])

  const loadFriends = async () => {
    try {
      const res = await friendAPI.list()
      setFriends(res.data)
    } catch (e) { console.error(e) }
  }

  const loadRequests = async () => {
    try {
      const res = await friendAPI.getRequests()
      setRequests(res.data)
    } catch (e) { console.error(e) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await friendAPI.search(searchQuery.trim())
      setSearchResults(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSendRequest = async (userId) => {
    try {
      const res = await friendAPI.sendRequest(userId)
      showMessage(res.data.message)
      // 更新搜索结果中的状态
      setSearchResults(prev => prev.map(u =>
        u.id === userId ? { ...u, relation: res.data.status === 'accepted' ? 'friend' : 'pending_sent' } : u
      ))
      if (res.data.status === 'accepted') loadFriends()
    } catch (e) {
      showMessage(e.response?.data?.detail || '发送失败')
    }
  }

  const handleRespondRequest = async (requestId, accept) => {
    try {
      await friendAPI.respondRequest(requestId, accept)
      showMessage(accept ? '已接受好友请求' : '已拒绝')
      loadRequests()
      if (accept) loadFriends()
    } catch (e) {
      showMessage(e.response?.data?.detail || '操作失败')
    }
  }

  const showMessage = (msg) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 2500)
  }

  const tabs = [
    { key: 'friends', label: '好友', icon: '/assets/cakie/好友图标_nav-friends.png', fallback: '友', count: friends.length },
    { key: 'search', label: '搜索', icon: '/assets/cakie/搜索图标_icon-search.png', fallback: '寻' },
    { key: 'requests', label: '请求', icon: '/assets/cakie/请求图标_icon-request.png', fallback: '请', count: requests.length },
  ]

  return (
    <div className="cakie-friends-page min-h-screen pb-28">
      {/* 顶部 */}
      <div className="px-4 pt-5 pb-4">
        <div className="cakie-friends-header">
          <div className="text-center flex-1">
            <p className="cakie-friends-kicker">CAKIE PARTNERS</p>
            <h1 className="text-2xl font-hand font-medium text-choco-600 mt-1">好友</h1>
            <p className="text-xs text-choco-300 mt-1">找到你的蛋糕小伙伴</p>
          </div>
          <button onClick={() => navigate(-1)} className="cakie-friends-back">返回</button>
        </div>

        {/* Tab 切换 */}
        <div className="cakie-friends-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`cakie-friends-tab ${tab === t.key ? 'is-active' : ''}`}
            >
              <CakieAsset src={t.icon} alt="" fallback={t.fallback} className="cakie-friends-tab-icon" />
              <span>{t.label}{t.count ? ` (${t.count})` : ''}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 提示消息 */}
      {message && (
        <div className="cakie-friends-message mx-4 mb-3 text-xs text-sage-500 text-center fade-in-up">
          {message}
        </div>
      )}

      {/* 好友列表 */}
      {tab === 'friends' && (
        <div className="px-4 space-y-3">
          {friends.length === 0 ? (
            <div className="cakie-friends-empty">
              <CakieAsset
                src="/assets/cakie/头像_草莓蛋糕_avatar-strawberry.png"
                alt="等待加入的草莓蛋糕小伙伴"
                fallback="草莓蛋糕小伙伴"
                className="cakie-friends-empty-cake"
              />
              <p className="text-choco-500 text-sm font-medium mt-4">还没有好友</p>
              <p className="text-choco-300 text-xs mt-1">去搜索页添加小伙伴吧</p>
              <button onClick={() => setTab('search')} className="cakie-button text-xs py-2.5 px-6 mt-5">
                寻找小伙伴
              </button>
            </div>
          ) : (
            friends.map(f => (
              <div key={f.id} className="cakie-friend-card flex items-center gap-3">
                <div className="cakie-friend-persona">
                  {f.avatar || f.username?.slice(0, 1) || '友'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-choco-600 truncate">{f.username}</p>
                  <p className="text-xs text-choco-200 truncate">{f.email}</p>
                  {f.skills?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {f.skills.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-full bg-cream-200 text-choco-300 text-[10px]">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="cakie-friend-status">好友</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 搜索 */}
      {tab === 'search' && (
        <div className="px-4">
          <div className="cakie-friends-search flex gap-2 mb-4">
            <input
              className="cakie-input flex-1 text-sm"
              placeholder="搜索昵称或邮箱..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading} className="cakie-button text-xs py-2 px-4 flex-shrink-0">
              {loading ? '...' : '寻找'}
            </button>
          </div>

          <div className="space-y-3">
            {searchResults.map(u => (
              <div key={u.id} className="cakie-friend-card flex items-center gap-3 fade-in-up">
                <div className="cakie-friend-persona cakie-friend-persona-search">
                  {u.avatar || u.username?.slice(0, 1) || '寻'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-choco-600 truncate">{u.username}</p>
                  <p className="text-xs text-choco-200 truncate">{u.email}</p>
                  {u.major?.length > 0 && (
                    <p className="text-xs text-dusty-400 mt-0.5">{u.major.join(' · ')}</p>
                  )}
                </div>
                {u.relation === 'friend' ? (
                  <span className="text-xs text-sage-400 bg-sage-50 px-2 py-1 rounded-full border border-sage-100">已是好友</span>
                ) : u.relation === 'pending_sent' ? (
                  <span className="text-xs text-caramel-400 bg-caramel-50 px-2 py-1 rounded-full border border-caramel-100">已发送</span>
                ) : u.relation === 'pending_received' ? (
                  <button onClick={() => handleSendRequest(u.id)} className="text-xs text-white bg-sage-400 px-3 py-1 rounded-full">
                    接受
                  </button>
                ) : (
                  <button onClick={() => handleSendRequest(u.id)} className="cakie-button text-xs py-1.5 px-3">
                    添加
                  </button>
                )}
              </div>
            ))}
            {searchResults.length === 0 && searchQuery && !loading && (
              <p className="text-center text-choco-200 text-xs py-8">未找到相关用户</p>
            )}
          </div>
        </div>
      )}

      {/* 好友请求 */}
      {tab === 'requests' && (
        <div className="px-4 space-y-3">
          {requests.length === 0 ? (
            <div className="cakie-friends-empty">
              <CakieAsset
                src="/assets/cakie/请求图标_icon-request.png"
                alt="好友请求"
                fallback="等待新请求"
                className="cakie-friends-request-empty"
              />
              <p className="text-choco-400 text-sm mt-4">暂无好友请求</p>
            </div>
          ) : (
            requests.map(r => (
              <div key={r.id} className="cakie-friend-card fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="cakie-friend-persona cakie-friend-persona-request">
                    {r.avatar || r.username?.slice(0, 1) || '请'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-choco-600">{r.username}</p>
                    <p className="text-xs text-choco-200">{r.email}</p>
                    {r.skills?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {r.skills.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-full bg-cream-200 text-choco-300 text-[10px]">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleRespondRequest(r.id, true)}
                    className="flex-1 py-2 rounded-full text-xs font-medium text-white"
                    style={{ background: 'linear-gradient(135deg, #A8BFA0, #8AA880)' }}
                  >
                    接受
                  </button>
                  <button
                    onClick={() => handleRespondRequest(r.id, false)}
                    className="flex-1 py-2 rounded-full text-xs font-medium text-choco-300 bg-cream-100 border border-cream-200"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
