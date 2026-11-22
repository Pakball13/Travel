"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  destinations,
  getDestination,
  getOrigin,
  moods,
  origins,
  regions,
  type Coordinates,
  type Destination,
  type MoodId,
} from "@/lib/travel-data";
import {
  DEFAULT_PETROL_PRICE_PKR,
  estimateTrip,
  formatPKR,
  getMoodLabel,
  type TransportMode,
  transportModes,
} from "@/lib/travel-estimates";

const PakistanMap = dynamic(() => import("./pakistan-map"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="loading-dot" /> Loading the map…</div>,
});

type LiveData = {
  fetchedAt: string;
  origin: { id: string; name: string; coordinates: Coordinates };
  destination: { id: string; name: string; coordinates: Coordinates };
  route: { distanceKm: number; durationMinutes: number; path: Coordinates[]; source: string } | null;
  weather: {
    temperature: number; feelsLike: number; windSpeed: number; humidity: number | null;
    label: string; icon: string; timezone: string | null; source: string;
    threeDay: { max: number; min: number; rainChance: number | null }[];
  } | null;
  airQuality: { usAqi: number; pm25: number | null; pm10: number | null; label: string; source: string } | null;
  fuel: {
    pricePkr: number | null; effectiveDate: string | null; sourceName: string;
    documentUrl: string | null; archiveUrl: string; live: boolean;
  };
  sources: { map: string; route: string };
};

type SavedTrip = {
  id: string;
  destinationId: string;
  destinationName: string;
  originId: string;
  originName: string;
  mood: MoodId | "all";
  budget: number;
  days: number;
  partySize: number;
  mode: TransportMode;
  estimate: number;
  savedAt: string;
};

type SortMode = "best" | "cheapest" | "closest";
const SAVED_TRIPS_KEY = "rah-pakistan-saved-trips-v1";
const flightModes = transportModes.filter((mode) => mode.id !== "flight");

function readSavedTrips(): SavedTrip[] {
  try {
    const saved = window.localStorage.getItem(SAVED_TRIPS_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedTrip =>
      Boolean(item && typeof item.id === "string" && typeof item.destinationId === "string" && getDestination(item.destinationId)),
    ).slice(0, 12);
  } catch {
    return [];
  }
}

function wordForPeople(count: number): string {
  return count === 1 ? "traveller" : "travellers";
}

function googleMapsUrl(originId: string, destination: Destination, mode: TransportMode): string {
  const origin = getOrigin(originId);
  const mapMode = mode === "flight" ? "transit" : mode === "walk" ? "walking" : mode === "motorcycle" ? "two-wheeler" : "driving";
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin?.name ?? "Islamabad"}, Pakistan`,
    destination: `${destination.name}, ${destination.province}, Pakistan`,
    travelmode: mapMode,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function googleFlightsUrl(originId: string, destination: Destination): string {
  const origin = getOrigin(originId);
  if (!destination.flight) return "https://www.google.com/travel/flights";
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${origin?.name ?? "Islamabad"} to ${destination.flight.airport} ${destination.flight.code}`,
  )}`;
}

function qualityTone(aqi: number | undefined): string {
  if (aqi === undefined) return "tone-muted";
  if (aqi <= 50) return "tone-good";
  if (aqi <= 100) return "tone-fair";
  return "tone-caution";
}

export default function TravelPlanner() {
  const [originId, setOriginId] = useState("islamabad");
  const [budget, setBudget] = useState(140000);
  const [days, setDays] = useState(4);
  const [partySize, setPartySize] = useState(2);
  const [selectedMood, setSelectedMood] = useState<MoodId | "all">("nature");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [transport, setTransport] = useState<TransportMode>("smart");
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [search, setSearch] = useState("");
  const [fitsOnly, setFitsOnly] = useState(false);
  const [selected, setSelected] = useState<Destination | null>(null);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [petrolPrice, setPetrolPrice] = useState(DEFAULT_PETROL_PRICE_PKR);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);
  const [toast, setToast] = useState("");
  const petrolWasEditedByVisitor = useRef(false);
  const liveRequestId = useRef(0);

  useEffect(() => {
    setSavedTrips(readSavedTrips());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3300);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected && !savedPanelOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setSavedPanelOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selected, savedPanelOpen]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const requestId = ++liveRequestId.current;
    setLiveLoading(true);
    setLiveError("");

    fetch(`/api/live-data?origin=${encodeURIComponent(originId)}&destination=${encodeURIComponent(selected.id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("The live travel check is temporarily unavailable.");
        return (await response.json()) as LiveData;
      })
      .then((result) => {
        if (controller.signal.aborted || requestId !== liveRequestId.current) return;
        setLiveData(result);
        if (result.fuel.live && result.fuel.pricePkr && !petrolWasEditedByVisitor.current) {
          setPetrolPrice(result.fuel.pricePkr);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestId !== liveRequestId.current) return;
        setLiveError(error instanceof Error ? error.message : "Could not fetch live travel data.");
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === liveRequestId.current) setLiveLoading(false);
      });

    return () => controller.abort();
  }, [originId, refreshCount, selected]);

  const estimateFor = useCallback((destination: Destination) => estimateTrip(destination, {
    originId,
    days,
    partySize,
    mode: transport,
    petrolPrice,
    roadDistanceKm: liveData?.destination.id === destination.id ? liveData.route?.distanceKm : undefined,
  }), [days, liveData, originId, partySize, petrolPrice, transport]);

  const visibleDestinations = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    const list = destinations.filter((destination) => {
      const matchesRegion = selectedRegion === "all" || destination.province === selectedRegion;
      const matchesMood = selectedMood === "all" || destination.moods.includes(selectedMood);
      const matchesSearch = !needle || [destination.name, destination.province, destination.subregion, destination.category, destination.intro]
        .some((value) => value.toLocaleLowerCase().includes(needle));
      const estimate = estimateTrip(destination, {
        originId,
        days,
        partySize,
        mode: transport,
        petrolPrice,
        roadDistanceKm: liveData?.destination.id === destination.id ? liveData.route?.distanceKm : undefined,
      });
      return matchesRegion && matchesMood && matchesSearch && (!fitsOnly || estimate.total <= budget);
    });

    return list.sort((first, second) => {
      const firstPlan = estimateTrip(first, {
        originId, days, partySize, mode: transport, petrolPrice,
        roadDistanceKm: liveData?.destination.id === first.id ? liveData.route?.distanceKm : undefined,
      });
      const secondPlan = estimateTrip(second, {
        originId, days, partySize, mode: transport, petrolPrice,
        roadDistanceKm: liveData?.destination.id === second.id ? liveData.route?.distanceKm : undefined,
      });
      if (sortMode === "cheapest") return firstPlan.total - secondPlan.total;
      if (sortMode === "closest") return firstPlan.oneWayKm - secondPlan.oneWayKm;
      const firstOver = firstPlan.total > budget;
      const secondOver = secondPlan.total > budget;
      if (firstOver !== secondOver) return Number(firstOver) - Number(secondOver);
      const firstMoodPenalty = selectedMood !== "all" && !first.moods.includes(selectedMood) ? 80000 : 0;
      const secondMoodPenalty = selectedMood !== "all" && !second.moods.includes(selectedMood) ? 80000 : 0;
      return Math.abs(firstPlan.total + firstMoodPenalty - budget * 0.72) - Math.abs(secondPlan.total + secondMoodPenalty - budget * 0.72);
    });
  }, [budget, days, fitsOnly, liveData, originId, partySize, petrolPrice, search, selectedMood, selectedRegion, sortMode, transport]);

  const selectedEstimate = selected ? estimateFor(selected) : null;
  const origin = getOrigin(originId) ?? origins[0];
  const hasLiveRoute = Boolean(selected && liveData?.destination.id === selected.id && liveData.route);
  const savedDestinationIds = useMemo(() => new Set(savedTrips.map((trip) => trip.destinationId)), [savedTrips]);

  const persistTrips = useCallback((nextTrips: SavedTrip[]) => {
    setSavedTrips(nextTrips);
    try {
      window.localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(nextTrips));
    } catch {
      setToast("Your browser couldn't store this trip. Try freeing some storage and saving again.");
    }
  }, []);

  const toggleSave = useCallback((destination: Destination) => {
    const exists = savedTrips.some((trip) => trip.destinationId === destination.id && trip.originId === originId);
    if (exists) {
      persistTrips(savedTrips.filter((trip) => !(trip.destinationId === destination.id && trip.originId === originId)));
      setToast(`${destination.name} removed from your saved trips.`);
      return;
    }
    const estimate = estimateTrip(destination, {
      originId, days, partySize, mode: transport, petrolPrice,
      roadDistanceKm: liveData?.destination.id === destination.id ? liveData.route?.distanceKm : undefined,
    });
    const trip: SavedTrip = {
      id: `${destination.id}-${originId}-${Date.now()}`,
      destinationId: destination.id,
      destinationName: destination.name,
      originId,
      originName: origin.name,
      mood: selectedMood,
      budget,
      days,
      partySize,
      mode: transport,
      estimate: estimate.total,
      savedAt: new Date().toISOString(),
    };
    persistTrips([trip, ...savedTrips].slice(0, 12));
    setToast(`${destination.name} tucked away for later.`);
  }, [budget, days, liveData, origin.name, originId, partySize, petrolPrice, persistTrips, savedTrips, selectedMood, transport]);

  const openTrip = useCallback((destination: Destination) => {
    setSavedPanelOpen(false);
    setSelected(destination);
    setLiveData(null);
    setLiveError("");
  }, []);

  const buildEscape = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setToast(`Found ${visibleDestinations.length} places for your ${selectedMood === "all" ? "next escape" : getMoodLabel(selectedMood)}.`);
    document.getElementById("discover")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeSavedTrip = (trip: SavedTrip) => {
    persistTrips(savedTrips.filter((item) => item.id !== trip.id));
    setToast(`${trip.destinationName} removed from your saved list.`);
  };

  const reopenSavedTrip = (trip: SavedTrip) => {
    const destination = getDestination(trip.destinationId);
    if (!destination) return;
    setOriginId(trip.originId);
    setBudget(trip.budget);
    setDays(trip.days);
    setPartySize(trip.partySize);
    setTransport(trip.mode);
    setSelectedMood(trip.mood);
    openTrip(destination);
  };

  const setMood = (mood: MoodId | "all") => {
    setSelectedMood(mood);
    setFitsOnly(false);
  };

  const visitorMode = selectedEstimate?.mode ?? transport;
  const petrolLabel = liveData?.fuel.live && liveData.fuel.pricePkr
    ? `${liveData.fuel.sourceName} · ${liveData.fuel.effectiveDate}`
    : "Planning placeholder · edit to match your local pump";

  return (
    <main className="site-shell" id="top">
      <header className="site-header shell">
        <a className="wordmark" href="#top" aria-label="Rāh Pakistan, back to top">
          <span className="wordmark-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12.6" stroke="currentColor" strokeWidth="1.6" /><path d="M20.8 10.5 18 18l-7 3.4 3.1-7.7 6.7-3.2Z" fill="currentColor" /><circle cx="16" cy="16" r="1.55" fill="#fbf8f0" /></svg>
          </span>
          <span className="wordmark-type">rāh<span>.</span><small>PAKISTAN, YOUR WAY</small></span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#discover">Find your somewhere</a>
          <a href="#how-it-works">How it works</a>
          <a href="#sources">Data notes</a>
        </nav>
        <button className="saved-header-button" type="button" onClick={() => setSavedPanelOpen(true)} aria-label={`Open ${savedTrips.length} saved trips`}>
          <span className="saved-heart" aria-hidden="true">♡</span>
          <span className="saved-header-label">My trips</span>
          <span className="saved-count">{savedTrips.length}</span>
        </button>
      </header>

      <section className="hero shell" aria-labelledby="hero-heading">
        <div className="hero-backdrop" />
        <div className="hero-text">
          <div className="hero-kicker"><span className="live-pulse" /> BUILT FOR THE WAY WE ACTUALLY TRAVEL</div>
          <h1 id="hero-heading">Pakistan,<br />on your <em>terms.</em></h1>
          <p>Good roads, tiny detours, real-ish budgets. Find your kind of escape from the peaks to the coast.</p>
          <div className="hero-trust-row">
            <span><b aria-hidden="true">↗</b> 6 regions, one big map</span>
            <span><b aria-hidden="true">PKR</b> Costed for your crew</span>
          </div>
          <div className="hero-caption"><span className="caption-line" /> A little more local. A lot more you.</div>
        </div>

        <form className="planner-card" onSubmit={buildEscape} aria-label="Plan your Pakistan holiday">
          <div className="planner-card-top">
            <div><p className="eyebrow">YOUR TRIP, YOUR CALL</p><h2>Where to next?</h2></div>
            <span className="planner-step">01 <i>/</i> 03</span>
          </div>

          <label className="field-label" htmlFor="departure-city">Starting from</label>
          <div className="select-wrap city-select-wrap">
            <span className="control-icon" aria-hidden="true">⌖</span>
            <select id="departure-city" value={originId} onChange={(event) => setOriginId(event.target.value)}>
              {origins.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <span className="select-chevron" aria-hidden="true">⌄</span>
          </div>

          <div className="mood-label-row"><span className="field-label">Pick your mood</span><button type="button" className={`quiet-link ${selectedMood === "all" ? "quiet-link-active" : ""}`} onClick={() => setMood(selectedMood === "all" ? "nature" : "all")}>{selectedMood === "all" ? "Pick a mood" : "Surprise me"}</button></div>
          <div className="mood-options" role="group" aria-label="Holiday mood">
            {moods.map((mood) => (
              <button key={mood.id} type="button" onClick={() => setMood(mood.id)} className={`mood-chip ${selectedMood === mood.id ? "is-selected" : ""}`} aria-pressed={selectedMood === mood.id}>
                <span className="mood-emoji" aria-hidden="true">{mood.icon}</span><span>{mood.label}</span>
              </button>
            ))}
          </div>

          <div className="budget-entry-row">
            <div><label className="field-label" htmlFor="trip-budget">Budget for everyone</label><span className="field-hint">Whole trip, in Pakistani rupees</span></div>
            <div className="currency-entry"><span>Rs</span><input id="trip-budget" type="number" min="10000" max="5000000" step="5000" inputMode="numeric" value={budget} onChange={(event) => setBudget(Number(event.target.value) || 0)} /></div>
          </div>
          <input className="budget-slider" aria-label="Adjust the whole-trip budget" type="range" min="20000" max="800000" step="10000" value={Math.max(20000, Math.min(budget, 800000))} onChange={(event) => setBudget(Number(event.target.value))} />
          <div className="range-captions"><span>Rs 20k</span><span>Up to Rs 800k+</span></div>

          <div className="planner-fields-row">
            <div><label className="field-label" htmlFor="stay-length">How long?</label><div className="select-wrap compact-select"><select id="stay-length" value={days} onChange={(event) => setDays(Number(event.target.value))}>{Array.from({ length: 14 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day} {day === 1 ? "day" : "days"}</option>)}</select><span className="select-chevron" aria-hidden="true">⌄</span></div></div>
            <div><label className="field-label" htmlFor="group-size">Who's coming?</label><div className="select-wrap compact-select"><select id="group-size" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}>{Array.from({ length: 8 }, (_, index) => index + 1).map((size) => <option key={size} value={size}>{size} {size === 1 ? "person" : "people"}</option>)}</select><span className="select-chevron" aria-hidden="true">⌄</span></div></div>
          </div>

          <label className="field-label field-label-mode" htmlFor="trip-mode">Getting around</label>
          <div className="select-wrap compact-select style-select"><span className="control-icon" aria-hidden="true">↗</span><select id="trip-mode" value={transport} onChange={(event) => setTransport(event.target.value as TransportMode)}>{transportModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.icon}  {mode.label}</option>)}</select><span className="select-chevron" aria-hidden="true">⌄</span></div>

          <button className="primary-button planner-submit" type="submit"><span>Find my kind of getaway</span><span className="button-arrow" aria-hidden="true">↗</span></button>
          <p className="planner-footnote"><span aria-hidden="true">✳</span> No signup. No pressure. Just useful estimates.</p>
        </form>

        <div className="hero-photo-credit">Hunza, through our eyes · Rāh artwork</div>
      </section>

      <section className="data-ribbon shell" aria-label="Planning data sources">
        <span className="ribbon-label"><span className="ribbon-sparkle" aria-hidden="true">✳</span> THE USEFUL BITS, NOT GUESSWORK</span>
        <span className="ribbon-divider" />
        <span className="ribbon-item"><span className="ribbon-dot ribbon-dot-green" /><span><b>Fuel</b> · OGRA published rates</span></span>
        <span className="ribbon-item"><span className="ribbon-dot ribbon-dot-blue" /><span><b>Roads</b> · OpenStreetMap network</span></span>
        <span className="ribbon-item"><span className="ribbon-dot ribbon-dot-amber" /><span><b>Conditions</b> · Open-Meteo forecast</span></span>
        <a className="ribbon-link" href="#sources">How it works <span aria-hidden="true">↗</span></a>
      </section>

      <section className="discover-section shell" id="discover" aria-labelledby="discover-heading">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow section-eyebrow"><span>02</span> · A GOOD PLACE TO START</p>
            <h2 id="discover-heading">Your kind of <em>somewhere.</em></h2>
            <p className="section-intro">A big little shortlist from every corner of Pakistan. All prices are for your group, not just one person.</p>
          </div>
          <div className="result-tally"><span>{visibleDestinations.length.toString().padStart(2, "0")}</span><small>places to<br />get lost in</small></div>
        </div>

        <div className="discovery-controls">
          <label className="search-box" htmlFor="place-search"><span aria-hidden="true">⌕</span><input id="place-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try Hunza, Balochistan, old city…" /><kbd>/</kbd></label>
          <label className="filter-select-label" htmlFor="region-select"><span className="control-label-small">REGION</span><span className="select-wrap filter-select"><select id="region-select" value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>{regions.map((region) => <option key={region.id} value={region.id}>{region.label}</option>)}</select><span className="select-chevron" aria-hidden="true">⌄</span></span></label>
          <label className="filter-select-label" htmlFor="sort-select"><span className="control-label-small">ORDER BY</span><span className="select-wrap filter-select"><select id="sort-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="best">Best fit</option><option value="cheapest">Lowest estimate</option><option value="closest">Nearest road</option></select><span className="select-chevron" aria-hidden="true">⌄</span></span></label>
          <button type="button" onClick={() => setFitsOnly((current) => !current)} className={`fits-toggle ${fitsOnly ? "is-on" : ""}`} aria-pressed={fitsOnly}><span className="toggle-check" aria-hidden="true">{fitsOnly ? "✓" : ""}</span> Fits my budget</button>
        </div>

        <div className="discovery-moods" role="group" aria-label="Filter places by mood">
          <span className="discovery-moods-label">MOOD</span>
          <button type="button" className={`discovery-mood ${selectedMood === "all" ? "is-selected" : ""}`} onClick={() => setMood("all")} aria-pressed={selectedMood === "all"}>All the moods</button>
          {moods.map((mood) => <button type="button" key={mood.id} className={`discovery-mood ${selectedMood === mood.id ? "is-selected" : ""}`} onClick={() => setMood(mood.id)} aria-pressed={selectedMood === mood.id}><span aria-hidden="true">{mood.icon}</span>{mood.label}</button>)}
        </div>

        {visibleDestinations.length ? (
          <div className="destination-grid">
            {visibleDestinations.map((destination, index) => {
              const estimate = estimateFor(destination);
              const inBudget = estimate.total <= budget;
              const saved = savedDestinationIds.has(destination.id);
              return (
                <article className="destination-card" key={destination.id} style={{ "--card-index": index } as React.CSSProperties}>
                  <div className="destination-photo">
                    <img src={destination.image} alt={destination.imageAlt} loading={index > 5 ? "lazy" : "eager"} />
                    <div className="photo-vignette" />
                    <span className="destination-place-label"><span className="place-pin" aria-hidden="true">●</span>{destination.subregion}</span>
                    <button type="button" className={`favorite-button ${saved ? "is-favorite" : ""}`} onClick={() => toggleSave(destination)} aria-label={saved ? `Remove ${destination.name} from saved trips` : `Save ${destination.name}`} aria-pressed={saved}>{saved ? "♥" : "♡"}</button>
                    <div className="photo-number">{String(index + 1).padStart(2, "0")}<span> / {String(visibleDestinations.length).padStart(2, "0")}</span></div>
                  </div>
                  <div className="destination-card-body">
                    <div className="card-category-row"><span className="card-category">{destination.category}</span><span className={`fit-indicator ${inBudget ? "fit-ok" : "fit-over"}`}><span className="fit-dot" />{inBudget ? "In your range" : "Stretch pick"}</span></div>
                    <button type="button" className="destination-title" onClick={() => openTrip(destination)}>{destination.name}<span aria-hidden="true">↗</span></button>
                    <p className="destination-description">{destination.intro}</p>
                    <div className="mood-tags">{destination.moods.slice(0, 2).map((moodId) => {
                      const moodDetails = moods.find((item) => item.id === moodId);
                      return moodDetails ? <button type="button" key={moodId} onClick={() => setMood(moodId)}>{moodDetails.icon} {moodDetails.label}</button> : null;
                    })}</div>
                    <div className="destination-card-footer">
                      <div className="estimated-amount"><span>YOUR CREW · {days} {days === 1 ? "DAY" : "DAYS"}</span><strong>{formatPKR(estimate.total)}</strong><small>{formatPKR(estimate.perPerson)} each · approx</small></div>
                      <div className="distance-amount"><span>ONE WAY</span><strong>~{estimate.oneWayKm.toLocaleString("en-PK")} <small>km</small></strong><small>{estimate.usesLiveRoadDistance ? "OSRM road route" : "route check on open"}</small></div>
                    </div>
                    <div className="card-action-row"><button type="button" className="text-action" onClick={() => openTrip(destination)}>Plan this trip <span aria-hidden="true">→</span></button><span className="card-plan-note">Stay + getting there</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-results"><span aria-hidden="true">⌕</span><h3>No detours found.</h3><p>Try another region, mood or search. Pakistan's a big place.</p><button className="quiet-link" type="button" onClick={() => { setSearch(""); setSelectedRegion("all"); setMood("all"); setFitsOnly(false); }}>Show me all Pakistan →</button></div>
        )}
        <div className="discovery-footnote"><span>✳</span> Route distance is a map-based estimate; fuel, local fares, stays and season prices can change. Open a place for a live route check and the full breakdown.</div>
      </section>

      <section className="local-first-section shell" id="how-it-works" aria-labelledby="local-heading">
        <div className="local-first-image"><img src="https://images.pexels.com/photos/37258830/pexels-photo-37258830.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200" alt="A local vendor at a traditional street market in northern Pakistan" loading="lazy" /><span className="local-image-note">LOCAL IS ALWAYS A BETTER LENS</span></div>
        <div className="local-first-copy">
          <p className="eyebrow section-eyebrow"><span>03</span> · LESS GUESSING, MORE GOING</p>
          <h2 id="local-heading">Go where the <em>good story</em> is.</h2>
          <p>Start with a feeling. We’ll pair it with places, give the numbers a reality check and point you towards the people who know the road.</p>
          <div className="how-steps">
            <div className="how-step"><span>01</span><div><b>Name the mood.</b><small>Quiet mountains? One big lunch? Your call.</small></div></div>
            <div className="how-step"><span>02</span><div><b>Bring a real budget.</b><small>Tell us where from, who's going and how you like to travel.</small></div></div>
            <div className="how-step"><span>03</span><div><b>Check the actual route.</b><small>Roads, weather and OGRA fuel rates are checked when you open a plan.</small></div></div>
          </div>
          <a href="#discover" className="underlined-link">Find your kind of trip <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="source-section shell" id="sources" aria-labelledby="sources-heading">
        <div className="source-heading"><div><p className="eyebrow section-eyebrow"><span>04</span> · OPEN BOOK</p><h2 id="sources-heading">The fine print,<br /><em>made useful.</em></h2></div><p>No black-box “AI price”. We use official and open sources for the live bits, and label the things that are only estimates.</p></div>
        <div className="source-grid">
          <a className="source-card" href="https://www.ogra.org.pk/notified-petroleum-prices" target="_blank" rel="noreferrer"><span className="source-number">01</span><span className="source-symbol source-symbol-fuel">⌁</span><span className="source-card-main"><b>Petrol, not a guess</b><small>First we check OGRA’s dated archive and readable official PDFs. If a new notice is scan-only, we fall back to the validated OilPrices.pk mirror of OGRA notifications, credited under CC BY 4.0.</small></span><span className="source-open" aria-hidden="true">↗</span></a>
          <a className="source-card" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"><span className="source-number">02</span><span className="source-symbol source-symbol-map">⌖</span><span className="source-card-main"><b>Actual roads, open map</b><small>OpenStreetMap data and an OSRM road route power the distance check and the in-trip route map.</small></span><span className="source-open" aria-hidden="true">↗</span></a>
          <a className="source-card" href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer"><span className="source-number">03</span><span className="source-symbol source-symbol-weather">☼</span><span className="source-card-main"><b>Look up, then go</b><small>Open-Meteo weather forecasts and CAMS air-quality estimates give context, not a safety guarantee.</small></span><span className="source-open" aria-hidden="true">↗</span></a>
          <a className="source-card" href="https://developers.google.com/maps/documentation/urls/get-started" target="_blank" rel="noreferrer"><span className="source-number">04</span><span className="source-symbol source-symbol-google">↗</span><span className="source-card-main"><b>Take it to Google Maps</b><small>Open directions with the route's origin, destination and appropriate travel mode. No Maps API key needed.</small></span><span className="source-open" aria-hidden="true">↗</span></a>
        </div>
        <div className="source-disclaimer"><span className="disclaimer-icon" aria-hidden="true">i</span><p><b>Real talk about the numbers.</b> Stay, food, activities, tolls, local travel and bus prices are planning allowances—not hotel, transport or booking quotations. Car and motorcycle fuel is calculated from the checked (or clearly marked fallback) petrol rate. Flight ranges are illustrative return-fare budgets, not live airline data; use the flight-search link to check actual dates. Always confirm seasonal road access, local rules, weather and travel advisories before setting off.</p></div>
      </section>

      <footer className="site-footer shell">
        <a className="wordmark footer-wordmark" href="#top"><span className="wordmark-icon" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12.6" stroke="currentColor" strokeWidth="1.6" /><path d="M20.8 10.5 18 18l-7 3.4 3.1-7.7 6.7-3.2Z" fill="currentColor" /></svg></span><span className="wordmark-type">rāh<span>.</span><small>A LITTLE MORE LOCAL.</small></span></a>
        <p>Made for the long way around. <span>♥</span> Pakistan</p>
        <div className="footer-links"><a href="#sources">Sources & notes</a><a href="#top">Back to the top ↑</a></div>
      </footer>

      {selected && selectedEstimate ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="trip-modal" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
            <div className="detail-banner">
              <img src={selected.image} alt="" />
              <div className="detail-banner-wash" />
              <div className="detail-banner-top"><span className="detail-region"><span aria-hidden="true">⌖</span> {selected.subregion}</span><button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="Close trip details">×</button></div>
              <div className="detail-banner-copy"><p className="eyebrow">{selected.category.toLocaleUpperCase()} · {selected.province.toLocaleUpperCase()}</p><h2 id="trip-modal-title">{selected.name}</h2><p>{selected.intro}</p></div>
              <div className="detail-banner-credit">IMAGE · {selected.imageCredit.toLocaleUpperCase()}</div>
            </div>

            <div className="trip-modal-content">
              <div className="modal-live-row">
                <div><span className={`live-pulse ${liveLoading ? "is-checking" : ""}`} /><span>{liveLoading ? "Checking the live bits…" : liveData ? "Plan check complete" : "Ready when the road is"}</span></div>
                <button className="refresh-link" type="button" onClick={() => setRefreshCount((count) => count + 1)} disabled={liveLoading}><span aria-hidden="true">↻</span> {liveLoading ? "Checking" : "Refresh live checks"}</button>
              </div>

              {liveError ? <div className="live-error" role="status"><span aria-hidden="true">!</span> {liveError} · Your route map will still open, and you can use the estimates below.</div> : null}

              <div className="detail-layout">
                <div className="detail-main-column">
                  <div className="detail-summary-row"><div><span className="field-label">YOUR ROUTE</span><p className="route-name-line"><span>{origin.name}</span><span className="route-arrow">→</span><b>{selected.name}</b></p></div><div className="route-fact"><b>{selectedEstimate.usesLiveRoadDistance ? selectedEstimate.oneWayKm.toLocaleString("en-PK") : `~${selectedEstimate.oneWayKm.toLocaleString("en-PK")}`} km</b><small>one way · road estimate</small></div></div>
                  <div className="map-frame"><div className="map-topbar"><span><i className="route-live-dot" /> {liveData?.route ? "ROAD NETWORK · LIVE CHECK" : "MAP · STRAIGHT-LINE UNTIL CHECKED"}</span><span>OPENSTREETMAP</span></div><PakistanMap originName={origin.name} destinationName={selected.name} originCoordinates={origin.coordinates} destinationCoordinates={selected.coordinates} routePath={liveData?.destination.id === selected.id ? liveData.route?.path ?? [] : []} /></div>
                  <p className="map-note"><span aria-hidden="true">✳</span> {liveData?.route?.source ?? "Map and road routes are best-effort. The live road-network check runs when you open a plan."}{liveData?.route ? ` · Approx. ${Math.floor(liveData.route.durationMinutes / 60)} hr ${liveData.route.durationMinutes % 60} min before stops.` : ""}</p>

                  <div className="live-weather-grid">
                    <div className="condition-card weather-condition-card">
                      <span className="condition-overline">AT THE DESTINATION <span className="condition-status">{liveData?.weather ? "LIVE CHECK" : "FORECAST"}</span></span>
                      {liveData?.weather ? <><div className="weather-reading"><span>{liveData.weather.icon}</span><b>{liveData.weather.temperature}°</b><small>feels like {liveData.weather.feelsLike}°C</small></div><div className="weather-description">{liveData.weather.label} <span>·</span> wind {liveData.weather.windSpeed} km/h {liveData.weather.humidity !== null ? `· ${liveData.weather.humidity}% humidity` : ""}</div><div className="three-day-strip">{liveData.weather.threeDay.map((day, index) => <div key={`${index}-${day.max}`}><span>{index === 0 ? "TODAY" : index === 1 ? "TOMORROW" : "DAY 03"}</span><b>{day.max}° <i>{day.min}°</i></b><small>{day.rainChance === null ? "—" : `${day.rainChance}% rain`}</small></div>)}</div></> : <><div className="condition-placeholder"><span aria-hidden="true">☼</span><p>{liveLoading ? "Checking current conditions…" : "Open-Meteo conditions will appear after a live check."}</p></div><a className="tiny-source-link" href="https://open-meteo.com" target="_blank" rel="noreferrer">Weather model · Open-Meteo ↗</a></>}
                    </div>
                    <div className="condition-card air-condition-card">
                      <span className="condition-overline">AIR QUALITY <span className="condition-status">CAMS MODEL</span></span>
                      {liveData?.airQuality ? <><div className="air-reading"><span className={`aqi-score ${qualityTone(liveData.airQuality.usAqi)}`}>{liveData.airQuality.usAqi}</span><div><b className={qualityTone(liveData.airQuality.usAqi)}>{liveData.airQuality.label}</b><small>US AQI · at {selected.name}</small></div></div><div className="pollutant-list"><span>PM2.5 <b>{liveData.airQuality.pm25 ?? "—"} <i>μg/m³</i></b></span><span>PM10 <b>{liveData.airQuality.pm10 ?? "—"} <i>μg/m³</i></b></span></div><p className="air-footnote">Modelled air-quality guidance; not a live station or health advisory.</p></> : <><div className="condition-placeholder"><span aria-hidden="true">◌</span><p>{liveLoading ? "Checking the air-quality model…" : "A modelled air-quality check is available with your route."}</p></div><a className="tiny-source-link" href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Air data · CAMS / Open-Meteo ↗</a></>}
                    </div>
                  </div>

                  <div className="local-note-card"><span className="local-note-icon" aria-hidden="true">✳</span><div><span className="condition-overline">A NOTE FROM THE LOCAL LENS</span><p>{selected.localTip}</p><span className="best-time-line">GOOD WINDOW · {selected.bestTime}</span></div></div>
                </div>

                <aside className="trip-budget-column">
                  <div className="trip-budget-panel">
                    <div className="budget-panel-top"><div><span className="condition-overline">THE HONEST-ISH TOTAL</span><h3>Your trip,<br />roughly.</h3></div><span className={`budget-status-bubble ${selectedEstimate.total <= budget ? "budget-good" : "budget-stretch"}`}>{selectedEstimate.total <= budget ? "IN RANGE" : "OVER PLAN"}</span></div>
                    <p className="estimate-context">{days} {days === 1 ? "day" : "days"} <span>·</span> {partySize} {wordForPeople(partySize)} <span>·</span> {selectedEstimate.modeLabel.toLowerCase()}</p>
                    <strong className="trip-total-number">{formatPKR(selectedEstimate.total)}</strong>
                    {selectedEstimate.usesAirfareRange ? <p className="fare-range-note">Air option · {formatPKR(selectedEstimate.lowTotal)}–{formatPKR(selectedEstimate.highTotal)} planning range for your crew.</p> : <p className="per-person-label">about <b>{formatPKR(selectedEstimate.perPerson)}</b> each <span>·</span> your budget {formatPKR(budget)}</p>}
                    <div className="budget-progress" aria-label={`${Math.min(100, Math.round((selectedEstimate.total / Math.max(1, budget)) * 100))} percent of budget`}><span style={{ width: `${Math.min(100, Math.max(2, (selectedEstimate.total / Math.max(1, budget)) * 100))}%` }} className={selectedEstimate.total > budget ? "over-budget-bar" : ""} /></div>
                    <div className="transport-choice-label"><span className="field-label">GET THERE YOUR WAY</span><span className="field-hint">One-way road distance</span></div>
                    <div className="transport-choice-grid">
                      {transportModes.map((mode) => (
                        <button type="button" key={mode.id} onClick={() => setTransport(mode.id)} disabled={mode.id === "flight" && !selected.flight} className={`transport-choice ${selectedEstimate.mode === mode.id ? "is-picked" : ""} ${mode.id === "flight" && !selected.flight ? "is-unavailable" : ""}`} aria-pressed={selectedEstimate.mode === mode.id} title={mode.id === "flight" && !selected.flight ? "No reliable scheduled airport fare is listed for this destination." : undefined}><span aria-hidden="true">{mode.icon}</span>{mode.label}</button>
                      ))}
                    </div>

                    <div className="breakdown-list">
                      <div className="breakdown-line"><span><i className="breakdown-dot stay-dot" />Stay · {selectedEstimate.nights} {selectedEstimate.nights === 1 ? "night" : "nights"}</span><b>{formatPKR(selectedEstimate.staying)}</b></div>
                      <div className="breakdown-line"><span><i className="breakdown-dot food-dot" />Food & chai · {days} {days === 1 ? "day" : "days"}</span><b>{formatPKR(selectedEstimate.food)}</b></div>
                      <div className="breakdown-line"><span><i className="breakdown-dot activity-dot" />Activities · allowance</span><b>{formatPKR(selectedEstimate.activities)}</b></div>
                      <div className="breakdown-line"><span><i className="breakdown-dot transport-dot" />{selectedEstimate.mode === "walk" ? "Intercity coach" : selectedEstimate.mode === "flight" ? "Flight + airport ride" : selectedEstimate.mode === "car" ? "Fuel + toll cushion" : selectedEstimate.mode === "motorcycle" ? "Bike fuel + road allowance" : "Intercity coach"}</span><b>{formatPKR(selectedEstimate.transport)}</b></div>
                      <div className="breakdown-line"><span><i className="breakdown-dot local-dot" />Getting around locally</span><b>{formatPKR(selectedEstimate.local)}</b></div>
                    </div>

                    {(selectedEstimate.mode === "car" || selectedEstimate.mode === "motorcycle") ? <div className="fuel-rate-control"><div><label className="field-label" htmlFor="fuel-rate">PETROL · PER LITRE</label><small className={liveData?.fuel.live ? "live-fuel-label" : "estimate-fuel-label"}>{petrolLabel}</small>{liveData?.fuel.live ? <a className="fuel-source-link" href={liveData.fuel.documentUrl ?? liveData.fuel.archiveUrl} target="_blank" rel="noreferrer">View notified rate source ↗</a> : null}</div><div className="currency-entry fuel-entry"><span>Rs</span><input id="fuel-rate" type="number" min="100" max="2000" step="1" value={petrolPrice} onChange={(event) => { petrolWasEditedByVisitor.current = true; setPetrolPrice(Math.max(0, Number(event.target.value) || 0)); }} aria-label="Petrol rate in Pakistani rupees per litre" /></div></div> : null}

                    <div className="transport-explainer">
                      {selectedEstimate.mode === "flight" && selected.flight ? <><b>{selected.flight.airport} · {selected.flight.code}</b><span>{selected.flight.note ?? "Indicative round-trip fare range, not live seats."} <a href={googleFlightsUrl(originId, selected)} target="_blank" rel="noreferrer">Check flights ↗</a></span></> : selectedEstimate.mode === "car" ? <><b>Own car · fuel-first estimate</b><span>{selectedEstimate.fuelLitres} L for the round trip at {formatPKR(petrolPrice)}/L, plus a light toll/parking cushion. Vehicle hire not included.</span></> : selectedEstimate.mode === "motorcycle" ? <><b>Motorcycle · group bikes included</b><span>{selectedEstimate.fuelLitres} L estimate for {selectedEstimate.roundTripKm.toLocaleString("en-PK")} return kilometres. Bikes assumed at ~34 km/L; roads and weather matter.</span></> : selectedEstimate.mode === "walk" ? <><b>Walk the local bits, not the intercity miles</b><span>Intercity coach cost stays in the plan; local walks are budgeted as free. An optional rickshaw is not included.</span></> : <><b>Coach fare · planning proxy</b><span>Allowance based on an estimated PKR/km seat rate, not a quote from a bus operator. Check the actual route and class.</span></>}
                    </div>

                    <button type="button" onClick={() => toggleSave(selected)} className={`save-trip-button ${savedDestinationIds.has(selected.id) ? "is-saved" : ""}`}><span aria-hidden="true">{savedDestinationIds.has(selected.id) ? "♥" : "♡"}</span>{savedDestinationIds.has(selected.id) ? "Saved · remove trip" : "Save this little plan"}</button>
                    <a className="google-route-button" href={googleMapsUrl(originId, selected, visitorMode)} target="_blank" rel="noreferrer"><span>Open this route in Google Maps</span><span aria-hidden="true">↗</span></a>
                    {selected.flight ? <a className="flight-route-link" href={googleFlightsUrl(originId, selected)} target="_blank" rel="noreferrer">Compare actual flights to {selected.flight.code} <span aria-hidden="true">↗</span></a> : null}
                    <p className="mini-estimate-disclaimer">Illustrative estimates—not quotes. The live map, weather and OGRA rate refresh when this plan opens. Flight budgets are a manual, indicative range.</p>
                  </div>
                </aside>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {savedPanelOpen ? (
        <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSavedPanelOpen(false); }}>
          <aside className="saved-drawer" role="dialog" aria-modal="true" aria-labelledby="saved-heading">
            <div className="saved-drawer-top"><div><p className="eyebrow section-eyebrow">SAVED FOR A RAINY DAY</p><h2 id="saved-heading">Your little <em>list.</em></h2></div><button type="button" className="modal-close drawer-close" onClick={() => setSavedPanelOpen(false)} aria-label="Close saved trips">×</button></div>
            <p className="saved-drawer-description">Your plans stay in this browser, just for you. No account and no shared trip list.</p>
            {savedTrips.length ? <div className="saved-list">{savedTrips.map((trip) => <article className="saved-list-item" key={trip.id}>
              <span className="saved-item-emoji" aria-hidden="true">{getDestination(trip.destinationId)?.moods[0] === "coast" ? "🌊" : getDestination(trip.destinationId)?.moods.includes("heritage") ? "🏛" : "⛰"}</span>
              <div className="saved-list-content"><span>{trip.originName} · {trip.days} {trip.days === 1 ? "day" : "days"}</span><b>{trip.destinationName}</b><small>{formatPKR(trip.estimate)} · {trip.partySize} {wordForPeople(trip.partySize)}</small></div>
              <button type="button" className="saved-open-button" onClick={() => reopenSavedTrip(trip)} aria-label={`Open ${trip.destinationName} plan`}>↗</button>
              <button type="button" className="saved-remove-button" onClick={() => removeSavedTrip(trip)} aria-label={`Remove ${trip.destinationName}`}>&times;</button>
            </article>)}</div> : <div className="saved-empty"><span aria-hidden="true">♡</span><h3>Nothing tucked away yet.</h3><p>Tap the heart on a place to keep it here.</p><button type="button" className="primary-button" onClick={() => { setSavedPanelOpen(false); document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }); }}>Find a place <span aria-hidden="true">↗</span></button></div>}
            <div className="saved-drawer-note"><span aria-hidden="true">⌂</span> Stored locally in this browser. Nothing to sign up for.</div>
          </aside>
        </div>
      ) : null}

      {toast ? <div role="status" className="toast-message"><span aria-hidden="true">✳</span>{toast}<button type="button" onClick={() => setToast("")} aria-label="Dismiss notification">×</button></div> : null}
    </main>
  );
}
