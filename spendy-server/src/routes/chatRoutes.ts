import { Router } from "express";
import { ChatMessage } from "../models/ChatMessage";

const router = Router();

router.get("/chat/history", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const messages = await ChatMessage.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Reverse to get chronological order (oldest first) and convert timestamps to milliseconds
    const chronologicalMessages = messages
      .reverse()
      .map((msg: any) => ({
        id: msg._id?.toString() || `${Date.now()}-${Math.random()}`,
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: new Date(msg.timestamp).getTime(),
      }));

    res.status(200).json(chronologicalMessages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

export default router;

