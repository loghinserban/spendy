class NoopWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readyState = NoopWebSocket.OPEN
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    void url
    queueMicrotask(() => {
      this.onopen?.(new Event('open'))
    })
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    void data
    return undefined
  }

  close() {
    this.readyState = NoopWebSocket.CLOSED
    queueMicrotask(() => {
      this.onclose?.(new CloseEvent('close'))
    })
  }

  addEventListener() {
    return undefined
  }

  removeEventListener() {
    return undefined
  }
}

Object.defineProperty(globalThis, 'WebSocket', {
  configurable: true,
  writable: true,
  value: NoopWebSocket,
})

