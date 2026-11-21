import mongoose, { Schema, type Document, type Model } from 'mongoose';

export type PointTransactionType = 'earn_post' | 'earn_unlock' | 'portfolio_bonus' | 'bonus';

export interface IPointTransactionDocument extends Document {
  userId: string;
  userUid: string | null;
  ideaId: string | null;
  type: PointTransactionType;
  amount: number;
  description: string;
  createdAt: Date;
}

const PointTransactionSchema = new Schema<IPointTransactionDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userUid: {
      type: String,
      default: null,
      index: true,
    },
    ideaId: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      enum: ['earn_post', 'earn_unlock', 'portfolio_bonus', 'bonus'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 1000,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const PointTransactionModel: Model<IPointTransactionDocument> =
  mongoose.models.PointTransaction ||
  mongoose.model<IPointTransactionDocument>('PointTransaction', PointTransactionSchema);
