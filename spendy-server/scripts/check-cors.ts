import request from 'supertest'
import app from '../src/server'

const ORIGINS = [
  'https://localhost:5173',
  'https://10.139.107.33:5173',
]

;(async () => {
  for (const origin of ORIGINS) {
    console.log(`\nTesting preflight OPTIONS for origin: ${origin}`)
    const res = await request(app)
      .options('/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization')

    console.log('Status:', res.status)
    console.log('Access-Control-Allow-Origin:', res.headers['access-control-allow-origin'])
    console.log('Access-Control-Allow-Credentials:', res.headers['access-control-allow-credentials'])
    console.log('Access-Control-Allow-Methods:', res.headers['access-control-allow-methods'])
    console.log('Access-Control-Allow-Headers:', res.headers['access-control-allow-headers'])
  }

  // Also test a simple GET from allowed origin
  const origin = ORIGINS[0]
  console.log(`\nTesting GET /health from origin: ${origin}`)
  const getRes = await request(app).get('/health').set('Origin', origin)

  console.log('Status:', getRes.status)
  console.log('Access-Control-Allow-Origin:', getRes.headers['access-control-allow-origin'])
  console.log('Access-Control-Allow-Credentials:', getRes.headers['access-control-allow-credentials'])

  process.exit(0)
})().catch((err) => {
  console.error('Error during CORS checks:', err)
  process.exit(1)
})

