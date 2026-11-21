import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const ALLOWED_DOMAINS = [
  'Environment',
  'Health',
  'Education',
  'FinTech',
  'Campus Tech',
  'Civic',
] as const;

export const ALLOWED_DIFFICULTIES = [
  'Beginner',
  'Intermediate',
  'Advanced',
] as const;

export type IdeaDomain = (typeof ALLOWED_DOMAINS)[number];
export type IdeaDifficulty = (typeof ALLOWED_DIFFICULTIES)[number];
export type UserRole = 'student' | 'admin';

export interface DbUserRow {
  id: string;
  email: string;
  password_hash: string | null;
  auth_provider: string;
  role: UserRole;
  name: string;
  college: string;
  skills: string;
  bio: string;
  about: string;
  github_url: string;
  linkedin_url: string;
  resume_storage_key: string | null;
  resume_original_name: string | null;
  resume_size_bytes: number | null;
  resume_uploaded_at: string | null;
  points_balance: number;
  created_at: string;
}

export interface PublicUserProfile {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  college: string;
  skills: string[];
  bio: string;
  about: string;
  github_url: string;
  linkedin_url: string;
  has_resume: boolean;
  resume_filename: string | null;
  resume_size_bytes: number | null;
  resume_uploaded_at: string | null;
  portfolio_completion: number;
  portfolio_complete: boolean;
  portfolio_missing_fields: string[];
  company_rank_score: number;
  points_balance: number;
  ideas_posted: number;
  projects_built: number;
  created_at: string;
}

export interface StudentProjectItem {
  id: string;
  idea_id: string | null;
  builder_id: string;
  builder_name: string;
  builder_college: string;
  builder_portfolio_complete: boolean;
  builder_company_rank_score: number;
  title: string;
  description: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  tech_stack: string[];
  github_url: string;
  demo_url: string;
  status: 'published';
  is_published_live: boolean;
  is_owner: boolean;
  created_at: string;
}

export interface IdeaFeedItem {
  id: string;
  title: string;
  summary: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  author_id: string;
  author_name: string;
  author_college: string;
  created_at: string;
  is_owner: boolean;
  locked: boolean;
}

export interface IdeaFullDetail extends IdeaFeedItem {
  problem: string;
  purpose: string;
  target_users: string;
  tech_stack: string[];
}

export interface SihProblemListItem {
  id: string;
  problem_id: string;
  title: string;
  organization: string;
  category: string;
  ideas_initialized: boolean;
  ideas_count: number;
  created_at: string;
}

export interface SihProblemDetail extends SihProblemListItem {
  description: string;
}

export interface SihUniqueIdea {
  id: string;
  problem_db_id: string;
  title: string;
  description: string;
  tech_stack: string[];
  difficulty: IdeaDifficulty;
  batch_number: number;
  created_at: string;
  is_saved?: boolean;
}

export interface SavedSihIdeaWithProblem extends SihUniqueIdea {
  sih_problem_code: string;
  sih_problem_title: string;
  sih_problem_organization: string;
  sih_problem_category: string;
  sih_problem_description: string;
  saved_at: string;
}

export interface PastCollegeEvent {
  title: string;
  year: string;
  participants: string;
}

export interface CollegeProfileData {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  photos: string[];
  specialties: string[];
  previous_events: PastCollegeEvent[];
  tips_canteen: string;
  tips_restrooms: string;
  tips_transport: string;
  tips_wifi_charging: string;
  tips_what_to_carry: string;
  avg_rating: number;
  review_count: number;
  is_verified_organizer: boolean;
  updated_at: string;
}

export interface NearbyEventItem {
  id: string;
  college_id: string;
  college_name: string;
  college_city: string;
  college_lat: number;
  college_lng: number;
  title: string;
  event_type: string;
  event_date: string;
  end_date: string;
  mode: string;
  summary: string;
  description: string;
  team_size: string;
  registration_deadline: string;
  venue_hall: string;
  what_to_bring: string;
  distance_km: number | null;
  created_at: string;
}

export interface CollegeReviewItem {
  id: string;
  college_id: string;
  event_id: string | null;
  event_title: string | null;
  author_id: string;
  author_name: string;
  author_college: string;
  rating: number;
  review_text: string;
  canteen_tip: string;
  restroom_tip: string;
  transport_tip: string;
  wifi_tip: string;
  carry_tip: string;
  created_at: string;
}

export interface ApproxLocationRecord {
  approx_lat: number;
  approx_lng: number;
  city_label: string;
  updated_at: string;
}

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const PRIVATE_RESUME_DIR = path.resolve(dataDir, 'private_resumes');
if (!fs.existsSync(PRIVATE_RESUME_DIR)) {
  fs.mkdirSync(PRIVATE_RESUME_DIR, { recursive: true });
}

export function resolvePrivateResumePath(storageKey: string): string | null {
  if (!storageKey || storageKey.includes('/') || storageKey.includes('\\')) {
    return null;
  }
  const resolved = path.resolve(PRIVATE_RESUME_DIR, storageKey);
  if (!resolved.startsWith(PRIVATE_RESUME_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

const dbPath = path.join(dataDir, 'ideabridge.db');
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    role TEXT NOT NULL DEFAULT 'student',
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    skills TEXT NOT NULL DEFAULT '[]',
    points_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    problem TEXT NOT NULL,
    purpose TEXT NOT NULL,
    target_users TEXT NOT NULL,
    domain TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    idea_id TEXT REFERENCES ideas(id) ON DELETE SET NULL,
    builder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    domain TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '[]',
    github_url TEXT NOT NULL,
    demo_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sih_problems (
    id TEXT PRIMARY KEY,
    problem_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    organization TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    ideas_initialized INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sih_problem_ideas (
    id TEXT PRIMARY KEY,
    problem_db_id TEXT NOT NULL REFERENCES sih_problems(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '[]',
    difficulty TEXT NOT NULL,
    batch_number INTEGER NOT NULL DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS saved_sih_ideas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sih_idea_id TEXT NOT NULL REFERENCES sih_problem_ideas(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, sih_idea_id)
  );

  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_db_id TEXT NOT NULL REFERENCES sih_problems(id) ON DELETE CASCADE,
    usage_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    photos TEXT NOT NULL DEFAULT '[]',
    specialties TEXT NOT NULL DEFAULT '[]',
    previous_events TEXT NOT NULL DEFAULT '[]',
    tips_canteen TEXT NOT NULL DEFAULT '',
    tips_restrooms TEXT NOT NULL DEFAULT '',
    tips_transport TEXT NOT NULL DEFAULT '',
    tips_wifi_charging TEXT NOT NULL DEFAULT '',
    tips_what_to_carry TEXT NOT NULL DEFAULT '',
    organizer_passcode_hash TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS college_organizers (
    college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (college_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS nearby_events (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    mode TEXT NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    team_size TEXT NOT NULL,
    registration_deadline TEXT NOT NULL,
    venue_hall TEXT NOT NULL,
    what_to_bring TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS college_reviews (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    event_id TEXT REFERENCES nearby_events(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    review_text TEXT NOT NULL,
    canteen_tip TEXT NOT NULL DEFAULT '',
    restroom_tip TEXT NOT NULL DEFAULT '',
    transport_tip TEXT NOT NULL DEFAULT '',
    wifi_tip TEXT NOT NULL DEFAULT '',
    carry_tip TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_approx_locations (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    approx_lat REAL NOT NULL,
    approx_lng REAL NOT NULL,
    city_label TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bridgey_qa_cache (
    cache_key TEXT PRIMARY KEY,
    college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    event_id TEXT,
    question_norm TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    checklist_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
`);

// Safe migrations for existing database files
const userColumns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
const existingUserColNames = new Set(userColumns.map((col) => col.name));

if (!existingUserColNames.has('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'");
}
if (!existingUserColNames.has('bio')) {
  db.exec("ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''");
}
if (!existingUserColNames.has('about')) {
  db.exec("ALTER TABLE users ADD COLUMN about TEXT NOT NULL DEFAULT ''");
}
if (!existingUserColNames.has('github_url')) {
  db.exec("ALTER TABLE users ADD COLUMN github_url TEXT NOT NULL DEFAULT ''");
}
if (!existingUserColNames.has('linkedin_url')) {
  db.exec("ALTER TABLE users ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT ''");
}
if (!existingUserColNames.has('resume_storage_key')) {
  db.exec('ALTER TABLE users ADD COLUMN resume_storage_key TEXT');
}
if (!existingUserColNames.has('resume_original_name')) {
  db.exec('ALTER TABLE users ADD COLUMN resume_original_name TEXT');
}
if (!existingUserColNames.has('resume_size_bytes')) {
  db.exec('ALTER TABLE users ADD COLUMN resume_size_bytes INTEGER');
}
if (!existingUserColNames.has('resume_uploaded_at')) {
  db.exec('ALTER TABLE users ADD COLUMN resume_uploaded_at TEXT');
}

const projectColumns = db.prepare('PRAGMA table_info(projects)').all() as Array<{ name: string }>;
if (!projectColumns.some((col) => col.name === 'title')) {
  // Replace empty Stage 1 placeholder projects table with full Stage 1 schema
  db.exec(`
    DROP TABLE IF EXISTS projects;
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      idea_id TEXT REFERENCES ideas(id) ON DELETE SET NULL,
      builder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      domain TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      tech_stack TEXT NOT NULL DEFAULT '[]',
      github_url TEXT NOT NULL,
      demo_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      created_at TEXT NOT NULL
    );
  `);
}

function parseJsonArray<T = string>(raw: unknown): T[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function seedStarterMarketplaceIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM ideas').get() as
    | { total: number }
    | undefined;

  if (countRow && countRow.total > 0) {
    return;
  }

  const starterAuthors = [
    {
      id: 'seed-student-1',
      email: 'ananya.rao@campus-seed.edu',
      name: 'Ananya Rao',
      college: 'IIT Madras',
      skills: ['React Native', 'Python', 'TensorFlow Lite'],
      points_balance: 0,
    },
    {
      id: 'seed-student-2',
      email: 'rohan.mehta@campus-seed.edu',
      name: 'Rohan Mehta',
      college: 'NIT Surathkal',
      skills: ['TypeScript', 'PostgreSQL', 'Node.js'],
      points_balance: 0,
    },
    {
      id: 'seed-student-3',
      email: 'meera.iyer@campus-seed.edu',
      name: 'Meera Iyer',
      college: 'BITS Pilani',
      skills: ['Flutter', 'FastAPI', 'IoT'],
      points_balance: 0,
    },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, auth_provider, role, name, college, skills, points_balance, created_at)
    VALUES (?, ?, NULL, 'seed', 'student', ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  for (const author of starterAuthors) {
    insertUser.run(
      author.id,
      author.email,
      author.name,
      author.college,
      JSON.stringify(author.skills),
      author.points_balance,
      now
    );
  }

  const starterIdeas = [
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-1',
      title: 'Campus Surplus Meal & Compost Router',
      summary:
        'Connects hostel mess halls with nearby community shelters before excess cooked food spoils, routing unavoidable waste to campus biodigesters.',
      problem:
        'College dining halls discard hundreds of kilograms of edible meals weekly because there is no real-time coordination window between evening mess closing and local NGOs.',
      purpose:
        'Cut campus food waste in half while giving student volunteers verified pickup schedules and temperature safety checklists.',
      target_users: 'Hostel mess managers, student eco-clubs, and verified local food rescue NGOs.',
      domain: 'Environment',
      difficulty: 'Intermediate',
      tech_stack: ['React Native', 'Supabase', 'Node.js', 'Push Notifications'],
      created_at: '2026-11-18T10:15:00.000Z',
    },
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-2',
      title: 'Prescription Label Voice Reader for Elderly Patients',
      summary:
        'Scans printed pharmacy strips and speaks dosage timing in regional Indian languages with large-contrast daily reminder alerts.',
      problem:
        'Elderly patients with low vision or limited English literacy often confuse morning and evening tablet strips, leading to missed or doubled doses.',
      purpose:
        'Provide an offline-capable camera scanner that reads dosage instructions aloud in Hindi, Tamil, Telugu, or Marathi.',
      target_users: 'Senior patients, rural clinic pharmacists, and family caregivers.',
      domain: 'Health',
      difficulty: 'Intermediate',
      tech_stack: ['Expo', 'ML Kit OCR', 'SQLite', 'Text-to-Speech'],
      created_at: '2026-11-19T08:40:00.000Z',
    },
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-3',
      title: 'Lab Equipment Micro-Slot & Calibration Tracker',
      summary:
        'Lets engineering students book shared oscilloscope and 3D-printer slots while logging calibration drift after each session.',
      problem:
        'Department labs suffer from double-booked benches and broken equipment because faults go unreported until the next practical exam.',
      purpose:
        'Create an accountable booking and quick-checkoff log tied to student IDs and lab technician alerts.',
      target_users: 'Undergraduate lab students, teaching assistants, and department lab coordinators.',
      domain: 'Education',
      difficulty: 'Beginner',
      tech_stack: ['React Native', 'Express', 'PostgreSQL', 'QR Scanner'],
      created_at: '2026-11-19T14:20:00.000Z',
    },
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-1',
      title: 'Low-Bandwidth Peer Doubt Exchange for Rural Colleges',
      summary:
        'Text-first academic Q&A board that compresses diagrams and syncs answer threads opportunistically over 2G/3G connections.',
      problem:
        'Video-heavy edtech apps fail in areas with patchy hostel Wi-Fi or limited mobile data caps, leaving students stuck on core math and coding concepts.',
      purpose:
        'Deliver a lightweight offline-queue forum where seniors earn campus credit for concise step-by-step explanations.',
      target_users: 'First-year engineering and polytechnic students in low-connectivity regions.',
      domain: 'Education',
      difficulty: 'Advanced',
      tech_stack: ['Expo', 'Local-First Sync', 'Supabase', 'Markdown Math'],
      created_at: '2026-11-20T07:05:00.000Z',
    },
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-2',
      title: 'Shared Hostel Expense & Mess Rebate Ledger',
      summary:
        'Tracks group project hardware splits and automates hostel mess rebate proofs when students travel for hackathons.',
      problem:
        'Students constantly lose track of shared PCB/component bills and miss mess rebate deadlines due to paper slip approvals.',
      purpose:
        'Simplify transparent group IOUs and digital rebate sign-offs with exportable PDF summaries.',
      target_users: 'Hostel residents, robotics clubs, and hackathon student teams.',
      domain: 'Campus Tech',
      difficulty: 'Beginner',
      tech_stack: ['React Native', 'TypeScript', 'Supabase', 'PDFKit'],
      created_at: '2026-11-20T16:50:00.000Z',
    },
    {
      id: crypto.randomUUID(),
      author_id: 'seed-student-3',
      title: 'Micro-Scholarship Document Readiness Checker',
      summary:
        'Walks first-generation college students through income, domicile, and bonafide certificate checks before scholarship portals close.',
      problem:
        'Thousands of eligible students have state scholarship applications rejected each year due to blurry scans or mismatched name spellings.',
      purpose:
        'Catch formatting and document mismatch errors locally on the phone before final portal upload.',
      target_users: 'First-generation undergraduate applicants and college financial aid desks.',
      domain: 'FinTech',
      difficulty: 'Intermediate',
      tech_stack: ['React Native', 'Python FastAPI', 'OpenCV', 'Supabase'],
      created_at: '2026-11-21T02:10:00.000Z',
    },
  ];

  const insertIdea = db.prepare(`
    INSERT INTO ideas (id, author_id, title, summary, problem, purpose, target_users, domain, difficulty, tech_stack, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const idea of starterIdeas) {
    insertIdea.run(
      idea.id,
      idea.author_id,
      idea.title,
      idea.summary,
      idea.problem,
      idea.purpose,
      idea.target_users,
      idea.domain,
      idea.difficulty,
      JSON.stringify(idea.tech_stack),
      idea.created_at
    );
  }
}

function seedStarterSihProblemsIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM sih_problems').get() as
    | { total: number }
    | undefined;
  if (countRow && countRow.total > 0) {
    return;
  }

  const starterProblems = [
    {
      problem_id: 'SIH1601',
      title: 'Real-Time Groundwater Level Prediction and Borewell Monitoring System',
      organization: 'Ministry of Jal Shakti',
      category: 'Clean & Green Technology',
      description:
        'Many semi-arid blocks lack timely visibility into seasonal groundwater depletion, causing borewells to run dry mid-cropping cycle. Build a software solution combining telemetry from digital water-level recorders, rainfall datasets, and soil moisture indicators to forecast aquifer stress 30 to 90 days ahead and deliver actionable conservation alerts to district water officers and village panchayats.',
    },
    {
      problem_id: 'SIH1608',
      title: 'AI-Assisted Crop Disease Triage and Advisory in Regional Languages',
      organization: 'Ministry of Agriculture & Farmers Welfare',
      category: 'Agriculture & Rural Development',
      description:
        'Smallholder farmers often apply broad-spectrum pesticides too late or unnecessarily because local extension officers cannot inspect every field. Create a low-bandwidth mobile and backend system that identifies common leaf blights and pest damage offline, asks structured follow-up questions about soil and weather, and outputs verified treatment steps in regional languages.',
    },
    {
      problem_id: 'SIH1614',
      title: 'Automated Ambulance Corridor and Hospital Bed Readiness Routing',
      organization: 'Ministry of Health & Family Welfare',
      category: 'HealthTech',
      description:
        'Emergency ambulances frequently lose critical golden-hour minutes in urban traffic or arrive at hospitals whose trauma or ICU beds are already full. Design a real-time dispatch platform connecting ambulance GPS feeds, live hospital emergency-bed availability, and traffic signal priority advisories for rapid triage.',
    },
    {
      problem_id: 'SIH1622',
      title: 'Vernacular Sign Language & Speech Captioning Companion for Classrooms',
      organization: 'Department of Empowerment of Persons with Disabilities',
      category: 'EdTech',
      description:
        'Students with hearing impairments in engineering and polytechnic classrooms struggle with fast-paced technical lectures that use domain vocabulary not covered by generic captions. Build an accessible classroom tool that transcribes technical lectures in real time, generates gloss/sign visual cues, and compiles searchable revision notes.',
    },
    {
      problem_id: 'SIH1635',
      title: 'Smart Freight Wagon Health and Wheel-Flat Acoustic Anomaly Detection',
      organization: 'Ministry of Railways',
      category: 'Smart Automation',
      description:
        'Undetected wheel-flat defects and axle-bearing overheating on freight wagons cause track damage and costly unscheduled yard delays. Develop an analytics and predictive maintenance dashboard ingesting wayside acoustic and thermal sensor streams to flag high-risk wagons before departure.',
    },
    {
      problem_id: 'SIH1649',
      title: 'Phishing, Mule Account, and UPI Spoof Detection for First-Time Digital Users',
      organization: 'Ministry of Electronics & Information Technology',
      category: 'Cybersecurity & FinTech',
      description:
        'First-time digital payment users and senior citizens are disproportionately targeted by fake payment request links, screen-sharing scams, and lookalike merchant QR codes. Build a lightweight risk-scoring assistant that warns users before authorizing suspicious UPI intents and educates them with clear, non-technical explanations.',
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO sih_problems (id, problem_id, title, organization, category, description, ideas_initialized, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);

  const now = new Date().toISOString();
  for (const problem of starterProblems) {
    insertStmt.run(
      crypto.randomUUID(),
      problem.problem_id,
      problem.title,
      problem.organization,
      problem.category,
      problem.description,
      now
    );
  }
}

function seedStarterCollegesAndEventsIfEmpty(): void {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM colleges').get() as
    | { total: number }
    | undefined;
  if (countRow && countRow.total > 0) {
    return;
  }

  const now = new Date().toISOString();
  const campusPhotos = [
    '/src/assets/images/college_campus_quad_1795263070555.jpg',
    '/src/assets/images/college_hackathon_hall_1795263069109.jpg',
    '/src/assets/images/college_canteen_courtyard_1795263069408.jpg',
  ];

  const colleges = [
    {
      id: 'college-rvce-bengaluru',
      slug: 'rvce-bengaluru',
      name: 'RV College of Engineering',
      city: 'Bengaluru',
      address: 'Mysore Road, RV Vidyaniketan Post, Bengaluru, Karnataka 560059',
      lat: 12.9237,
      lng: 77.4987,
      photos: campusPhotos,
      specialties: ['Embedded Systems & Robotics', 'Cloud & FinTech', 'Autonomous Mobility'],
      previous_events: [
        { title: 'RV HackSprint 2025', year: '2025', participants: '420 students' },
        { title: 'IoT & Edge Makers Conclave', year: '2024', participants: '280 students' },
      ],
      tips_canteen:
        'Main Mingos Canteen near the Civil Block serves great masala dosa, filter coffee, and affordable thalis. The smaller coffee kiosk behind IEM Auditorium stays open late during hackathons.',
      tips_restrooms:
        'Clean restrooms are on the ground and first floors of the IEM Auditorium wing and inside the Placement Block lobby.',
      tips_transport:
        'Take Namma Metro Purple Line directly to Pattanagere Station — the main campus gate is a 4-minute walk. Two-wheeler visitor parking is near Gate 2 with college event pass.',
      tips_wifi_charging:
        'Guest event Wi-Fi vouchers are handed out at the registration desk; extension boards are taped under every hackathon table in the IEM Hall.',
      tips_what_to_carry:
        'Carry your college photo ID, a 3-pin power extension strip, laptop charger, light hoodie (hall AC gets cold at night), and a refillable water bottle.',
    },
    {
      id: 'college-iitm-chennai',
      slug: 'iit-madras-chennai',
      name: 'IIT Madras Research & Innovation Park',
      city: 'Chennai',
      address: 'Sardar Patel Road, Adyar, Chennai, Tamil Nadu 600036',
      lat: 12.9915,
      lng: 80.2336,
      photos: [campusPhotos[1], campusPhotos[0], campusPhotos[2]],
      specialties: ['DeepTech & AI Systems', 'Clean Energy & Water', 'Biotech Hardware'],
      previous_events: [
        { title: 'Shaastra Buildathon 2025', year: '2025', participants: '650 students' },
        { title: 'Zero-Waste Campus Challenge', year: '2024', participants: '310 students' },
      ],
      tips_canteen:
        'Tifins and lemon rice at Himalaya Mess guest counter and Quark Cafe near the Research Park lobby are top picks. Night tea stalls operate near Gajendra Circle.',
      tips_restrooms:
        'Accessible restrooms are located next to the elevator banks on every floor of ICSR Building and Research Park.',
      tips_transport:
        'Campus electric shuttle buses run every 10 minutes from Main Gate (Sardar Patel Rd) to Gajendra Circle and ICSR. Visitors without passes must park outside Main Gate.',
      tips_wifi_charging:
        'Event SSID credentials are printed on your participant lanyard. Dual-socket power strips are provided at each team pod in the ICSR Hall.',
      tips_what_to_carry:
        'Mandatory government or college ID for Main Gate security QR scan, ethernet dongle as backup, power bank, and comfortable walking shoes.',
    },
    {
      id: 'college-coep-pune',
      slug: 'coep-tech-pune',
      name: 'COEP Technological University',
      city: 'Pune',
      address: 'Wellesley Road, Shivajinagar, Pune, Maharashtra 411005',
      lat: 18.5293,
      lng: 73.8565,
      photos: [campusPhotos[0], campusPhotos[2], campusPhotos[1]],
      specialties: ['Smart Manufacturing', 'Civic Infrastructure', 'Open-Source Software'],
      previous_events: [
        { title: 'MindSpark Civic Hack 2025', year: '2025', participants: '500 students' },
        { title: 'Pune Transit Data Sprint', year: '2024', participants: '240 students' },
      ],
      tips_canteen:
        'COEP Boat Club Canteen is famous for misal pav, poha, and cold coffee. The Academic Complex tuck shop stocks quick sandwiches and chai.',
      tips_restrooms:
        'Restrooms are in the Main Heritage Building east wing and on the ground floor of the Academic Complex.',
      tips_transport:
        'Located 600 meters from Shivajinagar Railway & Metro Station. Limited four-wheeler parking; arrive by Pune Metro Aqua/Purple Line or PMPML buses.',
      tips_wifi_charging:
        'Dedicated hackathon VLAN covers the Auditorium and Computer Dept labs; bring a multi-plug adapter if your team has 4+ laptops.',
      tips_what_to_carry:
        'College ID card, printed registration pass, 5m extension cord, HDMI/USB-C adapter for final judge demos, and umbrella during monsoon.',
    },
    {
      id: 'college-nitk-surathkal',
      slug: 'nitk-surathkal',
      name: 'NITK Surathkal',
      city: 'Mangaluru',
      address: 'NH 66, Srinivasnagar, Surathkal, Mangaluru, Karnataka 575025',
      lat: 13.0108,
      lng: 74.7943,
      photos: [campusPhotos[2], campusPhotos[1], campusPhotos[0]],
      specialties: ['Marine & Coastal Tech', 'Distributed Systems', 'AgriTech'],
      previous_events: [
        { title: 'Engineer HackVerse 2025', year: '2025', participants: '480 students' },
        { title: 'Coastal Sustainability Ideathon', year: '2024', participants: '210 students' },
      ],
      tips_canteen:
        'Night Canteen (Block C) is loved for neer dosa, egg fried rice, and mango milkshakes. Nandini Parlour near Main Building has cold beverages all afternoon.',
      tips_restrooms:
        'Clean restrooms are right outside the Silver Jubilee Auditorium and in the Lecture Hall Complex (LHC-C) ground floor.',
      tips_transport:
        'Direct express buses on NH 66 from Mangaluru Central stop right at the NITK Main Gate. Surathkal Railway Station is 3 km away by auto.',
      tips_wifi_charging:
        'LHC-C seminar rooms have wall sockets along side rows and reliable campus guest Wi-Fi once registered at the helpdesk.',
      tips_what_to_carry:
        'College ID, mosquito repellent for evening courtyard sessions, laptop + HDMI adapter, and a spare 10,000mAh power bank.',
    },
  ];

  const insertCollege = db.prepare(`
    INSERT INTO colleges (
      id, slug, name, city, address, lat, lng, photos, specialties, previous_events,
      tips_canteen, tips_restrooms, tips_transport, tips_wifi_charging, tips_what_to_carry, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of colleges) {
    insertCollege.run(
      c.id,
      c.slug,
      c.name,
      c.city,
      c.address,
      c.lat,
      c.lng,
      JSON.stringify(c.photos),
      JSON.stringify(c.specialties),
      JSON.stringify(c.previous_events),
      c.tips_canteen,
      c.tips_restrooms,
      c.tips_transport,
      c.tips_wifi_charging,
      c.tips_what_to_carry,
      now
    );
  }

  const events = [
    {
      id: 'event-rvce-buildsprint',
      college_id: 'college-rvce-bengaluru',
      title: 'Bengaluru Campus Mobility & CleanTech Buildathon',
      event_type: 'Hackathon',
      event_date: '2026-12-05',
      end_date: '2026-12-06',
      mode: 'In-Person',
      summary: '24-hour student buildathon tackling last-mile metro transit and campus energy tracking.',
      description:
        'Teams of 2 to 4 students build working prototypes for urban commuter safety, EV charging queues, or campus sustainability. Mentors from local hardware and cloud startups hold office hours every 4 hours, followed by 5-minute live judge demos.',
      team_size: '2–4 students',
      registration_deadline: '2026-12-01',
      venue_hall: 'IEM Auditorium & Innovation Wing',
      what_to_bring: 'College ID, laptop + charger, 3-pin extension strip, HDMI/USB-C adapter.',
    },
    {
      id: 'event-iitm-deeptech',
      college_id: 'college-iitm-chennai',
      title: 'Chennai Student Health & MedTech Ideathon',
      event_type: 'Ideathon',
      event_date: '2026-12-12',
      end_date: '2026-12-12',
      mode: 'In-Person',
      summary: 'One-day clinical problem-solving sprint pairing engineering students with hospital mentors.',
      description:
        'Spend the morning interviewing clinical practitioners on rural diagnostics and patient accessibility, then pitch a validated system architecture and clickable prototype to the afternoon jury.',
      team_size: '2–3 students',
      registration_deadline: '2026-12-08',
      venue_hall: 'ICSR Main Hall, IIT Madras',
      what_to_bring: 'College ID, Aadhaar/photo ID for gate entry, laptop, notebook.',
    },
    {
      id: 'event-coep-civic',
      college_id: 'college-coep-pune',
      title: 'Pune Open Civic Data & Transit Hack',
      event_type: 'Hackathon',
      event_date: '2026-12-19',
      end_date: '2026-12-20',
      mode: 'In-Person',
      summary: '30-hour hackathon building public transit, flood-alert, and accessibility tools for Pune.',
      description:
        'Collaborate with urban planners and open-data maintainers to ship civic web or mobile apps. Finalists present live demos on the Heritage Auditorium stage.',
      team_size: '2–4 students',
      registration_deadline: '2026-12-14',
      venue_hall: 'Academic Complex & Auditorium',
      what_to_bring: 'Student ID, multi-plug extension box, USB-C display dongle, water bottle.',
    },
    {
      id: 'event-nitk-coastal',
      college_id: 'college-nitk-surathkal',
      title: 'Coastal IoT & Offline-First AI Workshop',
      event_type: 'Workshop',
      event_date: '2026-12-27',
      end_date: '2026-12-27',
      mode: 'Hybrid',
      summary: 'Hands-on workshop on edge sensor telemetry and offline mobile sync for rural deployments.',
      description:
        'Learn how to capture environmental sensor streams, store data reliably offline on mobile devices, and build lightweight anomaly dashboards.',
      team_size: 'Individual or pairs',
      registration_deadline: '2026-12-23',
      venue_hall: 'Lecture Hall Complex (LHC-C) Room 204',
      what_to_bring: 'College ID, laptop with Node.js/Python installed, power bank.',
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO nearby_events (
      id, college_id, title, event_type, event_date, end_date, mode, summary, description,
      team_size, registration_deadline, venue_hall, what_to_bring, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ev of events) {
    insertEvent.run(
      ev.id,
      ev.college_id,
      ev.title,
      ev.event_type,
      ev.event_date,
      ev.end_date,
      ev.mode,
      ev.summary,
      ev.description,
      ev.team_size,
      ev.registration_deadline,
      ev.venue_hall,
      ev.what_to_bring,
      now
    );
  }

  const insertReview = db.prepare(`
    INSERT INTO college_reviews (
      id, college_id, event_id, author_id, rating, review_text,
      canteen_tip, restroom_tip, transport_tip, wifi_tip, carry_tip, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertReview.run(
    crypto.randomUUID(),
    'college-rvce-bengaluru',
    'event-rvce-buildsprint',
    'seed-student-2',
    5,
    'Super well-organized venue with helpful volunteers at the gate. Judge Q&A moved fast, so keep your demo under 3 minutes.',
    'Mingos masala dosa and filter coffee kept our whole team awake.',
    'Ground floor IEM Auditorium restrooms were spotless all night.',
    'Pattanagere Metro drop-off saved us from Mysore Road traffic.',
    'Extension boards under the tables had 4 sockets each.',
    'Bring a light jacket for the overnight AC.',
    '2026-11-15T11:20:00.000Z'
  );

  insertReview.run(
    crypto.randomUUID(),
    'college-iitm-chennai',
    'event-iitm-deeptech',
    'seed-student-1',
    5,
    'ICSR hall acoustics and mentor tables were great. Give yourself 15 extra minutes at the main gate for visitor pass verification.',
    'Quark Cafe cold coffee and Himalaya lunch counters are fast.',
    'Restrooms beside the ICSR atrium lifts are easy to find.',
    'Wait for the campus electric shuttle at Main Gate instead of walking in the afternoon sun.',
    'Guest Wi-Fi login comes on the lanyard card.',
    'Keep a physical student ID and USB-C to HDMI adapter ready.',
    '2026-11-16T15:10:00.000Z'
  );
}

seedStarterMarketplaceIfEmpty();
seedStarterSihProblemsIfEmpty();
seedStarterCollegesAndEventsIfEmpty();

function isAdminEmail(email: string): boolean {
  const configured = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase());
}

export function computePortfolioStats(params: {
  bio: string;
  skills: string[];
  github_url: string;
  linkedin_url: string;
  about: string;
  projects_built: number;
  has_resume: boolean;
}): {
  completion: number;
  complete: boolean;
  missingFields: string[];
  rankScore: number;
} {
  const missingFields: string[] = [];
  let filled = 0;

  if (params.bio.trim().length > 0) filled++;
  else missingFields.push('Bio');

  if (params.skills.length > 0) filled++;
  else missingFields.push('Skills');

  if (params.github_url.trim().length > 0) filled++;
  else missingFields.push('GitHub link');

  if (params.linkedin_url.trim().length > 0) filled++;
  else missingFields.push('LinkedIn link');

  if (params.about.trim().length > 0) filled++;
  else missingFields.push('About section');

  const completion = filled * 20;
  const complete = filled === 5;
  // Portfolio complete badge gives a clear ranking boost for companies
  const rankScore =
    completion +
    (complete ? 100 : 0) +
    (params.has_resume ? 25 : 0) +
    params.projects_built * 15;

  return { completion, complete, missingFields, rankScore };
}

export function getUserProfileById(userId: string): PublicUserProfile | null {
  const row = db
    .prepare(
      `SELECT
        u.id,
        u.email,
        u.role,
        u.name,
        u.college,
        u.skills,
        u.bio,
        u.about,
        u.github_url,
        u.linkedin_url,
        u.resume_storage_key,
        u.resume_original_name,
        u.resume_size_bytes,
        u.resume_uploaded_at,
        u.points_balance,
        u.created_at,
        (SELECT COUNT(*) FROM ideas i WHERE i.author_id = u.id) AS ideas_posted,
        (SELECT COUNT(*) FROM projects p WHERE p.builder_id = u.id) AS projects_built
       FROM users u
       WHERE u.id = ?`
    )
    .get(userId) as
    | {
        id: string;
        email: string;
        role: string;
        name: string;
        college: string;
        skills: string;
        bio: string;
        about: string;
        github_url: string;
        linkedin_url: string;
        resume_storage_key: string | null;
        resume_original_name: string | null;
        resume_size_bytes: number | null;
        resume_uploaded_at: string | null;
        points_balance: number;
        created_at: string;
        ideas_posted: number;
        projects_built: number;
      }
    | undefined;

  if (!row) return null;

  const effectiveRole: UserRole =
    row.role === 'admin' || isAdminEmail(row.email) ? 'admin' : 'student';
  const skills = parseJsonArray<string>(row.skills);
  const resumePath = row.resume_storage_key
    ? resolvePrivateResumePath(row.resume_storage_key)
    : null;
  const hasResume = Boolean(resumePath && fs.existsSync(resumePath));
  const projectsBuilt = Number(row.projects_built ?? 0);

  const portfolio = computePortfolioStats({
    bio: row.bio ?? '',
    skills,
    github_url: row.github_url ?? '',
    linkedin_url: row.linkedin_url ?? '',
    about: row.about ?? '',
    projects_built: projectsBuilt,
    has_resume: hasResume,
  });

  return {
    id: row.id,
    email: row.email,
    role: effectiveRole,
    name: row.name,
    college: row.college,
    skills,
    bio: row.bio ?? '',
    about: row.about ?? '',
    github_url: row.github_url ?? '',
    linkedin_url: row.linkedin_url ?? '',
    has_resume: hasResume,
    resume_filename: hasResume ? row.resume_original_name : null,
    resume_size_bytes: hasResume ? row.resume_size_bytes : null,
    resume_uploaded_at: hasResume ? row.resume_uploaded_at : null,
    portfolio_completion: portfolio.completion,
    portfolio_complete: portfolio.complete,
    portfolio_missing_fields: portfolio.missingFields,
    company_rank_score: portfolio.rankScore,
    points_balance: Number(row.points_balance ?? 0),
    ideas_posted: Number(row.ideas_posted ?? 0),
    projects_built: projectsBuilt,
    created_at: row.created_at,
  };
}

export function getUserByEmail(email: string): DbUserRow | null {
  const row = db
    .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
    .get(email) as DbUserRow | undefined;
  return row ?? null;
}

export function createUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  college: string;
  skills: string[];
}): PublicUserProfile {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const role: UserRole = isAdminEmail(input.email) ? 'admin' : 'student';

  db.prepare(
    `INSERT INTO users (id, email, password_hash, auth_provider, role, name, college, skills, points_balance, created_at)
     VALUES (?, ?, ?, 'email', ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    input.email.toLowerCase(),
    input.passwordHash,
    role,
    input.name,
    input.college,
    JSON.stringify(input.skills),
    createdAt
  );

  const profile = getUserProfileById(id);
  if (!profile) {
    throw new Error('Failed to load created user profile');
  }
  return profile;
}

export function setUserRole(userId: string, role: UserRole): PublicUserProfile | null {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  return getUserProfileById(userId);
}

export function hasAnyAdminUser(): boolean {
  const row = db
    .prepare("SELECT COUNT(*) as total FROM users WHERE role = 'admin'")
    .get() as { total: number } | undefined;
  return Boolean(row && row.total > 0);
}

export function getAppSetting(key: string): string | null {
  const row = db
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setAppSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function updateUserProfile(
  userId: string,
  updates: {
    name: string;
    college: string;
    skills: string[];
    bio?: string;
    about?: string;
    github_url?: string;
    linkedin_url?: string;
  }
): PublicUserProfile | null {
  const current = getUserProfileById(userId);
  if (!current) return null;

  db.prepare(
    `UPDATE users
     SET name = ?, college = ?, skills = ?, bio = ?, about = ?, github_url = ?, linkedin_url = ?
     WHERE id = ?`
  ).run(
    updates.name,
    updates.college,
    JSON.stringify(updates.skills),
    updates.bio !== undefined ? updates.bio : current.bio,
    updates.about !== undefined ? updates.about : current.about,
    updates.github_url !== undefined ? updates.github_url : current.github_url,
    updates.linkedin_url !== undefined ? updates.linkedin_url : current.linkedin_url,
    userId
  );

  return getUserProfileById(userId);
}

export function getUserResumeRecord(userId: string): {
  storageKey: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
  filePath: string;
} | null {
  const row = db
    .prepare(
      `SELECT resume_storage_key, resume_original_name, resume_size_bytes, resume_uploaded_at
       FROM users WHERE id = ?`
    )
    .get(userId) as
    | {
        resume_storage_key: string | null;
        resume_original_name: string | null;
        resume_size_bytes: number | null;
        resume_uploaded_at: string | null;
      }
    | undefined;

  if (!row || !row.resume_storage_key) return null;
  const resolved = resolvePrivateResumePath(row.resume_storage_key);
  if (!resolved || !fs.existsSync(resolved)) return null;

  return {
    storageKey: row.resume_storage_key,
    originalName: row.resume_original_name ?? 'resume.pdf',
    sizeBytes: Number(row.resume_size_bytes ?? 0),
    uploadedAt: row.resume_uploaded_at ?? '',
    filePath: resolved,
  };
}

export function hasValidStoredResume(userId: string): boolean {
  return getUserResumeRecord(userId) !== null;
}

export function saveUserResumeFile(params: {
  userId: string;
  originalName: string;
  buffer: Buffer;
}): PublicUserProfile | null {
  const previous = getUserResumeRecord(params.userId);
  const storageKey = `${params.userId.replace(/[^a-zA-Z0-9-]/g, '')}-${crypto.randomUUID()}.pdf`;
  const targetPath = resolvePrivateResumePath(storageKey);
  if (!targetPath) {
    throw new Error('Invalid private storage path.');
  }

  fs.writeFileSync(targetPath, params.buffer, { mode: 0o600 });
  const uploadedAt = new Date().toISOString();

  db.prepare(
    `UPDATE users
     SET resume_storage_key = ?, resume_original_name = ?, resume_size_bytes = ?, resume_uploaded_at = ?
     WHERE id = ?`
  ).run(storageKey, params.originalName, params.buffer.length, uploadedAt, params.userId);

  if (previous && previous.filePath !== targetPath && fs.existsSync(previous.filePath)) {
    try {
      fs.unlinkSync(previous.filePath);
    } catch {
      // ignore stale cleanup error
    }
  }

  return getUserProfileById(params.userId);
}

export function deleteUserResumeFile(userId: string): PublicUserProfile | null {
  const row = db
    .prepare('SELECT resume_storage_key FROM users WHERE id = ?')
    .get(userId) as { resume_storage_key: string | null } | undefined;

  if (row?.resume_storage_key) {
    const resolved = resolvePrivateResumePath(row.resume_storage_key);
    if (resolved && fs.existsSync(resolved)) {
      try {
        fs.unlinkSync(resolved);
      } catch {
        // ignore unlink error
      }
    }
  }

  db.prepare(
    `UPDATE users
     SET resume_storage_key = NULL, resume_original_name = NULL, resume_size_bytes = NULL, resume_uploaded_at = NULL
     WHERE id = ?`
  ).run(userId);

  return getUserProfileById(userId);
}

export function listFeedIdeas(options: {
  viewerId: string | null;
  query?: string;
  domain?: string;
}): IdeaFeedItem[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (options.domain && options.domain !== 'All') {
    conditions.push('i.domain = ?');
    params.push(options.domain);
  }

  if (options.query && options.query.trim().length > 0) {
    const pattern = `%${options.query.trim().toLowerCase()}%`;
    conditions.push('(lower(i.title) LIKE ? OR lower(i.summary) LIKE ?)');
    params.push(pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT
        i.id,
        i.title,
        i.summary,
        i.domain,
        i.difficulty,
        i.author_id,
        u.name AS author_name,
        u.college AS author_college,
        i.created_at
       FROM ideas i
       JOIN users u ON u.id = i.author_id
       ${whereClause}
       ORDER BY i.created_at DESC`
    )
    .all(...params) as Array<{
    id: string;
    title: string;
    summary: string;
    domain: IdeaDomain;
    difficulty: IdeaDifficulty;
    author_id: string;
    author_name: string;
    author_college: string;
    created_at: string;
  }>;

  return rows.map((row) => {
    const isOwner = Boolean(options.viewerId && options.viewerId === row.author_id);
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      domain: row.domain,
      difficulty: row.difficulty,
      author_id: row.author_id,
      author_name: row.author_name,
      author_college: row.author_college,
      created_at: row.created_at,
      is_owner: isOwner,
      locked: !isOwner,
    };
  });
}

export function getIdeaByIdForViewer(
  ideaId: string,
  viewerId: string | null
): (IdeaFeedItem | IdeaFullDetail) | null {
  const row = db
    .prepare(
      `SELECT
        i.*,
        u.name AS author_name,
        u.college AS author_college
       FROM ideas i
       JOIN users u ON u.id = i.author_id
       WHERE i.id = ?`
    )
    .get(ideaId) as
    | {
        id: string;
        author_id: string;
        title: string;
        summary: string;
        problem: string;
        purpose: string;
        target_users: string;
        domain: IdeaDomain;
        difficulty: IdeaDifficulty;
        tech_stack: string;
        created_at: string;
        author_name: string;
        author_college: string;
      }
    | undefined;

  if (!row) return null;

  const isOwner = Boolean(viewerId && viewerId === row.author_id);
  const base: IdeaFeedItem = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    domain: row.domain,
    difficulty: row.difficulty,
    author_id: row.author_id,
    author_name: row.author_name,
    author_college: row.author_college,
    created_at: row.created_at,
    is_owner: isOwner,
    locked: !isOwner,
  };

  if (!isOwner) {
    return base;
  }

  return {
    ...base,
    problem: row.problem,
    purpose: row.purpose,
    target_users: row.target_users,
    tech_stack: parseJsonArray(row.tech_stack),
  };
}

export function listIdeasByAuthor(authorId: string): IdeaFullDetail[] {
  const rows = db
    .prepare(
      `SELECT
        i.*,
        u.name AS author_name,
        u.college AS author_college
       FROM ideas i
       JOIN users u ON u.id = i.author_id
       WHERE i.author_id = ?
       ORDER BY i.created_at DESC`
    )
    .all(authorId) as Array<{
    id: string;
    author_id: string;
    title: string;
    summary: string;
    problem: string;
    purpose: string;
    target_users: string;
    domain: IdeaDomain;
    difficulty: IdeaDifficulty;
    tech_stack: string;
    created_at: string;
    author_name: string;
    author_college: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    domain: row.domain,
    difficulty: row.difficulty,
    author_id: row.author_id,
    author_name: row.author_name,
    author_college: row.author_college,
    created_at: row.created_at,
    is_owner: true,
    locked: false,
    problem: row.problem,
    purpose: row.purpose,
    target_users: row.target_users,
    tech_stack: parseJsonArray(row.tech_stack),
  }));
}

export function createIdea(input: {
  authorId: string;
  title: string;
  summary: string;
  problem: string;
  purpose: string;
  targetUsers: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  techStack: string[];
}): IdeaFullDetail {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO ideas (id, author_id, title, summary, problem, purpose, target_users, domain, difficulty, tech_stack, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.authorId,
    input.title,
    input.summary,
    input.problem,
    input.purpose,
    input.targetUsers,
    input.domain,
    input.difficulty,
    JSON.stringify(input.techStack),
    createdAt
  );

  const created = getIdeaByIdForViewer(id, input.authorId);
  if (!created || created.locked) {
    throw new Error('Failed to load created idea');
  }
  return created as IdeaFullDetail;
}

export function deleteIdeaByOwner(ideaId: string, ownerId: string): boolean {
  const result = db
    .prepare('DELETE FROM ideas WHERE id = ? AND author_id = ?')
    .run(ideaId, ownerId);
  return Number(result.changes) > 0;
}

// --- Student Projects (Gated by Resume Upload) ---

interface ProjectQueryRow {
  id: string;
  idea_id: string | null;
  builder_id: string;
  builder_name: string;
  builder_college: string;
  builder_bio: string;
  builder_about: string;
  builder_github: string;
  builder_linkedin: string;
  builder_skills: string;
  builder_resume_key: string | null;
  builder_projects_built: number;
  title: string;
  description: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  tech_stack: string;
  github_url: string;
  demo_url: string;
  status: 'published';
  created_at: string;
}

function mapProjectRow(row: ProjectQueryRow, viewerId: string | null): StudentProjectItem {
  const resumePath = row.builder_resume_key
    ? resolvePrivateResumePath(row.builder_resume_key)
    : null;
  const hasResume = Boolean(resumePath && fs.existsSync(resumePath));
  const stats = computePortfolioStats({
    bio: row.builder_bio ?? '',
    skills: parseJsonArray<string>(row.builder_skills),
    github_url: row.builder_github ?? '',
    linkedin_url: row.builder_linkedin ?? '',
    about: row.builder_about ?? '',
    projects_built: Number(row.builder_projects_built ?? 0),
    has_resume: hasResume,
  });

  return {
    id: row.id,
    idea_id: row.idea_id ?? null,
    builder_id: row.builder_id,
    builder_name: row.builder_name,
    builder_college: row.builder_college,
    builder_portfolio_complete: stats.complete,
    builder_company_rank_score: stats.rankScore,
    title: row.title,
    description: row.description,
    domain: row.domain,
    difficulty: row.difficulty,
    tech_stack: parseJsonArray<string>(row.tech_stack),
    github_url: row.github_url,
    demo_url: row.demo_url ?? '',
    status: 'published',
    is_published_live: row.status === 'published' && hasResume,
    is_owner: Boolean(viewerId && viewerId === row.builder_id),
    created_at: row.created_at,
  };
}

export function listPublishedProjects(options: {
  viewerId: string | null;
  query?: string;
  domain?: string;
}): StudentProjectItem[] {
  const conditions: string[] = [
    "p.status = 'published'",
    'u.resume_storage_key IS NOT NULL',
  ];
  const params: string[] = [];

  if (options.domain && options.domain !== 'All') {
    conditions.push('p.domain = ?');
    params.push(options.domain);
  }
  if (options.query && options.query.trim().length > 0) {
    const pattern = `%${options.query.trim().toLowerCase()}%`;
    conditions.push('(lower(p.title) LIKE ? OR lower(p.description) LIKE ? OR lower(u.name) LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  const rows = db
    .prepare(
      `SELECT
        p.*,
        u.name AS builder_name,
        u.college AS builder_college,
        u.bio AS builder_bio,
        u.about AS builder_about,
        u.github_url AS builder_github,
        u.linkedin_url AS builder_linkedin,
        u.skills AS builder_skills,
        u.resume_storage_key AS builder_resume_key,
        (SELECT COUNT(*) FROM projects p2 WHERE p2.builder_id = u.id) AS builder_projects_built
       FROM projects p
       JOIN users u ON u.id = p.builder_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC`
    )
    .all(...params) as unknown as ProjectQueryRow[];

  return rows
    .map((row) => mapProjectRow(row, options.viewerId))
    .filter((item) => item.is_published_live)
    .sort((a, b) => {
      // Rank Portfolio-Complete builders higher, then newest
      if (b.builder_portfolio_complete !== a.builder_portfolio_complete) {
        return b.builder_portfolio_complete ? 1 : -1;
      }
      return b.created_at.localeCompare(a.created_at);
    });
}

export function listProjectsByBuilder(builderId: string): StudentProjectItem[] {
  const rows = db
    .prepare(
      `SELECT
        p.*,
        u.name AS builder_name,
        u.college AS builder_college,
        u.bio AS builder_bio,
        u.about AS builder_about,
        u.github_url AS builder_github,
        u.linkedin_url AS builder_linkedin,
        u.skills AS builder_skills,
        u.resume_storage_key AS builder_resume_key,
        (SELECT COUNT(*) FROM projects p2 WHERE p2.builder_id = u.id) AS builder_projects_built
       FROM projects p
       JOIN users u ON u.id = p.builder_id
       WHERE p.builder_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(builderId) as unknown as ProjectQueryRow[];

  return rows.map((row) => mapProjectRow(row, builderId));
}

export function createProject(input: {
  builderId: string;
  ideaId: string | null;
  title: string;
  description: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  techStack: string[];
  githubUrl: string;
  demoUrl: string;
}): StudentProjectItem {
  if (!hasValidStoredResume(input.builderId)) {
    throw new Error('RESUME_REQUIRED');
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO projects (
      id, idea_id, builder_id, title, description, domain, difficulty, tech_stack, github_url, demo_url, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`
  ).run(
    id,
    input.ideaId,
    input.builderId,
    input.title,
    input.description,
    input.domain,
    input.difficulty,
    JSON.stringify(input.techStack),
    input.githubUrl,
    input.demoUrl,
    createdAt
  );

  const created = listProjectsByBuilder(input.builderId).find((p) => p.id === id);
  if (!created) {
    throw new Error('Failed to load created project');
  }
  return created;
}

export function deleteProjectByOwner(projectId: string, ownerId: string): boolean {
  const result = db
    .prepare('DELETE FROM projects WHERE id = ? AND builder_id = ?')
    .run(projectId, ownerId);
  return Number(result.changes) > 0;
}

// --- SIH Problems & Cached Unique Ideas ---

export function listSihCategories(): string[] {
  const rows = db
    .prepare('SELECT DISTINCT category FROM sih_problems ORDER BY category ASC')
    .all() as Array<{ category: string }>;
  return rows.map((r) => r.category).filter(Boolean);
}

export function listSihProblems(options: {
  query?: string;
  category?: string;
}): SihProblemListItem[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (options.category && options.category !== 'All') {
    conditions.push('p.category = ?');
    params.push(options.category);
  }

  if (options.query && options.query.trim().length > 0) {
    const pattern = `%${options.query.trim().toLowerCase()}%`;
    conditions.push(
      '(lower(p.problem_id) LIKE ? OR lower(p.title) LIKE ? OR lower(p.organization) LIKE ? OR lower(p.description) LIKE ?)'
    );
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT
        p.id,
        p.problem_id,
        p.title,
        p.organization,
        p.category,
        p.ideas_initialized,
        p.created_at,
        (SELECT COUNT(*) FROM sih_problem_ideas i WHERE i.problem_db_id = p.id) AS ideas_count
       FROM sih_problems p
       ${whereClause}
       ORDER BY p.problem_id ASC`
    )
    .all(...params) as Array<{
    id: string;
    problem_id: string;
    title: string;
    organization: string;
    category: string;
    ideas_initialized: number;
    created_at: string;
    ideas_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    problem_id: row.problem_id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    ideas_initialized: row.ideas_initialized === 1,
    ideas_count: Number(row.ideas_count ?? 0),
    created_at: row.created_at,
  }));
}

export function getSihProblemById(id: string): SihProblemDetail | null {
  const row = db
    .prepare(
      `SELECT
        p.*,
        (SELECT COUNT(*) FROM sih_problem_ideas i WHERE i.problem_db_id = p.id) AS ideas_count
       FROM sih_problems p
       WHERE p.id = ?`
    )
    .get(id) as
    | {
        id: string;
        problem_id: string;
        title: string;
        organization: string;
        category: string;
        description: string;
        ideas_initialized: number;
        created_at: string;
        ideas_count: number;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    problem_id: row.problem_id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    description: row.description,
    ideas_initialized: row.ideas_initialized === 1,
    ideas_count: Number(row.ideas_count ?? 0),
    created_at: row.created_at,
  };
}

export function listIdeasForSihProblem(
  problemDbId: string,
  viewerId: string | null
): SihUniqueIdea[] {
  const rows = db
    .prepare(
      `SELECT * FROM sih_problem_ideas
       WHERE problem_db_id = ?
       ORDER BY batch_number ASC, created_at ASC`
    )
    .all(problemDbId) as Array<{
    id: string;
    problem_db_id: string;
    title: string;
    description: string;
    tech_stack: string;
    difficulty: IdeaDifficulty;
    batch_number: number;
    created_at: string;
  }>;

  const savedSet = viewerId ? getSavedSihIdeaIdsForUser(viewerId) : new Set<string>();

  return rows.map((row) => ({
    id: row.id,
    problem_db_id: row.problem_db_id,
    title: row.title,
    description: row.description,
    tech_stack: parseJsonArray(row.tech_stack),
    difficulty: row.difficulty,
    batch_number: Number(row.batch_number ?? 1),
    created_at: row.created_at,
    is_saved: savedSet.has(row.id),
  }));
}

export function saveGeneratedIdeasForProblem(params: {
  problemDbId: string;
  ideas: Array<{
    title: string;
    description: string;
    tech_stack: string[];
    difficulty: IdeaDifficulty;
  }>;
  batchNumber: number;
  createdBy: string | null;
  markInitialized?: boolean;
}): void {
  const insertStmt = db.prepare(`
    INSERT INTO sih_problem_ideas (id, problem_db_id, title, description, tech_stack, difficulty, batch_number, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN IMMEDIATE');
  try {
    const now = new Date().toISOString();
    for (const idea of params.ideas) {
      insertStmt.run(
        crypto.randomUUID(),
        params.problemDbId,
        idea.title,
        idea.description,
        JSON.stringify(idea.tech_stack),
        idea.difficulty,
        params.batchNumber,
        params.createdBy,
        now
      );
    }

    if (params.markInitialized) {
      db.prepare('UPDATE sih_problems SET ideas_initialized = 1 WHERE id = ?').run(
        params.problemDbId
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getNextBatchNumberForProblem(problemDbId: string): number {
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(batch_number), 0) AS max_batch FROM sih_problem_ideas WHERE problem_db_id = ?'
    )
    .get(problemDbId) as { max_batch: number } | undefined;
  return Number(row?.max_batch ?? 0) + 1;
}

export function getDailyAiUsageCount(userId: string, usageDate: string): number {
  const row = db
    .prepare(
      'SELECT COUNT(*) as total FROM ai_usage_logs WHERE user_id = ? AND usage_date = ?'
    )
    .get(userId, usageDate) as { total: number } | undefined;
  return Number(row?.total ?? 0);
}

export function recordAiUsage(userId: string, problemDbId: string, usageDate: string): void {
  db.prepare(
    `INSERT INTO ai_usage_logs (id, user_id, problem_db_id, usage_date, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, problemDbId, usageDate, new Date().toISOString());
}

export function getSavedSihIdeaIdsForUser(userId: string): Set<string> {
  const rows = db
    .prepare('SELECT sih_idea_id FROM saved_sih_ideas WHERE user_id = ?')
    .all(userId) as Array<{ sih_idea_id: string }>;
  return new Set(rows.map((r) => r.sih_idea_id));
}

export function saveSihIdeaForUser(userId: string, sihIdeaId: string): boolean {
  const exists = db
    .prepare('SELECT id FROM sih_problem_ideas WHERE id = ?')
    .get(sihIdeaId);
  if (!exists) return false;

  db.prepare(
    `INSERT OR IGNORE INTO saved_sih_ideas (id, user_id, sih_idea_id, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, sihIdeaId, new Date().toISOString());
  return true;
}

export function unsaveSihIdeaForUser(userId: string, sihIdeaId: string): boolean {
  const result = db
    .prepare('DELETE FROM saved_sih_ideas WHERE user_id = ? AND sih_idea_id = ?')
    .run(userId, sihIdeaId);
  return Number(result.changes) > 0;
}

export function listSavedSihIdeasForUser(userId: string): SavedSihIdeaWithProblem[] {
  const rows = db
    .prepare(
      `SELECT
        i.id,
        i.problem_db_id,
        i.title,
        i.description,
        i.tech_stack,
        i.difficulty,
        i.batch_number,
        i.created_at,
        s.created_at AS saved_at,
        p.problem_id AS sih_problem_code,
        p.title AS sih_problem_title,
        p.organization AS sih_problem_organization,
        p.category AS sih_problem_category,
        p.description AS sih_problem_description
       FROM saved_sih_ideas s
       JOIN sih_problem_ideas i ON i.id = s.sih_idea_id
       JOIN sih_problems p ON p.id = i.problem_db_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(userId) as Array<{
    id: string;
    problem_db_id: string;
    title: string;
    description: string;
    tech_stack: string;
    difficulty: IdeaDifficulty;
    batch_number: number;
    created_at: string;
    saved_at: string;
    sih_problem_code: string;
    sih_problem_title: string;
    sih_problem_organization: string;
    sih_problem_category: string;
    sih_problem_description: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    problem_db_id: row.problem_db_id,
    title: row.title,
    description: row.description,
    tech_stack: parseJsonArray(row.tech_stack),
    difficulty: row.difficulty,
    batch_number: Number(row.batch_number ?? 1),
    created_at: row.created_at,
    is_saved: true,
    sih_problem_code: row.sih_problem_code,
    sih_problem_title: row.sih_problem_title,
    sih_problem_organization: row.sih_problem_organization,
    sih_problem_category: row.sih_problem_category,
    sih_problem_description: row.sih_problem_description,
    saved_at: row.saved_at,
  }));
}

export function upsertSihProblemsBatch(
  rows: Array<{
    problem_id: string;
    title: string;
    organization: string;
    category: string;
    description: string;
  }>
): { inserted: number; updated: number } {
  const findExisting = db.prepare('SELECT id FROM sih_problems WHERE problem_id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO sih_problems (id, problem_id, title, organization, category, description, ideas_initialized, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE sih_problems
    SET title = ?, organization = ?, category = ?, description = ?
    WHERE problem_id = ?
  `);

  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of rows) {
      const existing = findExisting.get(row.problem_id);
      if (existing) {
        updateStmt.run(row.title, row.organization, row.category, row.description, row.problem_id);
        updated++;
      } else {
        insertStmt.run(
          crypto.randomUUID(),
          row.problem_id,
          row.title,
          row.organization,
          row.category,
          row.description,
          now
        );
        inserted++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { inserted, updated };
}

// --- Nearby Events, College Profiles, Organizers, Reviews & Bridgey Cache ---

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function roundApproxCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function saveUserApproxLocation(
  userId: string,
  lat: number,
  lng: number,
  cityLabel: string
): ApproxLocationRecord {
  const approxLat = roundApproxCoord(lat);
  const approxLng = roundApproxCoord(lng);
  const updatedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO user_approx_locations (user_id, approx_lat, approx_lng, city_label, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       approx_lat = excluded.approx_lat,
       approx_lng = excluded.approx_lng,
       city_label = excluded.city_label,
       updated_at = excluded.updated_at`
  ).run(userId, approxLat, approxLng, cityLabel, updatedAt);

  return {
    approx_lat: approxLat,
    approx_lng: approxLng,
    city_label: cityLabel,
    updated_at: updatedAt,
  };
}

export function getUserApproxLocation(userId: string): ApproxLocationRecord | null {
  const row = db
    .prepare(
      'SELECT approx_lat, approx_lng, city_label, updated_at FROM user_approx_locations WHERE user_id = ?'
    )
    .get(userId) as ApproxLocationRecord | undefined;
  return row ?? null;
}

export function listNearbyEvents(options: {
  query?: string;
  eventType?: string;
  city?: string;
  approxLat?: number | null;
  approxLng?: number | null;
}): NearbyEventItem[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (options.eventType && options.eventType !== 'All') {
    conditions.push('e.event_type = ?');
    params.push(options.eventType);
  }
  if (options.city && options.city !== 'All') {
    conditions.push('lower(c.city) = lower(?)');
    params.push(options.city);
  }
  if (options.query && options.query.trim().length > 0) {
    const pattern = `%${options.query.trim().toLowerCase()}%`;
    conditions.push(
      '(lower(e.title) LIKE ? OR lower(e.summary) LIKE ? OR lower(c.name) LIKE ? OR lower(c.city) LIKE ?)'
    );
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT
        e.*,
        c.name AS college_name,
        c.city AS college_city,
        c.lat AS college_lat,
        c.lng AS college_lng
       FROM nearby_events e
       JOIN colleges c ON c.id = e.college_id
       ${whereClause}
       ORDER BY e.event_date ASC`
    )
    .all(...params) as Array<{
    id: string;
    college_id: string;
    college_name: string;
    college_city: string;
    college_lat: number;
    college_lng: number;
    title: string;
    event_type: string;
    event_date: string;
    end_date: string;
    mode: string;
    summary: string;
    description: string;
    team_size: string;
    registration_deadline: string;
    venue_hall: string;
    what_to_bring: string;
    created_at: string;
  }>;

  const hasCoords =
    typeof options.approxLat === 'number' &&
    typeof options.approxLng === 'number' &&
    Number.isFinite(options.approxLat) &&
    Number.isFinite(options.approxLng);

  const items: NearbyEventItem[] = rows.map((row) => ({
    id: row.id,
    college_id: row.college_id,
    college_name: row.college_name,
    college_city: row.college_city,
    college_lat: Number(row.college_lat),
    college_lng: Number(row.college_lng),
    title: row.title,
    event_type: row.event_type,
    event_date: row.event_date,
    end_date: row.end_date,
    mode: row.mode,
    summary: row.summary,
    description: row.description,
    team_size: row.team_size,
    registration_deadline: row.registration_deadline,
    venue_hall: row.venue_hall,
    what_to_bring: row.what_to_bring,
    distance_km: hasCoords
      ? haversineDistanceKm(
          options.approxLat!,
          options.approxLng!,
          Number(row.college_lat),
          Number(row.college_lng)
        )
      : null,
    created_at: row.created_at,
  }));

  if (hasCoords) {
    items.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
  }
  return items;
}

export function getNearbyEventById(id: string): NearbyEventItem | null {
  const row = db
    .prepare(
      `SELECT
        e.*,
        c.name AS college_name,
        c.city AS college_city,
        c.lat AS college_lat,
        c.lng AS college_lng
       FROM nearby_events e
       JOIN colleges c ON c.id = e.college_id
       WHERE e.id = ?`
    )
    .get(id) as
    | {
        id: string;
        college_id: string;
        college_name: string;
        college_city: string;
        college_lat: number;
        college_lng: number;
        title: string;
        event_type: string;
        event_date: string;
        end_date: string;
        mode: string;
        summary: string;
        description: string;
        team_size: string;
        registration_deadline: string;
        venue_hall: string;
        what_to_bring: string;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    college_id: row.college_id,
    college_name: row.college_name,
    college_city: row.college_city,
    college_lat: Number(row.college_lat),
    college_lng: Number(row.college_lng),
    title: row.title,
    event_type: row.event_type,
    event_date: row.event_date,
    end_date: row.end_date,
    mode: row.mode,
    summary: row.summary,
    description: row.description,
    team_size: row.team_size,
    registration_deadline: row.registration_deadline,
    venue_hall: row.venue_hall,
    what_to_bring: row.what_to_bring,
    distance_km: null,
    created_at: row.created_at,
  };
}

export function isVerifiedCollegeOrganizer(collegeId: string, userId: string | null): boolean {
  if (!userId) return false;
  const user = getUserProfileById(userId);
  if (user?.role === 'admin') return true;
  const row = db
    .prepare('SELECT 1 FROM college_organizers WHERE college_id = ? AND user_id = ?')
    .get(collegeId, userId);
  return Boolean(row);
}

export function hasCollegeOrganizer(collegeId: string): boolean {
  const row = db
    .prepare('SELECT COUNT(*) as total FROM college_organizers WHERE college_id = ?')
    .get(collegeId) as { total: number } | undefined;
  return Boolean(row && row.total > 0);
}

export function getCollegeOrganizerPasscodeHash(collegeId: string): string | null {
  const row = db
    .prepare('SELECT organizer_passcode_hash FROM colleges WHERE id = ?')
    .get(collegeId) as { organizer_passcode_hash: string | null } | undefined;
  return row?.organizer_passcode_hash ?? null;
}

export function setCollegeOrganizerPasscodeHash(collegeId: string, hash: string): void {
  db.prepare('UPDATE colleges SET organizer_passcode_hash = ? WHERE id = ?').run(hash, collegeId);
}

export function addVerifiedCollegeOrganizer(collegeId: string, userId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO college_organizers (college_id, user_id, created_at)
     VALUES (?, ?, ?)`
  ).run(collegeId, userId, new Date().toISOString());
}

export function getCollegeProfileById(
  collegeId: string,
  viewerId: string | null
): CollegeProfileData | null {
  const row = db
    .prepare(
      `SELECT
        c.*,
        COALESCE((SELECT AVG(r.rating) FROM college_reviews r WHERE r.college_id = c.id), 0) AS avg_rating,
        (SELECT COUNT(*) FROM college_reviews r WHERE r.college_id = c.id) AS review_count
       FROM colleges c
       WHERE c.id = ?`
    )
    .get(collegeId) as
    | {
        id: string;
        slug: string;
        name: string;
        city: string;
        address: string;
        lat: number;
        lng: number;
        photos: string;
        specialties: string;
        previous_events: string;
        tips_canteen: string;
        tips_restrooms: string;
        tips_transport: string;
        tips_wifi_charging: string;
        tips_what_to_carry: string;
        avg_rating: number;
        review_count: number;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    photos: parseJsonArray<string>(row.photos),
    specialties: parseJsonArray<string>(row.specialties),
    previous_events: parseJsonArray<PastCollegeEvent>(row.previous_events),
    tips_canteen: row.tips_canteen,
    tips_restrooms: row.tips_restrooms,
    tips_transport: row.tips_transport,
    tips_wifi_charging: row.tips_wifi_charging,
    tips_what_to_carry: row.tips_what_to_carry,
    avg_rating: Math.round(Number(row.avg_rating ?? 0) * 10) / 10,
    review_count: Number(row.review_count ?? 0),
    is_verified_organizer: isVerifiedCollegeOrganizer(row.id, viewerId),
    updated_at: row.updated_at,
  };
}

export function updateCollegeOfficialDetails(
  collegeId: string,
  updates: {
    name: string;
    address: string;
    specialties: string[];
    tips_canteen: string;
    tips_restrooms: string;
    tips_transport: string;
    tips_wifi_charging: string;
    tips_what_to_carry: string;
  }
): CollegeProfileData | null {
  db.prepare(
    `UPDATE colleges
     SET name = ?, address = ?, specialties = ?, tips_canteen = ?, tips_restrooms = ?,
         tips_transport = ?, tips_wifi_charging = ?, tips_what_to_carry = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.name,
    updates.address,
    JSON.stringify(updates.specialties),
    updates.tips_canteen,
    updates.tips_restrooms,
    updates.tips_transport,
    updates.tips_wifi_charging,
    updates.tips_what_to_carry,
    new Date().toISOString(),
    collegeId
  );

  // Invalidate cached Bridgey answers for this college since official facts changed
  db.prepare('DELETE FROM bridgey_qa_cache WHERE college_id = ?').run(collegeId);

  return getCollegeProfileById(collegeId, null);
}

export function listEventsForCollege(collegeId: string): NearbyEventItem[] {
  const rows = db
    .prepare(
      `SELECT
        e.*,
        c.name AS college_name,
        c.city AS college_city,
        c.lat AS college_lat,
        c.lng AS college_lng
       FROM nearby_events e
       JOIN colleges c ON c.id = e.college_id
       WHERE e.college_id = ?
       ORDER BY e.event_date ASC`
    )
    .all(collegeId) as Array<{
    id: string;
    college_id: string;
    college_name: string;
    college_city: string;
    college_lat: number;
    college_lng: number;
    title: string;
    event_type: string;
    event_date: string;
    end_date: string;
    mode: string;
    summary: string;
    description: string;
    team_size: string;
    registration_deadline: string;
    venue_hall: string;
    what_to_bring: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    ...row,
    college_lat: Number(row.college_lat),
    college_lng: Number(row.college_lng),
    distance_km: null,
  }));
}

export function listReviewsForCollege(collegeId: string): CollegeReviewItem[] {
  const rows = db
    .prepare(
      `SELECT
        r.*,
        u.name AS author_name,
        u.college AS author_college,
        e.title AS event_title
       FROM college_reviews r
       JOIN users u ON u.id = r.author_id
       LEFT JOIN nearby_events e ON e.id = r.event_id
       WHERE r.college_id = ?
       ORDER BY r.created_at DESC`
    )
    .all(collegeId) as unknown as CollegeReviewItem[];
  return rows.map((r) => ({ ...r, rating: Number(r.rating) }));
}

export function createCollegeReview(input: {
  collegeId: string;
  eventId: string | null;
  authorId: string;
  rating: number;
  reviewText: string;
  canteenTip: string;
  restroomTip: string;
  transportTip: string;
  wifiTip: string;
  carryTip: string;
}): CollegeReviewItem {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO college_reviews (
      id, college_id, event_id, author_id, rating, review_text,
      canteen_tip, restroom_tip, transport_tip, wifi_tip, carry_tip, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.collegeId,
    input.eventId,
    input.authorId,
    input.rating,
    input.reviewText,
    input.canteenTip,
    input.restroomTip,
    input.transportTip,
    input.wifiTip,
    input.carryTip,
    createdAt
  );

  // Invalidate cached Bridgey answers for this college so new attendee tips are included
  db.prepare('DELETE FROM bridgey_qa_cache WHERE college_id = ?').run(input.collegeId);

  const row = db
    .prepare(
      `SELECT
        r.*,
        u.name AS author_name,
        u.college AS author_college,
        e.title AS event_title
       FROM college_reviews r
       JOIN users u ON u.id = r.author_id
       LEFT JOIN nearby_events e ON e.id = r.event_id
       WHERE r.id = ?`
    )
    .get(id) as unknown as CollegeReviewItem;

  return { ...row, rating: Number(row.rating) };
}

export function getCachedBridgeyAnswer(cacheKey: string): {
  answer: string;
  checklist: string[];
} | null {
  const row = db
    .prepare('SELECT answer_text, checklist_json FROM bridgey_qa_cache WHERE cache_key = ?')
    .get(cacheKey) as { answer_text: string; checklist_json: string } | undefined;
  if (!row) return null;
  return {
    answer: row.answer_text,
    checklist: parseJsonArray<string>(row.checklist_json),
  };
}

export function saveCachedBridgeyAnswer(params: {
  cacheKey: string;
  collegeId: string;
  eventId: string | null;
  questionNorm: string;
  answer: string;
  checklist: string[];
}): void {
  db.prepare(
    `INSERT INTO bridgey_qa_cache (cache_key, college_id, event_id, question_norm, answer_text, checklist_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       answer_text = excluded.answer_text,
       checklist_json = excluded.checklist_json,
       created_at = excluded.created_at`
  ).run(
    params.cacheKey,
    params.collegeId,
    params.eventId,
    params.questionNorm,
    params.answer,
    JSON.stringify(params.checklist),
    new Date().toISOString()
  );
}
