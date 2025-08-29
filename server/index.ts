import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectToDatabase } from "./database/connection";
import { handleDemo } from "./routes/demo";
import {
  handleLogin,
  handleSignup,
  handleLogout,
  handleGetProfile,
  handleGetUserById,
} from "./routes/auth";
import {
  handleGetEvents,
  handleGetOrganizerEvents,
  handleCreateEvent,
  handleUpdateEvent,
  handleDeleteEvent,
  handleExpressInterest,
  handleGetSponsors,
  eventMemoryStore,
} from "./routes/events";
import {
  handleGetInterestedSponsors,
  handleRespondToInterest,
  handleGetAgentDeals,
  handleGetChatMessages,
  handleSendChatMessage,
  handleUpdateDealStatus,
  handleGetPendingDeals,
  handleAssignAgentToDeal,
  handleGetMyDeals,
  handleRefreshDealData,
  dealMemoryStore,
} from "./routes/deals";
import {
  handleCreatePackages,
  handleGetEventPackages,
  handleExpressPackageInterest,
  handleGetAllSponsors,
  handlePackageInterestResponse,
  handleGetInterestedSponsorsForEvent,
} from "./routes/packages";
import { authenticateToken } from "./middleware/auth";
import { memoryStore } from "./database/memory-store";
import { createDefaultAgent } from "./database/default-agent";
import { adminAuth, listPendingSponsors, approveSponsor, rejectSponsor } from "./routes/admin";

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

  // Create default agent account
  createDefaultAgent();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Public routes
  app.get("/api/ping", (_req, res) => {
    const dbStatus =
      mongoose.connection.readyState === 1
        ? "MongoDB connected"
        : "Using memory store";
    res.json({
      message: "SponsorHub API v1.0",
      database: dbStatus,
      stats: {
        users: memoryStore.getStats(),
        events: eventMemoryStore.getStats(),
        deals: dealMemoryStore.getStats(),
      },
    });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes (public)
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/logout", handleLogout);

  // Protected routes (require authentication)
  app.get("/api/auth/profile", authenticateToken, handleGetProfile);
  app.get("/api/users/:userId", authenticateToken, handleGetUserById);

  // Event routes
  app.get("/api/events", handleGetEvents);
  app.get("/api/events/organizer", authenticateToken, handleGetOrganizerEvents);
  app.post("/api/events", authenticateToken, handleCreateEvent);
  app.put("/api/events/:eventId", authenticateToken, handleUpdateEvent);
  app.delete("/api/events/:eventId", authenticateToken, handleDeleteEvent);
  app.post(
    "/api/events/:eventId/interest",
    authenticateToken,
    handleExpressInterest,
  );
  app.get("/api/sponsors", handleGetSponsors);

  // Deal routes
  app.get(
    "/api/events/:eventId/interested-sponsors",
    authenticateToken,
    handleGetInterestedSponsors,
  );
  app.post(
    "/api/events/:eventId/sponsors/:sponsorId/respond",
    authenticateToken,
    handleRespondToInterest,
  );
  app.get("/api/deals/agent", authenticateToken, handleGetAgentDeals);
  app.get("/api/deals/pending", authenticateToken, handleGetPendingDeals);
  app.post(
    "/api/deals/:dealId/assign",
    authenticateToken,
    handleAssignAgentToDeal,
  );
  app.get("/api/deals/my", authenticateToken, handleGetMyDeals);
  app.get("/api/deals/:dealId/chat", authenticateToken, handleGetChatMessages);
  app.post("/api/deals/:dealId/chat", authenticateToken, handleSendChatMessage);
  app.patch(
    "/api/deals/:dealId/status",
    authenticateToken,
    handleUpdateDealStatus,
  );
  app.get("/api/deals/refresh", authenticateToken, handleRefreshDealData);

  // Package routes
  app.post(
    "/api/events/:eventId/packages",
    authenticateToken,
    handleCreatePackages,
  );
  app.get("/api/events/:eventId/packages", handleGetEventPackages);
  app.get(
    "/api/events/:eventId/packages/interested-sponsors",
    authenticateToken,
    handleGetInterestedSponsorsForEvent,
  );
  app.post(
    "/api/packages/:packageId/interest",
    authenticateToken,
    handleExpressPackageInterest,
  );
  app.delete(
    "/api/packages/:packageId/interest",
    authenticateToken,
    handleExpressPackageInterest,
  );
  app.post(
    "/api/events/:eventId/packages/:packageNumber/sponsors/:sponsorId/respond",
    authenticateToken,
    handlePackageInterestResponse,
  );

  // Sponsor interest routes
  app.get("/api/sponsors/all", authenticateToken, handleGetAllSponsors);

  // Admin routes
  app.get("/api/admin/sponsors/pending", ...adminAuth, listPendingSponsors);
  app.post("/api/admin/sponsors/:applicationId/approve", ...adminAuth, approveSponsor);
  app.post("/api/admin/sponsors/:applicationId/reject", ...adminAuth, rejectSponsor);

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
