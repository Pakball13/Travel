import { NextRequest } from "next/server";
import { getOgraPetrolRate } from "@/lib/ogra-fuel";
import { getDestination, getOrigin } from "@/lib/travel-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const timeout = (ms: number) => AbortSignal.timeout(ms);

type OsrmResponse = {
  code?: string;
  routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[];
};

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    relative_humidity_2m?: number;
  };
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_probability_max?: number[] };
  timezone?: string;
};

type AirResponse = { current?: { us_aqi?: number; pm2_5?: number; pm10?: number } };

function weatherDescription(code: number | undefined): { label: string; icon: string } {
  if (code === undefined) return { label: "Conditions unavailable", icon: "—" };
  if (code === 0) return { label: "Clear skies", icon: "☀" };
  if (code <= 2) return { label: "Partly cloudy", icon: "◐" };
  if (code === 3) return { label: "Cloudy", icon: "☁" };
  if (code <= 48) return { label: "Mist or fog", icon: "〰" };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Rain nearby", icon: "☂" };
  if (code <= 77) return { label: "Snow or sleet", icon: "❄" };
  if (code >= 95) return { label: "Thunderstorm", icon: "ϟ" };
  return { label: "Changeable skies", icon: "☁" };
}

function airQualityLabel(aqi: number | undefined): string {
  if (aqi === undefined) return "Unavailable";
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Fair";
  if (aqi <= 150) return "Sensitive groups";
  if (aqi <= 200) return "Poor";
  return "Very poor";
}

export async function GET(request: NextRequest) {
  const originId = request.nextUrl.searchParams.get("origin") ?? "";
  const destinationId = request.nextUrl.searchParams.get("destination") ?? "";
  const origin = getOrigin(originId);
  const destination = getDestination(destinationId);

  if (!origin || !destination) {
    return Response.json({ error: "Choose a listed Pakistani city and destination." }, { status: 400 });
  }

  const [routeResult, weatherResult, airResult, fuelResult] = await Promise.allSettled([
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.coordinates[1]},${origin.coordinates[0]};${destination.coordinates[1]},${destination.coordinates[0]}?overview=simplified&geometries=geojson&steps=false`,
      { signal: timeout(9000), cache: "no-store", headers: { "User-Agent": "RahPakistanHolidayPlanner/1.0" } },
    ).then(async (response) => (response.ok ? (response.json() as Promise<OsrmResponse>) : null)),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${destination.coordinates[0]}&longitude=${destination.coordinates[1]}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`,
      { signal: timeout(9000), next: { revalidate: 900 } },
    ).then(async (response) => (response.ok ? (response.json() as Promise<WeatherResponse>) : null)),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${destination.coordinates[0]}&longitude=${destination.coordinates[1]}&current=us_aqi,pm2_5,pm10&timezone=auto`,
      { signal: timeout(9000), next: { revalidate: 1800 } },
    ).then(async (response) => (response.ok ? (response.json() as Promise<AirResponse>) : null)),
    getOgraPetrolRate(),
  ]);

  const routeResponse = routeResult.status === "fulfilled" ? routeResult.value : null;
  const roadRoute = routeResponse?.code === "Ok" ? routeResponse.routes?.[0] : undefined;
  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const air = airResult.status === "fulfilled" ? airResult.value : null;
  const fuel = fuelResult.status === "fulfilled" ? fuelResult.value : null;
  const currentWeather = weather?.current;
  const conditions = weatherDescription(currentWeather?.weather_code);
  const aqi = air?.current?.us_aqi;
  const forecastDays = weather?.daily?.temperature_2m_max?.map((max, index) => ({
    max: Math.round(max),
    min: Math.round(weather.daily?.temperature_2m_min?.[index] ?? max),
    rainChance: weather.daily?.precipitation_probability_max?.[index] ?? null,
  })) ?? [];

  return Response.json(
    {
      fetchedAt: new Date().toISOString(),
      origin: { id: origin.id, name: origin.name, coordinates: origin.coordinates },
      destination: { id: destination.id, name: destination.name, coordinates: destination.coordinates },
      route: roadRoute ? {
        distanceKm: Math.round((roadRoute.distance ?? 0) / 100) / 10,
        durationMinutes: Math.round((roadRoute.duration ?? 0) / 60),
        path: roadRoute.geometry?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) ?? [],
        source: "OpenStreetMap road network · OSRM",
      } : null,
      weather: currentWeather?.temperature_2m !== undefined ? {
        temperature: Math.round(currentWeather.temperature_2m),
        feelsLike: Math.round(currentWeather.apparent_temperature ?? currentWeather.temperature_2m),
        windSpeed: Math.round(currentWeather.wind_speed_10m ?? 0),
        humidity: currentWeather.relative_humidity_2m ?? null,
        code: currentWeather.weather_code ?? null,
        label: conditions.label,
        icon: conditions.icon,
        timezone: weather?.timezone ?? null,
        threeDay: forecastDays,
        source: "Open-Meteo · national weather-service models",
      } : null,
      airQuality: aqi !== undefined ? {
        usAqi: Math.round(aqi),
        pm25: air?.current?.pm2_5 ?? null,
        pm10: air?.current?.pm10 ?? null,
        label: airQualityLabel(aqi),
        source: "Open-Meteo · CAMS atmospheric model",
      } : null,
      fuel: fuel ? {
        pricePkr: fuel.pricePkr,
        effectiveDate: fuel.effectiveDate,
        sourceName: fuel.sourceName,
        documentUrl: fuel.documentUrl,
        archiveUrl: fuel.archiveUrl,
        live: true,
      } : {
        pricePkr: null,
        effectiveDate: null,
        sourceName: "OGRA official archive · unable to confirm a searchable rate right now",
        documentUrl: null,
        archiveUrl: "https://www.ogra.org.pk/notified-petroleum-prices",
        live: false,
      },
      sources: {
        map: "© OpenStreetMap contributors",
        route: roadRoute ? "OSRM road-network estimate" : "Road route temporarily unavailable; using a straight-line planning estimate",
      },
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
