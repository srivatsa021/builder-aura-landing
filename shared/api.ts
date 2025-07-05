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
