import WebSocket from 'ws'

const WS_URL = process.env.WS_URL || 'wss://10.139.107.33:3000'
const ORIGIN = process.env.ORIGIN || 'https://localhost:5173'

console.log(`Connecting to ${WS_URL} with Origin: ${ORIGIN}`)

const ws = new WebSocket(WS_URL, {
  rejectUnauthorized: false, // Test-only: allow self-signed for local smoke test
  headers: {
    Origin: ORIGIN,
  },
})

ws.on('open', () => {
  console.log('WebSocket connection opened')
  ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }))
  setTimeout(() => ws.close(), 500)
})

ws.on('message', (data) => {
  console.log('Received:', data.toString())
})

ws.on('close', (code, reason) => {
  console.log('Closed', code, reason.toString())
  process.exit(0)
})

ws.on('error', (err) => {
  console.error('Connection error', err)
  process.exit(1)
})

