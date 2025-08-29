// In-memory storage for development when MongoDB is not available
interface User {
  _id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: "sponsor" | "organizer" | "agent";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

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

interface SponsorApplication {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: "sponsor";
  companyName: string;
  industry: string;
  website?: string;
  address: string;
  gstNumber: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: Date;
}

class MemoryStore {
  private users: Map<string, User> = new Map();
  private applications: Map<string, SponsorApplication> = new Map();
  private idCounter = 1;
  private appCounter = 1;

  generateId(): string {
    return `user_${this.idCounter++}`;
  }

  generateAppId(): string {
    return `app_${this.appCounter++}`;
  }

  async createUser(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">,
  ): Promise<User> {
    const user: User = {
      ...userData,
      _id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user._id, user);
    console.log(`💾 [MemoryStore] Created user: ${user.email}`);
    return user;
  }

  async findUserByEmail(email: string, role?: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (
        user.email.toLowerCase() === email.toLowerCase() &&
        (!role || user.role === role) &&
        user.isActive
      ) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  findAll() {
    return this.users.values();
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      usersByRole: {
        sponsor: Array.from(this.users.values()).filter(
          (u) => u.role === "sponsor",
        ).length,
        organizer: Array.from(this.users.values()).filter(
          (u) => u.role === "organizer",
        ).length,
        agent: Array.from(this.users.values()).filter((u) => u.role === "agent")
          .length,
      },
    };
  }

  // Sponsor application methods
  async createSponsorApplication(app: Omit<SponsorApplication, "id" | "status" | "submittedAt">): Promise<SponsorApplication> {
    const id = this.generateAppId();
    const application: SponsorApplication = {
      ...app,
      id,
      status: "pending",
      submittedAt: new Date(),
    };
    this.applications.set(id, application);
    console.log(`💾 [MemoryStore] Created sponsor application: ${app.email}`);
    return application;
  }

  async listPendingSponsorApplications(): Promise<SponsorApplication[]> {
    return Array.from(this.applications.values()).filter((a) => a.status === "pending");
  }

  async getSponsorApplicationById(id: string): Promise<SponsorApplication | null> {
    return this.applications.get(id) || null;
  }

  async approveSponsorApplication(id: string): Promise<User | null> {
    const app = this.applications.get(id);
    if (!app || app.status !== "pending") return null;
    app.status = "approved";

    const user = await this.createUser({
      email: app.email,
      password: app.passwordHash,
      name: app.name,
      phone: app.phone,
      role: "sponsor",
      isActive: true,
      companyName: app.companyName,
      industry: app.industry,
      website: app.website,
      address: app.address,
      gstNumber: app.gstNumber,
    });
    return user;
  }

  async rejectSponsorApplication(id: string): Promise<boolean> {
    const app = this.applications.get(id);
    if (!app || app.status !== "pending") return false;
    app.status = "rejected";
    return true;
  }
}

export const memoryStore = new MemoryStore();
