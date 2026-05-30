/**
 * Chat Client Example
 *
 * This file demonstrates how to connect to the Spendy Chat WebSocket server
 * and send/receive real-time chat messages.
 *
 * Usage: Include this in your frontend application and instantiate ChatClient.
 */

interface ChatMessage {
  _id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

class ChatClient {
  private ws: WebSocket | null = null;
  private url: string;
  private apiBaseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private messageHandlers: Array<(message: ChatMessage) => void> = [];
  private connectionHandlers: Array<(connected: boolean) => void> = [];

  constructor(options?: { wsUrl?: string; apiBaseUrl?: string }) {
    const defaultApiBaseUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : "https://localhost:3000";

    const defaultWsUrl = defaultApiBaseUrl.replace(/^http/, "ws");

    this.apiBaseUrl = options?.apiBaseUrl ?? defaultApiBaseUrl;
    this.url = options?.wsUrl ?? defaultWsUrl;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log("Connected to chat server");
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("Disconnected from chat server");
          this.notifyConnectionHandlers(false);
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a chat message
   */
  public sendMessage(
    senderId: string,
    senderName: string,
    text: string
  ): void {
    if (!this.isConnected()) {
      console.error("WebSocket is not connected");
      return;
    }

    const payload = {
      type: "CHAT_MESSAGE",
      senderId,
      senderName,
      text,
    };

    this.ws?.send(JSON.stringify(payload));
  }

  /**
   * Register a handler for incoming messages
   */
  public onMessage(handler: (message: ChatMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Register a handler for connection status changes
   */
  public onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Fetch chat history from the server
   */
  public async fetchHistory(): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/history`, {
        credentials: "include",
      });
      const data = await response.json();
      return Array.isArray(data) ? data : data.messages || [];
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      return [];
    }
  }

  // ---- Private methods ----

  private handleMessage(data: string): void {
    try {
      const payload = JSON.parse(data);

      if (payload.type === "CHAT_MESSAGE" && payload.data) {
        this.notifyMessageHandlers(payload.data);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  private notifyMessageHandlers(message: ChatMessage): void {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in message handler:", error);
      }
    }
  }

  private notifyConnectionHandlers(connected: boolean): void {
    for (const handler of this.connectionHandlers) {
      try {
        handler(connected);
      } catch (error) {
        console.error("Error in connection handler:", error);
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }, this.reconnectDelay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }
}

// ---- Example usage ----
/*
// Initialize the chat client
const chatClient = new ChatClient({
  apiBaseUrl: "https://192.168.1.50:3000",
  wsUrl: "wss://192.168.1.50:3000",
});

// Handle incoming messages
chatClient.onMessage((message) => {
  console.log(`${message.senderName}: ${message.text}`);
  // Update UI with new message
});

// Handle connection status
chatClient.onConnectionChange((connected) => {
  if (connected) {
    console.log("Connected! Fetching chat history...");
    chatClient.fetchHistory().then((messages) => {
      console.log("Chat history:", messages);
    });
  } else {
    console.log("Disconnected from chat");
  }
});

// Connect to the server
chatClient.connect().then(() => {
  console.log("Connected successfully");

  // Send a message
  chatClient.sendMessage("user123", "John Doe", "Hello everyone!");
});

// Disconnect when needed
// chatClient.disconnect();
*/

export default ChatClient;


