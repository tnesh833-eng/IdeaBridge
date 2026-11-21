# IdeaBridge Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false`).
2. **PII Isolation**: User email addresses and private metadata live exclusively in `/users/{userId}/private/{docId}` and are readable/writable only by `request.auth.uid == userId` with verified email.
3. **Immutable Ownership & Timestamps**: `uid`, `authorUid`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **Points Integrity**: Users cannot inflate their own `pointsBalance` on create (`pointsBalance == 0`) or update it arbitrarily from client writes (`affectedKeys()` excludes `pointsBalance`).
5. **Terminal State Lock**: Ideas transitioned to `status == 'archived'` cannot be reopened or mutated.
6. **Verified Identity**: All authenticated writes require `request.auth != null && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Create**: User A posts to `/ideas/idea_1` with `authorUid: "user_b"`. -> Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection**: User A creates `/users/user_a` including an extra undeclared field `isAdmin: true`. -> Expected: `PERMISSION_DENIED`.
3. **Self-Assigned Points Inflation**: User A creates `/users/user_a` with `pointsBalance: 99999`. -> Expected: `PERMISSION_DENIED`.
4. **Update-Gap Points Escalation**: User A updates `/users/user_a` adding `pointsBalance` into an allowed profile edit. -> Expected: `PERMISSION_DENIED`.
5. **Unverified Email Bypass**: User with `email_verified: false` attempts to create `/ideas/idea_2`. -> Expected: `PERMISSION_DENIED`.
6. **PII Blanket Read**: User B attempts `get` on `/users/user_a/private/info`. -> Expected: `PERMISSION_DENIED`.
7. **Unauthorized List Scraping**: User B attempts blanket `list` on `/points` without filtering `userUid == request.auth.uid`. -> Expected: `PERMISSION_DENIED`.
8. **ID Poisoning**: Attacker targets `/ideas/` with a 1,500-character or slash-containing document ID. -> Expected: `PERMISSION_DENIED`.
9. **Resource Exhaustion String**: User A submits a 50,000-character `summary` on `/ideas/idea_3`. -> Expected: `PERMISSION_DENIED`.
10. **Unbounded Array Poisoning**: User A submits 500 entries in `skills` or non-string first element `[123]`. -> Expected: `PERMISSION_DENIED`.
11. **Backdated Timestamp Spoofing**: User A submits `createdAt` set to a client-chosen year instead of `request.time`. -> Expected: `PERMISSION_DENIED`.
12. **Terminal State Mutation**: User A updates an idea whose `existing().status == 'archived'` back to `'open'`. -> Expected: `PERMISSION_DENIED`.
