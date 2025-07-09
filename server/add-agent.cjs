const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  role: { type: String, required: true, enum: ["sponsor", "organizer", "agent"] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sponsorhub";

async function addAgent() {
  await mongoose.connect(MONGODB_URI);

  const email = "a@gmail.com";
  const password = "a@12345";
  const name = "Platform Agent";
  const phone = "9999999999";
  const role = "agent";

  // Check if agent already exists
  const existing = await User.findOne({ email, role });
  if (existing) {
    console.log("Agent already exists in MongoDB.");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const agent = new User({
    email,
    password: hashedPassword,
    name,
    phone,
    role,
    isActive: true,
  });

  await agent.save();
  console.log("Agent user created in MongoDB:", { email, password });
  process.exit(0);
}

addAgent().catch((err) => {
  console.error("Error adding agent:", err);
  process.exit(1);
}); 