import 'dotenv/config';
import crypto from 'node:crypto';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_DIFFICULTIES,
  ALLOWED_DOMAINS,
  addVerifiedCollegeOrganizer,
  createCollegeReview,
  createIdea,
  createProject,
  createUser,
  deleteIdeaByOwner,
  deleteProjectByOwner,
  deleteUserResumeFile,
  getAppSetting,
  getCachedBridgeyAnswer,
  getCollegeOrganizerPasscodeHash,
  getCollegeProfileById,
  getDailyAiUsageCount,
  getIdeaByIdForViewer,
  getNearbyEventById,
  getNextBatchNumberForProblem,
  getSihProblemById,
  getUserApproxLocation,
  getUserByEmail,
  getUserProfileById,
  getUserResumeRecord,
  hasAnyAdminUser,
  hasCollegeOrganizer,
  hasValidStoredResume,
  isVerifiedCollegeOrganizer,
  listEventsForCollege,
  listFeedIdeas,
  listIdeasByAuthor,
  listIdeasForSihProblem,
  listNearbyEvents,
  listProjectsByBuilder,
  listPublishedProjects,
  listReviewsForCollege,
  listSavedSihIdeasForUser,
  listSihCategories,
  listSihProblems,
  recordAiUsage,
  roundApproxCoord,
  saveCachedBridgeyAnswer,
  saveGeneratedIdeasForProblem,
  saveSihIdeaForUser,
  saveUserApproxLocation,
  saveUserResumeFile,
  setAppSetting,
  setCollegeOrganizerPasscodeHash,
  setUserRole,
  unsaveSihIdeaForUser,
  updateCollegeOfficialDetails,
  updateUserProfile,
  upsertSihProblemsBatch,
  type IdeaDifficulty,
  type IdeaDomain,
} from './server/db.ts';
import {
  hashPassword,
  issueSessionToken,
  optionalAuth,
  requireAdmin,
  requireAuth,
  timingSafeStringMatch,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { askBridgeyAssistant } from './server/bridgeyAi.ts';
import { createRateLimiter } from './server/rateLimit.ts';
import { generateUniqueSihIdeas } from './server/sihAi.ts';
import { parseSihSpreadsheet } from './server/spreadsheet.ts';

const PORT = 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DAILY_AI_LIMIT = 3;

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Larger JSON caps only for spreadsheet & 5MB PDF base64 uploads; strict 64kb default everywhere else
app.use('/api/sih/import', express.json({ limit: '3mb' }));
app.use('/api/profile/resume', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '64kb' }));

// Security headers (preserve iframe embed compatibility; no X-Frame-Options)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=()');
  next();
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 120,
  message: 'Too many requests from this IP. Please pause a moment and try again.',
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many sign-in attempts. Please wait a few minutes before trying again.',
});

const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 25,
  message: 'Rate limit reached for submissions. Please wait a minute before posting again.',
});

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 12,
  message: 'AI generation rate limit reached. Please wait a minute and try again.',
});

const bridgeyUserLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Bridgey rate limit reached for your account. Please wait a few minutes before asking more questions.',
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.authUser?.id) {
      return `bridgey-user:${authReq.authUser.id}`;
    }
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      'unknown';
    return `bridgey-ip:${ip}`;
  },
});

app.use('/api', apiLimiter);

// Prevent duplicate concurrent AI calls when multiple visitors open the same uncached problem
const inFlightInitialGenerations = new Map<string, Promise<void>>();

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(email: string): boolean {
  return email.length >= 5 && email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseSkillsOrStack(raw: unknown, maxItems = 12): string[] {
  const list = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === 'string')
    : typeof raw === 'string'
      ? raw.split(',')
      : [];

  const deduped = new Set<string>();
  for (const entry of list) {
    const cleaned = entry.trim().slice(0, 40);
    if (cleaned.length > 0) {
      deduped.add(cleaned);
    }
    if (deduped.size >= maxItems) break;
  }
  return Array.from(deduped);
}

function normalizeBridgeyQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB exact cap

function sanitizeUrlInput(
  raw: unknown,
  options: { label: string; allowedHosts?: string[] }
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = cleanString(raw);
  if (!trimmed) {
    return { ok: true, value: '' };
  }
  if (trimmed.length > 300) {
    return { ok: false, error: `${options.label} must be 300 characters or less.` };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: `${options.label} must be a valid URL starting with https://` };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: `${options.label} must start with https:// or http://` };
  }
  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const host = parsed.hostname.toLowerCase();
    const matches = options.allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
    if (!matches) {
      return {
        ok: false,
        error: `${options.label} must point to ${options.allowedHosts[0]}.`,
      };
    }
  }
  return { ok: true, value: parsed.toString() };
}

function validatePdfUpload(
  rawFilename: unknown,
  rawBase64: unknown
): { ok: true; filename: string; buffer: Buffer } | { ok: false; error: string } {
  const baseName = path
    .basename(cleanString(rawFilename))
    .replace(/[\r\n\0"<>|:*?\\/]/g, '_')
    .slice(0, 100);

  if (!baseName || !baseName.toLowerCase().endsWith('.pdf')) {
    return { ok: false, error: 'Only PDF files (.pdf) are accepted for resumes.' };
  }

  if (typeof rawBase64 !== 'string' || rawBase64.trim().length === 0) {
    return { ok: false, error: 'Resume file content is missing.' };
  }

  const strippedBase64 = rawBase64.includes(',')
    ? rawBase64.slice(rawBase64.indexOf(',') + 1).trim()
    : rawBase64.trim();

  if (!/^[A-Za-z0-9+/=\s]+$/.test(strippedBase64)) {
    return { ok: false, error: 'Invalid uploaded file encoding.' };
  }

  const buffer = Buffer.from(strippedBase64, 'base64');
  if (buffer.length === 0) {
    return { ok: false, error: 'Uploaded PDF file is empty.' };
  }
  if (buffer.length > MAX_RESUME_BYTES) {
    return { ok: false, error: 'Resume PDF must be 5 MB or smaller.' };
  }

  // Server-side magic byte verification: true PDF starts with "%PDF-"
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return {
      ok: false,
      error: 'Invalid PDF file. Only genuine PDF documents up to 5 MB are allowed.',
    };
  }

  return { ok: true, filename: baseName, buffer };
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, stage: 1 });
});

app.get('/api/auth/providers', (_req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const googleEnabled = Boolean(supabaseUrl && supabaseAnonKey);

  res.json({
    emailEnabled: true,
    googleEnabled,
    supabaseUrl: googleEnabled ? supabaseUrl : null,
    supabaseAnonKey: googleEnabled ? supabaseAnonKey : null,
  });
});

app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
  const email = cleanString(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = cleanString(req.body?.name);
  const college = cleanString(req.body?.college);
  const skills = parseSkillsOrStack(req.body?.skills, 12);

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid student email address.' });
    return;
  }
  if (password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    return;
  }
  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
    return;
  }
  if (college.length < 2 || college.length > 120) {
    res.status(400).json({ error: 'College name must be between 2 and 120 characters.' });
    return;
  }

  const existing = getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
    return;
  }

  const passwordHash = hashPassword(password);
  const user = createUser({
    email,
    passwordHash,
    name,
    college,
    skills,
  });

  const token = issueSessionToken(user.id);
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
  const email = cleanString(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isValidEmail(email) || password.length === 0) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const userRow = getUserByEmail(email);
  if (!userRow || !userRow.password_hash || !verifyPassword(password, userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const user = getUserProfileById(userRow.id);
  if (!user) {
    res.status(500).json({ error: 'Unable to load account profile.' });
    return;
  }

  const token = issueSessionToken(user.id);
  res.json({ token, user });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.authUser });
});

app.patch('/api/profile', requireAuth, writeLimiter, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const name = cleanString(req.body?.name);
  const college = cleanString(req.body?.college);
  const skills = parseSkillsOrStack(req.body?.skills, 15);
  const bio = req.body?.bio !== undefined ? cleanString(req.body.bio).slice(0, 300) : undefined;
  const about =
    req.body?.about !== undefined ? cleanString(req.body.about).slice(0, 2000) : undefined;

  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    return;
  }
  if (college.length < 2 || college.length > 120) {
    res.status(400).json({ error: 'College must be between 2 and 120 characters.' });
    return;
  }

  let githubUrl: string | undefined;
  if (req.body?.github_url !== undefined) {
    const check = sanitizeUrlInput(req.body.github_url, {
      label: 'GitHub link',
      allowedHosts: ['github.com'],
    });
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
    githubUrl = check.value;
  }

  let linkedinUrl: string | undefined;
  if (req.body?.linkedin_url !== undefined) {
    const check = sanitizeUrlInput(req.body.linkedin_url, {
      label: 'LinkedIn link',
      allowedHosts: ['linkedin.com'],
    });
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }
    linkedinUrl = check.value;
  }

  const updated = updateUserProfile(user.id, {
    name,
    college,
    skills,
    bio,
    about,
    github_url: githubUrl,
    linkedin_url: linkedinUrl,
  });
  if (!updated) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }

  res.json({ user: updated });
});

// --- Private PDF Resume Upload / Replace / Download / Delete ---

app.post(
  '/api/profile/resume',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const check = validatePdfUpload(req.body?.filename, req.body?.contentBase64);
    if (!check.ok) {
      res.status(400).json({ error: check.error });
      return;
    }

    try {
      const updated = saveUserResumeFile({
        userId: req.authUser!.id,
        originalName: check.filename,
        buffer: check.buffer,
      });
      if (!updated) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }
      res.status(201).json({ user: updated });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to save resume in private storage.',
      });
    }
  }
);

app.get('/api/profile/resume', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const record = getUserResumeRecord(req.authUser!.id);
  if (!record) {
    res.status(404).json({ error: 'No resume uploaded yet.' });
    return;
  }

  const safeDownloadName = record.originalName.replace(/["\r\n]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeDownloadName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(record.filePath);
});

app.delete(
  '/api/profile/resume',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const updated = deleteUserResumeFile(req.authUser!.id);
    if (!updated) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    res.json({ user: updated });
  }
);

// Admin status & first-run claim/passcode verification
app.get('/api/admin/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const envPasscode = (process.env.ADMIN_PASSCODE ?? '').trim();
  const claimedHash = getAppSetting('claimed_admin_passcode_hash');
  res.json({
    isAdmin: req.authUser?.role === 'admin',
    envPasscodeConfigured: envPasscode.length > 0,
    adminClaimed: Boolean(claimedHash) || hasAnyAdminUser(),
  });
});

app.post('/api/admin/claim', requireAuth, authLimiter, (req: AuthenticatedRequest, res: Response) => {
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
  if (passcode.length < 8 || passcode.length > 128) {
    res.status(400).json({ error: 'Admin passcode must be between 8 and 128 characters.' });
    return;
  }

  const envPasscode = (process.env.ADMIN_PASSCODE ?? '').trim();
  if (envPasscode.length > 0) {
    if (!timingSafeStringMatch(passcode, envPasscode)) {
      res.status(403).json({ error: 'Invalid admin passcode.' });
      return;
    }
    const updated = setUserRole(req.authUser!.id, 'admin');
    res.json({ user: updated });
    return;
  }

  const existingHash = getAppSetting('claimed_admin_passcode_hash');
  if (existingHash) {
    if (!verifyPassword(passcode, existingHash)) {
      res.status(403).json({ error: 'Invalid admin passcode.' });
      return;
    }
    const updated = setUserRole(req.authUser!.id, 'admin');
    res.json({ user: updated });
    return;
  }

  if (hasAnyAdminUser()) {
    res.status(403).json({ error: 'An admin account has already been configured.' });
    return;
  }

  setAppSetting('claimed_admin_passcode_hash', hashPassword(passcode));
  const updated = setUserRole(req.authUser!.id, 'admin');
  res.json({ user: updated });
});

// --- Marketplace Ideas ---

app.get('/api/ideas', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  const domainParam = typeof req.query.domain === 'string' ? req.query.domain : 'All';
  const domain =
    domainParam === 'All' || (ALLOWED_DOMAINS as readonly string[]).includes(domainParam)
      ? domainParam
      : 'All';

  const ideas = listFeedIdeas({
    viewerId: req.authUser?.id ?? null,
    query,
    domain,
  });

  res.json({ ideas });
});

app.get('/api/ideas/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const ideaId = cleanString(req.params.id);
  if (!ideaId) {
    res.status(400).json({ error: 'Invalid idea ID.' });
    return;
  }

  const idea = getIdeaByIdForViewer(ideaId, req.authUser?.id ?? null);
  if (!idea) {
    res.status(404).json({ error: 'Idea not found.' });
    return;
  }

  res.json({ idea });
});

app.get('/api/my/ideas', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const ideas = listIdeasByAuthor(req.authUser!.id);
  res.json({ ideas });
});

app.post('/api/ideas', requireAuth, writeLimiter, (req: AuthenticatedRequest, res: Response) => {
  const title = cleanString(req.body?.title);
  const summary = cleanString(req.body?.summary);
  const problem = cleanString(req.body?.problem);
  const purpose = cleanString(req.body?.purpose);
  const targetUsers = cleanString(req.body?.target_users);
  const domain = cleanString(req.body?.domain) as IdeaDomain;
  const difficulty = cleanString(req.body?.difficulty) as IdeaDifficulty;
  const techStack = parseSkillsOrStack(req.body?.tech_stack, 10);

  if (title.length < 4 || title.length > 120) {
    res.status(400).json({ error: 'Title must be between 4 and 120 characters.' });
    return;
  }
  if (summary.length < 15 || summary.length > 240) {
    res.status(400).json({ error: 'Short summary must be between 15 and 240 characters.' });
    return;
  }
  if (problem.length < 15 || problem.length > 2000) {
    res.status(400).json({ error: 'Problem description must be between 15 and 2000 characters.' });
    return;
  }
  if (purpose.length < 10 || purpose.length > 2000) {
    res.status(400).json({ error: 'Purpose must be between 10 and 2000 characters.' });
    return;
  }
  if (targetUsers.length < 3 || targetUsers.length > 500) {
    res.status(400).json({ error: 'Target users must be between 3 and 500 characters.' });
    return;
  }
  if (!(ALLOWED_DOMAINS as readonly string[]).includes(domain)) {
    res.status(400).json({ error: 'Please select a valid project domain.' });
    return;
  }
  if (!(ALLOWED_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    res.status(400).json({ error: 'Please select a valid difficulty level.' });
    return;
  }
  if (techStack.length === 0) {
    res.status(400).json({ error: 'Please add at least one suggested technology.' });
    return;
  }

  const created = createIdea({
    authorId: req.authUser!.id,
    title,
    summary,
    problem,
    purpose,
    targetUsers,
    domain,
    difficulty,
    techStack,
  });

  const updatedProfile = getUserProfileById(req.authUser!.id);
  res.status(201).json({ idea: created, user: updatedProfile });
});

app.delete('/api/ideas/:id', requireAuth, writeLimiter, (req: AuthenticatedRequest, res: Response) => {
  const ideaId = cleanString(req.params.id);
  if (!ideaId) {
    res.status(400).json({ error: 'Invalid idea ID.' });
    return;
  }

  const deleted = deleteIdeaByOwner(ideaId, req.authUser!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Idea not found or you do not have permission to delete it.' });
    return;
  }

  const updatedProfile = getUserProfileById(req.authUser!.id);
  res.json({ ok: true, user: updatedProfile });
});

// --- Student Projects (Published only when resume is uploaded) ---

app.get('/api/projects', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
  const domainParam = typeof req.query.domain === 'string' ? req.query.domain : 'All';
  const domain =
    domainParam === 'All' || (ALLOWED_DOMAINS as readonly string[]).includes(domainParam)
      ? domainParam
      : 'All';

  const projects = listPublishedProjects({
    viewerId: req.authUser?.id ?? null,
    query,
    domain,
  });

  res.json({ projects });
});

app.get('/api/my/projects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const projects = listProjectsByBuilder(req.authUser!.id);
  res.json({ projects });
});

app.post('/api/projects', requireAuth, writeLimiter, (req: AuthenticatedRequest, res: Response) => {
  if (!hasValidStoredResume(req.authUser!.id)) {
    res.status(403).json({
      error: 'Upload a PDF resume (max 5 MB) before publishing a project.',
      code: 'RESUME_REQUIRED',
    });
    return;
  }

  const title = cleanString(req.body?.title);
  const description = cleanString(req.body?.description);
  const domain = cleanString(req.body?.domain) as IdeaDomain;
  const difficulty = cleanString(req.body?.difficulty) as IdeaDifficulty;
  const techStack = parseSkillsOrStack(req.body?.tech_stack, 10);
  const ideaId = cleanString(req.body?.idea_id) || null;

  if (title.length < 4 || title.length > 120) {
    res.status(400).json({ error: 'Project title must be between 4 and 120 characters.' });
    return;
  }
  if (description.length < 20 || description.length > 2000) {
    res.status(400).json({ error: 'Project description must be between 20 and 2000 characters.' });
    return;
  }
  if (!(ALLOWED_DOMAINS as readonly string[]).includes(domain)) {
    res.status(400).json({ error: 'Please select a valid project domain.' });
    return;
  }
  if (!(ALLOWED_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    res.status(400).json({ error: 'Please select a valid difficulty level.' });
    return;
  }
  if (techStack.length === 0) {
    res.status(400).json({ error: 'Please add at least one technology used.' });
    return;
  }

  const githubCheck = sanitizeUrlInput(req.body?.github_url, {
    label: 'GitHub repository URL',
    allowedHosts: ['github.com'],
  });
  if (!githubCheck.ok || !githubCheck.value) {
    res.status(400).json({
      error: !githubCheck.ok ? githubCheck.error : 'A valid GitHub repository URL is required.',
    });
    return;
  }

  const demoCheck = sanitizeUrlInput(req.body?.demo_url, { label: 'Live demo URL' });
  if (!demoCheck.ok) {
    res.status(400).json({ error: demoCheck.error });
    return;
  }

  if (ideaId && !getIdeaByIdForViewer(ideaId, req.authUser!.id)) {
    res.status(400).json({ error: 'Referenced idea was not found.' });
    return;
  }

  try {
    const project = createProject({
      builderId: req.authUser!.id,
      ideaId,
      title,
      description,
      domain,
      difficulty,
      techStack,
      githubUrl: githubCheck.value,
      demoUrl: demoCheck.value,
    });

    const updatedProfile = getUserProfileById(req.authUser!.id);
    res.status(201).json({ project, user: updatedProfile });
  } catch (err) {
    if (err instanceof Error && err.message === 'RESUME_REQUIRED') {
      res.status(403).json({
        error: 'Upload a PDF resume (max 5 MB) before publishing a project.',
        code: 'RESUME_REQUIRED',
      });
      return;
    }
    res.status(500).json({ error: 'Unable to publish project.' });
  }
});

app.delete(
  '/api/projects/:id',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const projectId = cleanString(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: 'Invalid project ID.' });
      return;
    }

    const deleted = deleteProjectByOwner(projectId, req.authUser!.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found or you do not have permission to delete it.' });
      return;
    }

    const updatedProfile = getUserProfileById(req.authUser!.id);
    res.json({ ok: true, user: updatedProfile });
  }
);

// --- SIH Problem Statements & Cached Unique Ideas ---

app.get('/api/sih/problems', (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '';
  const category = typeof req.query.category === 'string' ? req.query.category.slice(0, 80) : 'All';

  const problems = listSihProblems({ query, category });
  const categories = listSihCategories();
  res.json({ problems, categories });
});

app.post(
  '/api/sih/import',
  requireAuth,
  requireAdmin,
  writeLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const filename = cleanString(req.body?.filename);
    const contentBase64 = typeof req.body?.contentBase64 === 'string' ? req.body.contentBase64 : '';

    if (!filename || !contentBase64) {
      res.status(400).json({ error: 'Spreadsheet filename and file contents are required.' });
      return;
    }

    const buffer = Buffer.from(contentBase64, 'base64');
    if (buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
      res.status(400).json({ error: 'Spreadsheet file must be non-empty and under 2 MB.' });
      return;
    }

    try {
      const { rows, skipped } = await parseSihSpreadsheet(filename, buffer);
      const { inserted, updated } = upsertSihProblemsBatch(rows);
      res.json({
        inserted,
        updated,
        skipped,
        totalProcessed: inserted + updated,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to parse uploaded spreadsheet.',
      });
    }
  }
);

app.get('/api/sih/problems/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const id = cleanString(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid SIH problem ID.' });
    return;
  }

  const problem = getSihProblemById(id);
  if (!problem) {
    res.status(404).json({ error: 'SIH problem statement not found.' });
    return;
  }

  const viewerId = req.authUser?.id ?? null;
  let aiError: string | null = null;

  if (!problem.ideas_initialized) {
    let pending = inFlightInitialGenerations.get(problem.id);
    if (!pending) {
      pending = (async () => {
        const freshProblem = getSihProblemById(problem.id);
        if (!freshProblem || freshProblem.ideas_initialized) return;

        const generated = await generateUniqueSihIdeas({
          problemId: freshProblem.problem_id,
          title: freshProblem.title,
          organization: freshProblem.organization,
          category: freshProblem.category,
          description: freshProblem.description,
        });

        saveGeneratedIdeasForProblem({
          problemDbId: freshProblem.id,
          ideas: generated,
          batchNumber: 1,
          createdBy: null,
          markInitialized: true,
        });
      })();
      inFlightInitialGenerations.set(problem.id, pending);
    }

    try {
      await pending;
    } catch (err) {
      aiError = err instanceof Error ? err.message : 'Unable to generate Unique Ideas right now.';
    } finally {
      inFlightInitialGenerations.delete(problem.id);
    }
  }

  const ideas = listIdeasForSihProblem(problem.id, viewerId);
  const usedToday = viewerId ? getDailyAiUsageCount(viewerId, getTodayUtcDate()) : 0;
  const remainingToday = Math.max(0, DAILY_AI_LIMIT - usedToday);

  res.json({
    problem: getSihProblemById(problem.id) ?? problem,
    ideas,
    aiError,
    dailyLimit: DAILY_AI_LIMIT,
    remainingToday,
  });
});

app.post(
  '/api/sih/problems/:id/more-ideas',
  requireAuth,
  aiLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = cleanString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid SIH problem ID.' });
      return;
    }

    const problem = getSihProblemById(id);
    if (!problem) {
      res.status(404).json({ error: 'SIH problem statement not found.' });
      return;
    }

    const userId = req.authUser!.id;
    const today = getTodayUtcDate();
    const usedToday = getDailyAiUsageCount(userId, today);
    if (usedToday >= DAILY_AI_LIMIT) {
      res.status(429).json({
        error: `Daily limit reached: you can generate more ideas up to ${DAILY_AI_LIMIT} times per day.`,
        remainingToday: 0,
      });
      return;
    }

    const existingIdeas = listIdeasForSihProblem(problem.id, userId);
    const existingTitles = existingIdeas.map((item) => item.title);

    try {
      const generated = await generateUniqueSihIdeas({
        problemId: problem.problem_id,
        title: problem.title,
        organization: problem.organization,
        category: problem.category,
        description: problem.description,
        existingTitles,
      });

      const nextBatch = getNextBatchNumberForProblem(problem.id);
      saveGeneratedIdeasForProblem({
        problemDbId: problem.id,
        ideas: generated,
        batchNumber: nextBatch,
        createdBy: userId,
        markInitialized: true,
      });
      recordAiUsage(userId, problem.id, today);

      const updatedIdeas = listIdeasForSihProblem(problem.id, userId);
      const remainingToday = Math.max(0, DAILY_AI_LIMIT - (usedToday + 1));

      res.json({
        ideas: updatedIdeas,
        remainingToday,
        dailyLimit: DAILY_AI_LIMIT,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to generate more ideas right now.',
      });
    }
  }
);

app.post(
  '/api/sih/ideas/:ideaId/save',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const ideaId = cleanString(req.params.ideaId);
    if (!ideaId) {
      res.status(400).json({ error: 'Invalid idea ID.' });
      return;
    }
    const ok = saveSihIdeaForUser(req.authUser!.id, ideaId);
    if (!ok) {
      res.status(404).json({ error: 'SIH idea not found.' });
      return;
    }
    res.json({ saved: true });
  }
);

app.delete(
  '/api/sih/ideas/:ideaId/save',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const ideaId = cleanString(req.params.ideaId);
    if (!ideaId) {
      res.status(400).json({ error: 'Invalid idea ID.' });
      return;
    }
    unsaveSihIdeaForUser(req.authUser!.id, ideaId);
    res.json({ saved: false });
  }
);

app.get('/api/my/saved-sih-ideas', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const savedIdeas = listSavedSihIdeasForUser(req.authUser!.id);
  res.json({ savedIdeas });
});

// --- Nearby Events, Approximate User Location, College Profiles & Bridgey AI ---

app.get('/api/location/approximate', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.authUser) {
    res.json({ location: null });
    return;
  }
  const location = getUserApproxLocation(req.authUser.id);
  res.json({ location });
});

app.post(
  '/api/location/approximate',
  optionalAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const rawLat = Number(req.body?.lat);
    const rawLng = Number(req.body?.lng);
    const cityLabel = cleanString(req.body?.city_label).slice(0, 80);

    if (
      !Number.isFinite(rawLat) ||
      !Number.isFinite(rawLng) ||
      rawLat < -90 ||
      rawLat > 90 ||
      rawLng < -180 ||
      rawLng > 180
    ) {
      res.status(400).json({ error: 'Valid approximate latitude and longitude are required.' });
      return;
    }

    // Store ONLY approximate location rounded to ~1.1km grid
    const approxLat = roundApproxCoord(rawLat);
    const approxLng = roundApproxCoord(rawLng);

    if (req.authUser) {
      const saved = saveUserApproxLocation(req.authUser.id, approxLat, approxLng, cityLabel);
      res.json({ location: saved });
      return;
    }

    res.json({
      location: {
        approx_lat: approxLat,
        approx_lng: approxLng,
        city_label: cityLabel,
        updated_at: new Date().toISOString(),
      },
    });
  }
);

app.get('/api/events', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 120) : '';
  const eventType =
    typeof req.query.eventType === 'string' ? req.query.eventType.slice(0, 40) : 'All';
  const city = typeof req.query.city === 'string' ? req.query.city.slice(0, 60) : 'All';

  const rawLat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const rawLng = req.query.lng !== undefined ? Number(req.query.lng) : null;

  let approxLat =
    rawLat !== null && Number.isFinite(rawLat) ? roundApproxCoord(rawLat) : null;
  let approxLng =
    rawLng !== null && Number.isFinite(rawLng) ? roundApproxCoord(rawLng) : null;

  if (approxLat === null && req.authUser) {
    const savedLoc = getUserApproxLocation(req.authUser.id);
    if (savedLoc) {
      approxLat = savedLoc.approx_lat;
      approxLng = savedLoc.approx_lng;
    }
  }

  const events = listNearbyEvents({
    query,
    eventType,
    city,
    approxLat,
    approxLng,
  });

  res.json({ events });
});

app.get('/api/events/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const id = cleanString(req.params.id);
  const event = id ? getNearbyEventById(id) : null;
  if (!event) {
    res.status(404).json({ error: 'Event not found.' });
    return;
  }

  const college = getCollegeProfileById(event.college_id, req.authUser?.id ?? null);
  res.json({
    event,
    college,
  });
});

app.get('/api/colleges/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const id = cleanString(req.params.id);
  const viewerId = req.authUser?.id ?? null;
  const college = id ? getCollegeProfileById(id, viewerId) : null;

  if (!college) {
    res.status(404).json({ error: 'College profile not found.' });
    return;
  }

  const events = listEventsForCollege(college.id);
  const reviews = listReviewsForCollege(college.id);

  res.json({
    college,
    events,
    reviews,
    organizerStatus: {
      hasOrganizer: hasCollegeOrganizer(college.id),
      isVerified: college.is_verified_organizer,
    },
  });
});

app.post(
  '/api/colleges/:id/verify-organizer',
  requireAuth,
  authLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const collegeId = cleanString(req.params.id);
    const college = collegeId ? getCollegeProfileById(collegeId, req.authUser!.id) : null;
    if (!college) {
      res.status(404).json({ error: 'College profile not found.' });
      return;
    }

    if (college.is_verified_organizer) {
      res.json({ college });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({ error: 'Organizer passcode must be at least 6 characters.' });
      return;
    }

    const existingHash = getCollegeOrganizerPasscodeHash(college.id);
    if (existingHash) {
      if (!verifyPassword(passcode, existingHash)) {
        res.status(403).json({ error: 'Invalid organizer verification code for this college.' });
        return;
      }
      addVerifiedCollegeOrganizer(college.id, req.authUser!.id);
    } else {
      setCollegeOrganizerPasscodeHash(college.id, hashPassword(passcode));
      addVerifiedCollegeOrganizer(college.id, req.authUser!.id);
    }

    const updated = getCollegeProfileById(college.id, req.authUser!.id);
    res.json({ college: updated });
  }
);

app.patch(
  '/api/colleges/:id',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const collegeId = cleanString(req.params.id);
    const userId = req.authUser!.id;

    if (!collegeId || !getCollegeProfileById(collegeId, userId)) {
      res.status(404).json({ error: 'College profile not found.' });
      return;
    }

    if (!isVerifiedCollegeOrganizer(collegeId, userId)) {
      res.status(403).json({
        error: 'Only verified college organizers can edit official college details.',
      });
      return;
    }

    const name = cleanString(req.body?.name);
    const address = cleanString(req.body?.address);
    const specialties = parseSkillsOrStack(req.body?.specialties, 10);
    const tipsCanteen = cleanString(req.body?.tips_canteen).slice(0, 800);
    const tipsRestrooms = cleanString(req.body?.tips_restrooms).slice(0, 800);
    const tipsTransport = cleanString(req.body?.tips_transport).slice(0, 800);
    const tipsWifiCharging = cleanString(req.body?.tips_wifi_charging).slice(0, 800);
    const tipsWhatToCarry = cleanString(req.body?.tips_what_to_carry).slice(0, 800);

    if (name.length < 3 || name.length > 140) {
      res.status(400).json({ error: 'College name must be between 3 and 140 characters.' });
      return;
    }
    if (address.length < 5 || address.length > 260) {
      res.status(400).json({ error: 'Address must be between 5 and 260 characters.' });
      return;
    }

    const updated = updateCollegeOfficialDetails(collegeId, {
      name,
      address,
      specialties,
      tips_canteen: tipsCanteen,
      tips_restrooms: tipsRestrooms,
      tips_transport: tipsTransport,
      tips_wifi_charging: tipsWifiCharging,
      tips_what_to_carry: tipsWhatToCarry,
    });

    res.json({
      college: getCollegeProfileById(collegeId, userId) ?? updated,
    });
  }
);

app.post(
  '/api/colleges/:id/reviews',
  requireAuth,
  writeLimiter,
  (req: AuthenticatedRequest, res: Response) => {
    const collegeId = cleanString(req.params.id);
    const userId = req.authUser!.id;
    const college = collegeId ? getCollegeProfileById(collegeId, userId) : null;
    if (!college) {
      res.status(404).json({ error: 'College profile not found.' });
      return;
    }

    const rating = Number(req.body?.rating);
    const reviewText = cleanString(req.body?.review_text);
    const eventIdRaw = cleanString(req.body?.event_id);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Please select a star rating between 1 and 5.' });
      return;
    }
    if (reviewText.length < 10 || reviewText.length > 1000) {
      res.status(400).json({ error: 'Review text must be between 10 and 1000 characters.' });
      return;
    }

    let verifiedEventId: string | null = null;
    if (eventIdRaw) {
      const ev = getNearbyEventById(eventIdRaw);
      if (!ev || ev.college_id !== college.id) {
        res.status(400).json({ error: 'Selected event does not belong to this college.' });
        return;
      }
      verifiedEventId = ev.id;
    }

    const review = createCollegeReview({
      collegeId: college.id,
      eventId: verifiedEventId,
      authorId: userId,
      rating,
      reviewText,
      canteenTip: cleanString(req.body?.canteen_tip).slice(0, 300),
      restroomTip: cleanString(req.body?.restroom_tip).slice(0, 300),
      transportTip: cleanString(req.body?.transport_tip).slice(0, 300),
      wifiTip: cleanString(req.body?.wifi_tip).slice(0, 300),
      carryTip: cleanString(req.body?.carry_tip).slice(0, 300),
    });

    const updatedCollege = getCollegeProfileById(college.id, userId);
    res.status(201).json({ review, college: updatedCollege });
  }
);

app.get('/api/bridgey/checklist', (req: Request, res: Response) => {
  const collegeId = typeof req.query.collegeId === 'string' ? req.query.collegeId.trim() : '';
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId.trim() : '';

  const college = collegeId ? getCollegeProfileById(collegeId, null) : null;
  if (!college) {
    res.status(404).json({ error: 'College not found.' });
    return;
  }

  const event = eventId ? getNearbyEventById(eventId) : null;
  const items: string[] = [];

  if (event?.what_to_bring) {
    items.push(`Pack for ${event.title}: ${event.what_to_bring}`);
  } else if (college.tips_what_to_carry) {
    items.push(`What to carry: ${college.tips_what_to_carry}`);
  }
  if (college.tips_transport) {
    items.push(`Getting there: ${college.tips_transport}`);
  }
  if (college.tips_wifi_charging) {
    items.push(`Power & Wi-Fi: ${college.tips_wifi_charging}`);
  }
  if (college.tips_canteen) {
    items.push(`Food nearby: ${college.tips_canteen}`);
  }

  res.json({ checklist: items.slice(0, 4) });
});

app.post(
  '/api/bridgey/ask',
  optionalAuth,
  bridgeyUserLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    const collegeId = cleanString(req.body?.collegeId);
    const eventId = cleanString(req.body?.eventId) || null;
    const question = cleanString(req.body?.question);

    if (!collegeId) {
      res.status(400).json({ error: 'College ID is required.' });
      return;
    }
    if (question.length < 2 || question.length > 400) {
      res.status(400).json({ error: 'Please ask a question between 2 and 400 characters.' });
      return;
    }

    const college = getCollegeProfileById(collegeId, null);
    if (!college) {
      res.status(404).json({ error: 'College profile not found.' });
      return;
    }

    const event = eventId ? getNearbyEventById(eventId) : null;
    if (eventId && (!event || event.college_id !== college.id)) {
      res.status(400).json({ error: 'Event does not match the selected college.' });
      return;
    }

    const normQ = normalizeBridgeyQuestion(question);
    const qHash = crypto.createHash('sha256').update(normQ).digest('hex').slice(0, 16);
    const cacheKey = `${college.id}:${event ? event.id : 'college'}:${qHash}`;

    const cached = getCachedBridgeyAnswer(cacheKey);
    if (cached) {
      res.json({
        answer: cached.answer,
        checklist: cached.checklist,
        cached: true,
      });
      return;
    }

    const reviews = listReviewsForCollege(college.id);

    try {
      const result = await askBridgeyAssistant({
        question,
        context: {
          college: {
            name: college.name,
            city: college.city,
            address: college.address,
            specialties: college.specialties,
            tips_canteen: college.tips_canteen,
            tips_restrooms: college.tips_restrooms,
            tips_transport: college.tips_transport,
            tips_wifi_charging: college.tips_wifi_charging,
            tips_what_to_carry: college.tips_what_to_carry,
          },
          event: event
            ? {
                title: event.title,
                event_type: event.event_type,
                event_date: event.event_date,
                venue_hall: event.venue_hall,
                team_size: event.team_size,
                what_to_bring: event.what_to_bring,
              }
            : null,
          reviews,
        },
      });

      saveCachedBridgeyAnswer({
        cacheKey,
        collegeId: college.id,
        eventId: event ? event.id : null,
        questionNorm: normQ,
        answer: result.answer,
        checklist: result.checklist,
      });

      res.json({
        answer: result.answer,
        checklist: result.checklist,
        cached: false,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Bridgey is unavailable right now.',
      });
    }
  }
);

async function startServer(): Promise<void> {
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IdeaBridge server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start IdeaBridge server:', err);
  process.exit(1);
});
