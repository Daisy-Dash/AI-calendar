import { useEffect, useRef, useCallback } from 'react'

/**
 * WebSocket Hook - 实时接收后端推送的更新
 *
 * @param {object} options
 * @param {Function} options.onTaskUpdate - 任务变更回调
 * @param {Function} options.onNotification - 新通知回调
 * @param {Function} options.onConnected - 连接成功回调
 */
export function useWebSocket({ onTaskUpdate, onNotification, onConnected } = {}) {
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const callbacksRef = useRef({ onTaskUpdate, onNotification, onConnected })

  // 更新回调引用
  useEffect(() => {
    callbacksRef.current = { onTaskUpdate, onNotification, onConnected }
  }, [onTaskUpdate, onNotification, onConnected])

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    // 确定 WebSocket URL
    const apiBase = import.meta.env.VITE_API_URL || '/api'
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    let wsUrl

    if (apiBase.startsWith('http')) {
      wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws'
    } else {
      wsUrl = `${wsProtocol}//${window.location.host}/ws`
    }

    wsUrl += `?token=${token}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] Connected')
        callbacksRef.current.onConnected?.()

        // 心跳 - 每30秒 ping
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        ws._pingInterval = pingInterval
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const cbs = callbacksRef.current

          switch (msg.type) {
            case 'task_update':
              cbs.onTaskUpdate?.(msg)
              break
            case 'notification':
              cbs.onNotification?.(msg.data)
              break
            case 'pong':
              // 心跳响应
              break
            case 'connected':
              console.log('[WS]', msg.message, 'active:', msg.active_users)
              break
            default:
              break
          }
        } catch (e) {
          console.error('[WS] Message parse error:', e)
        }
      }

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason)
        if (ws._pingInterval) clearInterval(ws._pingInterval)

        // 自动重连（非认证失败）
        if (event.code !== 4001) {
          reconnectTimer.current = setTimeout(() => {
            console.log('[WS] Reconnecting...')
            connect()
          }, 5000)
        }
      }

      ws.onerror = (err) => {
        console.error('[WS] Error:', err)
      }
    } catch (e) {
      console.error('[WS] Connection failed:', e)
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        if (wsRef.current._pingInterval) clearInterval(wsRef.current._pingInterval)
        wsRef.current.close()
      }
    }
  }, [connect])

  return wsRef
}
