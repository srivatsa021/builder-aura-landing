import express from "express";
import cors from "cors";
import { connectToDatabase } from "./database/connection";
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleSignup,
  handleLogout,
  handleGetProfile,
} from "./routes/auth";
import { authenticateToken } from "./middleware/auth";
import { memoryStore } from "./database/memory-store";

export function createServer() {
  const app = express();

  // Connect to MongoDB (non-blocking)
  connectToDatabase().catch((error) => {
    console.error(
      "⚠️ Failed to connect to MongoDB. Some features may not work:",
      error.message,
    );
    console.log("💡 To fix this:");
    console.log(
      "   1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/",
    );
    console.log(
      "   2. Or update MONGODB_URI in .env with MongoDB Atlas connection string",
    );
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Public routes
  app.get("/api/ping", (_req, res) => {
    const mongoose = require("mongoose");
    const dbStatus =
      mongoose.connection.readyState === 1
        ? "MongoDB connected"
        : "Using memory store";
    res.json({
      message: "SponsorHub API v1.0",
      database: dbStatus,
      stats: memoryStore.getStats(),
    });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes (public)
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/logout", handleLogout);

  // Protected routes (require authentication)
  app.get("/api/auth/profile", authenticateToken, handleGetProfile);

  // Health check with database status
  app.get("/api/health", async (_req, res) => {
    try {
      // Test database connection
      const mongoose = require("mongoose");
      const dbStatus =
        mongoose.connection.readyState === 1 ? "connected" : "disconnected";

      res.json({
        status: "healthy",
        database: dbStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        database: "error",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  return app;
}
