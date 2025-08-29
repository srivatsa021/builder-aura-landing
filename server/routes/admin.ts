import { RequestHandler } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { memoryStore } from "../database/memory-store";
import type { ActionResponse, SponsorApplicationsResponse } from "@shared/api";

// Middleware wrappers to enforce auth + role
export const adminAuth = [authenticateToken, requireRole(["agent"])];

export const listPendingSponsors: RequestHandler = async (_req, res) => {
  try {
    const applications = await memoryStore.listPendingSponsorApplications();
    const response: SponsorApplicationsResponse = {
      success: true,
      applications: applications.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        phone: a.phone,
        role: "sponsor",
        companyName: a.companyName,
        industry: a.industry,
        website: a.website,
        address: a.address,
        gstNumber: a.gstNumber,
        status: a.status,
        submittedAt: a.submittedAt.toISOString(),
      })),
    };
    res.json(response);
  } catch (error) {
    console.error("Failed to list pending sponsors:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

export const approveSponsor: RequestHandler = async (req, res) => {
  try {
    const { applicationId } = req.params as { applicationId: string };
    const user = await memoryStore.approveSponsorApplication(applicationId);
    if (!user) {
      const resp: ActionResponse = { success: false, message: "Application not found or already processed" };
      return res.status(404).json(resp);
    }
    const resp: ActionResponse = { success: true, message: "Sponsor approved and account activated" };
    res.json(resp);
  } catch (error) {
    console.error("Failed to approve sponsor:", error);
    res.status(500).json({ success: false, message: "Approval failed" });
  }
};

export const rejectSponsor: RequestHandler = async (req, res) => {
  try {
    const { applicationId } = req.params as { applicationId: string };
    const ok = await memoryStore.rejectSponsorApplication(applicationId);
    if (!ok) {
      const resp: ActionResponse = { success: false, message: "Application not found or already processed" };
      return res.status(404).json(resp);
    }
    const resp: ActionResponse = { success: true, message: "Sponsor application rejected" };
    res.json(resp);
  } catch (error) {
    console.error("Failed to reject sponsor:", error);
    res.status(500).json({ success: false, message: "Rejection failed" });
  }
};
