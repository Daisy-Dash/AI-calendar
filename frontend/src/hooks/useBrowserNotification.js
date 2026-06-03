import { useEffect, useCallback } from 'react'

/**
 * 浏览器通知 Hook
 * 请求通知权限，提供 showNotification 函数
 */
export function useBrowserNotification() {
  const permission = 'Notification' in window ? Notification.permission : 'denied'

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    const result = await Notification.requestPermission()
    return result
  }, [])

  const showNotification = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return

    const n = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: options.tag || 'ai-calendar',
      requireInteraction: options.requireInteraction || false,
      body: options.body || '',
      data: options.data || {},
      vibrate: [200, 100, 200],
      ...options,
    })

    if (options.onClick) {
      n.onclick = () => {
        n.close()
        options.onClick()
      }
    } else if (options.url) {
      n.onclick = () => {
        n.close()
        window.focus()
        window.location.href = options.url
      }
    }

    // 5秒后自动关闭
    if (!options.requireInteraction) {
      setTimeout(() => n.close(), 5000)
    }
  }, [])

  // 页面加载时请求权限（仅一次）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Notification.permission === 'default') {
        requestPermission()
      }
    }, 3000) // 3秒后请求，避免页面加载时弹出
    return () => clearTimeout(timer)
  }, [requestPermission])

  return { permission, requestPermission, showNotification }
}
