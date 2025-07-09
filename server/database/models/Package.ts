import mongoose, { Schema, Document } from "mongoose";

export interface IPackage extends Document {
  eventId: mongoose.Types.ObjectId;
  packageNumber: number;
  amount: number;
  deliverables: string;
  interestedSponsors: mongoose.Types.ObjectId[];
  selectedSponsor?: mongoose.Types.ObjectId;
  status: "available" | "selected" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    packageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    deliverables: {
      type: String,
      required: true,
      trim: true,
    },
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
    status: {
      type: String,
      required: true,
      enum: ["available", "selected", "completed"],
      default: "available",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better performance
PackageSchema.index({ eventId: 1 });
PackageSchema.index({ selectedSponsor: 1 });

// Prevent model recompilation during hot reload
export const Package = mongoose.models.Package || mongoose.model<IPackage>("Package", PackageSchema);
