export const IDEA_DOMAINS = [
  'Environment',
  'Health',
  'Education',
  'FinTech',
  'Campus Tech',
  'Civic',
] as const;

export const IDEA_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export type IdeaDomain = (typeof IDEA_DOMAINS)[number];
export type IdeaDifficulty = (typeof IDEA_DIFFICULTIES)[number];
export type AppTab = 'home' | 'nearby' | 'sih' | 'post' | 'projects' | 'profile';
export type UserRole = 'student' | 'admin';

export interface UserProfile {
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

export interface AuthProvidersInfo {
  emailEnabled: boolean;
  googleEnabled: boolean;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
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

export interface PostIdeaPrefill {
  title: string;
  summary: string;
  problem: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  tech_stack: string[];
  sourceLabel?: string;
}

export interface AdminStatusInfo {
  isAdmin: boolean;
  envPasscodeConfigured: boolean;
  adminClaimed: boolean;
}

export interface ApproxLocation {
  approx_lat: number;
  approx_lng: number;
  city_label: string;
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

export interface CollegeReviewItem {
  id: string;
  college_id: string;
  event_id: string | null;
  event_title?: string | null;
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

export interface BridgeyMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cached?: boolean;
}

export interface BridgeyAnswerResponse {
  answer: string;
  checklist: string[];
  cached: boolean;
}

