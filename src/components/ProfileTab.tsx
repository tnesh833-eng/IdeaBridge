import { useState, type FormEvent } from 'react';
import {
  Award,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ExternalLink,
  FolderGit2,
  Github,
  GraduationCap,
  Linkedin,
  LogOut,
  Mail,
  Trophy,
} from 'lucide-react';
import { updateProfile } from '../api';
import type { UserProfile } from '../types';
import { AuthScreen } from './AuthScreen';
import { ResumeManagerCard } from './ResumeManagerCard';

interface ProfileTabProps {
  user: UserProfile | null;
  onAuthenticated: (user: UserProfile) => void;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onOpenProjects?: () => void;
}

export function ProfileTab({
  user,
  onAuthenticated,
  onUserUpdated,
  onLogout,
  onOpenProjects,
}: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [college, setCollege] = useState(user?.college ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [skillsText, setSkillsText] = useState(user?.skills.join(', ') ?? '');
  const [githubUrl, setGithubUrl] = useState(user?.github_url ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url ?? '');
  const [about, setAbout] = useState(user?.about ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={onAuthenticated}
        contextMessage="Sign in or create your student account to upload your resume, complete your optional portfolio, and manage posted ideas and projects."
      />
    );
  }

  function startEditing() {
    setName(user!.name);
    setCollege(user!.college);
    setBio(user!.bio);
    setSkillsText(user!.skills.join(', '));
    setGithubUrl(user!.github_url);
    setLinkedinUrl(user!.linkedin_url);
    setAbout(user!.about);
    setError(null);
    setSavedNotice(false);
    setEditing(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const skills = skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await updateProfile({
        name,
        college,
        skills,
        bio,
        about,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
      });
      onUserUpdated(res.user);
      setEditing(false);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Centered Profile Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xs sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#0052CC] to-[#2563EB] font-display text-2xl font-bold text-white shadow-sm">
          {initials || 'IB'}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {user.name}
          </h1>
          {user.portfolio_complete && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Award className="h-3.5 w-3.5" />
              <span>Portfolio Complete</span>
            </span>
          )}
        </div>

        {user.bio && (
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-700">
            {user.bio}
          </p>
        )}

        <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4 text-[#0052CC]" />
            <span>{user.college}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail className="h-4 w-4 text-slate-400" />
            <span>{user.email}</span>
          </span>
        </p>

        {/* Points Balance Banner */}
        <button
          type="button"
          onClick={onOpenProjects}
          className="mt-6 flex w-full items-center justify-between rounded-2xl border border-blue-200 bg-gradient-to-r from-[#EAF2FF] via-[#F4F8FF] to-white px-5 py-4 text-left transition-colors hover:border-blue-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Points Balance</p>
              <p className="font-mono text-2xl font-bold text-[#0052CC] tabular-nums">
                {user.points_balance} <span className="text-sm font-semibold">Points</span>
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#0052CC]" />
        </button>

        {/* Stats Strip */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 text-center">
          <div className="px-2">
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {user.ideas_posted}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">Ideas Posted</div>
          </div>
          <div className="px-2">
            <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {user.projects_built}
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">Projects Built</div>
          </div>
          <div className="px-2">
            <div className="font-mono text-xl font-bold text-[#0052CC] tabular-nums">
              {user.portfolio_completion}%
            </div>
            <div className="mt-0.5 text-xs font-medium text-slate-500">Portfolio</div>
          </div>
        </div>

        {savedNotice && (
          <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs font-medium text-blue-800">
            Profile & portfolio updated.
          </p>
        )}
      </section>

      {/* Private PDF Resume Management */}
      <ResumeManagerCard user={user} onUserUpdated={onUserUpdated} />

      {/* Optional Portfolio Completion & Company Ranking Card */}
      {!editing && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Optional Portfolio
                </h2>
                {user.portfolio_complete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Portfolio Complete</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs font-bold text-[#0052CC] tabular-nums">
                    {user.portfolio_completion}% complete
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {user.portfolio_complete
                  ? 'Your profile carries the Portfolio Complete badge and ranks higher for companies.'
                  : 'Complete your optional portfolio (bio, skills, GitHub, LinkedIn, and about) to earn the Portfolio Complete badge and rank higher for companies.'}
              </p>
            </div>

            <button
              type="button"
              onClick={startEditing}
              className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-1.5 text-xs font-semibold text-[#0052CC] transition-colors hover:bg-blue-100 whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{user.portfolio_complete ? 'Edit Portfolio' : 'Complete Portfolio'}</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  user.portfolio_complete ? 'bg-emerald-500' : 'bg-[#0052CC]'
                }`}
                style={{ width: `${user.portfolio_completion}%` }}
              />
            </div>
            {user.portfolio_missing_fields.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Missing to reach 100%:{' '}
                <span className="font-medium text-slate-700">
                  {user.portfolio_missing_fields.join(', ')}
                </span>
              </p>
            )}
          </div>

          {/* Portfolio Details */}
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500">Skills</span>
              {user.skills.length > 0 ? (
                <p className="mt-1 font-mono text-xs leading-relaxed text-[#0052CC]">
                  {user.skills.join(' · ')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Not added yet</p>
              )}
            </div>

            {user.about && (
              <div>
                <span className="text-xs font-semibold text-slate-500">About</span>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-700 sm:text-sm">
                  {user.about}
                </p>
              </div>
            )}

            {(user.github_url || user.linkedin_url) && (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {user.github_url && (
                  <a
                    href={user.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:text-[#0052CC]"
                  >
                    <Github className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                )}
                {user.linkedin_url && (
                  <a
                    href={user.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-300 hover:text-[#0052CC]"
                  >
                    <Linkedin className="h-3.5 w-3.5 text-[#0052CC]" />
                    <span>LinkedIn</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Edit Form OR Menu Action List */}
      {editing ? (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <h2 className="font-display text-base font-bold text-slate-900">
            Edit Profile & Optional Portfolio
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <input
                id="edit-name"
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="edit-college"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                College / University
              </label>
              <input
                id="edit-college"
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-bio" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Short Bio <span className="font-normal text-slate-400">(optional · +20%)</span>
            </label>
            <input
              id="edit-bio"
              type="text"
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Final-year CSE student building offline-first health and civic apps"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-skills"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Skills (comma-separated){' '}
              <span className="font-normal text-slate-400">(optional · +20%)</span>
            </label>
            <input
              id="edit-skills"
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="React Native, TypeScript, Supabase"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="edit-github"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                GitHub Link <span className="font-normal text-slate-400">(optional · +20%)</span>
              </label>
              <input
                id="edit-github"
                type="url"
                maxLength={300}
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="edit-linkedin"
                className="mb-1.5 block text-xs font-semibold text-slate-700"
              >
                LinkedIn Link <span className="font-normal text-slate-400">(optional · +20%)</span>
              </label>
              <input
                id="edit-linkedin"
                type="url"
                maxLength={300}
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-about"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              About Section <span className="font-normal text-slate-400">(optional · +20%)</span>
            </label>
            <textarea
              id="edit-about"
              rows={4}
              maxLength={2000}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Share what projects you love building, hackathon experience, and roles you are looking for..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-[#0052CC] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0043A8] disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Portfolio'}
            </button>
          </div>
        </form>
      ) : (
        <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {onOpenProjects && (
            <button
              type="button"
              onClick={onOpenProjects}
              className="flex min-h-[56px] w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <FolderGit2 className="h-5 w-5 text-[#0052CC]" />
                <span className="text-sm font-semibold text-slate-800">My Projects & Posts</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
          {onOpenProjects && (
            <button
              type="button"
              onClick={onOpenProjects}
              className="flex min-h-[56px] w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="h-5 w-5 text-[#0052CC]" />
                <span className="text-sm font-semibold text-slate-800">Saved SIH Ideas</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          )}
          <button
            type="button"
            onClick={startEditing}
            className="flex min-h-[56px] w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <Edit3 className="h-5 w-5 text-[#0052CC]" />
              <span className="text-sm font-semibold text-slate-800">
                Edit Profile & Portfolio
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[56px] w-full items-center justify-between px-5 py-3 text-left text-red-600 transition-colors hover:bg-red-50/70"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-semibold">Sign Out</span>
            </div>
            <ChevronRight className="h-4 w-4 text-red-300" />
          </button>
        </section>
      )}
    </div>
  );
}
