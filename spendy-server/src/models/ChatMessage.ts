import mongoose, { Schema } from "mongoose";

export interface IChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const existingModel = mongoose.models.ChatMessage as mongoose.Model<IChatMessage> | undefined;

export const ChatMessage = existingModel ?? mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

