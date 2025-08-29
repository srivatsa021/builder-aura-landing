/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * User roles in the sponsorship platform
 */
export type UserRole = "sponsor" | "organizer" | "agent";

/**
 * User authentication interfaces
 */
export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  // Sponsor fields
  companyName?: string;
  industry?: string;
  website?: string;
  address?: string;
  gstNumber?: string;
  // Organizer fields
  clubName?: string;
  collegeName?: string;
  description?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  message?: string;
}

// Sponsor application types
export interface SponsorApplication {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "sponsor";
  companyName: string;
  industry: string;
  website?: string;
  address: string;
  gstNumber: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export interface SponsorApplicationsResponse {
  success: boolean;
  applications?: SponsorApplication[];
  message?: string;
}

export interface ActionResponse {
  success: boolean;
  message?: string;
}

/**
 * Event interfaces
 */
export interface CreateEventRequest {
  title: string;
  description: string;
  eventDate: string;
  expectedAttendees: number;
  sponsorshipAmount: number;
  category:
    | "technical"
    | "cultural"
    | "academic"
    | "sports"
    | "social"
    | "other";
  venue: string;
  status?: "draft" | "published";
}

export interface Event {
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
  status: "draft" | "published" | "sponsored" | "completed" | "cancelled";
  interestedSponsors: string[];
  brochureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventResponse {
  success: boolean;
  event?: Event;
  events?: Event[];
  message?: string;
}

export interface InterestResponse {
  success: boolean;
  message?: string;
}
