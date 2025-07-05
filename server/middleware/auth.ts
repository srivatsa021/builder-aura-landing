import { Request, Response, NextFunction } from "express";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "../utils/jwt";
import { User } from "../database/models/User";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & { _id: string };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res
        .status(401)
        .json({ success: false, message: "Access token required" });
      return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
      return;
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      res
        .status(401)
        .json({ success: false, message: "User not found or inactive" });
      return;
    }

    req.user = { ...decoded, _id: decoded.userId };
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ success: false, message: "Authentication failed" });
  }
}

export function requireRole(roles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}
