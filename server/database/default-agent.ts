import { memoryStore } from "./memory-store";
import bcrypt from "bcryptjs";

export async function createDefaultAgent() {
  try {
    // Check if agent already exists
    const existingAgent = await memoryStore.findUserByEmail("a@gmail.com");
    if (existingAgent) {
      console.log("💾 Default agent already exists");
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("a@12345", salt);

    // Create default agent
    await memoryStore.createUser({
      email: "a@gmail.com",
      password: hashedPassword,
      name: "Platform Agent",
      phone: "9999999999",
      role: "agent",
      isActive: true,
    });

    console.log("💾 Default agent created: a@gmail.com / a@12345");
  } catch (error) {
    console.error("Failed to create default agent:", error);
  }
}
