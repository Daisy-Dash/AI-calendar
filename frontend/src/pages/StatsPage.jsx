import { useState, useEffect } from 'react'
import { taskAPI, userAPI } from '../utils/api'

export default function StatsPage() {
  const [tasks, setTasks] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
    userAPI.getAbilityProfile().then(r => setProfile(r.data)).catch(() => {})
  }, [])

  const loadTasks = async () => {
    try {
      const res = await taskAPI.list()
      setTasks(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const total = tasks.length
  const completed = tasks.filter(t => t.status === '已完成').length
  const inProgress = tasks.filter(t => t.status === '进行中').length
  const pending = tasks.filter(t => t.status === '待办').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const priorityDist = {
    urgent: tasks.filter(t => t.priority === 4).length,
    high: tasks.filter(t => t.priority === 3).length,
    medium: tasks.filter(t => t.priority === 2).length,
    low: tasks.filter(t => t.priority === 1).length,
  }

  const statsCards = [
    { label: '完成率', value: `${completionRate}%`, color: 'text-green-500', bg: 'bg-green-50' },
    { label: '已完成', value: completed, color: 'text-warm-500', bg: 'bg-warm-50' },
    { label: '进行中', value: inProgress, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '待办', value: pending, color: 'text-gray-500', bg: 'bg-gray-50' },
  ]

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">📈 统计</h1>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statsCards.map((card) => (
          <div key={card.label} className={`hand-card ${card.bg}`}>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* 进度环形图 */}
      <div className="hand-card mb-6 text-center">
        <h3 className="text-sm font-medium text-gray-600 mb-4">📊 任务完成分布</h3>
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#FFE8CC" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="56" fill="none" stroke="#FF9F43" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionRate / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-warm-500">{completionRate}%</div>
                <div className="text-xs text-gray-400">完成率</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 优先级分布 */}
      <div className="hand-card mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-3">🎯 优先级分布</h3>
        <div className="space-y-2">
          {[
            { label: '紧急', value: priorityDist.urgent, color: 'bg-red-500', textColor: 'text-red-500' },
            { label: '高', value: priorityDist.high, color: 'bg-orange-500', textColor: 'text-orange-500' },
            { label: '中', value: priorityDist.medium, color: 'bg-blue-500', textColor: 'text-blue-500' },
            { label: '低', value: priorityDist.low, color: 'bg-gray-400', textColor: 'text-gray-500' },
          ].map((item) => {
            const maxVal = Math.max(priorityDist.urgent, priorityDist.high, priorityDist.medium, priorityDist.low, 1)
            const pct = (item.value / maxVal) * 100
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
                  <span className="text-xs text-gray-400">{item.value}个</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI效率分析 */}
      <div className="hand-card bg-gradient-to-r from-purple-50 to-pink-50 mb-6">
        <h3 className="text-sm font-medium text-gray-600 mb-2">🤖 AI效率分析</h3>
        {total === 0 ? (
          <p className="text-sm text-gray-400">暂无数据，开始创建任务吧</p>
        ) : (
          <div className="text-sm text-gray-500 space-y-1">
            <p>📊 总体完成率 <strong className="text-warm-600">{completionRate}%</strong></p>
            <p>💡 {completionRate >= 80 ? '效率很高，继续保持！' :
              completionRate >= 50 ? '进度正常，加油完成剩余任务' :
              '建议使用AI分解功能提高效率'}
            </p>
          </div>
        )}
      </div>

      {/* 能力画像 */}
      {profile && profile.total_completed > 0 && (
        <div className="hand-card mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3">🧠 能力画像分析</h3>
          <p className="text-xs text-gray-500 mb-3">{profile.analysis}</p>

          {/* 技能雷达 */}
          {profile.top_skills?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-2">🏆 核心技能</p>
              <div className="space-y-1.5">
                {profile.top_skills.slice(0, 6).map(skill => {
                  const maxCount = profile.top_skills[0]?.count || 1
                  const pct = (skill.count / maxCount) * 100
                  return (
                    <div key={skill.name} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-16 truncate">{skill.name}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                          style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-400 w-8">{skill.count}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-500">{skill.level}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 任务类型分布 */}
          {profile.task_types?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-400 mb-2">📂 任务类型分布</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.task_types.map(t => (
                  <span key={t.type} className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                    {t.type} ×{t.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 准时率 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>⏱ 准时完成率</span>
            <span className={`font-bold ${profile.on_time_rate >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
              {profile.on_time_rate}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
