import "dotenv/config";
import express from "express";
import { createServer as createHttpsServer } from "https";
import fs from "fs";
import os from "os";
import path from "path";
import selfsigned from "selfsigned";
import { WebSocket, WebSocketServer } from "ws";
import expenseRouter from "./routes/expenseRoutes";
import fakerRouter from "./routes/fakerRoutes";
import authRouter from "./routes/authRoutes";
import chatRouter from "./routes/chatRoutes";
import adminRouter from "./routes/adminRoutes";
import { fakerService } from "./services/fakerService";
import { auditLoggingMiddleware, startAuditThreatDetection } from "./services/auditService";
import { extractUser } from "./utils/permissions";
import { Expense } from "./types";
import { connectMongo } from "./config/mongo";
import { applySecurityMiddleware, getAllowedOrigins } from "./config/security";
import { ChatMessage } from "./models/ChatMessage";

const app = express();
const wsClients = new Set<WebSocket>();

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const collectSubjectAltNames = (): Array<{ type: 2; value: string } | { type: 7; ip: string }> => {
  const altNames: Array<{ type: 2; value: string } | { type: 7; ip: string }> = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
    { type: 7, ip: "::1" },
  ];

  const seen = new Set<string>(altNames.map((altName) => ("ip" in altName ? altName.ip : altName.value)));

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const netInfo of interfaces ?? []) {
      if (netInfo.internal) {
        continue;
      }

      const value = netInfo.family === "IPv4" ? netInfo.address : netInfo.address;
      const key = netInfo.family === "IPv4" ? `ip:${value}` : `dns:${value}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      if (netInfo.family === "IPv4") {
        altNames.push({ type: 7, ip: value });
      } else {
        altNames.push({ type: 2, value });
      }
    }
  }

  return altNames;
};

const ensureHttpsCredentials = async (
  keyPath: string,
  certPath: string
): Promise<{ key: Buffer; cert: Buffer }> => {
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  fs.mkdirSync(path.dirname(keyPath), { recursive: true });

  const pems = await selfsigned.generate(
    [{ name: "commonName", value: "spendy-local" }],
    {
      keySize: 2048,
      algorithm: "sha256",
      extensions: [
        { name: "basicConstraints", cA: false },
        { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
        { name: "extKeyUsage", serverAuth: true },
        { name: "subjectAltName", altNames: collectSubjectAltNames() },
      ],
    }
  );

  fs.writeFileSync(keyPath, pems.private, { encoding: "utf8" });
  fs.writeFileSync(certPath, pems.cert, { encoding: "utf8" });

  return {
    key: Buffer.from(pems.private, "utf8"),
    cert: Buffer.from(pems.cert, "utf8"),
  };
};

const broadcastFakerBatch = (expenses: Expense[]): void => {
  const payload = JSON.stringify({ type: "faker-expenses", data: expenses });

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      continue;
    }

    wsClients.delete(client);
  }
};

const broadcastChatMessage = (message: any): void => {
  const payload = JSON.stringify({
    type: 'CHAT_MESSAGE',
    id: message._id?.toString() || message.id,
    senderId: message.senderId,
    senderName: message.senderName,
    text: message.text,
    timestamp: new Date(message.timestamp).getTime(),
  });

  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      continue;
    }

    wsClients.delete(client);
  }
};

fakerService.setBroadcastHandler(broadcastFakerBatch);

app.disable("x-powered-by");

const requestBodyLimitBytes = parsePositiveInt(process.env.REQUEST_BODY_LIMIT_BYTES, 64 * 1024);
// Apache JMeter: cap payload size globally to avoid memory exhaustion from oversized bodies.
app.use(express.json({ limit: requestBodyLimitBytes, strict: true }));
app.use(express.urlencoded({ extended: false, limit: requestBodyLimitBytes }));
applySecurityMiddleware(app);

// Apply global user extraction middleware
app.use(extractUser);

// Persist authenticated user actions asynchronously for audit + threat detection.
app.use(auditLoggingMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/", authRouter);
app.use("/", expenseRouter);
app.use("/", fakerRouter);
app.use("/", chatRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

if (require.main === module) {
  const start = async (): Promise<void> => {
    const port = Number(process.env.PORT ?? 3000);

    const keyPath = path.resolve(process.cwd(), process.env.SSL_KEY_PATH ?? "certs/key.pem");
    const certPath = path.resolve(process.cwd(), process.env.SSL_CERT_PATH ?? "certs/cert.pem");
    const httpsServer = createHttpsServer(await ensureHttpsCredentials(keyPath, certPath), app);

    // Optionally skip Mongo connection during quick dev smoke-tests by setting
    // SKIP_CONNECT_MONGO=true in the environment. This avoids adding test-only
    // code paths elsewhere and keeps production behaviour unchanged.
    if (process.env.SKIP_CONNECT_MONGO === 'true') {
      console.log('SKIP_CONNECT_MONGO is true — skipping MongoDB connection (dev-only)');
    } else {
      await connectMongo();
    }

    startAuditThreatDetection();

    const allowedOrigins = getAllowedOrigins();
    const wsServer = new WebSocketServer({
      server: httpsServer,
      verifyClient: ({ origin }, done) => {
        // Allow non-browser clients (no Origin header)
        if (!origin) {
          done(true);
          return;
        }

        // Normalize incoming origin (strip trailing slash) before comparison
        const incoming = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(incoming)) {
          done(true);
          return;
        }

        console.warn(`WebSocket connection blocked from origin: ${origin}`);
        done(false, 403, "Forbidden");
      },
    });

    wsServer.on("connection", (socket) => {
      console.log('[WS] New client connected. Total clients:', wsClients.size + 1);
      wsClients.add(socket);

      socket.on("message", async (data) => {
        try {
          const messageStr = data.toString();
          console.log('[WS] Received raw message:', messageStr.substring(0, 100)); // Log first 100 chars

          const parsedMessage = JSON.parse(messageStr) as {
            type?: string;
            senderId?: string;
            senderName?: string;
            text?: string;
          };

          console.log('[WS] Parsed message type:', parsedMessage.type);

          if (parsedMessage.type !== "CHAT_MESSAGE") {
            console.log('[WS] Ignoring non-CHAT_MESSAGE type:', parsedMessage.type);
            return;
          }

          if (!parsedMessage.senderId || !parsedMessage.senderName || !parsedMessage.text) {
            console.warn('[WS] Incomplete CHAT_MESSAGE - missing fields:', {
              hasSenderId: !!parsedMessage.senderId,
              hasSenderName: !!parsedMessage.senderName,
              hasText: !!parsedMessage.text,
            });
            return;
          }

          try {
            console.log('[WS] Attempting to save message to database...');
            const savedMessage = await ChatMessage.create({
              senderId: parsedMessage.senderId,
              senderName: parsedMessage.senderName,
              text: parsedMessage.text,
              timestamp: new Date(),
            });

            if (!savedMessage) {
              console.error('[WS] ChatMessage.create returned falsy value');
              return;
            }

            console.log('[WS] Message saved successfully. ID:', savedMessage._id);

            // Broadcast to all connected clients
            const messageObj = savedMessage.toObject();
            console.log('[WS] Broadcasting to', wsClients.size, 'connected clients');
            broadcastChatMessage(messageObj);
          } catch (dbError) {
            console.error('[WS] Database error while saving chat message:', {
              error: dbError instanceof Error ? dbError.message : String(dbError),
              stack: dbError instanceof Error ? dbError.stack : 'N/A',
              senderId: parsedMessage.senderId,
              senderName: parsedMessage.senderName,
              textLength: parsedMessage.text?.length,
            });
            // Continue without crashing the server - the message just won't be persisted
          }
        } catch (parseError) {
          console.error('[WS] Failed to parse WebSocket message:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            stack: parseError instanceof Error ? parseError.stack : 'N/A',
            rawData: data.toString().substring(0, 200),
          });
        }
      });

      socket.on("error", (error) => {
        console.error('[WS] Socket error event:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'N/A',
        });
      });

      socket.on("close", () => {
        console.log('[WS] Client disconnected. Remaining clients:', wsClients.size - 1);
        wsClients.delete(socket);
      });
    });

    httpsServer.listen(port, "0.0.0.0", () => {
      console.log(`Spendy HTTPS server listening on port ${port} (host 0.0.0.0)`);
    });
  };

  void start().catch((error) => {
    console.error("Unable to start server:", error);
    process.exit(1);
  });
}

export default app;

