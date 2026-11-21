import { useEffect, useState, type FormEvent } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import {
  ArrowLeft,
  Backpack,
  Building2,
  Bus,
  Calendar,
  CheckCircle2,
  Edit3,
  MapPin,
  ShieldCheck,
  Star,
  Utensils,
  Wifi,
  X,
} from 'lucide-react';
import {
  fetchCollegeProfile,
  submitCollegeReview,
  updateCollegeProfile,
  verifyCollegeOrganizer,
} from '../api';
import type {
  CollegeProfileData,
  CollegeReviewItem,
  NearbyEventItem,
  UserProfile,
} from '../types';
import { BridgeyWidget } from './BridgeyWidget';

interface CollegeProfilePageProps {
  collegeId: string;
  user: UserProfile | null;
  mapsQuotaExceeded: boolean;
  onBack: () => void;
  onSelectEvent: (eventId: string) => void;
  onRequireAuth: () => void;
}

type CollegeSubTab = 'overview' | 'reviews' | 'facilities';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function CollegeMarkerWithInfo({ college }: { college: CollegeProfileData }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: college.lat, lng: college.lng }}
        onClick={() => setInfoOpen(true)}
        title={college.name}
      >
        <Pin background="#0052CC" borderColor="#1E3A8A" glyphColor="#FFFFFF" />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={240} onCloseClick={() => setInfoOpen(false)}>
          <div className="p-0.5 text-slate-900">
            <p className="text-xs font-bold">{college.name}</p>
            <p className="mt-1 text-[11px] text-slate-600">{college.address}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function CollegeProfilePage({
  collegeId,
  user,
  mapsQuotaExceeded,
  onBack,
  onSelectEvent,
  onRequireAuth,
}: CollegeProfilePageProps) {
  const [college, setCollege] = useState<CollegeProfileData | null>(null);
  const [events, setEvents] = useState<NearbyEventItem[]>([]);
  const [reviews, setReviews] = useState<CollegeReviewItem[]>([]);
  const [hasOrganizer, setHasOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bridgeyRefreshKey, setBridgeyRefreshKey] = useState(0);

  const [activeSubTab, setActiveSubTab] = useState<CollegeSubTab>('overview');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Organizer verification & edit state
  const [showOrganizerVerify, setShowOrganizerVerify] = useState(false);
  const [organizerPasscode, setOrganizerPasscode] = useState('');
  const [verifyingOrganizer, setVerifyingOrganizer] = useState(false);
  const [organizerError, setOrganizerError] = useState<string | null>(null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSpecialties, setEditSpecialties] = useState('');
  const [editCanteen, setEditCanteen] = useState('');
  const [editRestrooms, setEditRestrooms] = useState('');
  const [editTransport, setEditTransport] = useState('');
  const [editWifi, setEditWifi] = useState('');
  const [editCarry, setEditCarry] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);

  // Attendee review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewEventId, setReviewEventId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState('');
  const [canteenTip, setCanteenTip] = useState('');
  const [restroomTip, setRestroomTip] = useState('');
  const [transportTip, setTransportTip] = useState('');
  const [wifiTip, setWifiTip] = useState('');
  const [carryTip, setCarryTip] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  function syncEditFields(c: CollegeProfileData) {
    setEditName(c.name);
    setEditAddress(c.address);
    setEditSpecialties(c.specialties.join(', '));
    setEditCanteen(c.tips_canteen);
    setEditRestrooms(c.tips_restrooms);
    setEditTransport(c.tips_transport);
    setEditWifi(c.tips_wifi_charging);
    setEditCarry(c.tips_what_to_carry);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setShowOrganizerVerify(false);
    setShowEditForm(false);
    setShowReviewForm(false);
    setEditMessage(null);
    setReviewNotice(null);
    setActivePhotoIndex(0);
    setActiveSubTab('overview');

    fetchCollegeProfile(collegeId)
      .then((res) => {
        if (!active) return;
        setCollege(res.college);
        setEvents(res.events);
        setReviews(res.reviews);
        setHasOrganizer(res.organizerStatus.hasOrganizer);
        syncEditFields(res.college);
        if (res.events.length > 0) {
          setReviewEventId(res.events[0].id);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load college profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [collegeId, user?.id]);

  async function handleVerifyOrganizer(e: FormEvent) {
    e.preventDefault();
    if (!college) return;
    setVerifyingOrganizer(true);
    setOrganizerError(null);
    try {
      const res = await verifyCollegeOrganizer(college.id, organizerPasscode);
      setCollege(res.college);
      syncEditFields(res.college);
      setOrganizerPasscode('');
      setShowOrganizerVerify(false);
      setShowEditForm(true);
    } catch (err) {
      setOrganizerError(
        err instanceof Error ? err.message : 'Organizer verification failed.'
      );
    } finally {
      setVerifyingOrganizer(false);
    }
  }

  async function handleSaveOfficialDetails(e: FormEvent) {
    e.preventDefault();
    if (!college) return;
    setSavingEdit(true);
    setOrganizerError(null);
    setEditMessage(null);

    try {
      const res = await updateCollegeProfile(college.id, {
        name: editName.trim(),
        address: editAddress.trim(),
        specialties: editSpecialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tips_canteen: editCanteen.trim(),
        tips_restrooms: editRestrooms.trim(),
        tips_transport: editTransport.trim(),
        tips_wifi_charging: editWifi.trim(),
        tips_what_to_carry: editCarry.trim(),
      });
      setCollege(res.college);
      syncEditFields(res.college);
      setShowEditForm(false);
      setEditMessage('Official college details updated.');
      setBridgeyRefreshKey((k) => k + 1);
    } catch (err) {
      setOrganizerError(
        err instanceof Error ? err.message : 'Unable to save official college details.'
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!college) return;
    setSubmittingReview(true);
    setReviewError(null);
    setReviewNotice(null);

    try {
      const res = await submitCollegeReview(college.id, {
        event_id: reviewEventId || null,
        rating: reviewRating,
        review_text: reviewText.trim(),
        canteen_tip: canteenTip.trim(),
        restroom_tip: restroomTip.trim(),
        transport_tip: transportTip.trim(),
        wifi_tip: wifiTip.trim(),
        carry_tip: carryTip.trim(),
      });
      setReviews((prev) => [res.review, ...prev]);
      setCollege(res.college);
      setReviewText('');
      setCanteenTip('');
      setRestroomTip('');
      setTransportTip('');
      setWifiTip('');
      setCarryTip('');
      setShowReviewForm(false);
      setReviewNotice('Thanks! Your review and tips are now live for future visitors.');
      setBridgeyRefreshKey((k) => k + 1);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to post review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium text-[#0052CC] hover:text-[#0043A8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Nearby Events
        </button>
        <p className="mt-4 text-sm text-red-700">{error ?? 'College profile not found.'}</p>
      </div>
    );
  }

  const tipCards = [
    {
      title: 'Canteen & Good Food',
      icon: Utensils,
      value: college.tips_canteen,
    },
    {
      title: 'Restrooms',
      icon: Building2,
      value: college.tips_restrooms,
    },
    {
      title: 'Parking & Transport',
      icon: Bus,
      value: college.tips_transport,
    },
    {
      title: 'Wi-Fi & Charging Points',
      icon: Wifi,
      value: college.tips_wifi_charging,
    },
    {
      title: 'What to Carry',
      icon: Backpack,
      value: college.tips_what_to_carry,
    },
  ];

  const heroPhoto = college.photos[activePhotoIndex] ?? college.photos[0];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-[#0052CC]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Nearby Events
        </button>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              onRequireAuth();
              return;
            }
            if (college.is_verified_organizer) {
              setShowEditForm((prev) => !prev);
              setShowOrganizerVerify(false);
            } else {
              setShowOrganizerVerify((prev) => !prev);
            }
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052CC] transition-colors hover:bg-blue-100"
        >
          {college.is_verified_organizer ? (
            <>
              <Edit3 className="h-4 w-4" />
              Edit Official Details
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Organizer Verify & Edit
            </>
          )}
        </button>
      </div>

      {/* Feedback Notices */}
      {editMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0052CC]" />
          {editMessage}
        </div>
      )}
      {reviewNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0052CC]" />
          {reviewNotice}
        </div>
      )}

      {/* Organizer Verification Drawer */}
      {showOrganizerVerify && !college.is_verified_organizer && (
        <form
          onSubmit={handleVerifyOrganizer}
          className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">
                Verify as Official College Organizer
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                {hasOrganizer
                  ? 'Enter the existing organizer passcode for this campus to edit official venue details.'
                  : 'No organizer has claimed this campus yet. Set a passcode (6+ characters) to register as a verified college organizer.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOrganizerVerify(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {organizerError && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {organizerError}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <input
              type="password"
              required
              minLength={6}
              value={organizerPasscode}
              onChange={(e) => setOrganizerPasscode(e.target.value)}
              placeholder="Organizer verification passcode"
              className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={verifyingOrganizer}
              className="min-h-[44px] rounded-xl bg-[#0052CC] px-5 text-xs font-semibold text-white hover:bg-[#0043A8] disabled:opacity-60"
            >
              {verifyingOrganizer ? 'Verifying...' : 'Verify Organizer'}
            </button>
          </div>
        </form>
      )}

      {/* Official Details Editor (Verified Organizers Only) */}
      {showEditForm && college.is_verified_organizer && (
        <form
          onSubmit={handleSaveOfficialDetails}
          className="space-y-4 rounded-2xl border border-blue-200 bg-white p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">
              Edit Official College Details
            </h3>
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {organizerError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {organizerError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">College Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Specialties (comma-separated)
              </label>
              <input
                type="text"
                value={editSpecialties}
                onChange={(e) => setEditSpecialties(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Address</label>
            <input
              type="text"
              required
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Canteen & Food</label>
              <textarea
                rows={2}
                value={editCanteen}
                onChange={(e) => setEditCanteen(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Restrooms</label>
              <textarea
                rows={2}
                value={editRestrooms}
                onChange={(e) => setEditRestrooms(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Parking & Transport
              </label>
              <textarea
                rows={2}
                value={editTransport}
                onChange={(e) => setEditTransport(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Wi-Fi & Charging Points
              </label>
              <textarea
                rows={2}
                value={editWifi}
                onChange={(e) => setEditWifi(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">What to Carry</label>
            <textarea
              rows={2}
              value={editCarry}
              onChange={(e) => setEditCarry(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="min-h-[44px] rounded-xl bg-[#0052CC] px-5 text-xs font-semibold text-white hover:bg-[#0043A8] disabled:opacity-60"
            >
              {savingEdit ? 'Saving...' : 'Save Official Details'}
            </button>
          </div>
        </form>
      )}

      {/* College Hero Card + Photo Carousel */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        {heroPhoto && (
          <div className="relative aspect-[16/7] max-h-64 w-full overflow-hidden bg-slate-100">
            <img
              src={heroPhoto}
              alt={`${college.name} campus view`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            {college.photos.length > 1 && (
              <div className="absolute right-3 bottom-3 rounded-lg bg-slate-900/75 px-2.5 py-1 font-mono text-[11px] font-medium text-white tabular-nums">
                {activePhotoIndex + 1}/{college.photos.length}
              </div>
            )}
          </div>
        )}

        <div className="p-5 sm:p-6">
          {college.photos.length > 1 && (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {college.photos.map((photoUrl, idx) => (
                <button
                  key={`${photoUrl}-${idx}`}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`h-14 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activePhotoIndex === idx
                      ? 'border-[#0052CC]'
                      : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photoUrl}
                    alt={`${college.name} thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#0052CC]">
                {college.city}
                {college.is_verified_organizer ? ' · Verified Organizer Mode' : ''}
              </p>
              <h1 className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {college.name}
              </h1>
              <p className="mt-1.5 flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0052CC]" />
                <span>{college.address}</span>
              </p>
              {college.specialties.length > 0 && (
                <p className="mt-2.5 text-xs font-medium text-slate-500">
                  {college.specialties.join(' · ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-[#F4F8FF] px-3.5 py-2.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <div className="tabular-nums">
                <span className="text-sm font-bold text-slate-900">
                  {college.review_count > 0 ? college.avg_rating.toFixed(1) : 'New'}
                </span>
                <span className="ml-1.5 text-xs text-slate-600">
                  ({college.review_count} {college.review_count === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Sub-Tabs: Overview | Reviews | Food & Facilities */}
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'reviews', label: `Reviews (${college.review_count})` },
                { id: 'facilities', label: 'Food & Facilities' },
              ] as const
            ).map((tab) => {
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`min-h-[40px] rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap sm:text-sm ${
                    active
                      ? 'bg-[#0052CC] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content + Bridgey Owl Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {activeSubTab === 'overview' && (
            <>
              {/* Interactive Google Map */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Campus Map Location
                  </h2>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {college.lat.toFixed(4)}, {college.lng.toFixed(4)}
                  </span>
                </div>

                {MAPS_API_KEY && !mapsQuotaExceeded ? (
                  <div className="h-[300px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']}>
                      <GoogleMap
                        key={college.id}
                        mapId="DEMO_MAP_ID"
                        defaultCenter={{ lat: college.lat, lng: college.lng }}
                        defaultZoom={15}
                        gestureHandling="greedy"
                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <CollegeMarkerWithInfo college={college} />
                      </GoogleMap>
                    </APIProvider>
                  </div>
                ) : (
                  <div className="flex h-[220px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <MapPin className="h-7 w-7 text-[#0052CC]" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">{college.name}</p>
                    <p className="mt-1 max-w-md text-xs text-slate-600">{college.address}</p>
                    <p className="mt-2 font-mono text-[11px] text-slate-500 tabular-nums">
                      Coordinates: {college.lat.toFixed(4)}, {college.lng.toFixed(4)}
                    </p>
                  </div>
                )}
              </section>

              {/* Previous & Upcoming Events Hosted Here */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Hackathons & Events Hosted Here
                </h2>

                {events.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold tracking-wide text-[#0052CC] uppercase">
                      Upcoming at {college.name}
                    </p>
                    <div className="mt-2 space-y-2.5">
                      {events.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onSelectEvent(ev.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-[#F4F8FF] p-3.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#0052CC]">
                              {ev.event_type} · {ev.event_date} · {ev.mode}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                              {ev.title}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-[#0052CC]">
                            View →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {college.previous_events.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Previous Editions
                    </p>
                    <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50">
                      {college.previous_events.map((past, idx) => (
                        <li
                          key={`${past.title}-${idx}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                        >
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <Calendar className="h-3.5 w-3.5 text-[#0052CC]" />
                            <span>{past.title}</span>
                          </div>
                          <span className="shrink-0 text-slate-500 tabular-nums">
                            {past.year} · {past.participants}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </>
          )}

          {activeSubTab === 'facilities' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="font-display text-base font-bold text-slate-900">
                Practical Campus Tips from Past Visitors
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Verified logistics to help first-time hackathon & event attendees navigate comfortably.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {tipCards.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <div
                      key={tip.title}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-[#0052CC]" />
                        <h3 className="text-xs font-bold text-slate-900">{tip.title}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {tip.value || 'No tips saved yet. Attendees can share theirs in Reviews.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeSubTab === 'reviews' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Student Reviews & Feedback
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Attended an event here? Share practical campus tips for the next batch.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onRequireAuth();
                      return;
                    }
                    setShowReviewForm((prev) => !prev);
                  }}
                  className="min-h-[44px] rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8]"
                >
                  {showReviewForm ? 'Close Form' : 'Write Review & Tips'}
                </button>
              </div>

              {showReviewForm && user && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="mt-4 space-y-4 rounded-xl border border-blue-200 bg-[#F4F8FF] p-4"
                >
                  {reviewError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {reviewError}
                    </p>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Event Attended
                      </label>
                      <select
                        value={reviewEventId}
                        onChange={(e) => setReviewEventId(e.target.value)}
                        className="mt-1 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none"
                      >
                        <option value="">General campus visit</option>
                        {events.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {ev.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Star Rating
                      </label>
                      <div className="mt-1 flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            aria-label={`Rate ${star} stars`}
                            className="p-1"
                          >
                            <Star
                              className={`h-5 w-5 ${
                                star <= reviewRating
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-semibold text-slate-700 tabular-nums">
                          {reviewRating}/5
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Your Experience (min 10 characters)
                    </label>
                    <textarea
                      required
                      minLength={10}
                      maxLength={1000}
                      rows={3}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="How was the event organization, judging, seating, and overall vibe?"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:border-[#0052CC] focus:outline-none"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      maxLength={300}
                      value={canteenTip}
                      onChange={(e) => setCanteenTip(e.target.value)}
                      placeholder="Canteen food tip (optional)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[#0052CC] focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={300}
                      value={restroomTip}
                      onChange={(e) => setRestroomTip(e.target.value)}
                      placeholder="Restroom location tip (optional)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[#0052CC] focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={300}
                      value={transportTip}
                      onChange={(e) => setTransportTip(e.target.value)}
                      placeholder="Parking / metro / bus tip (optional)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[#0052CC] focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={300}
                      value={wifiTip}
                      onChange={(e) => setWifiTip(e.target.value)}
                      placeholder="Wi-Fi & charging tip (optional)"
                      className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[#0052CC] focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={300}
                    value={carryTip}
                    onChange={(e) => setCarryTip(e.target.value)}
                    placeholder="What should visitors carry? (optional)"
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-[#0052CC] focus:outline-none"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="min-h-[44px] rounded-xl bg-[#0052CC] px-5 text-xs font-semibold text-white hover:bg-[#0043A8] disabled:opacity-60"
                    >
                      {submittingReview ? 'Submitting...' : 'Post Review'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 space-y-3">
                {reviews.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    No student reviews posted yet. Be the first attendee to share tips!
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {rev.author_name}
                            {rev.author_college ? ` · ${rev.author_college}` : ''}
                          </p>
                          {rev.event_title && (
                            <p className="text-[11px] font-medium text-[#0052CC]">
                              Attended: {rev.event_title}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= rev.rating
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-slate-700">
                        {rev.review_text}
                      </p>

                      {(rev.canteen_tip ||
                        rev.restroom_tip ||
                        rev.transport_tip ||
                        rev.wifi_tip ||
                        rev.carry_tip) && (
                        <div className="mt-3 space-y-1 border-t border-slate-200/80 pt-2.5 text-[11px] text-slate-600">
                          {rev.canteen_tip && (
                            <p>
                              <span className="font-semibold text-slate-800">Food:</span>{' '}
                              {rev.canteen_tip}
                            </p>
                          )}
                          {rev.restroom_tip && (
                            <p>
                              <span className="font-semibold text-slate-800">Restrooms:</span>{' '}
                              {rev.restroom_tip}
                            </p>
                          )}
                          {rev.transport_tip && (
                            <p>
                              <span className="font-semibold text-slate-800">Transport:</span>{' '}
                              {rev.transport_tip}
                            </p>
                          )}
                          {rev.wifi_tip && (
                            <p>
                              <span className="font-semibold text-slate-800">Wi-Fi & Power:</span>{' '}
                              {rev.wifi_tip}
                            </p>
                          )}
                          {rev.carry_tip && (
                            <p>
                              <span className="font-semibold text-slate-800">Carry:</span>{' '}
                              {rev.carry_tip}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sticky/Sidebar Bridgey Chat Assistant */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-20">
            <BridgeyWidget
              collegeId={college.id}
              collegeName={college.name}
              refreshKey={bridgeyRefreshKey}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
