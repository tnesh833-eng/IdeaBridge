import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, User } from 'lucide-react';
import { loginWithEmail, registerWithEmail } from '../api';
import type { UserProfile } from '../types';

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

  function toggleSuggestedSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
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
        </div>
      </div>
    </div>
  );
}
