import { useState } from 'react'
import { getWeekDates } from '../utils/helpers'

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState([])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // 周一开始

  const daysInMonth = []
  // 上月填充
  for (let i = 0; i < startDay; i++) {
    daysInMonth.push(null)
  }
  // 当月天数
  for (let i = 1; i <= lastDay.getDate(); i++) {
    daysInMonth.push(i)
  }

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))

  const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const isSelected = (day) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
  }

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const weekDates = getWeekDates()

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">📅 日历视图</h1>

      {/* 日历头部 */}
      <div className="hand-card mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-warm-500 hover:bg-warm-50 p-2 rounded-lg">◀</button>
          <h3 className="text-base font-medium">{year}年 {monthNames[month]}</h3>
          <button onClick={nextMonth} className="text-warm-500 hover:bg-warm-50 p-2 rounded-lg">▶</button>
        </div>

        {/* 星期头 */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, i) => (
            <div key={i} className="flex justify-center">
              {day ? (
                <button
                  onClick={() => setSelectedDate(new Date(year, month, day))}
                  className={`calendar-day w-9 h-9 text-sm ${
                    isToday(day) ? 'today' : ''
                  } ${isSelected(day) ? 'ring-2 ring-warm-300' : ''}`}
                >
                  {day}
                </button>
              ) : (
                <div className="w-9 h-9"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 本周 */}
      <div className="hand-card mb-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">📆 本周</h3>
        <div className="space-y-2">
          {weekDates.map((date, i) => {
            const isToday = date.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${isToday ? 'bg-warm-50' : ''}`}>
                <div className="w-8 text-center">
                  <div className="text-xs text-gray-400">{weekDays[i]}</div>
                  <div className={`text-sm font-medium ${isToday ? 'text-warm-500' : 'text-gray-700'}`}>{date.getDate()}</div>
                </div>
                <div className="flex-1 h-10 flex items-center">
                  {isToday && (
                    <div className="flex gap-2">
                      <span className="tag">📋 3个任务</span>
                      <span className="tag">🤖 AI建议</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 快速添加 */}
      <button className="hand-btn-outline w-full text-center">
        ➕ 快速添加日程
      </button>
    </div>
  )
}
