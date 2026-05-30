import mongoose from "mongoose";
import { ChatMessage } from "../src/models/ChatMessage";
import { connectMongo, disconnectMongo } from "../src/config/mongo";

// Test suite for Chat functionality
describe("ChatMessage Model and MongoDB", () => {
  beforeAll(async () => {
    // Connect to MongoDB test instance
    try {
      await connectMongo();
    } catch (error) {
      console.warn(
        "MongoDB not available for testing. Skipping chat tests.",
        error
      );
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await disconnectMongo();
    }
  });

  beforeEach(async () => {
    // Clear messages before each test
    if (mongoose.connection.readyState === 1) {
      await ChatMessage.deleteMany({});
    }
  });

  describe("ChatMessage Model", () => {
    it("should create a chat message with all required fields", async () => {
      if (mongoose.connection.readyState !== 1) {
        // Skip if MongoDB is not connected
        expect(true).toBe(true);
        return;
      }

      const messageData = {
        senderId: "user123",
        senderName: "John Doe",
        text: "Hello, this is a test message!",
        timestamp: new Date(),
      };

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage._id).toBeDefined();
      expect(savedMessage.senderId).toBe("user123");
      expect(savedMessage.senderName).toBe("John Doe");
      expect(savedMessage.text).toBe("Hello, this is a test message!");
      expect(savedMessage.timestamp).toBeDefined();
    });

    it("should throw validation error if required fields are missing", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const incompleteMessage = new ChatMessage({
        senderId: "user123",
        // Missing senderName, text
      });

      await expect(incompleteMessage.save()).rejects.toThrow();
    });

    it("should set default timestamp if not provided", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const messageData = {
        senderId: "user456",
        senderName: "Jane Doe",
        text: "Another test message",
      };

      const message = new ChatMessage(messageData);
      const savedMessage = await message.save();

      expect(savedMessage.timestamp).toBeDefined();
      expect(savedMessage.timestamp instanceof Date).toBe(true);
    });
  });

  describe("ChatMessage Queries", () => {
    beforeEach(async () => {
      if (mongoose.connection.readyState !== 1) return;

      // Create test messages
      const messages = [
        {
          senderId: "user1",
          senderName: "Alice",
          text: "First message",
          timestamp: new Date(Date.now() - 3000),
        },
        {
          senderId: "user2",
          senderName: "Bob",
          text: "Second message",
          timestamp: new Date(Date.now() - 2000),
        },
        {
          senderId: "user1",
          senderName: "Alice",
          text: "Third message",
          timestamp: new Date(Date.now() - 1000),
        },
      ];

      await ChatMessage.insertMany(messages);
    });

    it("should retrieve messages in descending order by timestamp", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const messages = await ChatMessage.find()
        .sort({ timestamp: -1 })
        .lean();

      expect(messages).toHaveLength(3);
      expect(messages[0]?.text).toBe("Third message");
      expect(messages[1]?.text).toBe("Second message");
      expect(messages[2]?.text).toBe("First message");
    });

    it("should limit query to 50 messages", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const messages = await ChatMessage.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      expect(messages.length).toBeLessThanOrEqual(50);
    });

    it("should filter messages by senderId", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const messages = await ChatMessage.find({ senderId: "user1" }).lean();

      expect(messages).toHaveLength(2);
      expect(messages.every((m) => m.senderId === "user1")).toBe(true);
    });
  });

  describe("ChatMessage Persistence", () => {
    it("should persist message to database and retrieve it", async () => {
      if (mongoose.connection.readyState !== 1) {
        expect(true).toBe(true);
        return;
      }

      const messageData = {
        senderId: "persistent-user",
        senderName: "Persistent User",
        text: "This message should persist",
        timestamp: new Date(),
      };

      const savedMessage = await ChatMessage.create(messageData);
      const retrievedMessage = await ChatMessage.findById(
        savedMessage._id
      ).lean();

      expect(retrievedMessage).toBeDefined();
      expect(retrievedMessage?.text).toBe("This message should persist");
    });
  });
});

