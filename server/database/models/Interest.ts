import mongoose, { Schema, Document } from "mongoose";

export interface IInterest extends Document {
  sponsorId: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  packageId?: mongoose.Types.ObjectId;
  type: "sponsor_to_organizer" | "organizer_to_sponsor" | "sponsor_to_package";
  status: "pending" | "mutual" | "declined";
  assignedAgent?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InterestSchema = new Schema<IInterest>(
  {
    sponsorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
    },
    type: {
      type: String,
      required: true,
      enum: [
        "sponsor_to_organizer",
        "organizer_to_sponsor",
        "sponsor_to_package",
      ],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "mutual", "declined"],
      default: "pending",
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
InterestSchema.index({ sponsorId: 1 });
InterestSchema.index({ organizerId: 1 });
InterestSchema.index({ status: 1 });
InterestSchema.index({ assignedAgent: 1 });

export const Interest = mongoose.model<IInterest>("Interest", InterestSchema);
