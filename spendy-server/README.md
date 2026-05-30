# Spendy Server

REST API backend for the personal finance app **Spendy** using Node.js, Express, and TypeScript.

## Features

- In-memory expense store only (RAM, reset on restart)
- Layered architecture (`routes` -> `controllers` -> `services`)
- Strict server-side validation for payload and pagination
- Server-side pagination on `GET /expenses?page=1&limit=5`
- Statistics endpoint: `GET /statistics`
- Async faker loop that generates expenses every 5 seconds
- WebSocket broadcast for generated faker batches
- Async audit logging for authenticated actions
- Near-real-time threat detection and admin observation queue
- Admin observation workflow: `GET /api/admin/observation-list`
- Admin review workflow: `PATCH /api/admin/observation-list/:flagId/review`
- Jest + Supertest integration tests

## API Endpoints

- `GET /expenses?page=1&limit=10`
- `GET /expenses/:id`
- `POST /expenses`
- `PUT /expenses/:id`
- `DELETE /expenses/:id`
- `GET /statistics`
- `POST /faker/start`
- `POST /faker/stop`
- `GET /api/admin/observation-list?page=1&limit=20&status=ACTIVE&historyLimit=10`
- `PATCH /api/admin/observation-list/:flagId/review`
- `GET /health`

## WebSocket

- Connect with a secure WebSocket client to the same server host and port using `wss://`.
- Faker loop batches are broadcast as:

```json
{
  "type": "faker-expenses",
  "data": [
    {
      "id": "string",
      "title": "string",
      "amount": 10.5,
      "category": "Food",
      "date": "2026-04-23",
      "paymentMethod": "Card"
    }
  ]
}
```

## Expense Schema

```json
{
  "id": "string",
  "title": "string",
  "amount": 99.5,
  "category": "string",
  "date": "YYYY-MM-DD",
  "paymentMethod": "string",
  "notes": "string (optional)"
}
```

## Run

```bash
npm run dev
```

## HTTPS / WSS setup

- The server will automatically generate self-signed PEM certs at `./certs/key.pem` and `./certs/cert.pem` if they are missing.
- You can still set `SSL_KEY_PATH` and `SSL_CERT_PATH` in `.env` if you want custom paths.
- Set `CORS_ORIGINS` to your frontend LAN origin, for example `https://192.168.1.50:5173`.
- The server binds to `0.0.0.0` so it remains reachable over your LAN.

## Test

```bash
npm test
```

