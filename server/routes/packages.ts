import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Package } from "../database/models/Package";
import { User } from "../database/models/User";
import { Event } from "../database/models/Event";
import mongoose from "mongoose";
import { memoryStore } from "../database/memory-store";

// Create packages for an event
export const handleCreatePackages: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can create packages",
      });
    }

    const { eventId } = req.params;
    const { packages } = req.body;

    if (!packages || !Array.isArray(packages) || packages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Packages array is required",
      });
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for creating packages");

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
          message: "You can only create packages for your own events",
        });
      }

      // Delete existing packages for this event (for updates)
      await Package.deleteMany({ eventId });

      const createdPackages = [];
      for (let i = 0; i < packages.length; i++) {
        const { amount, deliverables } = packages[i];

        if (!amount || !deliverables) {
          return res.status(400).json({
            success: false,
            message: `Package ${i + 1}: Amount and deliverables are required`,
          });
        }

        const packageDoc = new Package({
          eventId,
          packageNumber: i + 1,
          amount: parseInt(amount),
          deliverables,
          interestedSponsors: [],
          status: "available",
        });

        await packageDoc.save();
        createdPackages.push(packageDoc);
      }

      res.status(201).json({
        success: true,
        packages: createdPackages,
        message: "Packages created successfully",
      });
    } else {
      console.log("💾 Using memory store for creating packages");
      // Fallback to memory store implementation
      res.status(503).json({
        success: false,
        message: "Database not available",
      });
    }
  } catch (error) {
    console.error("Create packages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create packages",
    });
  }
};

// Get packages for an event
export const handleGetEventPackages: RequestHandler = async (req, res) => {
  try {
    const { eventId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting packages");

      const packages = await Package.find({ eventId })
        .sort({ packageNumber: 1 })
        .populate(
          "interestedSponsors",
          "name companyName industry phone website",
        );

      res.json({
        success: true,
        packages,
      });
    } else {
      console.log("💾 Using memory store for getting packages");
      res.status(503).json({
        success: false,
        message: "Database not available",
      });
    }
  } catch (error) {
    console.error("Get event packages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get packages",
    });
  }
};

// Express interest in a package
export const handleExpressPackageInterest: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "sponsor") {
      return res.status(403).json({
        success: false,
        message: "Only sponsors can express interest in packages",
      });
    }

    const { packageId } = req.params;
    const success = await packageMemoryStore.expressInterestInPackage(
      packageId,
      req.user.userId,
    );

    if (success) {
      res.json({
        success: true,
        message: "Interest expressed in package successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to express interest or already interested",
      });
    }
  } catch (error) {
    console.error("Express package interest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to express interest",
    });
  }
};

// Get all sponsors (for organizer to view and express interest)
export const handleGetAllSponsors: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can view sponsors",
      });
    }

    // Get all sponsor users from memory store
    const allUsers = Array.from(memoryStore.findAll());
    const sponsors = allUsers
      .filter((user) => user.role === "sponsor" && user.isActive)
      .map((sponsor) => ({
        _id: sponsor._id,
        name: sponsor.name,
        companyName: sponsor.companyName,
        industry: sponsor.industry,
        website: sponsor.website,
        phone: sponsor.phone,
      }));

    res.json({
      success: true,
      sponsors,
    });
  } catch (error) {
    console.error("Get all sponsors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sponsors",
    });
  }
};

// Express interest in a sponsor (organizer to sponsor)
export const handleExpressSponsorInterest: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can express interest in sponsors",
      });
    }

    const { sponsorId } = req.params;

    // Check if interest already exists
    const existingInterest = Array.from(
      packageMemoryStore.interests.values(),
    ).find(
      (i) => i.sponsorId === sponsorId && i.organizerId === req.user!.userId,
    );

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: "Interest already expressed",
      });
    }

    const interest = await packageMemoryStore.createInterest({
      sponsorId,
      organizerId: req.user.userId,
      type: "organizer_to_sponsor",
      status: "pending",
    });

    res.json({
      success: true,
      message: "Interest expressed in sponsor successfully",
      interest,
    });
  } catch (error) {
    console.error("Express sponsor interest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to express interest",
    });
  }
};

// Get mutual interests for agent dashboard
export const handleGetMutualInterests: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can view mutual interests",
      });
    }

    const mutualInterests = await packageMemoryStore.findMutualInterests();

    // Enrich with user and event data
    const enrichedInterests = [];
    for (const interest of mutualInterests) {
      const sponsor = await memoryStore.findUserById(interest.sponsorId);
      const organizer = await memoryStore.findUserById(interest.organizerId);

      if (sponsor && organizer) {
        enrichedInterests.push({
          ...interest,
          sponsor: {
            name: sponsor.name,
            companyName: sponsor.companyName,
          },
          organizer: {
            name: organizer.name,
            clubName: organizer.clubName,
            collegeName: organizer.collegeName,
          },
        });
      }
    }

    res.json({
      success: true,
      interests: enrichedInterests,
    });
  } catch (error) {
    console.error("Get mutual interests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get mutual interests",
    });
  }
};

// Assign agent to mutual interest
export const handleAssignAgentToInterest: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can assign themselves to interests",
      });
    }

    const { interestId } = req.params;
    const success = await packageMemoryStore.assignAgentToInterest(
      interestId,
      req.user.userId,
    );

    if (success) {
      res.json({
        success: true,
        message: "Agent assigned successfully. Both parties will be notified.",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Interest not found",
      });
    }
  } catch (error) {
    console.error("Assign agent error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign agent",
    });
  }
};
