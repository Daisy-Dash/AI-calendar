import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    ddlReminder: true,
    aiSuggestion: true,
    sound: false,
  })

  const settingGroups = [
    {
      title: '🎨 外观',
      items: [
        { key: 'theme', label: '主题模式', type: 'select', options: ['浅色', '深色', '跟随系统'] },
      ],
    },
    {
      title: '🔔 通知',
      items: [
        { key: 'notifications', label: '推送通知', type: 'toggle' },
        { key: 'ddlReminder', label: 'DDL提醒', type: 'toggle' },
        { key: 'sound', label: '声音提醒', type: 'toggle' },
      ],
    },
    {
      title: '🤖 AI设置',
      items: [
        { key: 'aiSuggestion', label: 'AI智能建议', type: 'toggle' },
      ],
    },
  ]

  const handleToggle = (key) => {
    setSettings({ ...settings, [key]: !settings[key] })
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">⚙️ 设置</h1>

      {settingGroups.map((group, gi) => (
        <div key={gi} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{group.title}</h3>
          <div className="hand-card p-0 overflow-hidden">
            {group.items.map((item, ii) => (
              <div key={item.key} className={`flex items-center justify-between px-4 py-3.5 ${
                ii < group.items.length - 1 ? 'border-b border-warm-50' : ''
              }`}>
                <span className="text-sm text-gray-700">{item.label}</span>
                {item.type === 'toggle' ? (
                  <button
                    onClick={() => handleToggle(item.key)}
                    className={`w-11 h-6 rounded-full transition-all ${
                      settings[item.key] ? 'bg-warm-400' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                      settings[item.key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
                    }`}></div>
                  </button>
                ) : (
                  <select className="text-sm text-gray-600 bg-transparent border-none outline-none">
                    {item.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 其他操作 */}
      <div className="hand-card p-0 overflow-hidden">
        <button className="w-full text-left px-4 py-3.5 text-sm text-gray-700 border-b border-warm-50 hover:bg-warm-50">
          📊 数据导出
        </button>
        <button className="w-full text-left px-4 py-3.5 text-sm text-gray-700 border-b border-warm-50 hover:bg-warm-50">
          📖 使用教程
        </button>
        <button className="w-full text-left px-4 py-3.5 text-sm text-red-500 hover:bg-red-50">
          🗑️ 清除所有数据
        </button>
      </div>

      <div className="text-center mt-8">
        <p className="text-xs text-gray-400">AI日程协作者 v1.0.0</p>
      </div>
    </div>
  )
}
