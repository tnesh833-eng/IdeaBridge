import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IUserDocument extends Document {
  firebaseUid: string | null;
  email: string;
  passwordHash: string | null;
  authProvider: 'firebase' | 'email' | 'seed';
  role: 'student' | 'admin';
  name: string;
  college: string;
  skills: string[];
  bio: string;
  about: string;
  githubUrl: string;
  linkedinUrl: string;
  resumeStorageKey: string | null;
  resumeOriginalName: string | null;
  resumeSizeBytes: number | null;
  resumeUploadedAt: Date | null;
  pointsBalance: number;
  ideasPosted: number;
  projectsBuilt: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    firebaseUid: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
      maxlength: 128,
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 120,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['firebase', 'email', 'seed'],
      default: 'firebase',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    college: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    skills: {
      type: [String],
      default: [],
      validate: [(arr: string[]) => arr.length <= 15, 'Up to 15 skills allowed'],
    },
    bio: {
      type: String,
      default: '',
      maxlength: 300,
    },
    about: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    githubUrl: {
      type: String,
      default: '',
      maxlength: 300,
    },
    linkedinUrl: {
      type: String,
      default: '',
      maxlength: 300,
    },
    resumeStorageKey: { type: String, default: null },
    resumeOriginalName: { type: String, default: null },
    resumeSizeBytes: { type: Number, default: null },
    resumeUploadedAt: { type: Date, default: null },
    pointsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    ideasPosted: {
      type: Number,
      default: 0,
      min: 0,
    },
    projectsBuilt: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
