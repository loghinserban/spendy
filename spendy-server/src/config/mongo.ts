import mongoose from "mongoose";

const mongoUri = process.env.MONGO_URI?.trim();

export const connectMongo = async (): Promise<void> => {
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not set. Configure a cloud MongoDB connection string in Render environment variables.",
    );
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
};

export const disconnectMongo = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Failed to disconnect from MongoDB:", error);
    throw error;
  }
};

