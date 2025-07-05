import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/sponsorhub";

export async function connectToDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    console.log("🔄 Attempting to connect to MongoDB:", MONGODB_URI);

    const connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log("📦 Connected to MongoDB:", connection.connection.host);
    return connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log(
      "💡 Note: Make sure MongoDB is running locally or update MONGODB_URI for cloud database",
    );
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log("📦 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ MongoDB disconnection error:", error);
    throw error;
  }
}
