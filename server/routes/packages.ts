import { RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { eventMemoryStore } from "./events";
import { memoryStore } from "../database/memory-store";
import mongoose from "mongoose";

// In-memory storage for packages and interests
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

interface InterestData {
  _id: string;
  sponsorId: string;
  organizerId: string;
  eventId?: string;
  packageId?: string;
  type: "sponsor_to_organizer" | "organizer_to_sponsor" | "sponsor_to_package";
  status: "pending" | "mutual" | "declined";
  assignedAgent?: string;
  createdAt: string;
  updatedAt: string;
}

class PackageMemoryStore {
  public packages: Map<string, PackageData> = new Map();
  public interests: Map<string, InterestData> = new Map();
  private packageCounter = 1;
  private interestCounter = 1;

  generatePackageId(): string {
    return `package_${this.packageCounter++}`;
  }

  generateInterestId(): string {
    return `interest_${this.interestCounter++}`;
  }

  async createPackage(
    packageData: Omit<PackageData, "_id" | "createdAt" | "updatedAt">,
  ): Promise<PackageData> {
    const pkg: PackageData = {
      ...packageData,
      _id: this.generatePackageId(),
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

  async createInterest(
    interestData: Omit<InterestData, "_id" | "createdAt" | "updatedAt">,
  ): Promise<InterestData> {
    const interest: InterestData = {
      ...interestData,
      _id: this.generateInterestId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.interests.set(interest._id, interest);
    console.log(`💾 [PackageMemoryStore] Created interest: ${interest._id}`);
    return interest;
  }

  async findMutualInterests(): Promise<InterestData[]> {
    return Array.from(this.interests.values()).filter(
      (i) => i.status === "mutual" && !i.assignedAgent,
    );
  }

  async assignAgentToInterest(
    interestId: string,
    agentId: string,
  ): Promise<boolean> {
    const interest = this.interests.get(interestId);
    if (interest) {
      interest.assignedAgent = agentId;
      interest.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  async expressInterestInPackage(
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

  getStats() {
    return {
      totalPackages: this.packages.size,
      totalInterests: this.interests.size,
      mutualInterests: Array.from(this.interests.values()).filter(
        (i) => i.status === "mutual",
      ).length,
    };
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
    const packages = await packageMemoryStore.getPackagesByEvent(eventId);

    res.json({
      success: true,
      packages,
    });
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
