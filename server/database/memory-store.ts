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

  // Organizer fields
  clubName?: string;
  collegeName?: string;
  description?: string;
}

class MemoryStore {
  private users: Map<string, User> = new Map();
  private idCounter = 1;

  generateId(): string {
    return `user_${this.idCounter++}`;
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
}

export const memoryStore = new MemoryStore();
