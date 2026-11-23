import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IRateLimitDocument extends Document {
  key: string;
  count: number;
  resetAt: Date;
}

const RateLimitSchema = new Schema<IRateLimitDocument>({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    required: true,
    default: 1,
  },
  resetAt: {
    type: Date,
    required: true,
    expires: 0, // MongoDB TTL index automatically purges expired windows
  },
});

export const RateLimitModel: Model<IRateLimitDocument> =
  mongoose.models.RateLimit || mongoose.model<IRateLimitDocument>('RateLimit', RateLimitSchema);
