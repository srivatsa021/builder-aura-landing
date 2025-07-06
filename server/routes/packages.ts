import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Package } from "../database/models/Package";
import { User } from "../database/models/User";
import { Event } from "../database/models/Event";
import { Deal } from "../database/models/Deal";
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
export const handleGetEventPackages: RequestHandler = async (req: any, res) => {
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

      // If the request has a user (sponsor), mark packages they've expressed interest in
      const packagesWithInterestStatus = packages.map((pkg) => {
        const pkgObj = pkg.toObject();
        if (req.user && req.user.role === "sponsor") {
          pkgObj.hasExpressedInterest = pkg.interestedSponsors.some(
            (sponsor: any) => sponsor._id.toString() === req.user.userId,
          );
        }
        return pkgObj;
      });

      res.json({
        success: true,
        packages: packagesWithInterestStatus,
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
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for expressing package interest");

      const packageDoc = await Package.findById(packageId);
      if (!packageDoc) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check if already interested
      if (packageDoc.interestedSponsors.includes(req.user.userId as any)) {
        return res.status(400).json({
          success: false,
          message: "Already expressed interest in this package",
        });
      }

      // Add sponsor to interested list
      packageDoc.interestedSponsors.push(req.user.userId as any);
      await packageDoc.save();

      res.json({
        success: true,
        message: "Interest expressed in package successfully",
      });
    } else {
      console.log("💾 Using memory store for expressing package interest");
      res.status(503).json({
        success: false,
        message: "Database not available",
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

// Get all sponsors (for organizer to view in sponsors page)
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

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting sponsors");

      const sponsors = await User.find({ role: "sponsor", isActive: true })
        .select("name companyName industry phone website")
        .sort({ companyName: 1 });

      res.json({
        success: true,
        sponsors,
      });
    } else {
      console.log("💾 Using memory store for getting sponsors");

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
    }
  } catch (error) {
    console.error("Get all sponsors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get sponsors",
    });
  }
};
