import { useEffect, useState } from 'react';
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
  Building2,
  Calendar,
  ChevronRight,
  Compass,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import {
  fetchApproxLocation,
  fetchEventDetail,
  fetchNearbyEvents,
  saveApproxLocation,
} from '../api';
import type { ApproxLocation, NearbyEventItem, UserProfile } from '../types';
import { BridgeyWidget } from './BridgeyWidget';
import { CollegeProfilePage } from './CollegeProfilePage';

interface NearbyEventsTabProps {
  user: UserProfile | null;
  mapsQuotaExceeded: boolean;
  onRequireAuth: () => void;
}

const EVENT_TYPES = ['All', 'Hackathon', 'Ideathon', 'Workshop'] as const;
const CITIES = ['All', 'Bengaluru', 'Chennai', 'Pune', 'Mangaluru'] as const;
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

const EVENT_THUMBS = [
  '/src/assets/images/college_hackathon_hall_1795263069109.jpg',
  '/src/assets/images/college_campus_quad_1795263070555.jpg',
  '/src/assets/images/college_canteen_courtyard_1795263069408.jpg',
];

function EventMapMarker({
  event,
  onSelectEvent,
  onSelectCollege,
}: {
  event: NearbyEventItem;
  onSelectEvent: (eventId: string) => void;
  onSelectCollege: (collegeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: event.college_lat, lng: event.college_lng }}
        onClick={() => setOpen(true)}
        title={`${event.title} · ${event.college_name}`}
      >
        <Pin background="#0052CC" borderColor="#1E3A8A" glyphColor="#FFFFFF" />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} maxWidth={250} onCloseClick={() => setOpen(false)}>
          <div className="p-0.5 text-slate-900">
            <p className="text-[11px] font-semibold text-[#0052CC]">
              {event.event_type} · {event.event_date}
            </p>
            <p className="mt-0.5 text-xs font-bold leading-snug">{event.title}</p>
            <p className="mt-1 text-[11px] text-slate-600">
              {event.college_name}, {event.college_city}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="rounded-lg bg-[#0052CC] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#0043A8]"
              >
                Open Event
              </button>
              <button
                type="button"
                onClick={() => onSelectCollege(event.college_id)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                College
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function NearbyEventsTab({
  user,
  mapsQuotaExceeded,
  onRequireAuth,
}: NearbyEventsTabProps) {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [approxLocation, setApproxLocation] = useState<ApproxLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const [events, setEvents] = useState<NearbyEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<NearbyEventItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    fetchApproxLocation()
      .then((res) => {
        if (res.location) {
          setApproxLocation(res.location);
        }
      })
      .catch(() => {
        // Non-critical location prefill
      });
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setListError(null);

    fetchNearbyEvents({
      q: debouncedQuery,
      eventType: selectedType,
      city: selectedCity,
      lat: approxLocation?.approx_lat ?? null,
      lng: approxLocation?.approx_lng ?? null,
    })
      .then((res) => {
        if (active) {
          setEvents(res.events);
        }
      })
      .catch((err) => {
        if (active) {
          setListError(err instanceof Error ? err.message : 'Unable to load nearby events.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    debouncedQuery,
    selectedType,
    selectedCity,
    approxLocation?.approx_lat,
    approxLocation?.approx_lng,
  ]);

  useEffect(() => {
    if (!selectedEventId) {
      setDetailEvent(null);
      setDetailError(null);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError(null);

    fetchEventDetail(selectedEventId)
      .then((res) => {
        if (active) {
          setDetailEvent(res.event);
        }
      })
      .catch((err) => {
        if (active) {
          setDetailError(err instanceof Error ? err.message : 'Unable to load event details.');
        }
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEventId]);

  function handleUseApproxLocation() {
    if (!navigator.geolocation) {
      setLocationNotice('Location is unavailable in this browser. Filter by city instead.');
      return;
    }
    setLocating(true);
    setLocationNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Store ONLY approximate location rounded to 2 decimal places (~1.1 km grid)
          const approxLat = Math.round(position.coords.latitude * 100) / 100;
          const approxLng = Math.round(position.coords.longitude * 100) / 100;
          const res = await saveApproxLocation({
            lat: approxLat,
            lng: approxLng,
          });
          setApproxLocation(res.location);
          setLocationNotice(
            `Sorted by approximate area (${res.location.approx_lat.toFixed(2)}, ${res.location.approx_lng.toFixed(2)} · ~1.1 km grid).`
          );
        } catch (err) {
          setLocationNotice(
            err instanceof Error ? err.message : 'Could not save approximate location.'
          );
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocationNotice('Location permission declined. Use the city filter below instead.');
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  // Subview 1: College Profile Page
  if (selectedCollegeId) {
    return (
      <CollegeProfilePage
        collegeId={selectedCollegeId}
        user={user}
        mapsQuotaExceeded={mapsQuotaExceeded}
        onBack={() => setSelectedCollegeId(null)}
        onSelectEvent={(evId) => {
          setSelectedCollegeId(null);
          setSelectedEventId(evId);
        }}
        onRequireAuth={onRequireAuth}
      />
    );
  }

  // Subview 2: Event Detail Screen + Link to College Profile + Bridgey Assistant
  if (selectedEventId) {
    if (detailLoading) {
      return (
        <div className="space-y-4">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      );
    }

    if (detailError || !detailEvent) {
      return (
        <div className="rounded-2xl border border-red-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setSelectedEventId(null)}
            className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#0052CC]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Nearby Events
          </button>
          <p className="mt-4 text-sm text-red-700">{detailError ?? 'Event not found.'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedEventId(null)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-[#0052CC]"
          >
            <ArrowLeft className="h-4 w-4" />
            All Nearby Events
          </button>

          <button
            type="button"
            onClick={() => setSelectedCollegeId(detailEvent.college_id)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8]"
          >
            <Building2 className="h-4 w-4" />
            View College Profile & Campus Tips
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
              <div className="h-44 w-full overflow-hidden bg-slate-100 sm:h-52">
                <img
                  src={EVENT_THUMBS[0]}
                  alt={`${detailEvent.title} venue`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-5 sm:p-6">
                <p className="text-xs font-semibold text-[#0052CC] tabular-nums">
                  {detailEvent.event_type} · {detailEvent.event_date}
                  {detailEvent.end_date && detailEvent.end_date !== detailEvent.event_date
                    ? ` to ${detailEvent.end_date}`
                    : ''}{' '}
                  · {detailEvent.mode}
                </p>

                <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {detailEvent.title}
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {detailEvent.description}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-[#0052CC]" />
                      Venue Hall
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">
                      {detailEvent.venue_hall}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Users className="h-3.5 w-3.5 text-[#0052CC]" />
                      Team Size
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900">
                      {detailEvent.team_size}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-[#0052CC]" />
                      Registration Deadline
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-900 tabular-nums">
                      {detailEvent.registration_deadline}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold text-slate-500">What to Bring</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-800">
                      {detailEvent.what_to_bring}
                    </p>
                  </div>
                </div>

                {/* College Link Card */}
                <div className="mt-5 rounded-2xl border border-blue-200 bg-[#F4F8FF] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#0052CC]">Host Campus</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-900">
                        {detailEvent.college_name} · {detailEvent.college_city}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Check campus map, canteen picks, restrooms, Wi-Fi, and student reviews.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCollegeId(detailEvent.college_id)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#0052CC] ring-1 ring-blue-200 transition-colors hover:bg-blue-50"
                    >
                      Open College Profile
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          {/* Bridgey Owl Assistant on Event Detail Page */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20">
              <BridgeyWidget
                collegeId={detailEvent.college_id}
                collegeName={detailEvent.college_name}
                eventId={detailEvent.id}
                eventTitle={detailEvent.title}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mapCenter =
    approxLocation !== null
      ? { lat: approxLocation.approx_lat, lng: approxLocation.approx_lng }
      : events.length > 0
        ? { lat: events[0].college_lat, lng: events[0].college_lng }
        : { lat: 12.9716, lng: 77.5946 };

  // Subview 3: Nearby Events (Map | List segmented toggle)
  return (
    <div className="space-y-5">
      {/* Header + Map | List Toggle */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Nearby Events
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Explore upcoming student hackathons, ideathons, and workshops with verified campus tips.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:w-52">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-[#0052CC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === 'map'
                  ? 'bg-[#0052CC] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event, college, or city..."
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by city"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city === 'All' ? 'All Cities' : city}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by event type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#0052CC] focus:bg-white focus:outline-none"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Event Types' : t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Approximate Location Action Strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-[#F4F8FF] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0052CC]" />
            <div className="text-xs leading-relaxed text-slate-700 tabular-nums">
              {locationNotice ? (
                <span>{locationNotice}</span>
              ) : approxLocation ? (
                <span>
                  Sorted by approximate area ({approxLocation.approx_lat.toFixed(2)},{' '}
                  {approxLocation.approx_lng.toFixed(2)} · ~1.1 km grid only).
                </span>
              ) : (
                <span>
                  Find events near me using approximate city-grid location only (~1.1 km radius).
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseApproxLocation}
            disabled={locating}
            className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0043A8] disabled:opacity-60"
          >
            <Compass className="h-4 w-4" />
            <span>{locating ? 'Locating...' : 'Find events near me'}</span>
          </button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          {MAPS_API_KEY && !mapsQuotaExceeded ? (
            <div className="h-[420px] w-full bg-slate-100">
              <APIProvider apiKey={MAPS_API_KEY} libraries={['marker']}>
                <GoogleMap
                  key={`${selectedCity}-${approxLocation?.approx_lat ?? 'default'}`}
                  mapId="DEMO_MAP_ID"
                  defaultCenter={mapCenter}
                  defaultZoom={selectedCity === 'All' ? 5 : 12}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                >
                  {events.map((ev) => (
                    <EventMapMarker
                      key={ev.id}
                      event={ev}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                      onSelectCollege={(cid) => setSelectedCollegeId(cid)}
                    />
                  ))}
                </GoogleMap>
              </APIProvider>
            </div>
          ) : (
            <div className="flex h-[320px] flex-col items-center justify-center bg-slate-50 p-6 text-center">
              <MapPin className="h-8 w-8 text-[#0052CC]" />
              <p className="mt-2 text-sm font-semibold text-slate-900">
                Interactive Campus Map Unavailable
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-600">
                Switch to the List view to browse all {events.length} upcoming campus events and
                college coordinates.
              </p>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="mt-4 min-h-[40px] rounded-xl bg-[#0052CC] px-4 text-xs font-semibold text-white"
              >
                Switch to List View
              </button>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : listError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
          {listError}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-800">No matching events found</p>
          <p className="mt-1 text-xs text-slate-500">
            Try clearing your city or event type filter to see all upcoming campus events.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map((ev, idx) => (
            <article
              key={ev.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-blue-300"
            >
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <img
                    src={EVENT_THUMBS[idx % EVENT_THUMBS.length]}
                    alt={ev.college_name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#0052CC] tabular-nums">
                    {ev.event_type} · {ev.event_date}
                    {ev.distance_km !== null ? ` · ~${ev.distance_km} km` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className="mt-1 text-left font-display text-base leading-snug font-bold text-slate-900 hover:text-[#0052CC]"
                  >
                    {ev.title}
                  </button>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {ev.summary}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                <button
                  type="button"
                  onClick={() => setSelectedCollegeId(ev.college_id)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0052CC]"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0052CC]" />
                  <span className="truncate">
                    {ev.college_name} · {ev.college_city}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEventId(ev.id)}
                  className="inline-flex min-h-[36px] items-center gap-1 text-xs font-semibold text-[#0052CC] hover:text-[#0043A8]"
                >
                  Event & Guide
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
