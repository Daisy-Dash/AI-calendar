import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

// 全局错误捕获 - 防止白屏
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message, e.filename, e.lineno)
  const root = document.getElementById('root')
  if (root && !root.innerHTML.trim()) {
    root.innerHTML = `<div style="padding:40px;font-family:monospace;color:#B37474;background:#FAF6F1;min-height:100vh">
      <h2>加载出错</h2><pre style="white-space:pre-wrap;margin-top:12px;background:white;padding:16px;border-radius:12px;border:1px solid #E8DDD2">${e.message}\n${e.filename}:${e.lineno}</pre>
      <button onclick="localStorage.clear();location.href='/login'" style="margin-top:16px;padding:10px 24px;background:#D4A5A5;color:white;border:none;border-radius:999px;cursor:pointer">清除缓存并重新登录</button>
    </div>`
  }
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
