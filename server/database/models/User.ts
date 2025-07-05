import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: "sponsor" | "organizer" | "agent";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Sponsor-specific fields
  companyName?: string;
  industry?: string;
  website?: string;
  address?: string;

  // Organizer-specific fields
  clubName?: string;
  collegeName?: string;
  description?: string;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["sponsor", "organizer", "agent"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Sponsor fields
    companyName: {
      type: String,
      required: function (this: IUser) {
        return this.role === "sponsor";
      },
      trim: true,
    },
    industry: {
      type: String,
      required: function (this: IUser) {
        return this.role === "sponsor";
      },
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: function (this: IUser) {
        return this.role === "sponsor";
      },
      trim: true,
    },

    // Organizer fields
    clubName: {
      type: String,
      required: function (this: IUser) {
        return this.role === "organizer";
      },
      trim: true,
    },
    collegeName: {
      type: String,
      required: function (this: IUser) {
        return this.role === "organizer";
      },
      trim: true,
    },
    description: {
      type: String,
      required: function (this: IUser) {
        return this.role === "organizer";
      },
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export const User = mongoose.model<IUser>("User", UserSchema);
