import fs from 'node:fs';
import path from 'node:path';
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

interface FirebaseAppletConfig {
  projectId?: string;
}

function loadProvisionedProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }

  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as FirebaseAppletConfig;
    if (
      parsed.projectId &&
      parsed.projectId !== 'remixed-project-id' &&
      parsed.projectId.trim().length > 0
    ) {
      return parsed.projectId.trim();
    }
  } catch {
    return null;
  }
  return null;
}

function getFirebaseAdminApp(): App | null {
  const projectId = loadProvisionedProjectId();
  if (!projectId) return null;

  if (getApps().length > 0) {
    return getApp();
  }
  // verifyIdToken() requires only projectId and needs no IAM permissions
  return initializeApp({ projectId });
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken | null> {
  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    return await getAuth(app).verifyIdToken(idToken);
  } catch {
    return null;
  }
}

export function isFirebaseServerAuthConfigured(): boolean {
  return loadProvisionedProjectId() !== null;
}
