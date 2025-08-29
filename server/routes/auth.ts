import { RequestHandler } from "express";
import { LoginRequest, SignupRequest, AuthResponse } from "@shared/api";
import { User } from "../database/models/User";
import { generateToken } from "../utils/jwt";
import { AuthenticatedRequest } from "../middleware/auth";
import { memoryStore } from "../database/memory-store";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    // Ensure we only read the body once and it's properly parsed
    if (!req.body || typeof req.body !== "object") {
      console.error("Login handler: Invalid or missing request body");
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
      });
    }

    const { email, password, role } = req.body as LoginRequest;

    // Validate input
    if (!email || !password || !role) {
      const response: AuthResponse = {
        success: false,
        message: "Email, password, and role are required",
      };
      return res.status(400).json(response);
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      // Use MongoDB
      console.log("📦 Using MongoDB for login");

      // Find user by email and role
      const user = await User.findOne({
        email: email.toLowerCase(),
        role,
        isActive: true,
      });

      if (!user) {
        const response: AuthResponse = {
          success: false,
          message: "Invalid credentials or user not found",
        };
        return res.status(401).json(response);
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        const response: AuthResponse = {
          success: false,
          message: "Invalid credentials",
        };
        return res.status(401).json(response);
      }

      // Generate JWT token
      const token = generateToken(user);

      const response: AuthResponse = {
        success: true,
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };

      res.json(response);
    } else {
      // Use memory store fallback
      console.log("💾 Using memory store for login (MongoDB not connected)");

      // Find user by email and role
      const user = await memoryStore.findUserByEmail(email, role);

      if (!user) {
        const response: AuthResponse = {
          success: false,
          message: "Invalid credentials or user not found",
        };
        return res.status(401).json(response);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        const response: AuthResponse = {
          success: false,
          message: "Invalid credentials",
        };
        return res.status(401).json(response);
      }

      // Generate JWT token
      const mockUser = { _id: user._id, email: user.email, role: user.role };
      const token = generateToken(mockUser as any);

      const response: AuthResponse = {
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };

      res.json(response);
    }
  } catch (error) {
    console.error("Login error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Login failed",
    };
    res.status(500).json(response);
  }
};

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const userData = req.body as SignupRequest;

    // Validate required fields
    const { email, password, name, phone, role } = userData;
    if (!email || !password || !name || !phone || !role) {
      const response: AuthResponse = {
        success: false,
        message: "All basic fields are required",
      };
      return res.status(400).json(response);
    }

    // Validate role-specific fields
    if (
      role === "sponsor" &&
      (!userData.companyName || !userData.industry || !userData.address)
    ) {
      const response: AuthResponse = {
        success: false,
        message:
          "Company name, industry, and address are required for sponsors",
      };
      return res.status(400).json(response);
    }

    if (
      role === "organizer" &&
      (!userData.clubName || !userData.collegeName || !userData.description)
    ) {
      const response: AuthResponse = {
        success: false,
        message:
          "Club name, college name, and description are required for organizers",
      };
      return res.status(400).json(response);
    }

    if (role === "agent") {
      const response: AuthResponse = {
        success: false,
        message: "Agent accounts are created by invitation only",
      };
      return res.status(403).json(response);
    }

    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      // Use MongoDB
      console.log("📦 Using MongoDB for signup");

      // Check if user already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser) {
        const response: AuthResponse = {
          success: false,
          message: "User already exists with this email",
        };
        return res.status(409).json(response);
      }

      // Create new user
      const newUser = new User({
        email: email.toLowerCase(),
        password,
        name,
        phone,
        role,
        companyName: userData.companyName,
        industry: userData.industry,
        website: userData.website,
        address: userData.address,
        clubName: userData.clubName,
        collegeName: userData.collegeName,
        description: userData.description,
      });

      await newUser.save();

      // Generate JWT token
      const token = generateToken(newUser);

      const response: AuthResponse = {
        success: true,
        token,
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      };

      res.status(201).json(response);
    } else {
      // Use memory store fallback
      console.log("💾 Using memory store for signup (MongoDB not connected)");

      // Check if user already exists (active)
      const existingUser = await memoryStore.findUserByEmail(email);
      if (existingUser) {
        const response: AuthResponse = {
          success: false,
          message: "User already exists with this email",
        };
        return res.status(409).json(response);
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      if (role === "sponsor") {
        // Create sponsor application (pending approval)
        await memoryStore.createSponsorApplication({
          email: email.toLowerCase(),
          passwordHash: hashedPassword,
          name,
          phone,
          role: "sponsor",
          companyName: userData.companyName!,
          industry: userData.industry!,
          website: userData.website,
          address: userData.address!,
          gstNumber: userData.gstNumber || "",
        });

        return res.status(201).json({
          success: true,
          message:
            "Your application has been submitted. An admin will review and approve your profile shortly.",
        });
      }

      // Non-sponsor users are created immediately
      const newUser = await memoryStore.createUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone,
        role,
        isActive: true,
        companyName: userData.companyName,
        industry: userData.industry,
        website: userData.website,
        address: userData.address,
        clubName: userData.clubName,
        collegeName: userData.collegeName,
        description: userData.description,
      });

      const mockUser = {
        _id: newUser._id,
        email: newUser.email,
        role: newUser.role,
      };
      const token = generateToken(mockUser as any);

      const response: AuthResponse = {
        success: true,
        token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      };

      res.status(201).json(response);
    }
  } catch (error) {
    console.error("Signup error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Signup failed",
    };
    res.status(500).json(response);
  }
};

export const handleLogout: RequestHandler = async (req, res) => {
  try {
    // With JWT, logout is handled client-side by removing the token
    // In production, you might want to maintain a blacklist of revoked tokens

    const response: AuthResponse = {
      success: true,
      message: "Logged out successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Logout error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Logout failed",
    };
    res.status(500).json(response);
  }
};

export const handleGetProfile: RequestHandler = async (
  req: AuthenticatedRequest,
  res,
) => {
  try {
    if (!req.user) {
      const response: AuthResponse = {
        success: false,
        message: "Authentication required",
      };
      return res.status(401).json(response);
    }

    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      const response: AuthResponse = {
        success: false,
        message: "User not found",
      };
      return res.status(404).json(response);
    }

    const response: AuthResponse = {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Get profile error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Failed to get profile",
    };
    res.status(500).json(response);
  }
};

// Get user details by ID
export const handleGetUserById: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    const isMongoConnected = mongoose.connection.readyState === 1;

    if (isMongoConnected) {
      console.log("📦 Using MongoDB for getting user details");

      const user = await User.findById(userId).select("name email phone collegeName clubName companyName industry");
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: user,
      });
    } else {
      console.log("💾 Using memory store for getting user details");

      const user = await memoryStore.findUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: user,
      });
    }
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
};
