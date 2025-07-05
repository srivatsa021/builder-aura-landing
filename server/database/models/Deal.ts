import mongoose, { Schema, Document } from "mongoose";

export interface IDeal extends Document {
  event: mongoose.Types.ObjectId;
  sponsor: mongoose.Types.ObjectId;
  organizer: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;

  proposedAmount: number;
  finalAmount?: number;

  status:
    | "pending"
    | "negotiating"
    | "approved"
    | "signed"
    | "completed"
    | "cancelled";

  // Negotiation timeline
  negotiations: Array<{
    from: "sponsor" | "organizer" | "agent";
    message: string;
    amount?: number;
    timestamp: Date;
  }>;

  // Contract details
  contractTerms?: string;
  sponsorMouUrl?: string;
  organizerMouUrl?: string;
  finalMouUrl?: string;

  // Important dates
  proposalDate: Date;
  approvalDate?: Date;
  signingDate?: Date;
  completionDate?: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    sponsor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    proposedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    finalAmount: {
      type: Number,
      min: 0,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "negotiating",
        "approved",
        "signed",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },

    negotiations: [
      {
        from: {
          type: String,
          required: true,
          enum: ["sponsor", "organizer", "agent"],
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          min: 0,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    contractTerms: {
      type: String,
      trim: true,
    },
    sponsorMouUrl: {
      type: String,
      trim: true,
    },
    organizerMouUrl: {
      type: String,
      trim: true,
    },
    finalMouUrl: {
      type: String,
      trim: true,
    },

    proposalDate: {
      type: Date,
      default: Date.now,
    },
    approvalDate: {
      type: Date,
    },
    signingDate: {
      type: Date,
    },
    completionDate: {
      type: Date,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
DealSchema.index({ event: 1 });
DealSchema.index({ sponsor: 1 });
DealSchema.index({ organizer: 1 });
DealSchema.index({ agent: 1 });
DealSchema.index({ status: 1 });

export const Deal = mongoose.model<IDeal>("Deal", DealSchema);
