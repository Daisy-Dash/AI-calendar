import { useState, useEffect } from 'react'
import { scheduleAPI } from '../utils/api'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']
const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const scheduleColors = ['#FF9F43', '#4CAF50', '#2196F3', '#9C27B0', '#F44336', '#00BCD4', '#FF5722']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [schedules, setSchedules] = useState([])
  const [selectedSchedules, setSelectedSchedules] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [naturalInput, setNaturalInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    color: '#FF9F43',
    note: '',
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // 加载当月日程
  useEffect(() => {
    loadMonthSchedules()
  }, [year, month])

  // 选中日期变化时筛选日程
  useEffect(() => {
    filterSchedulesForDate(selectedDate)
  }, [selectedDate, schedules])

  const loadMonthSchedules = async () => {
    setLoading(true)
    try {
      const res = await scheduleAPI.getMonth(year, month + 1)
      setSchedules(res.data)
    } catch (err) {
      console.error('Failed to load schedules:', err)
      setSchedules([])
    }
    setLoading(false)
  }

  const filterSchedulesForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    const filtered = schedules.filter((s) => {
      const sDate = new Date(s.date).toISOString().split('T')[0]
      return sDate === dateStr
    })
    setSelectedSchedules(filtered)
  }

  // 日历网格
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

  const daysInMonth = []
  for (let i = 0; i < startDay; i++) daysInMonth.push(null)
  for (let i = 1; i <= lastDay.getDate(); i++) daysInMonth.push(i)

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))

  const isToday = (day) => {
    if (!day) return false
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const isSelected = (day) => {
    if (!day) return false
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
  }

  // 获取某天的日程（用于标记点）
  const getDaySchedules = (day) => {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return schedules.filter((s) => {
      const sDate = new Date(s.date).toISOString().split('T')[0]
      return sDate === dateStr
    })
  }

  // 创建日程
  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    if (!newSchedule.title.trim()) return

    setLoading(true)
    try {
      const dateStr = newSchedule.date || selectedDate.toISOString().split('T')[0]
      await scheduleAPI.create({
        ...newSchedule,
        date: dateStr,
      })
      setShowAddModal(false)
      setNewSchedule({ title: '', date: '', start_time: '', end_time: '', color: '#FF9F43', note: '' })
      loadMonthSchedules()
    } catch (err) {
      console.error('Failed to create schedule:', err)
      alert('创建日程失败，请重试')
    }
    setLoading(false)
  }

  // 删除日程
  const handleDeleteSchedule = async (id) => {
    if (!confirm('确定删除此日程？')) return
    try {
      await scheduleAPI.delete(id)
      loadMonthSchedules()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // AI 自然语言解析
  const handleNaturalParse = async () => {
    if (!naturalInput.trim()) return
    setParsing(true)
    try {
      const res = await scheduleAPI.parse(naturalInput)
      const suggestion = res.data.suggestions?.[0]
      if (suggestion && suggestion.title) {
        setNewSchedule({
          title: suggestion.title || naturalInput,
          date: suggestion.date || selectedDate.toISOString().split('T')[0],
          start_time: suggestion.start_time || '',
          end_time: suggestion.end_time || '',
          color: suggestion.color || '#FF9F43',
          note: suggestion.note || '',
        })
      }
    } catch (err) {
      console.error('Parse failed:', err)
      // 回退：直接用输入作为标题
      setNewSchedule((prev) => ({ ...prev, title: naturalInput }))
    }
    setParsing(false)
    setNaturalInput('')
  }

  // 本周
  const getWeekDates = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    monday.setHours(0, 0, 0, 0)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const weekDates = getWeekDates()

  const getDaySchedulesForWeek = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedules.filter((s) => {
      const sDate = new Date(s.date).toISOString().split('T')[0]
      return sDate === dateStr
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const d = new Date(timeStr)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const openAddForDate = (date) => {
    setSelectedDate(date)
    setNewSchedule((prev) => ({
      ...prev,
      date: date.toISOString().split('T')[0],
    }))
    setShowAddModal(true)
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">📅 日历视图</h1>

      {/* 日历头部 */}
      <div className="hand-card mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-warm-500 hover:bg-warm-50 p-2 rounded-lg transition-all">◀</button>
          <h3 className="text-base font-medium">{year}年 {monthNames[month]}</h3>
          <button onClick={nextMonth} className="text-warm-500 hover:bg-warm-50 p-2 rounded-lg transition-all">▶</button>
        </div>

        {/* 星期头 */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, i) => {
            const daySchedules = getDaySchedules(day)
            const hasSchedule = daySchedules.length > 0
            const uniqueColors = [...new Set(daySchedules.map((s) => s.color || '#FF9F43'))]
            return (
              <div key={i} className="flex flex-col items-center">
                {day ? (
                  <button
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`calendar-day w-9 h-9 text-sm relative ${
                      isToday(day) ? 'today' : ''
                    } ${isSelected(day) ? 'ring-2 ring-warm-300' : ''}`}
                  >
                    {day}
                    {/* 日程指示点 */}
                    {hasSchedule && (
                      <div className="absolute -bottom-0.5 flex gap-0.5">
                        {uniqueColors.slice(0, 3).map((c, ci) => (
                          <span
                            key={ci}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: c }}
                          ></span>
                        ))}
                        {uniqueColors.length > 3 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        )}
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="w-9 h-9"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 选中日期详情 */}
      <div className="hand-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-600">
            📌 {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            {selectedDate.toDateString() === new Date().toDateString() && ' (今天)'}
          </h3>
          <button
            onClick={() => openAddForDate(selectedDate)}
            className="text-xs text-warm-500 hover:text-warm-600 font-medium"
          >
            ➕ 添加
          </button>
        </div>

        {selectedSchedules.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-2xl mb-1">📭</div>
            <p className="text-xs">暂无日程安排</p>
            <button
              onClick={() => openAddForDate(selectedDate)}
              className="text-xs text-warm-500 mt-1 underline"
            >
              点击添加日程
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedSchedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-warm-50 hover:bg-warm-100 transition-all group"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.color || '#FF9F43' }}
                ></div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-800 truncate">{s.title}</h4>
                  {(s.start_time || s.end_time) && (
                    <p className="text-xs text-gray-400">
                      {formatTime(s.start_time)} {s.start_time && s.end_time ? '~' : ''} {formatTime(s.end_time)}
                    </p>
                  )}
                  {s.note && <p className="text-xs text-gray-400 truncate mt-0.5">{s.note}</p>}
                </div>
                {s.is_ai_generated && <span className="tag flex-shrink-0 text-xs">🤖 AI</span>}
                <button
                  onClick={() => handleDeleteSchedule(s.id)}
                  className="text-gray-300 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 本周概览 */}
      <div className="hand-card mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">📆 本周</h3>
        <div className="space-y-1">
          {weekDates.map((date, i) => {
            const daySchedules = getDaySchedulesForWeek(date)
            const isToday = date.toDateString() === new Date().toDateString()
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                  isToday ? 'bg-warm-50' : 'hover:bg-warm-50/50'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="w-10 text-center flex-shrink-0">
                  <div className="text-xs text-gray-400">{weekDays[i]}</div>
                  <div className={`text-sm font-medium ${isToday ? 'text-warm-500' : 'text-gray-700'}`}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                  {daySchedules.length === 0 ? (
                    <span className="text-xs text-gray-300">暂无安排</span>
                  ) : (
                    daySchedules.slice(0, 3).map((s) => (
                      <span key={s.id} className="tag text-xs truncate max-w-[100px]" title={s.title}>
                        {s.title}
                      </span>
                    ))
                  )}
                  {daySchedules.length > 3 && (
                    <span className="text-xs text-gray-400">+{daySchedules.length - 3}</span>
                  )}
                </div>
                <span className="text-xs text-gray-300 flex-shrink-0">›</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 快速添加日程弹窗 */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/20 z-50 flex items-end justify-center"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-app p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">📝 添加日程</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* AI 自然语言输入 */}
            <div className="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>🤖</span>
                <span className="text-xs font-medium text-gray-600">AI智能解析</span>
              </div>
              <div className="flex gap-2">
                <input
                  className="hand-input flex-1 text-sm"
                  placeholder="例如：明天下午3点开会"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNaturalParse()}
                />
                <button
                  onClick={handleNaturalParse}
                  className="hand-btn text-sm py-2 px-3"
                  disabled={parsing || !naturalInput.trim()}
                >
                  {parsing ? '...' : '解析'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">输入自然语言描述，AI自动识别时间和标题</p>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <input
                className="hand-input"
                placeholder="日程标题 *"
                value={newSchedule.title}
                onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                required
              />
              <input
                type="date"
                className="hand-input"
                value={newSchedule.date}
                onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
              />
              <div className="flex gap-3">
                <input
                  type="time"
                  className="hand-input flex-1"
                  placeholder="开始时间"
                  value={newSchedule.start_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                />
                <input
                  type="time"
                  className="hand-input flex-1"
                  placeholder="结束时间"
                  value={newSchedule.end_time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                />
              </div>
              <textarea
                className="hand-input"
                placeholder="备注（可选）"
                rows={2}
                value={newSchedule.note}
                onChange={(e) => setNewSchedule({ ...newSchedule, note: e.target.value })}
              />

              {/* 颜色选择 */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">颜色标记</label>
                <div className="flex gap-2">
                  {scheduleColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSchedule({ ...newSchedule, color: c })}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newSchedule.color === c ? 'ring-2 ring-offset-2 ring-warm-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    ></button>
                  ))}
                </div>
              </div>

              <button type="submit" className="hand-btn w-full" disabled={loading}>
                {loading ? '创建中...' : '✅ 创建日程'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 加载指示器 */}
      {loading && schedules.length === 0 && (
        <div className="text-center py-4">
          <div className="inline-block w-6 h-6 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
