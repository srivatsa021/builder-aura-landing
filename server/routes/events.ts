import { RequestHandler } from "express";
import { Event } from "../database/models/Event";
import { User } from "../database/models/User";
import { AuthenticatedRequest } from "../middleware/auth";
import mongoose from "mongoose";
import { memoryStore } from "../database/memory-store";

// In-memory storage for events when MongoDB is not available
interface EventData {
  _id: string;
  title: string;
  description: string;
  organizer: {
    _id: string;
    name: string;
    clubName: string;
    collegeName: string;
  };
  eventDate: string;
  expectedAttendees: number;
  sponsorshipAmount: number;
  category: string;
  venue: string;
  status: "draft" | "published" | "sponsored" | "completed";
  interestedSponsors: string[];
  createdAt: string;
  updatedAt: string;
}

class EventMemoryStore {
  private events: Map<string, EventData> = new Map();
  private idCounter = 1;

  generateId(): string {
    return `event_${this.idCounter++}`;
  }

  async createEvent(
    eventData: Omit<EventData, "_id" | "createdAt" | "updatedAt">,
  ): Promise<EventData> {
    const event: EventData = {
      ...eventData,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.events.set(event._id, event);
    console.log(`💾 [EventMemoryStore] Created event: ${event.title}`);
    return event;
  }

  async getAllEvents(): Promise<EventData[]> {
    return Array.from(this.events.values()).filter((e) => e.status !== "draft");
  }

  async getEventsByOrganizer(organizerId: string): Promise<EventData[]> {
    return Array.from(this.events.values()).filter(
      (e) => e.organizer._id === organizerId,
    );
  }

  async getEventById(id: string): Promise<EventData | null> {
    return this.events.get(id) || null;
  }

  async expressInterest(eventId: string, sponsorId: string): Promise<boolean> {
    const event = this.events.get(eventId);
    if (event && !event.interestedSponsors.includes(sponsorId)) {
      event.interestedSponsors.push(sponsorId);
      event.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getStats() {
    return {
      totalEvents: this.events.size,
      publishedEvents: Array.from(this.events.values()).filter(
        (e) => e.status === "published",
      ).length,
      draftEvents: Array.from(this.events.values()).filter(
        (e) => e.status === "draft",
      ).length,
    };
  }
}

export const eventMemoryStore = new EventMemoryStore();

// Get all events (for sponsors)
export const handleGetEvents: RequestHandler = async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting events");

      const events = await Event.find({ status: { $ne: "draft" } })
        .populate("organizer", "name clubName collegeName")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        events: events,
      });
    } else {
      console.log("💾 Using memory store for getting events");

      const events = await eventMemoryStore.getAllEvents();

      res.json({
        success: true,
        events: events,
      });
    }
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};

// Get events by organizer (for organizer dashboard)
export const handleGetOrganizerEvents: RequestHandler = async (
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

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting organizer events");

      const events = await Event.find({ organizer: req.user.userId }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        events: events,
      });
    } else {
      console.log("💾 Using memory store for getting organizer events");

      const events = await eventMemoryStore.getEventsByOrganizer(
        req.user.userId,
      );

      res.json({
        success: true,
        events: events,
      });
    }
  } catch (error) {
    console.error("Get organizer events error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizer events",
    });
  }
};

// Create new event
export const handleCreateEvent: RequestHandler = async (
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

    if (req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can create events",
      });
    }

    const {
      title,
      description,
      eventDate,
      expectedAttendees,
      sponsorshipAmount,
      category,
      venue,
      status = "draft",
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !eventDate ||
      !expectedAttendees ||
      !sponsorshipAmount ||
      !category ||
      !venue
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for creating event");

      // Get organizer details
      const organizer = await User.findById(req.user.userId);
      if (!organizer) {
        return res.status(404).json({
          success: false,
          message: "Organizer not found",
        });
      }

      const newEvent = new Event({
        title,
        description,
        organizer: req.user.userId,
        collegeName: organizer.collegeName,
        clubName: organizer.clubName,
        eventDate: new Date(eventDate),
        expectedAttendees: parseInt(expectedAttendees),
        sponsorshipAmount: parseInt(sponsorshipAmount),
        category,
        venue,
        status,
      });

      await newEvent.save();

      const populatedEvent = await Event.findById(newEvent._id).populate(
        "organizer",
        "name clubName collegeName",
      );

      res.status(201).json({
        success: true,
        event: populatedEvent,
        message: "Event created successfully",
      });
    } else {
      console.log("💾 Using memory store for creating event");

      // Get organizer details from memory store
      const organizer = await memoryStore.findUserById(req.user.userId);
      if (!organizer) {
        return res.status(404).json({
          success: false,
          message: "Organizer not found",
        });
      }

      const eventData = {
        title,
        description,
        organizer: {
          _id: req.user.userId,
          name: organizer.name,
          clubName: organizer.clubName || "",
          collegeName: organizer.collegeName || "",
        },
        eventDate,
        expectedAttendees: parseInt(expectedAttendees),
        sponsorshipAmount: parseInt(sponsorshipAmount),
        category,
        venue,
        status,
        interestedSponsors: [],
      };

      const newEvent = await eventMemoryStore.createEvent(eventData);

      res.status(201).json({
        success: true,
        event: newEvent,
        message: "Event created successfully",
      });
    }
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
};

// Express interest in an event
export const handleExpressInterest: RequestHandler = async (
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

    if (req.user.role !== "sponsor") {
      return res.status(403).json({
        success: false,
        message: "Only sponsors can express interest",
      });
    }

    const { eventId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for expressing interest");

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      // Check if already interested
      if (event.interestedSponsors.includes(req.user.userId as any)) {
        return res.status(400).json({
          success: false,
          message: "Already expressed interest in this event",
        });
      }

      // Add sponsor to interested list
      event.interestedSponsors.push(req.user.userId as any);
      await event.save();

      res.json({
        success: true,
        message: "Interest expressed successfully",
      });
    } else {
      console.log("💾 Using memory store for expressing interest");

      const success = await eventMemoryStore.expressInterest(
        eventId,
        req.user.userId,
      );

      if (success) {
        res.json({
          success: true,
          message: "Interest expressed successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to express interest or already interested",
        });
      }
    }
  } catch (error) {
    console.error("Express interest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to express interest",
    });
  }
};

// Get available sponsors (for organizer dashboard)
export const handleGetSponsors: RequestHandler = async (req, res) => {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting sponsors");

      const sponsors = await User.find({
        role: "sponsor",
        isActive: true,
      }).select("name companyName industry website phone");

      res.json({
        success: true,
        sponsors: sponsors.map((sponsor) => ({
          _id: sponsor._id,
          companyName: sponsor.companyName,
          industry: sponsor.industry,
          website: sponsor.website,
          contactPerson: sponsor.name,
          status: "open", // TODO: Add actual status tracking
          lastActive: new Date().toISOString(),
        })),
      });
    } else {
      console.log("💾 Using memory store for getting sponsors");

      // Mock sponsor data for memory store
      const sponsors = [
        {
          _id: "sponsor1",
          companyName: "Tech Innovators Pvt Ltd",
          industry: "Technology",
          website: "https://techinnovators.com",
          contactPerson: "John Smith",
          status: "open",
          lastActive: "2024-01-10",
        },
        {
          _id: "sponsor2",
          companyName: "Green Energy Solutions",
          industry: "Renewable Energy",
          contactPerson: "Sarah Johnson",
          status: "open",
          lastActive: "2024-01-08",
        },
        {
          _id: "sponsor3",
          companyName: "Digital Marketing Hub",
          industry: "Marketing",
          website: "https://digitalmarketing.com",
          contactPerson: "Mike Wilson",
          status: "busy",
          lastActive: "2024-01-05",
        },
      ];

      res.json({
        success: true,
        sponsors: sponsors,
      });
    }
  } catch (error) {
    console.error("Get sponsors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sponsors",
    });
  }
};
