import { useState, useEffect } from 'react'
import { userAPI, scheduleAPI, taskAPI } from '../utils/api'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    ddlReminder: true,
    aiSuggestion: true,
    sound: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await userAPI.getSettings()
      setSettings(res.data)
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
    setLoading(false)
  }

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setSaving(true)
    try {
      await userAPI.updateSettings({ [key]: value })
    } catch (err) {
      console.error('Failed to save setting:', err)
      setSettings(settings)
    }
    setSaving(false)
  }

  const handleExportICS = async () => {
    try {
      const res = await scheduleAPI.exportICS()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ai_calendar_${new Date().toISOString().split('T')[0]}.ics`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('导出失败，请检查后端是否启动')
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await taskAPI.exportCSV()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ai_calendar_tasks_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('导出失败，请检查后端是否启动')
    }
  }

  const settingGroups = [
    {
      title: '🎨 外观',
      items: [
        {
          key: 'theme',
          label: '主题模式',
          type: 'select',
          options: ['light', 'dark', 'system'],
          optionLabels: ['☀️ 浅色', '🌙 深色', '🔄 跟随系统'],
        },
      ],
    },
    {
      title: '🔔 通知',
      items: [
        { key: 'notifications', label: '推送通知', type: 'toggle' },
        { key: 'ddlReminder', label: 'DDL截止提醒', type: 'toggle' },
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-warm-300 border-t-warm-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-4">⚙️ 设置</h1>

      {settingGroups.map((group, gi) => (
        <div key={gi} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{group.title}</h3>
          <div className="hand-card p-0 overflow-hidden">
            {group.items.map((item, ii) => (
              <div
                key={item.key}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  ii < group.items.length - 1 ? 'border-b border-warm-50' : ''
                }`}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
                {item.type === 'toggle' ? (
                  <button
                    onClick={() => updateSetting(item.key, !settings[item.key])}
                    disabled={saving}
                    className={`w-11 h-6 rounded-full transition-all relative ${
                      settings[item.key] ? 'bg-warm-400' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${
                        settings[item.key] ? 'left-[22px]' : 'left-[2px]'
                      }`}
                    ></div>
                  </button>
                ) : (
                  <select
                    className="text-sm text-gray-600 bg-transparent border-none outline-none cursor-pointer"
                    value={settings[item.key] || 'light'}
                    onChange={(e) => updateSetting(item.key, e.target.value)}
                  >
                    {(item.optionLabels || item.options).map((opt, i) => (
                      <option key={opt} value={item.options[i]}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 其他操作 */}
      <div className="hand-card p-0 overflow-hidden mb-6">
        <button
          onClick={handleExportICS}
          className="w-full text-left px-4 py-3.5 text-sm text-gray-700 border-b border-warm-50 hover:bg-warm-50 transition-all"
        >
          📅 导出日历 (.ics)
        </button>
        <button
          onClick={handleExportCSV}
          className="w-full text-left px-4 py-3.5 text-sm text-gray-700 border-b border-warm-50 hover:bg-warm-50 transition-all"
        >
          📊 导出任务 (.csv)
        </button>
        <button className="w-full text-left px-4 py-3.5 text-sm text-gray-700 border-b border-warm-50 hover:bg-warm-50 transition-all">
          📖 使用教程
        </button>
        <button
          className="w-full text-left px-4 py-3.5 text-sm text-red-500 hover:bg-red-50 transition-all"
          onClick={() => {
            if (confirm('确定清除所有数据？此操作不可恢复！')) {
              alert('数据已清除（需要后端支持）')
            }
          }}
        >
          🗑️ 清除所有数据
        </button>
      </div>

      {/* 保存状态 */}
      <div className="text-center">
        {saving ? (
          <p className="text-xs text-warm-500 animate-pulse">💾 保存中...</p>
        ) : (
          <p className="text-xs text-green-500">✅ 设置已同步</p>
        )}
      </div>

      <div className="text-center mt-4">
        <p className="text-xs text-gray-400">AI日程协作者 v1.0.0</p>
      </div>
    </div>
  )
}
