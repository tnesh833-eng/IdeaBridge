import type { IdeaFullDetail, PointTransactionItem, PublicUserProfile } from './db.ts';
import { isMongoConnected } from './mongo.ts';
import { IdeaModel } from './models/Idea.ts';
import { PointTransactionModel, type PointTransactionType } from './models/PointTransaction.ts';
import { UserModel } from './models/User.ts';

export async function syncUserToMongo(
  user: PublicUserProfile,
  options?: { authProvider?: 'email' | 'google' | 'seed' }
): Promise<void> {
  if (!isMongoConnected()) return;
  try {
    const updateDoc: Record<string, unknown> = {
      email: user.email.toLowerCase(),
      role: user.role,
      name: user.name,
      college: user.college,
      skills: user.skills,
      bio: user.bio,
      about: user.about,
      githubUrl: user.github_url,
      linkedinUrl: user.linkedin_url,
      pointsBalance: user.points_balance,
      ideasPosted: user.ideas_posted,
      projectsBuilt: user.projects_built,
    };
    if (options?.authProvider) {
      updateDoc.authProvider = options.authProvider;
    }

    await UserModel.findOneAndUpdate(
      { email: user.email.toLowerCase() },
      { $set: updateDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.warn('MongoDB user sync warning:', err instanceof Error ? err.message : String(err));
  }
}

export async function syncIdeaToMongo(
  idea: IdeaFullDetail,
  author: PublicUserProfile
): Promise<void> {
  if (!isMongoConnected()) return;
  try {
    await IdeaModel.create({
      authorId: idea.author_id,
      authorName: author.name,
      authorCollege: author.college,
      title: idea.title,
      summary: idea.summary,
      problem: idea.problem,
      purpose: idea.purpose,
      targetUsers: idea.target_users,
      domain: idea.domain,
      difficulty: idea.difficulty,
      techStack: idea.tech_stack,
    });
  } catch (err) {
    console.warn('MongoDB idea sync warning:', err instanceof Error ? err.message : String(err));
  }
}

export async function syncPointTransactionToMongo(
  tx: PointTransactionItem,
  userEmail: string,
  newPointsBalance: number
): Promise<void> {
  if (!isMongoConnected()) return;
  try {
    await PointTransactionModel.create({
      userId: tx.user_id,
      ideaId: tx.idea_id,
      type: tx.type as PointTransactionType,
      amount: tx.amount,
      description: tx.description,
    });
    await UserModel.findOneAndUpdate(
      { email: userEmail.toLowerCase() },
      { $set: { pointsBalance: newPointsBalance } }
    );
  } catch (err) {
    console.warn(
      'MongoDB point transaction sync warning:',
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function fetchMongoPointsLedger(
  userId: string
): Promise<PointTransactionItem[] | null> {
  if (!isMongoConnected()) return null;
  try {
    const docs = await PointTransactionModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    if (!docs || docs.length === 0) return null;

    return docs.map((doc) => ({
      id: String(doc._id),
      user_id: doc.userId,
      idea_id: doc.ideaId ?? null,
      type: doc.type,
      amount: doc.amount,
      description: doc.description,
      created_at:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}
