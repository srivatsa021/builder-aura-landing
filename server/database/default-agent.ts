import { memoryStore } from "./memory-store";

export async function createDefaultAgent() {
  try {
    // Check if agent already exists
    const existingAgent = await memoryStore.findUserByEmail("a@gmail.com");
    if (existingAgent) {
      console.log("💾 Default agent already exists");
      return;
    }

    // Create default agent
    await memoryStore.createUser({
      email: "a@gmail.com",
      password: "$2a$12$LQv3c1yqBwlVHpPjrPyeNu3RVqZLsLGYEf9SMHC8gVQ5aBz1eo1QG", // Hash of "a@12345"
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
