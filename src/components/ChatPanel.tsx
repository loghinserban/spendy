import { MessageCircle, Send, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChatMessage } from '../types'
import { useAuth } from '../context/AuthContext'
import { fetchChatHistory } from '../utils/authApi'
import { getWebSocketUrl } from '../utils/expenseSync'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load chat history on mount
  useEffect(() => {
    if (!isOpen || !user) {
      return
    }

    let isMounted = true

    const loadHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const history = await fetchChatHistory(50)
        if (isMounted) {
          setMessages(history || [])
          scrollToBottom()
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load chat history'
          setError(errorMessage)
          console.error('Failed to load chat history:', err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadHistory()

    return () => {
      isMounted = false
    }
  }, [isOpen, user, scrollToBottom])

  // WebSocket connection with reconnection logic
  useEffect(() => {
    if (!isOpen || !user) {
      // Clean up on unmount or when closing
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close()
      }
      ws.current = null
      setWsConnected(false)
      return
    }

    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketUrl()
        console.log('[WS] Attempting to connect to:', wsUrl)
        ws.current = new WebSocket(wsUrl)

        ws.current.onopen = () => {
          console.log('[WS] Connection established')
          setWsConnected(true)
          setError(null)
          reconnectAttemptsRef.current = 0 // Reset reconnection attempts on successful connect
        }

        ws.current.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string) as Record<string, unknown> & Partial<ChatMessage>

            if (data.type === 'CHAT_MESSAGE' || (data.senderId && data.senderName && data.text)) {
              const message: ChatMessage = {
                id: (data.id as string) || `${Date.now()}-${Math.random()}`,
                senderId: (data.senderId as string) || '',
                senderName: (data.senderName as string) || 'Unknown',
                text: (data.text as string) || '',
                timestamp: (data.timestamp as number) || Date.now(),
              }

              setMessages((prev) => [...prev, message])
              scrollToBottom()
            }
          } catch (parseError) {
            console.error('[WS] Failed to parse message:', parseError, 'Raw data:', event.data)
          }
        }

        ws.current.onerror = (event) => {
          console.error('[WS] WebSocket error event:', event)
          console.error('[WS] ReadyState:', ws.current?.readyState)
          setWsConnected(false)
          setError('Connection error - attempting to reconnect...')
        }

        ws.current.onclose = (event) => {
          console.log('[WS] Connection closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean)
          setWsConnected(false)

          // Attempt to reconnect with exponential backoff
          if (isOpen && user) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
            console.log(`[WS] Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} after ${delay}ms`)
            reconnectAttemptsRef.current += 1

            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('[WS] Attempting to reconnect...')
              connectWebSocket()
            }, delay)
          }
        }
      } catch (err) {
        console.error('[WS] Failed to create WebSocket:', err)
        setWsConnected(false)
        setError('Failed to connect to chat')
      }
    }

    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws.current) {
        console.log('[WS] Closing connection on cleanup')
        if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.close()
        }
        ws.current = null
      }
      setWsConnected(false)
    }
  }, [isOpen, user, scrollToBottom])

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || !user || !ws.current) {
      console.log('[Chat] Send blocked - missing required fields:', {
        hasInput: !!inputValue.trim(),
        hasUser: !!user,
        hasWs: !!ws.current,
        wsReady: ws.current?.readyState === WebSocket.OPEN,
      })
      return
    }

    if (ws.current.readyState !== WebSocket.OPEN) {
      console.warn('[Chat] WebSocket not open. ReadyState:', ws.current.readyState)
      setError('Connection not ready - trying to reconnect...')
      return
    }

    try {
      const payload = {
        type: 'CHAT_MESSAGE',
        senderId: user.id,
        senderName: user.username,
        text: inputValue.trim(),
      }

      console.log('[Chat] Sending message:', payload)
      ws.current.send(JSON.stringify(payload))

      // Clear input only after successful send
      setInputValue('')
      setError(null)
    } catch (err) {
      console.error('[Chat] Failed to send message:', err)
      setError('Failed to send message - connection may have dropped')
    }
  }, [inputValue, user])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-300 p-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold text-white">Team Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
            aria-label="Close chat"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {isLoading && (
            <div className="text-center text-sm text-slate-500 py-4">
              Loading chat history...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 border-2 border-red-300 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {messages.length === 0 && !isLoading && !error && (
            <div className="text-center text-sm text-slate-500 py-8">
              No messages yet. Start a conversation!
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg break-words ${
                  message.senderId === user?.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border-2 border-slate-300 text-slate-900'
                }`}
              >
                {message.senderId !== user?.id && (
                  <p className="text-xs font-bold text-slate-600 mb-1">{message.senderName}</p>
                )}
                <p className="text-sm">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.senderId === user?.id
                      ? 'text-emerald-100'
                      : 'text-slate-500'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

         {/* Input Area */}
         <div className="border-t-2 border-slate-300 p-4 bg-white space-y-2">
           {!wsConnected && (
             <div className="p-2 bg-yellow-100 border-2 border-yellow-300 rounded-lg text-yellow-700 text-sm">
               {error ? error : 'Reconnecting to chat...'}
             </div>
           )}
           <div className="flex gap-2">
             <input
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Type a message..."
               className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
               disabled={!user || !wsConnected}
             />
             <button
               onClick={handleSendMessage}
               disabled={!inputValue.trim() || !user || !wsConnected}
               className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
               aria-label="Send message"
               title={!wsConnected ? 'Waiting for connection...' : ''}
             >
               <Send className="h-4 w-4" />
             </button>
           </div>
         </div>
      </div>
    </div>
  )
}



