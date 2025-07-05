import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description: string;
  organizer: mongoose.Types.ObjectId;
  collegeName: string;
  clubName: string;
  eventDate: Date;
  expectedAttendees: number;
  sponsorshipAmount: number;
  category: string;
  venue: string;
  brochureUrl?: string;
  additionalDocuments?: string[];
  status: "draft" | "published" | "sponsored" | "completed" | "cancelled";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Sponsorship details
  interestedSponsors: mongoose.Types.ObjectId[];
  selectedSponsor?: mongoose.Types.ObjectId;
  dealAmount?: number;
  dealStatus?: "pending" | "negotiating" | "approved" | "completed";
  assignedAgent?: mongoose.Types.ObjectId;
}

const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    clubName: {
      type: String,
      required: true,
      trim: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    expectedAttendees: {
      type: Number,
      required: true,
      min: 1,
    },
    sponsorshipAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ["technical", "cultural", "sports", "academic", "social", "other"],
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    brochureUrl: {
      type: String,
      trim: true,
    },
    additionalDocuments: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "sponsored", "completed", "cancelled"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Sponsorship tracking
    interestedSponsors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    selectedSponsor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dealAmount: {
      type: Number,
      min: 0,
    },
    dealStatus: {
      type: String,
      enum: ["pending", "negotiating", "approved", "completed"],
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
EventSchema.index({ organizer: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ eventDate: 1 });
EventSchema.index({ selectedSponsor: 1 });
EventSchema.index({ assignedAgent: 1 });

export const Event = mongoose.model<IEvent>("Event", EventSchema);
