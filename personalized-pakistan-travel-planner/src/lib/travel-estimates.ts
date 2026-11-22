import { getOrigin, type Destination, type MoodId } from "./travel-data";

export type TransportMode = "smart" | "car" | "motorcycle" | "bus" | "walk" | "flight";

export const transportModes: { id: TransportMode; label: string; icon: string }[] = [
  { id: "smart", label: "Smart pick", icon: "✦" },
  { id: "car", label: "My car", icon: "🚙" },
  { id: "motorcycle", label: "Motorcycle", icon: "🏍️" },
  { id: "bus", label: "Bus / coach", icon: "🚌" },
  { id: "walk", label: "Walk locally", icon: "🚶" },
  { id: "flight", label: "Fly + local ride", icon: "✈️" },
];

export const DEFAULT_PETROL_PRICE_PKR = 330;

export type EstimateInput = {
  originId: string;
  days: number;
  partySize: number;
  mode: TransportMode;
  petrolPrice: number;
  roadDistanceKm?: number | null;
};

export type TripEstimate = {
  mode: TransportMode;
  modeLabel: string;
  oneWayKm: number;
  roundTripKm: number;
  staying: number;
  food: number;
  activities: number;
  transport: number;
  local: number;
  fuel: number;
  fuelLitres: number;
  total: number;
  lowTotal: number;
  highTotal: number;
  perPerson: number;
  nights: number;
  usesAirfareRange: boolean;
  usesLiveRoadDistance: boolean;
};

export function distanceBetweenKm(a: [number, number], b: [number, number]): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const arc =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

export function getEstimatedRoadDistance(originId: string, destination: Destination): number {
  const origin = getOrigin(originId);
  if (!origin) return 0;
  const directDistance = distanceBetweenKm(origin.coordinates, destination.coordinates);
  if (directDistance < 1) return 0;
  return Math.round(directDistance * (directDistance < 100 ? 1.27 : 1.32));
}

export function estimateTrip(destination: Destination, input: EstimateInput): TripEstimate {
  const origin = getOrigin(input.originId);
  const straightDistance = origin ? distanceBetweenKm(origin.coordinates, destination.coordinates) : 0;
  const fallbackDistance = getEstimatedRoadDistance(input.originId, destination);
  const hasLiveRoadDistance = Number.isFinite(input.roadDistanceKm) && (input.roadDistanceKm ?? 0) > 0;
  const oneWayKm = hasLiveRoadDistance ? Math.max(0, input.roadDistanceKm ?? 0) : fallbackDistance;
  const roundTripKm = oneWayKm * 2;
  const partySize = Math.max(1, Math.min(12, Math.round(input.partySize)));
  const days = Math.max(1, Math.min(21, Math.round(input.days)));
  const nights = Math.max(0, days - 1);
  const hasAirConnection = Boolean(destination.flight?.code && origin?.airportCode !== destination.flight.code);

  let mode = input.mode;
  if (mode === "smart") {
    if (oneWayKm >= 800 && hasAirConnection) mode = "flight";
    else if (oneWayKm >= 300) mode = "bus";
    else mode = "car";
  }
  if (mode === "flight" && !hasAirConnection) mode = "bus";

  const staying = destination.stayPerNight * nights * partySize;
  const food = destination.foodPerDay * days * partySize;
  const activities = destination.activityBudget * partySize;
  const petrolPrice = Math.max(0, Number.isFinite(input.petrolPrice) ? input.petrolPrice : DEFAULT_PETROL_PRICE_PKR);
  let transport = 0;
  let local = 0;
  let fuel = 0;
  let fuelLitres = 0;
  let lowTotal = 0;
  let highTotal = 0;

  if (oneWayKm < 2) {
    local = mode === "walk" ? 0 : destination.localRidePerDay * days * partySize;
  } else if (mode === "car") {
    const cars = Math.ceil(partySize / 4);
    fuelLitres = roundTripKm / 12 * cars;
    fuel = Math.round(fuelLitres * petrolPrice);
    const motorwayAndParkingAllowance = Math.round(roundTripKm * 0.85 * cars);
    transport = fuel + motorwayAndParkingAllowance;
    local = destination.localRidePerDay * Math.max(0, days - 1) * partySize;
  } else if (mode === "motorcycle") {
    const motorcycles = Math.ceil(partySize / 2);
    fuelLitres = roundTripKm / 34 * motorcycles;
    fuel = Math.round(fuelLitres * petrolPrice);
    const roadAllowance = Math.round(roundTripKm * 0.22 * motorcycles);
    transport = fuel + roadAllowance;
    local = destination.localRidePerDay * Math.max(0, days - 1) * partySize;
  } else if (mode === "flight" && destination.flight) {
    const range = destination.flight;
    const transfer = (range.transferPerPerson ?? 0) * partySize;
    const lowFare = range.roundTripLow * partySize + transfer;
    const highFare = range.roundTripHigh * partySize + transfer;
    transport = Math.round((lowFare + highFare) / 2);
    lowTotal = staying + food + activities + lowFare;
    highTotal = staying + food + activities + highFare;
    local = destination.localRidePerDay * Math.max(0, days - 1) * partySize;
  } else if (mode === "walk") {
    // Walking is for the destination itself; reaching it is budgeted as a coach trip.
    transport = Math.round(roundTripKm * 3.7 * partySize + 900 * partySize);
    local = 0;
  } else {
    // A planning proxy for an intercity coach seat, not a quoted operator fare.
    transport = oneWayKm < 2 ? 0 : Math.round(roundTripKm * 3.7 * partySize + 900 * partySize);
    local = destination.localRidePerDay * Math.max(0, days - 1) * partySize;
  }

  const total = Math.round(staying + food + activities + transport + local);
  if (lowTotal === 0 && highTotal === 0) {
    lowTotal = total;
    highTotal = total;
  } else {
    lowTotal += local;
    highTotal += local;
  }

  const modeLabel =
    mode === "flight" ? "Fly + local ride" :
    mode === "motorcycle" ? "Motorcycle" :
    mode === "car" ? "Car · fuel & toll cushion" :
    mode === "walk" ? "Coach there · walk locally" :
    "Intercity bus / coach";

  return {
    mode,
    modeLabel,
    oneWayKm: Math.round(oneWayKm),
    roundTripKm: Math.round(roundTripKm),
    staying,
    food,
    activities,
    transport,
    local,
    fuel,
    fuelLitres: Math.round(fuelLitres * 10) / 10,
    total,
    lowTotal: Math.round(lowTotal),
    highTotal: Math.round(highTotal),
    perPerson: Math.round(total / partySize),
    nights,
    usesAirfareRange: mode === "flight" && Boolean(destination.flight),
    usesLiveRoadDistance: hasLiveRoadDistance,
  };
}

export function getMoodLabel(mood: MoodId): string {
  const labels: Record<MoodId, string> = {
    nature: "green & quiet",
    food: "food-first",
    heritage: "history-rich",
    coast: "coastal",
    adventure: "adventurous",
    slow: "slow-paced",
  };
  return labels[mood];
}

export function formatPKR(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
}
