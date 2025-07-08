import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { eventMemoryStore } from "./events";
import { memoryStore } from "../database/memory-store";
import { Package } from "../database/models/Package";
import { Event } from "../database/models/Event";
import { packageMemoryStore } from "./packages";
import mongoose from "mongoose";

// In-memory storage for deals and chats
interface Deal {
  _id: string;
  eventId: string;
  sponsorId: string;
  organizerId: string;
  agentId?: string;
  status:
    | "pending"
    | "negotiating"
    | "approved"
    | "signed"
    | "completed"
    | "cancelled";
  proposedAmount: number;
  finalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  _id: string;
  dealId: string;
  from: string; // userId
  fromRole: "sponsor" | "organizer" | "agent";
  message: string;
  timestamp: string;
}

class DealMemoryStore {
  private deals: Map<string, Deal> = new Map();
  private chats: Map<string, ChatMessage[]> = new Map(); // dealId -> messages
  private idCounter = 1;
  private messageCounter = 1;

  generateId(): string {
    return `deal_${this.idCounter++}`;
  }

  generateMessageId(): string {
    return `msg_${this.messageCounter++}`;
  }

  async createDeal(
    dealData: Omit<Deal, "_id" | "createdAt" | "updatedAt">,
  ): Promise<Deal> {
    const deal: Deal = {
      ...dealData,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.deals.set(deal._id, deal);
    this.chats.set(deal._id, []); // Initialize empty chat
    console.log(`💾 [DealMemoryStore] Created deal: ${deal._id}`);
    return deal;
  }

  async getDealsByAgent(agentId: string): Promise<Deal[]> {
    return Array.from(this.deals.values()).filter(
      (deal) => deal.agentId === agentId,
    );
  }

  async getAllDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values());
  }

  async getDealById(dealId: string): Promise<Deal | null> {
    return this.deals.get(dealId) || null;
  }

  async updateDealStatus(
    dealId: string,
    status: Deal["status"],
  ): Promise<boolean> {
    const deal = this.deals.get(dealId);
    if (deal) {
      deal.status = status;
      deal.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async assignAgent(dealId: string, agentId: string): Promise<boolean> {
    const deal = this.deals.get(dealId);
    if (deal) {
      deal.agentId = agentId;
      deal.status = "negotiating";
      deal.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async addChatMessage(
    dealId: string,
    from: string,
    fromRole: "sponsor" | "organizer" | "agent",
    message: string,
  ): Promise<ChatMessage> {
    const chatMessage: ChatMessage = {
      _id: this.generateMessageId(),
      dealId,
      from,
      fromRole,
      message,
      timestamp: new Date().toISOString(),
    };

    if (!this.chats.has(dealId)) {
      this.chats.set(dealId, []);
    }

    this.chats.get(dealId)!.push(chatMessage);
    return chatMessage;
  }

  async getChatMessages(dealId: string): Promise<ChatMessage[]> {
    return this.chats.get(dealId) || [];
  }

  getStats() {
    return {
      totalDeals: this.deals.size,
      activeDeals: Array.from(this.deals.values()).filter((d) =>
        ["pending", "negotiating"].includes(d.status),
      ).length,
      completedDeals: Array.from(this.deals.values()).filter(
        (d) => d.status === "completed",
      ).length,
    };
  }
}

export const dealMemoryStore = new DealMemoryStore();

// Get interested sponsors for an event
export const handleGetInterestedSponsors: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can view interested sponsors",
      });
    }

    const { eventId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for event verification");

      // Verify event exists and user owns it
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      if (event.organizer.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "You can only view sponsors for your own events",
        });
      }
      console.log("📦 Getting interested sponsors");

      // Get packages for this event with anonymous interest counts
      const packages = await Package.find({ eventId })
        .populate("selectedSponsor", "companyName")
        .sort({ packageNumber: 1 });

      // Get deals for packages to check agent assignments
      const deals = await Deal.find({
        event: eventId,
        packageId: { $in: packages.map((p) => p._id) },
      }).populate("agent", "name");

      // Create packages with interest info and agent status
      const packageInfo = packages.map((pkg) => {
        const deal = deals.find(
          (d) => d.packageId.toString() === pkg._id.toString(),
        );
        return {
          packageNumber: pkg.packageNumber,
          amount: pkg.amount,
          deliverables: pkg.deliverables,
          status: pkg.status,
          interestCount: pkg.interestedSponsors.length,
          hasSelectedSponsor: !!pkg.selectedSponsor,
          selectedSponsorCompany: pkg.selectedSponsor?.companyName,
          agentAssigned: !!deal?.agent,
          agentName: deal?.agent?.name,
          dealStatus: deal?.status,
        };
      });

      res.json({
        success: true,
        packages: packageInfo,
      });
    } else {
      console.log("💾 Using memory store for getting package status");

      // Get packages from memory store
      const packages = await packageMemoryStore.getPackagesByEvent(eventId);

      // Create packages with interest info (no agent assignment in memory store)
      const packageInfo = packages.map((pkg) => ({
        packageNumber: pkg.packageNumber,
        amount: pkg.amount,
        deliverables: pkg.deliverables,
        status: pkg.status,
        interestCount: pkg.interestedSponsors.length,
        hasSelectedSponsor: !!pkg.selectedSponsor,
        selectedSponsorCompany: null, // Can't get company name from memory store easily
        agentAssigned: false, // No automatic agent assignment in memory store
        agentName: null,
        dealStatus: null,
      }));

      res.json({
        success: true,
        packages: packageInfo,
      });
    }
  } catch (error) {
    console.error("Get interested sponsors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get interested sponsors",
    });
  }
};

// Accept or decline sponsor interest
export const handleRespondToInterest: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can respond to interest",
      });
    }

    const { eventId, sponsorId } = req.params;
    const { action } = req.body; // "accept" or "decline"

    const event = await eventMemoryStore.getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user owns this event
    if (event.organizer._id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only respond to interest for your own events",
      });
    }

    if (action === "accept") {
      // Create a deal and assign default agent
      const defaultAgent = await memoryStore.findUserByEmail("a@gmail.com");
      if (!defaultAgent) {
        return res.status(500).json({
          success: false,
          message: "No agent available",
        });
      }

      const deal = await dealMemoryStore.createDeal({
        eventId,
        sponsorId,
        organizerId: req.user.userId,
        agentId: defaultAgent._id,
        status: "negotiating",
        proposedAmount: event.sponsorshipAmount,
      });

      // Add initial chat message from agent
      await dealMemoryStore.addChatMessage(
        deal._id,
        defaultAgent._id,
        "agent",
        `Hello! I'm your assigned agent for this sponsorship deal. I'll help facilitate the negotiation between ${event.organizer.name} and the sponsor. Let's discuss the terms and find a mutually beneficial agreement.`,
      );

      res.json({
        success: true,
        message:
          "Interest accepted! An agent has been assigned to mediate the deal.",
        dealId: deal._id,
      });
    } else if (action === "decline") {
      res.json({
        success: true,
        message: "Interest declined.",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid action. Use 'accept' or 'decline'.",
      });
    }
  } catch (error) {
    console.error("Respond to interest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to interest",
    });
  }
};

// Get deals for agent
export const handleGetAgentDeals: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can view deals",
      });
    }

    const deals = await dealMemoryStore.getDealsByAgent(req.user.userId);

    // Enrich deals with event and user data
    const enrichedDeals = [];
    for (const deal of deals) {
      const event = await eventMemoryStore.getEventById(deal.eventId);
      const sponsor = await memoryStore.findUserById(deal.sponsorId);
      const organizer = await memoryStore.findUserById(deal.organizerId);

      if (event && sponsor && organizer) {
        enrichedDeals.push({
          ...deal,
          event: {
            title: event.title,
            eventDate: event.eventDate,
            organizer: organizer.name,
            college: organizer.collegeName,
          },
          sponsor: {
            companyName: sponsor.companyName,
            contactPerson: sponsor.name,
          },
        });
      }
    }

    res.json({
      success: true,
      deals: enrichedDeals,
    });
  } catch (error) {
    console.error("Get agent deals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get deals",
    });
  }
};

// Get chat messages for a deal
export const handleGetChatMessages: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { dealId } = req.params;
    const deal = await dealMemoryStore.getDealById(dealId);

    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    // Check if user is part of this deal
    if (
      ![deal.sponsorId, deal.organizerId, deal.agentId].includes(
        req.user.userId,
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this chat",
      });
    }

    const messages = await dealMemoryStore.getChatMessages(dealId);

    // Enrich messages with user names
    const enrichedMessages = [];
    for (const message of messages) {
      const user = await memoryStore.findUserById(message.from);
      enrichedMessages.push({
        ...message,
        fromName: user?.name || "Unknown User",
      });
    }

    res.json({
      success: true,
      messages: enrichedMessages,
    });
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get chat messages",
    });
  }
};

// Send chat message
export const handleSendChatMessage: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { dealId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const deal = await dealMemoryStore.getDealById(dealId);
    if (!deal) {
      return res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }

    // Check if user is part of this deal
    if (
      ![deal.sponsorId, deal.organizerId, deal.agentId].includes(
        req.user.userId,
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages in this chat",
      });
    }

    const chatMessage = await dealMemoryStore.addChatMessage(
      dealId,
      req.user.userId,
      req.user.role as "sponsor" | "organizer" | "agent",
      message.trim(),
    );

    const user = await memoryStore.findUserById(req.user.userId);

    res.json({
      success: true,
      message: {
        ...chatMessage,
        fromName: user?.name || "Unknown User",
      },
    });
  } catch (error) {
    console.error("Send chat message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

// Update deal status
export const handleUpdateDealStatus: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can update deal status",
      });
    }

    const { dealId } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "negotiating",
      "approved",
      "signed",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const success = await dealMemoryStore.updateDealStatus(dealId, status);
    if (success) {
      res.json({
        success: true,
        message: "Deal status updated successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Deal not found",
      });
    }
  } catch (error) {
    console.error("Update deal status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update deal status",
    });
  }
};

// Get pending deals for agent assignment
export const handleGetPendingDeals: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can view pending deals",
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting pending deals");

      const pendingDeals = await Deal.find({
        status: "pending",
        agent: { $exists: false },
      })
        .populate("event", "title eventDate")
        .populate("sponsor", "name companyName")
        .populate("organizer", "name clubName collegeName")
        .populate("packageId", "packageNumber amount deliverables")
        .sort({ createdAt: 1 });

      res.json({
        success: true,
        deals: pendingDeals,
      });
    } else {
      console.log("💾 Using memory store for getting pending deals");

      // Get pending deals from memory store
      const allDeals = await dealMemoryStore.getAllDeals();
      console.log("💾 All deals in memory store:", allDeals);
      const pendingDeals = allDeals.filter(
        (deal) =>
          deal.status === "pending" ||
          (deal.status === "negotiating" && !deal.agentId),
      );
      console.log("💾 Pending deals:", pendingDeals);

      // Enrich with user and event data
      const enrichedDeals = [];
      for (const deal of pendingDeals) {
        const event = await eventMemoryStore.getEventById(deal.eventId);
        const sponsor = await memoryStore.findUserById(deal.sponsorId);
        const organizer = await memoryStore.findUserById(deal.organizerId);

        if (event && sponsor && organizer) {
          enrichedDeals.push({
            _id: deal._id,
            event: {
              _id: event._id,
              title: event.title,
              eventDate: event.eventDate,
            },
            sponsor: {
              _id: sponsor._id,
              name: sponsor.name,
              companyName: sponsor.companyName,
            },
            organizer: {
              _id: organizer._id,
              name: organizer.name,
              clubName: organizer.clubName,
              collegeName: organizer.collegeName,
            },
            packageId: {
              _id: `pkg_${deal.eventId}`,
              packageNumber: 1, // Simplified for memory store
              amount: deal.proposedAmount,
              deliverables: "Package deliverables",
            },
            amount: deal.proposedAmount,
            status: deal.status,
            createdAt: deal.createdAt,
          });
        }
      }

      res.json({
        success: true,
        deals: enrichedDeals,
      });
    }
  } catch (error) {
    console.error("Get pending deals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get pending deals",
    });
  }
};

// Agent self-assign to a pending deal
export const handleAssignAgentToDeal: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can assign themselves to deals",
      });
    }

    const { dealId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for agent assignment");

      const deal = await Deal.findById(dealId);
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: "Deal not found",
        });
      }

      if (deal.agent) {
        return res.status(400).json({
          success: false,
          message: "Deal already has an assigned agent",
        });
      }

      deal.agent = req.user.userId as any;
      deal.status = "negotiating";
      await deal.save();

      res.json({
        success: true,
        message:
          "Successfully assigned to deal. You can now begin negotiations.",
      });
    } else {
      console.log("💾 Using memory store for agent assignment");

      const deal = await dealMemoryStore.getDealById(dealId);
      if (!deal) {
        return res.status(404).json({
          success: false,
          message: "Deal not found",
        });
      }

      if (deal.agentId) {
        return res.status(400).json({
          success: false,
          message: "Deal already has an assigned agent",
        });
      }

      // Update deal in memory store
      deal.agentId = req.user.userId;
      deal.status = "negotiating";
      deal.updatedAt = new Date().toISOString();

      res.json({
        success: true,
        message:
          "Successfully assigned to deal. You can now begin negotiations.",
      });
    }
  } catch (error) {
    console.error("Assign agent to deal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign agent to deal",
    });
  }
};

// Get deals assigned to current agent
export const handleGetMyDeals: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can view their deals",
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting agent deals");

      const myDeals = await Deal.find({ agent: req.user.userId })
        .populate("event", "title eventDate")
        .populate("sponsor", "name companyName")
        .populate("organizer", "name clubName collegeName")
        .populate("packageId", "packageNumber amount deliverables")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        deals: myDeals,
      });
    } else {
      console.log("💾 Using memory store for getting my deals");

      // Get deals assigned to current agent from memory store
      const myDeals = await dealMemoryStore.getDealsByAgent(req.user.userId);

      // Enrich with user and event data
      const enrichedDeals = [];
      for (const deal of myDeals) {
        const event = await eventMemoryStore.getEventById(deal.eventId);
        const sponsor = await memoryStore.findUserById(deal.sponsorId);
        const organizer = await memoryStore.findUserById(deal.organizerId);

        if (event && sponsor && organizer) {
          enrichedDeals.push({
            _id: deal._id,
            event: {
              _id: event._id,
              title: event.title,
              eventDate: event.eventDate,
            },
            sponsor: {
              _id: sponsor._id,
              name: sponsor.name,
              companyName: sponsor.companyName,
            },
            organizer: {
              _id: organizer._id,
              name: organizer.name,
              clubName: organizer.clubName,
              collegeName: organizer.collegeName,
            },
            packageId: {
              _id: `pkg_${deal.eventId}`,
              packageNumber: 1, // Simplified for memory store
              amount: deal.proposedAmount,
              deliverables: "Package deliverables",
            },
            amount: deal.proposedAmount,
            status: deal.status,
            createdAt: deal.createdAt,
          });
        }
      }

      res.json({
        success: true,
        deals: enrichedDeals,
      });
    }
  } catch (error) {
    console.error("Get my deals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get deals",
    });
  }
};
