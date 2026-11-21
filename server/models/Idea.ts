import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IIdeaDocument extends Document {
  authorId: string;
  authorUid: string | null;
  authorName: string;
  authorCollege: string;
  title: string;
  summary: string;
  problem: string;
  purpose: string;
  targetUsers: string;
  domain: 'Environment' | 'Health' | 'Education' | 'FinTech' | 'Campus Tech' | 'Civic';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  createdAt: Date;
  updatedAt: Date;
}

const IdeaSchema = new Schema<IIdeaDocument>(
  {
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorUid: {
      type: String,
      default: null,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    authorCollege: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 120,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 15,
      maxlength: 240,
    },
    problem: {
      type: String,
      required: true,
      trim: true,
      minlength: 15,
      maxlength: 2000,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    targetUsers: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 500,
    },
    domain: {
      type: String,
      enum: ['Environment', 'Health', 'Education', 'FinTech', 'Campus Tech', 'Civic'],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      required: true,
    },
    techStack: {
      type: [String],
      default: [],
      validate: [(arr: string[]) => arr.length >= 1 && arr.length <= 10, '1 to 10 technologies required'],
    },
  },
  {
    timestamps: true,
  }
);

IdeaSchema.index({ title: 'text', summary: 'text' });

export const IdeaModel: Model<IIdeaDocument> =
  mongoose.models.Idea || mongoose.model<IIdeaDocument>('Idea', IdeaSchema);
