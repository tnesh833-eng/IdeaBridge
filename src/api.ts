import type {
  AdminStatusInfo,
  ApproxLocation,
  AuthProvidersInfo,
  BridgeyAnswerResponse,
  CollegeProfileData,
  CollegeReviewItem,
  IdeaDifficulty,
  IdeaDomain,
  IdeaFeedItem,
  IdeaFullDetail,
  NearbyEventItem,
  SavedSihIdeaWithProblem,
  SihProblemDetail,
  SihProblemListItem,
  SihUniqueIdea,
  StudentProjectItem,
  UserProfile,
} from './types';

// Hold Bearer token strictly in memory (never in localStorage or sessionStorage)
let memoryAuthToken: string | null = null;

export function setAuthToken(token: string | null): void {
  memoryAuthToken = token;
}

export function getAuthToken(): string | null {
  return memoryAuthToken;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.error === 'string'
        ? data.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchAuthProviders(): Promise<AuthProvidersInfo> {
  return apiRequest<AuthProvidersInfo>('/api/auth/providers');
}

export async function registerWithEmail(payload: {
  email: string;
  password: string;
  name: string;
  college: string;
  skills: string[];
}): Promise<{ token: string; user: UserProfile }> {
  const result = await apiRequest<{ token: string; user: UserProfile }>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  setAuthToken(result.token);
  return result;
}

export async function loginWithEmail(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile }> {
  const result = await apiRequest<{ token: string; user: UserProfile }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  setAuthToken(result.token);
  return result;
}

export async function fetchCurrentUser(): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/auth/me');
}

export async function updateProfile(payload: {
  name: string;
  college: string;
  skills: string[];
  bio?: string;
  about?: string;
  github_url?: string;
  linkedin_url?: string;
}): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function uploadResumePdf(payload: {
  filename: string;
  contentBase64: string;
}): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/profile/resume', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchOwnResumeBlob(): Promise<Blob> {
  const headers = new Headers();
  if (memoryAuthToken) {
    headers.set('Authorization', `Bearer ${memoryAuthToken}`);
  }
  const res = await fetch('/api/profile/resume', { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      typeof errData?.error === 'string' ? errData.error : 'Unable to fetch resume PDF.'
    );
  }
  return res.blob();
}

export async function deleteOwnResume(): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/profile/resume', {
    method: 'DELETE',
  });
}

export async function fetchAdminStatus(): Promise<AdminStatusInfo> {
  return apiRequest<AdminStatusInfo>('/api/admin/status');
}

export async function claimAdminRole(passcode: string): Promise<{ user: UserProfile }> {
  return apiRequest<{ user: UserProfile }>('/api/admin/claim', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function fetchFeedIdeas(params: {
  q?: string;
  domain?: string;
}): Promise<{ ideas: IdeaFeedItem[] }> {
  const searchParams = new URLSearchParams();
  if (params.q && params.q.trim()) {
    searchParams.set('q', params.q.trim());
  }
  if (params.domain && params.domain !== 'All') {
    searchParams.set('domain', params.domain);
  }
  const qs = searchParams.toString();
  return apiRequest<{ ideas: IdeaFeedItem[] }>(`/api/ideas${qs ? `?${qs}` : ''}`);
}

export async function fetchIdeaById(
  id: string
): Promise<{ idea: IdeaFeedItem | IdeaFullDetail }> {
  return apiRequest<{ idea: IdeaFeedItem | IdeaFullDetail }>(
    `/api/ideas/${encodeURIComponent(id)}`
  );
}

export async function fetchMyIdeas(): Promise<{ ideas: IdeaFullDetail[] }> {
  return apiRequest<{ ideas: IdeaFullDetail[] }>('/api/my/ideas');
}

export async function createNewIdea(payload: {
  title: string;
  summary: string;
  problem: string;
  purpose: string;
  target_users: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  tech_stack: string[];
}): Promise<{ idea: IdeaFullDetail; user: UserProfile }> {
  return apiRequest<{ idea: IdeaFullDetail; user: UserProfile }>('/api/ideas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteOwnIdea(
  id: string
): Promise<{ ok: boolean; user: UserProfile }> {
  return apiRequest<{ ok: boolean; user: UserProfile }>(
    `/api/ideas/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

// --- Student Projects ---

export async function fetchPublishedProjects(params: {
  q?: string;
  domain?: string;
}): Promise<{ projects: StudentProjectItem[] }> {
  const searchParams = new URLSearchParams();
  if (params.q && params.q.trim()) {
    searchParams.set('q', params.q.trim());
  }
  if (params.domain && params.domain !== 'All') {
    searchParams.set('domain', params.domain);
  }
  const qs = searchParams.toString();
  return apiRequest<{ projects: StudentProjectItem[] }>(`/api/projects${qs ? `?${qs}` : ''}`);
}

export async function fetchMyProjects(): Promise<{ projects: StudentProjectItem[] }> {
  return apiRequest<{ projects: StudentProjectItem[] }>('/api/my/projects');
}

export async function createNewProject(payload: {
  title: string;
  description: string;
  domain: IdeaDomain;
  difficulty: IdeaDifficulty;
  tech_stack: string[];
  github_url: string;
  demo_url?: string;
  idea_id?: string | null;
}): Promise<{ project: StudentProjectItem; user: UserProfile }> {
  return apiRequest<{ project: StudentProjectItem; user: UserProfile }>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteOwnProject(
  id: string
): Promise<{ ok: boolean; user: UserProfile }> {
  return apiRequest<{ ok: boolean; user: UserProfile }>(
    `/api/projects/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

// --- SIH Problems & Cached AI Ideas ---

export async function fetchSihProblems(params: {
  q?: string;
  category?: string;
}): Promise<{ problems: SihProblemListItem[]; categories: string[] }> {
  const searchParams = new URLSearchParams();
  if (params.q && params.q.trim()) {
    searchParams.set('q', params.q.trim());
  }
  if (params.category && params.category !== 'All') {
    searchParams.set('category', params.category);
  }
  const qs = searchParams.toString();
  return apiRequest<{ problems: SihProblemListItem[]; categories: string[] }>(
    `/api/sih/problems${qs ? `?${qs}` : ''}`
  );
}

export async function fetchSihProblemDetail(id: string): Promise<{
  problem: SihProblemDetail;
  ideas: SihUniqueIdea[];
  aiError: string | null;
  dailyLimit: number;
  remainingToday: number;
}> {
  return apiRequest(`/api/sih/problems/${encodeURIComponent(id)}`);
}

export async function generateMoreSihIdeas(id: string): Promise<{
  ideas: SihUniqueIdea[];
  remainingToday: number;
  dailyLimit: number;
}> {
  return apiRequest(`/api/sih/problems/${encodeURIComponent(id)}/more-ideas`, {
    method: 'POST',
  });
}

export async function saveSihIdea(ideaId: string): Promise<{ saved: boolean }> {
  return apiRequest(`/api/sih/ideas/${encodeURIComponent(ideaId)}/save`, {
    method: 'POST',
  });
}

export async function unsaveSihIdea(ideaId: string): Promise<{ saved: boolean }> {
  return apiRequest(`/api/sih/ideas/${encodeURIComponent(ideaId)}/save`, {
    method: 'DELETE',
  });
}

export async function fetchSavedSihIdeas(): Promise<{
  savedIdeas: SavedSihIdeaWithProblem[];
}> {
  return apiRequest('/api/my/saved-sih-ideas');
}

export async function importSihSpreadsheet(payload: {
  filename: string;
  contentBase64: string;
}): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  totalProcessed: number;
}> {
  return apiRequest('/api/sih/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Nearby Events, Approximate Location, College Profiles & Bridgey AI ---

export async function fetchApproxLocation(): Promise<{
  location: ApproxLocation | null;
}> {
  return apiRequest('/api/location/approximate');
}

export async function saveApproxLocation(payload: {
  lat: number;
  lng: number;
  city_label?: string;
}): Promise<{ location: ApproxLocation }> {
  return apiRequest('/api/location/approximate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchNearbyEvents(params: {
  q?: string;
  eventType?: string;
  city?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ events: NearbyEventItem[] }> {
  const searchParams = new URLSearchParams();
  if (params.q && params.q.trim()) {
    searchParams.set('q', params.q.trim());
  }
  if (params.eventType && params.eventType !== 'All') {
    searchParams.set('eventType', params.eventType);
  }
  if (params.city && params.city !== 'All') {
    searchParams.set('city', params.city);
  }
  if (typeof params.lat === 'number' && typeof params.lng === 'number') {
    searchParams.set('lat', String(params.lat));
    searchParams.set('lng', String(params.lng));
  }
  const qs = searchParams.toString();
  return apiRequest(`/api/events${qs ? `?${qs}` : ''}`);
}

export async function fetchEventDetail(id: string): Promise<{
  event: NearbyEventItem;
  college: CollegeProfileData | null;
}> {
  return apiRequest(`/api/events/${encodeURIComponent(id)}`);
}

export async function fetchCollegeProfile(id: string): Promise<{
  college: CollegeProfileData;
  events: NearbyEventItem[];
  reviews: CollegeReviewItem[];
  organizerStatus: {
    hasOrganizer: boolean;
    isVerified: boolean;
  };
}> {
  return apiRequest(`/api/colleges/${encodeURIComponent(id)}`);
}

export async function verifyCollegeOrganizer(
  collegeId: string,
  passcode: string
): Promise<{ college: CollegeProfileData }> {
  return apiRequest(`/api/colleges/${encodeURIComponent(collegeId)}/verify-organizer`, {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export async function updateCollegeProfile(
  collegeId: string,
  payload: {
    name: string;
    address: string;
    specialties: string[];
    tips_canteen: string;
    tips_restrooms: string;
    tips_transport: string;
    tips_wifi_charging: string;
    tips_what_to_carry: string;
  }
): Promise<{ college: CollegeProfileData }> {
  return apiRequest(`/api/colleges/${encodeURIComponent(collegeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function submitCollegeReview(
  collegeId: string,
  payload: {
    event_id?: string | null;
    rating: number;
    review_text: string;
    canteen_tip?: string;
    restroom_tip?: string;
    transport_tip?: string;
    wifi_tip?: string;
    carry_tip?: string;
  }
): Promise<{ review: CollegeReviewItem; college: CollegeProfileData }> {
  return apiRequest(`/api/colleges/${encodeURIComponent(collegeId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchBridgeyChecklist(params: {
  collegeId: string;
  eventId?: string | null;
}): Promise<{ checklist: string[] }> {
  const searchParams = new URLSearchParams();
  searchParams.set('collegeId', params.collegeId);
  if (params.eventId) {
    searchParams.set('eventId', params.eventId);
  }
  return apiRequest(`/api/bridgey/checklist?${searchParams.toString()}`);
}

export async function askBridgey(payload: {
  collegeId: string;
  eventId?: string | null;
  question: string;
}): Promise<BridgeyAnswerResponse> {
  return apiRequest('/api/bridgey/ask', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

