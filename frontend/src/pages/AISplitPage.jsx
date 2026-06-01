import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { taskAPI } from '../utils/api'

export default function AISplitPage() {
  const navigate = useNavigate()
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [totalDays, setTotalDays] = useState('')
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSplit = async () => {
    if (!taskTitle.trim()) return
    setLoading(true)
    try {
      const res = await taskAPI.split({
        task_title: taskTitle,
        task_description: taskDesc,
        total_days: totalDays ? parseInt(totalDays) : null,
      })
      setSubtasks(res.data.subtasks)
    } catch (err) {
      console.error(err)
      // Fallback mock data if API fails
      setSubtasks([
        { title: '调研与资料收集', estimated_hours: 3.0, description: '收集相关资料和信息', priority: 'high' },
        { title: '方案设计与规划', estimated_hours: 2.0, description: '制定详细实施方案', priority: 'high' },
        { title: '执行与跟进', estimated_hours: 4.0, description: '按照方案逐步执行', priority: 'mid' },
        { title: '检查与总结', estimated_hours: 1.0, description: '完成后的检查和总结', priority: 'mid' },
      ])
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    try {
      // 将分解的子任务批量创建为任务
      for (const sub of subtasks) {
        await taskAPI.create({
          title: sub.title,
          description: sub.description || taskDesc,
          estimated_hours: sub.estimated_hours,
          priority: sub.priority === 'high' ? 3 : sub.priority === 'mid' ? 2 : 1,
          parent_id: null,
        })
      }
      alert('🎉 子任务已创建成功！')
      navigate('/tasks')
    } catch (err) {
      console.error(err)
    }
  }

  const removeSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl font-hand text-warm-700 mb-2">🤖 AI任务分解</h1>
      <p className="text-sm text-gray-400 mb-4">输入大型任务，AI自动分解为可执行的子任务</p>

      {/* 输入区域 */}
      <div className="hand-card mb-4">
        <div className="space-y-3">
          <input
            className="hand-input"
            placeholder="任务名称，例如：完成毕业设计"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
          />
          <textarea
            className="hand-input"
            placeholder="任务详细描述（可选）"
            rows={3}
            value={taskDesc}
            onChange={e => setTaskDesc(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="hand-input"
              placeholder="总天数（可选）"
              value={totalDays}
              onChange={e => setTotalDays(e.target.value)}
            />
            <span className="text-sm text-gray-400">天</span>
          </div>
          <button
            onClick={handleSplit}
            className="hand-btn w-full"
            disabled={loading || !taskTitle.trim()}
          >
            {loading ? '🤔 AI正在思考...' : '🚀 AI一键分解'}
          </button>
        </div>
      </div>

      {/* 分解结果 */}
      {subtasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">📋 分解结果</h3>
            <span className="text-xs text-gray-400">共 {subtasks.length} 个子任务</span>
          </div>

          {subtasks.map((sub, i) => (
            <div key={i} className="hand-card flex items-start gap-3 fade-in-up">
              <div className="w-6 h-6 rounded-full bg-warm-100 text-warm-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-800">{sub.title}</h4>
                {sub.description && <p className="text-xs text-gray-400 mt-0.5">{sub.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="tag">⏱ {sub.estimated_hours}h</span>
                  <span className={`tag ${sub.priority === 'high' ? 'bg-red-50 text-red-500' : sub.priority === 'mid' ? 'bg-warm-50 text-warm-600' : 'bg-gray-50 text-gray-500'}`}>
                    {sub.priority === 'high' ? '🔴 高' : sub.priority === 'mid' ? '🟡 中' : '🟢 低'}
                  </span>
                </div>
              </div>
              <button onClick={() => removeSubtask(i)} className="text-gray-300 hover:text-red-500 text-sm flex-shrink-0">✕</button>
            </div>
          ))}

          <button onClick={handleConfirm} className="hand-btn w-full mt-4">
            ✅ 确认创建 {subtasks.length} 个子任务
          </button>
        </div>
      )}
    </div>
  )
}
