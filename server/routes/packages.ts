import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Package } from "../database/models/Package";
import { User } from "../database/models/User";
import { Event } from "../database/models/Event";
import { Deal } from "../database/models/Deal";
import mongoose from "mongoose";
import { memoryStore } from "../database/memory-store";

// Memory store for packages when MongoDB is not available
interface PackageData {
  _id: string;
  eventId: string;
  packageNumber: number;
  amount: number;
  deliverables: string;
  interestedSponsors: string[];
  selectedSponsor?: string;
  status: "available" | "selected" | "completed";
  createdAt: string;
  updatedAt: string;
}

class PackageMemoryStore {
  private packages: Map<string, PackageData> = new Map();
  private packageCounter = 1;

  generateId(): string {
    return `package_${this.packageCounter++}`;
  }

  async createPackage(
    packageData: Omit<PackageData, "_id" | "createdAt" | "updatedAt">,
  ): Promise<PackageData> {
    const pkg: PackageData = {
      ...packageData,
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.packages.set(pkg._id, pkg);
    console.log(`💾 [PackageMemoryStore] Created package: ${pkg._id}`);
    return pkg;
  }

  async getPackagesByEvent(eventId: string): Promise<PackageData[]> {
    return Array.from(this.packages.values()).filter(
      (p) => p.eventId === eventId,
    );
  }

  async getPackageById(id: string): Promise<PackageData | null> {
    return this.packages.get(id) || null;
  }

  async expressInterest(
    packageId: string,
    sponsorId: string,
  ): Promise<boolean> {
    const pkg = this.packages.get(packageId);
    if (pkg && !pkg.interestedSponsors.includes(sponsorId)) {
      pkg.interestedSponsors.push(sponsorId);
      pkg.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async selectSponsor(packageId: string, sponsorId: string): Promise<boolean> {
    const pkg = this.packages.get(packageId);
    if (pkg) {
      pkg.selectedSponsor = sponsorId;
      pkg.status = "selected";
      pkg.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
}

export const packageMemoryStore = new PackageMemoryStore();

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

      const createdPackages = [];
      for (let i = 0; i < packages.length; i++) {
        const { amount, deliverables } = packages[i];

        if (!amount || !deliverables) {
          return res.status(400).json({
            success: false,
            message: `Package ${i + 1}: Amount and deliverables are required`,
          });
        }

        const packageData = {
          eventId,
          packageNumber: i + 1,
          amount: parseInt(amount),
          deliverables,
          interestedSponsors: [],
          status: "available" as const,
        };

        const createdPackage =
          await packageMemoryStore.createPackage(packageData);
        createdPackages.push(createdPackage);
      }

      res.status(201).json({
        success: true,
        packages: createdPackages,
        message: "Packages created successfully",
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

      const packages = await packageMemoryStore.getPackagesByEvent(eventId);

      // Add interest status for current user if they're a sponsor
      const packagesWithInterestStatus = packages.map((pkg) => {
        const pkgObj = { ...pkg };
        if (req.user && req.user.role === "sponsor") {
          pkgObj.hasExpressedInterest = pkg.interestedSponsors.includes(
            req.user.userId,
          );
        }
        return pkgObj;
      });

      res.json({
        success: true,
        packages: packagesWithInterestStatus,
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

      const packageDoc = await Package.findById(packageId).populate("eventId");
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

      // Get available agent (for now, use the default agent)
      const availableAgent = await User.findOne({
        role: "agent",
        isActive: true,
      });
      if (!availableAgent) {
        return res.status(503).json({
          success: false,
          message: "No agents available at the moment",
        });
      }

      // Create deal immediately with assigned agent
      const newDeal = new Deal({
        event: packageDoc.eventId,
        packageId: packageDoc._id,
        sponsor: req.user.userId,
        organizer: (packageDoc.eventId as any).organizer,
        agent: availableAgent._id,
        amount: packageDoc.amount,
        description: `Package ${packageDoc.packageNumber}: ${packageDoc.deliverables}`,
        status: "negotiating",
      });

      await newDeal.save();

      // Update package status to selected and assign agent
      packageDoc.selectedSponsor = req.user.userId as any;
      packageDoc.status = "selected";
      await packageDoc.save();

      res.json({
        success: true,
        message:
          "Interest expressed! An agent has been automatically assigned to facilitate this deal.",
        dealId: newDeal._id,
        agentAssigned: true,
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

// Handle organizer response to package interest
export const handlePackageInterestResponse: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user || req.user.role !== "organizer") {
      return res.status(403).json({
        success: false,
        message: "Only organizers can respond to package interest",
      });
    }

    const { eventId, packageNumber, sponsorId } = req.params;
    const { action } = req.body; // "accept" or "decline"

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for package interest response");

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
          message: "You can only respond to interests for your own events",
        });
      }

      // Find the package
      const packageDoc = await Package.findOne({
        eventId,
        packageNumber: parseInt(packageNumber),
      });

      if (!packageDoc) {
        return res.status(404).json({
          success: false,
          message: "Package not found",
        });
      }

      // Check if sponsor has expressed interest in this package
      if (!packageDoc.interestedSponsors.includes(sponsorId as any)) {
        return res.status(400).json({
          success: false,
          message: "Sponsor has not expressed interest in this package",
        });
      }

      if (action === "accept") {
        // Create a deal and assign to agent pool
        const newDeal = new Deal({
          eventId,
          packageId: packageDoc._id,
          sponsorId,
          organizerId: req.user.userId,
          status: "pending",
          amount: packageDoc.amount,
          description: `Package ${packageNumber}: ${packageDoc.deliverables}`,
        });

        await newDeal.save();

        // Remove sponsor from interested list and set as selected
        packageDoc.interestedSponsors = packageDoc.interestedSponsors.filter(
          (id: any) => id.toString() !== sponsorId,
        );
        packageDoc.selectedSponsor = sponsorId as any;
        packageDoc.status = "selected";
        await packageDoc.save();

        res.json({
          success: true,
          message:
            "Package interest accepted! Deal created and will be assigned to an agent.",
          dealId: newDeal._id,
        });
      } else if (action === "decline") {
        // Remove sponsor from interested list
        packageDoc.interestedSponsors = packageDoc.interestedSponsors.filter(
          (id: any) => id.toString() !== sponsorId,
        );
        await packageDoc.save();

        res.json({
          success: true,
          message: "Package interest declined.",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Must be 'accept' or 'decline'",
        });
      }
    } else {
      console.log("💾 Database not available");
      return res.status(503).json({
        success: false,
        message: "Database not available",
      });
    }
  } catch (error) {
    console.error("Package interest response error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to respond to package interest",
    });
  }
};
