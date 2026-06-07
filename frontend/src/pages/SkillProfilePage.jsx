import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile, saveUserProfile } from '../utils/store'

const MAJOR_OPTIONS = ['设计', '计算机', '商科', '文学', '工程', '理学', '医学', '教育', '艺术', '传媒']
const TOOL_OPTIONS = ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'PPT', 'Excel', 'Word', 'Python', 'JavaScript', 'React', 'Vue', 'Premiere', 'After Effects', 'Blender', 'AutoCAD', 'MATLAB', 'SPSS', 'Tableau', 'Notion', 'Markdown']
const SKILL_OPTIONS = ['UI设计', '视觉设计', '交互设计', '用户研究', '前端开发', '后端开发', '数据分析', '文案撰写', '演讲汇报', '项目管理', '调研分析', '视频剪辑', '3D建模', '产品设计', '市场分析', '统计分析', '算法设计', '测试']

export default function SkillProfilePage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [selectedMajors, setSelectedMajors] = useState([])
  const [selectedTools, setSelectedTools] = useState([])
  const [selectedSkills, setSelectedSkills] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const profile = getUserProfile()
    if (profile) {
      setName(profile.name || '')
      setSelectedMajors(profile.major || [])
      setSelectedTools(profile.tools || [])
      setSelectedSkills(profile.skills || [])
    }
  }, [])

  const toggleItem = (list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
    setSaved(false)
  }

  const handleSave = () => {
    saveUserProfile({
      name: name.trim(),
      major: selectedMajors,
      tools: selectedTools,
      skills: selectedSkills,
    })
    setSaved(true)
    setTimeout(() => navigate(-1), 600)
  }

  const isValid = selectedMajors.length > 0

  return (
    <div className="px-4 pt-6 pb-24 fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-rosa-400 text-lg">←</button>
        <h1 className="text-xl font-hand text-choco-600">个人技能名片</h1>
        <span className="text-lg">🍪</span>
      </div>

      <div className="hand-card mb-4 bg-gradient-to-r from-rosa-50 to-cream-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍬</span>
          <span className="text-sm text-rosa-500">AI 会根据你的技能为你匹配最合适的任务</span>
        </div>
      </div>

      <div className="hand-card mb-4">
        <h3 className="text-sm font-medium text-choco-500 mb-3">你的昵称</h3>
        <input
          className="hand-input text-sm"
          placeholder="输入你的昵称"
          value={name}
          onChange={e => { setName(e.target.value); setSaved(false) }}
        />
      </div>

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

      <button
        onClick={handleSave}
        className="hand-btn w-full text-sm py-3"
        disabled={!isValid}
        style={saved ? { background: 'linear-gradient(135deg, #A8BFA0, #8AA880)', boxShadow: '0 3px 0 #6F8F66' } : {}}
      >
        {saved ? '已保存 ✓' : '保存名片'}
      </button>
    </div>
  )
}
