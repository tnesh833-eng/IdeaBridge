/**
 * IdeaBridge Firestore Rules Specification Tests ("Dirty Dozen" Verification Matrix)
 * Maps each adversarial payload from security_spec.md to the enforcing gate in firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  targetPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Idea Create',
    targetPath: '/ideas/idea_1',
    operation: 'create',
    payload: { id: 'idea_1', authorUid: 'other_user', title: 'Spoofed Idea' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidIdea(): data.authorUid == request.auth.uid',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Create',
    targetPath: '/users/user_a',
    operation: 'create',
    payload: { uid: 'user_a', name: 'Alice', college: 'NITK', pointsBalance: 0, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidUserProfile(): data.keys().hasOnly([...])',
  },
  {
    id: 3,
    name: 'Points Inflation on Create',
    targetPath: '/users/user_a',
    operation: 'create',
    payload: { uid: 'user_a', name: 'Alice', college: 'NITK', pointsBalance: 9999 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow create on /users/{userId}: incoming().pointsBalance == 0',
  },
  {
    id: 4,
    name: 'Update-Gap Points Escalation',
    targetPath: '/users/user_a',
    operation: 'update',
    payload: { pointsBalance: 5000 },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "affectedKeys().hasOnly(['name', 'college', 'bio', 'skills', 'updatedAt'])",
  },
  {
    id: 5,
    name: 'Unverified Email Bypass',
    targetPath: '/ideas/idea_2',
    operation: 'create',
    payload: { id: 'idea_2', authorUid: 'unverified_uid' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isVerifiedUser(): request.auth.token.email_verified == true',
  },
  {
    id: 6,
    name: 'PII Blanket Read on Private Subcollection',
    targetPath: '/users/user_a/private/info',
    operation: 'get',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isOwner(userId) on /users/{userId}/private/{docId}',
  },
  {
    id: 7,
    name: 'Unauthorized List Scraping on Points Ledger',
    targetPath: '/points',
    operation: 'list',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'allow list: if isSignedIn() && resource.data.userUid == request.auth.uid',
  },
  {
    id: 8,
    name: 'Path Variable ID Poisoning',
    targetPath: '/ideas/' + 'a'.repeat(300),
    operation: 'create',
    payload: { id: 'a'.repeat(300) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "isValidId(id): id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 9,
    name: 'Resource Exhaustion Oversized Summary',
    targetPath: '/ideas/idea_3',
    operation: 'create',
    payload: { summary: 'x'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidIdea(): data.summary.size() >= 15 && data.summary.size() <= 240',
  },
  {
    id: 10,
    name: 'Unbounded or Non-String Skills Array',
    targetPath: '/users/user_a',
    operation: 'create',
    payload: { skills: [123, 456] },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'isValidSkillsList(data.skills): size <= 15 && data.skills[0] is string',
  },
  {
    id: 11,
    name: 'Backdated Client Timestamp Spoofing',
    targetPath: '/ideas/idea_4',
    operation: 'create',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 12,
    name: 'Terminal Archived State Reopening',
    targetPath: '/ideas/archived_idea',
    operation: 'update',
    payload: { status: 'open' },
    expectedResult: 'PERMISSION_DENIED',
    enforcedBy: "existing().status != 'archived'",
  },
];
