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

export function createServer() {
  const app = express();

  // Connect to MongoDB
  connectToDatabase().catch(console.error);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Public routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "SponsorHub API v1.0 - Connected to MongoDB!" });
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
