import { useEffect, useState, type FormEvent } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react';
import {
  fetchAuthProviders,
  loginWithEmail,
  registerWithEmail,
  syncFirebaseSession,
} from '../api';
import { auth, googleProvider } from '../firebase';
import type { AuthProvidersInfo, UserProfile } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
  contextMessage?: string;
}

const SUGGESTED_SKILLS = [
  'React Native',
  'TypeScript',
  'Node.js',
  'Python',
  'Supabase',
  'PostgreSQL',
  'Flutter',
  'UI/UX',
];

const BRIDGEY_MASCOT_URL = '/src/assets/images/bridgey_owl_mascot_1795263067390.jpg';

export function AuthScreen({ onAuthenticated, contextMessage }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [providers, setProviders] = useState<AuthProvidersInfo | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React Native']);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuthProviders()
      .then((info) => {
        if (active) setProviders(info);
      })
      .catch(() => {
        // Email auth remains available
      });
    return () => {
      active = false;
    };
  }, []);

  function toggleSuggestedSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]
    );
  }

  async function handleGoogleClick() {
    setError(null);
    setGoogleNotice(null);
    setSubmitting(true);

    try {
      if (providers?.firebaseGoogleEnabled !== false) {
        const credential = await signInWithPopup(auth, googleProvider);
        const idToken = await credential.user.getIdToken();
        const result = await syncFirebaseSession(idToken);
        onAuthenticated(result.user);
        return;
      }

      if (providers?.googleEnabled && providers.supabaseUrl) {
        const redirectTo = encodeURIComponent(window.location.origin);
        const oauthUrl = `${providers.supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
        window.location.assign(oauthUrl);
        return;
      }

      setGoogleNotice(
        'Google sign-in is not active in this environment. Use email sign-up below to start immediately.'
      );
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setGoogleNotice('Google sign-in popup was closed before completing.');
      } else if (code === 'auth/unauthorized-domain') {
        setError(
          'Add this domain under Firebase Console -> Authentication -> Settings -> Authorized domains.'
        );
      } else {
        setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setGoogleNotice(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await loginWithEmail({ email, password });
        onAuthenticated(result.user);
      } else {
        const customSkills = skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const mergedSkills = Array.from(new Set([...selectedSkills, ...customSkills])).slice(
          0,
          12
        );

        const result = await registerWithEmail({
          email,
          password,
          name,
          college,
          skills: mergedSkills,
        });
        onAuthenticated(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-4 sm:py-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Welcome Banner with Bridgey Owl */}
        <div className="flex items-center justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-[#EAF2FF] to-[#F5F9FF] px-6 py-5">
          <div>
            <p className="font-display text-xs font-bold tracking-wide text-[#0052CC] uppercase">
              IdeaBridge Student Account
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Welcome Back!' : 'Join IdeaBridge'}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {contextMessage ??
                (mode === 'login'
                  ? 'Login to continue building and reviewing.'
                  : 'Create your student profile to start sharing.')}
            </p>
          </div>
          {!imgFailed && (
            <img
              src={BRIDGEY_MASCOT_URL}
              alt="Bridgey mascot"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white object-cover shadow-xs"
            />
          )}
        </div>

        <div className="p-6 sm:p-7">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`min-h-[42px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`min-h-[42px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-[#0052CC] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Aarav Sharma"
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-college"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    College / University
                  </label>
                  <div className="relative">
                    <GraduationCap className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="auth-college"
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g., RV College of Engineering"
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 flex min-h-[36px] min-w-[36px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <span className="mb-2 block text-xs font-semibold text-slate-700">
                  Your Skills
                </span>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SKILLS.map((skill) => {
                    const active = selectedSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSuggestedSkill(skill)}
                        className={`min-h-[36px] rounded-xl border px-3 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#0052CC] bg-[#0052CC] text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="Add more skills separated by commas"
                  className="mt-2.5 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0043A8] disabled:opacity-60"
            >
              <span>
                {submitting
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Login'
                    : 'Create Student Account'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleClick}
            className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google (Firebase Auth)</span>
          </button>

          {googleNotice && (
            <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs leading-relaxed text-blue-900">
              {googleNotice}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
