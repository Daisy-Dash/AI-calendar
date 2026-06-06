const KEYS = {
  USER_PROFILE: 'aical_user_profile',
  PROJECTS: 'aical_projects',
}

export function getUserProfile() {
  const data = localStorage.getItem(KEYS.USER_PROFILE)
  return data ? JSON.parse(data) : null
}

export function saveUserProfile(profile) {
  localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify({
    ...profile,
    created_at: profile.created_at || new Date().toISOString(),
  }))
}

export function getProjects() {
  const data = localStorage.getItem(KEYS.PROJECTS)
  return data ? JSON.parse(data) : []
}

export function saveProjects(projects) {
  localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects))
}

export function getProject(id) {
  return getProjects().find(p => p.id === id) || null
}

export function createProject(data) {
  const projects = getProjects()
  const project = {
    id: Date.now().toString(),
    name: data.name,
    description: data.description || '',
    status: 'discussing',
    created_at: new Date().toISOString(),
    confirmed_goal: '',
    chat_history: [],
    tasks: [],
    inspirations: [],
  }
  projects.unshift(project)
  saveProjects(projects)
  return project
}

export function updateProject(id, updates) {
  const projects = getProjects()
  const idx = projects.findIndex(p => p.id === id)
  if (idx < 0) return null
  projects[idx] = { ...projects[idx], ...updates }
  saveProjects(projects)
  return projects[idx]
}

export function deleteProject(id) {
  saveProjects(getProjects().filter(p => p.id !== id))
}

export function addChatMessage(projectId, message) {
  const project = getProject(projectId)
  if (!project) return
  project.chat_history.push({
    id: Date.now().toString(),
    ...message,
    timestamp: new Date().toISOString(),
  })
  updateProject(projectId, { chat_history: project.chat_history })
}

export function setProjectTasks(projectId, tasks) {
  updateProject(projectId, { tasks, status: 'in_progress' })
}

export function updateTask(projectId, taskId, updates) {
  const project = getProject(projectId)
  if (!project) return
  const idx = project.tasks.findIndex(t => t.id === taskId)
  if (idx < 0) return
  project.tasks[idx] = { ...project.tasks[idx], ...updates }
  updateProject(projectId, { tasks: project.tasks })
  return project.tasks[idx]
}

export function deleteTask(projectId, taskId) {
  const project = getProject(projectId)
  if (!project) return
  project.tasks = project.tasks.filter(t => t.id !== taskId)
  updateProject(projectId, { tasks: project.tasks })
}
