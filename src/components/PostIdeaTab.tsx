import { useEffect, useState, type FormEvent } from 'react';
import { Check, FolderGit2, Lightbulb, Lock, Plus, Send, X } from 'lucide-react';
import { createNewIdea, createNewProject } from '../api';
import {
  IDEA_DIFFICULTIES,
  IDEA_DOMAINS,
  type IdeaDifficulty,
  type IdeaDomain,
  type PostIdeaPrefill,
  type UserProfile,
} from '../types';
import { AuthScreen } from './AuthScreen';
import { ResumeManagerCard } from './ResumeManagerCard';

interface PostIdeaTabProps {
  user: UserProfile | null;
  initialMode?: 'idea' | 'project';
  prefill?: PostIdeaPrefill | null;
  onClearPrefill?: () => void;
  onAuthenticated: (user: UserProfile) => void;
  onUserUpdated: (user: UserProfile) => void;
  onIdeaCreated: (updatedUser: UserProfile) => void;
  onProjectCreated: (updatedUser: UserProfile) => void;
}

const COMMON_STACKS = [
  'React Native',
  'Expo',
  'Supabase',
  'Node.js',
  'PostgreSQL',
  'Python',
  'FastAPI',
  'TypeScript',
  'Tailwind CSS',
  'SQLite',
];

const BRIDGEY_MASCOT_URL = '/src/assets/images/bridgey_owl_mascot_1795263067390.jpg';

export function PostIdeaTab({
  user,
  initialMode = 'idea',
  prefill,
  onClearPrefill,
  onAuthenticated,
  onUserUpdated,
  onIdeaCreated,
  onProjectCreated,
}: PostIdeaTabProps) {
  const [mode, setMode] = useState<'idea' | 'project'>(initialMode);

  // Idea fields
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [summary, setSummary] = useState(prefill?.summary ?? '');
  const [problem, setProblem] = useState(prefill?.problem ?? '');
  const [purpose, setPurpose] = useState('');
  const [targetUsers, setTargetUsers] = useState('');
  const [domain, setDomain] = useState<IdeaDomain>(prefill?.domain ?? 'Education');
  const [difficulty, setDifficulty] = useState<IdeaDifficulty>(
    prefill?.difficulty ?? 'Intermediate'
  );
  const [techStack, setTechStack] = useState<string[]>(
    prefill?.tech_stack?.length ? prefill.tech_stack : ['React Native', 'Supabase']
  );
  const [customTech, setCustomTech] = useState('');

  // Project fields
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDomain, setProjectDomain] = useState<IdeaDomain>('Education');
  const [projectDifficulty, setProjectDifficulty] = useState<IdeaDifficulty>('Intermediate');
  const [projectStack, setProjectStack] = useState<string[]>(['TypeScript', 'React Native']);
  const [projectCustomTech, setProjectCustomTech] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [showInlineResumeUploader, setShowInlineResumeUploader] = useState(false);

  const [imgFailed, setImgFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!prefill) return;
    setMode('idea');
    setTitle(prefill.title);
    setSummary(prefill.summary);
    setProblem(prefill.problem);
    setDomain(prefill.domain);
    setDifficulty(prefill.difficulty);
    setTechStack(prefill.tech_stack.length ? prefill.tech_stack : ['React Native', 'Supabase']);
  }, [prefill]);

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={onAuthenticated}
        contextMessage="Sign in or create a student profile to publish your project idea or completed project on IdeaBridge."
      />
    );
  }

  function toggleStackItem(
    item: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setter((prev) =>
      prev.includes(item)
        ? prev.filter((x) => x !== item)
        : prev.length < 10
          ? [...prev, item]
          : prev
    );
  }

  function addCustomStack(
    raw: string,
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: () => void
  ) {
    const cleaned = raw.trim().slice(0, 40);
    if (!cleaned) return;
    if (!current.includes(cleaned) && current.length < 10) {
      setter((prev) => [...prev, cleaned]);
    }
    clearInput();
  }

  async function handleIdeaSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (techStack.length === 0) {
      setError('Select or add at least one suggested technology.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createNewIdea({
        title,
        summary,
        problem,
        purpose,
        target_users: targetUsers,
        domain,
        difficulty,
        tech_stack: techStack,
      });

      setTitle('');
      setSummary('');
      setProblem('');
      setPurpose('');
      setTargetUsers('');
      onClearPrefill?.();
      onIdeaCreated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish idea.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProjectSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!user?.has_resume) {
      setShowInlineResumeUploader(true);
      setError('Upload a PDF resume before posting a project.');
      return;
    }

    if (projectStack.length === 0) {
      setError('Select or add at least one technology used.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createNewProject({
        title: projectTitle,
        description: projectDescription,
        domain: projectDomain,
        difficulty: projectDifficulty,
        tech_stack: projectStack,
        github_url: githubUrl,
        demo_url: demoUrl,
      });

      setProjectTitle('');
      setProjectDescription('');
      setGithubUrl('');
      setDemoUrl('');
      onProjectCreated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish project.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        {/* Top Mascot Header */}
        <div className="flex flex-col items-center gap-4 border-b border-blue-100 bg-gradient-to-br from-[#EAF2FF] via-[#F4F8FF] to-white px-6 py-6 text-center sm:flex-row sm:text-left">
          {!imgFailed && (
            <img
              src={BRIDGEY_MASCOT_URL}
              alt="Bridgey mascot"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white object-cover shadow-xs"
            />
          )}
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'idea' ? 'Share Your Project Idea' : 'Publish a Built Project'}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {mode === 'idea'
                ? 'Open to everyone with no resume needed. Problem details and tech stack stay hidden until unlocked.'
                : 'Showcase your GitHub build to students and companies. A verified PDF resume is required before publishing.'}
            </p>
          </div>
        </div>

        {/* Mode Segmented Control */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-8">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setMode('idea');
                setError(null);
              }}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                mode === 'idea'
                  ? 'bg-[#0052CC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span>Post an Idea</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('project');
                setError(null);
              }}
              className={`flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                mode === 'project'
                  ? 'bg-[#0052CC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderGit2 className="h-4 w-4 shrink-0" />
              <span>Post a Project</span>
              {!user.has_resume && <Lock className="h-3.5 w-3.5 shrink-0 opacity-75" />}
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {mode === 'idea' ? (
            <>
              {prefill?.sourceLabel && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
                  <span>
                    Prefilled from <span className="font-semibold">{prefill.sourceLabel}</span>. Add
                    your purpose and target users to publish.
                  </span>
                  {onClearPrefill && (
                    <button
                      type="button"
                      onClick={onClearPrefill}
                      aria-label="Clear prefill notice"
                      className="shrink-0 rounded-lg p-1 text-blue-700 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleIdeaSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="idea-title"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Project Idea Title
                  </label>
                  <input
                    id="idea-title"
                    type="text"
                    required
                    minLength={4}
                    maxLength={120}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Smart Waste Segregation System"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="idea-summary"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Short Description (shown publicly on feed)
                    </label>
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {summary.length}/240
                    </span>
                  </div>
                  <textarea
                    id="idea-summary"
                    required
                    minLength={15}
                    maxLength={240}
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Briefly describe your idea without revealing the full architecture..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="idea-domain"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Domain
                    </label>
                    <select
                      id="idea-domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value as IdeaDomain)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    >
                      {IDEA_DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Difficulty Level
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                      {IDEA_DIFFICULTIES.map((level) => {
                        const active = difficulty === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setDifficulty(level)}
                            className={`min-h-[40px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-white text-[#0052CC] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <p className="mb-4 text-xs font-bold tracking-wide text-[#0052CC] uppercase">
                    Protected Blueprint Details
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="idea-problem"
                        className="mb-1.5 block text-sm font-semibold text-slate-800"
                      >
                        Problem It Solves
                      </label>
                      <textarea
                        id="idea-problem"
                        required
                        minLength={15}
                        maxLength={2000}
                        rows={3}
                        value={problem}
                        onChange={(e) => setProblem(e.target.value)}
                        placeholder="Describe the real pain point students or communities face today..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="idea-purpose"
                        className="mb-1.5 block text-sm font-semibold text-slate-800"
                      >
                        Purpose & Core Outcome
                      </label>
                      <textarea
                        id="idea-purpose"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={3}
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="What measurable change or workflow improvement does the finished product deliver?"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="idea-users"
                        className="mb-1.5 block text-sm font-semibold text-slate-800"
                      >
                        Who Will Use It
                      </label>
                      <input
                        id="idea-users"
                        type="text"
                        required
                        minLength={3}
                        maxLength={500}
                        value={targetUsers}
                        onChange={(e) => setTargetUsers(e.target.value)}
                        placeholder="e.g., Hostel residents, campus library staff, first-year students"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="mb-2 block text-sm font-semibold text-slate-800">
                        Suggested Tech Stack
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {COMMON_STACKS.map((item) => {
                          const selected = techStack.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleStackItem(item, setTechStack)}
                              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                                selected
                                  ? 'border-[#0052CC] bg-[#0052CC] text-white'
                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                              <span>{item}</span>
                            </button>
                          );
                        })}
                        {techStack
                          .filter((item) => !COMMON_STACKS.includes(item))
                          .map((custom) => (
                            <button
                              key={custom}
                              type="button"
                              onClick={() => toggleStackItem(custom, setTechStack)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0052CC] bg-[#0052CC] px-3 py-1.5 text-xs font-medium text-white"
                            >
                              <span>{custom}</span>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ))}
                      </div>

                      <div className="mt-2.5 flex gap-2">
                        <input
                          type="text"
                          value={customTech}
                          onChange={(e) => setCustomTech(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomStack(customTech, techStack, setTechStack, () =>
                                setCustomTech('')
                              );
                            }
                          }}
                          placeholder="Add custom framework or API..."
                          className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            addCustomStack(customTech, techStack, setTechStack, () =>
                              setCustomTech('')
                            )
                          }
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0043A8] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Publishing Idea...' : 'Post Idea'}</span>
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              {/* Resume Gate Notice / Inline Uploader */}
              {!user.has_resume ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-sm font-bold text-slate-900">
                          Resume Required to Post a Project
                        </h2>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
                          Projects are published only when a PDF resume (max 5 MB) is uploaded in
                          private storage.
                        </p>
                      </div>
                    </div>
                    {!showInlineResumeUploader && (
                      <button
                        type="button"
                        onClick={() => setShowInlineResumeUploader(true)}
                        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0043A8] whitespace-nowrap"
                      >
                        Upload resume now
                      </button>
                    )}
                  </div>

                  {showInlineResumeUploader && (
                    <div className="mt-4">
                      <ResumeManagerCard
                        user={user}
                        onUserUpdated={(updated) => {
                          onUserUpdated(updated);
                          if (updated.has_resume) {
                            setShowInlineResumeUploader(false);
                            setError(null);
                          }
                        }}
                        compact
                        highlightPrompt
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-900">
                  <span className="truncate">
                    Verified PDF resume ready:{' '}
                    <span className="font-semibold">{user.resume_filename}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-emerald-700">Unlocked</span>
                </div>
              )}

              <form onSubmit={handleProjectSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="project-title"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    Project Title
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    required
                    minLength={4}
                    maxLength={120}
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g., Campus Surplus Meal Router App"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-description"
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    What You Built & Architecture
                  </label>
                  <textarea
                    id="project-description"
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe key features implemented, performance highlights, and how to test your project..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="project-github"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      GitHub Repository Link
                    </label>
                    <input
                      id="project-github"
                      type="url"
                      required
                      maxLength={300}
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/username/project-repo"
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="project-demo"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Live Demo Link <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="project-demo"
                      type="url"
                      maxLength={300}
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      placeholder="https://my-project.vercel.app"
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="project-domain"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      Domain
                    </label>
                    <select
                      id="project-domain"
                      value={projectDomain}
                      onChange={(e) => setProjectDomain(e.target.value as IdeaDomain)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    >
                      {IDEA_DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                      Difficulty Level
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
                      {IDEA_DIFFICULTIES.map((level) => {
                        const active = projectDifficulty === level;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setProjectDifficulty(level)}
                            className={`min-h-[40px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                              active
                                ? 'bg-white text-[#0052CC] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-800">
                    Tech Stack Used
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_STACKS.map((item) => {
                      const selected = projectStack.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleStackItem(item, setProjectStack)}
                          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                            selected
                              ? 'border-[#0052CC] bg-[#0052CC] text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                    {projectStack
                      .filter((item) => !COMMON_STACKS.includes(item))
                      .map((custom) => (
                        <button
                          key={custom}
                          type="button"
                          onClick={() => toggleStackItem(custom, setProjectStack)}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#0052CC] bg-[#0052CC] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          <span>{custom}</span>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ))}
                  </div>

                  <div className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      value={projectCustomTech}
                      onChange={(e) => setProjectCustomTech(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomStack(
                            projectCustomTech,
                            projectStack,
                            setProjectStack,
                            () => setProjectCustomTech('')
                          );
                        }
                      }}
                      placeholder="Add custom framework or tool..."
                      className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        addCustomStack(
                          projectCustomTech,
                          projectStack,
                          setProjectStack,
                          () => setProjectCustomTech('')
                        )
                      }
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting || !user.has_resume}
                    aria-disabled={!user.has_resume}
                    className={`flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                      user.has_resume
                        ? 'bg-[#0052CC] text-white hover:bg-[#0043A8] disabled:opacity-60'
                        : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                    }`}
                  >
                    {!user.has_resume ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    <span>{submitting ? 'Publishing Project...' : 'Post Project'}</span>
                  </button>

                  {!user.has_resume && (
                    <button
                      type="button"
                      onClick={() => setShowInlineResumeUploader(true)}
                      className="flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-[#0052CC] bg-blue-50 px-5 py-3 text-sm font-semibold text-[#0052CC] transition-colors hover:bg-blue-100 whitespace-nowrap"
                    >
                      Upload resume now
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
