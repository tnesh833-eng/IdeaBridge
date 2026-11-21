import { useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { Award, FolderGit2, Home, MapPin, PlusSquare, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { setAuthToken, syncFirebaseSession } from './api';
import { auth } from './firebase';
import { FeedTab } from './components/FeedTab';
import { MyProjectsTab } from './components/MyProjectsTab';
import { NearbyEventsTab } from './components/NearbyEventsTab';
import { PostIdeaTab } from './components/PostIdeaTab';
import { ProfileTab } from './components/ProfileTab';
import { SihProblemsTab } from './components/SihProblemsTab';
import type { AppTab, PostIdeaPrefill, UserProfile } from './types';

const NAV_ITEMS: Array<{ id: AppTab; label: string; mobileLabel: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', mobileLabel: 'Home', icon: Home },
  { id: 'nearby', label: 'Nearby Events', mobileLabel: 'Events', icon: MapPin },
  { id: 'sih', label: 'SIH Problems', mobileLabel: 'SIH', icon: Award },
  { id: 'post', label: 'Post', mobileLabel: 'Post', icon: PlusSquare },
  { id: 'projects', label: 'My Projects', mobileLabel: 'Projects', icon: FolderGit2 },
  { id: 'profile', label: 'Profile', mobileLabel: 'Profile', icon: User },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [postMode, setPostMode] = useState<'idea' | 'project'>('idea');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [postPrefill, setPostPrefill] = useState<PostIdeaPrefill | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const hadFirebaseUserRef = useRef(false);

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        hadFirebaseUserRef.current = true;
        try {
          const idToken = await fbUser.getIdToken();
          const res = await syncFirebaseSession(idToken);
          setUser(res.user);
        } catch {
          // Wait for explicit user retry if backend sync fails
        }
      } else if (hadFirebaseUserRef.current) {
        hadFirebaseUserRef.current = false;
        setAuthToken(null);
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  function handleAuthenticated(authenticatedUser: UserProfile) {
    setUser(authenticatedUser);
  }

  function handleIdeaCreated(updatedUser: UserProfile) {
    setUser(updatedUser);
    setPostPrefill(null);
    setFeedRefreshKey((prev) => prev + 1);
    setActiveTab('home');
  }

  function handleProjectCreated(updatedUser: UserProfile) {
    setUser(updatedUser);
    setFeedRefreshKey((prev) => prev + 1);
    setActiveTab('projects');
  }

  function handleTurnSihIdeaIntoPost(prefill: PostIdeaPrefill) {
    setPostPrefill(prefill);
    setPostMode('idea');
    setActiveTab('post');
  }

  function handleLogout() {
    hadFirebaseUserRef.current = false;
    void signOut(auth);
    setAuthToken(null);
    setUser(null);
    setActiveTab('home');
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-900">
      {mapsQuotaExceeded && (
        <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 shadow-sm md:text-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-950 underline hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          {/* Zone 1: Brand mark */}
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight text-[#0052CC] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0052CC]"
          >
            <svg
              className="h-5 w-6 shrink-0"
              viewBox="0 0 28 22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 18C6 7 22 7 26 18"
                stroke="#0052CC"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M7 18V12M14 18V10M21 18V12"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M1 18H27"
                stroke="#0052CC"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>IdeaBridge</span>
          </button>

          {/* Zone 2: Concise single-line desktop nav links */}
          <nav
            className="hidden items-center gap-5 md:flex"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#0052CC]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute right-0 -bottom-[17px] left-0 h-0.5 bg-[#0052CC]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary action */}
          <div className="shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => setActiveTab('post')}
                className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8] whitespace-nowrap shrink-0"
              >
                Post Idea
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8] whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area (with bottom padding for mobile tab bar) */}
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6 sm:pt-7 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'home' && (
              <FeedTab
                refreshKey={feedRefreshKey}
                onRequestPost={() => {
                  setPostMode('idea');
                  setActiveTab('post');
                }}
                onRequestPostProject={() => {
                  setPostMode('project');
                  setActiveTab('post');
                }}
              />
            )}

            {activeTab === 'nearby' && (
              <NearbyEventsTab
                user={user}
                mapsQuotaExceeded={mapsQuotaExceeded}
                onRequireAuth={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'sih' && (
              <SihProblemsTab
                user={user}
                onUserUpdated={setUser}
                onRequireAuth={() => setActiveTab('profile')}
                onTurnIntoPost={handleTurnSihIdeaIntoPost}
                onOpenNearby={() => setActiveTab('nearby')}
              />
            )}

            {activeTab === 'post' && (
              <PostIdeaTab
                user={user}
                initialMode={postMode}
                prefill={postPrefill}
                onClearPrefill={() => setPostPrefill(null)}
                onAuthenticated={handleAuthenticated}
                onUserUpdated={setUser}
                onIdeaCreated={handleIdeaCreated}
                onProjectCreated={handleProjectCreated}
              />
            )}

            {activeTab === 'projects' && (
              <MyProjectsTab
                user={user}
                onAuthenticated={handleAuthenticated}
                onUserUpdated={setUser}
                onNavigatePost={() => {
                  setPostMode('idea');
                  setActiveTab('post');
                }}
                onNavigatePostProject={() => {
                  setPostMode('project');
                  setActiveTab('post');
                }}
                onTurnSihIdeaIntoPost={handleTurnSihIdeaIntoPost}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab
                user={user}
                onAuthenticated={handleAuthenticated}
                onUserUpdated={setUser}
                onLogout={handleLogout}
                onOpenProjects={() => setActiveTab('projects')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Tab Bar for Mobile Thumb Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="pb-safe fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        <div className="grid h-16 grid-cols-6 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center px-1 transition-colors ${
                  active ? 'text-[#0052CC]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                <span className="mt-1 max-w-full truncate text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
