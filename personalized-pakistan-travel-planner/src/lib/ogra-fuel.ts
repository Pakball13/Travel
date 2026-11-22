import pdfParse from "pdf-parse";

export type OgRaFuelRate = {
  pricePkr: number;
  effectiveDate: string;
  documentUrl: string;
  archiveUrl: string;
  sourceName: string;
};

type ArchiveItem = { id: number; date: string };
type MirrorLatest = {
  effectiveDate?: unknown;
  products?: { product?: unknown; pricePkr?: unknown; unit?: unknown }[];
};

const OGRA_ARCHIVE = "https://www.ogra.org.pk/notified-petroleum-prices";
const OGRA_ORIGIN = "https://www.ogra.org.pk";
const OILPRICES_API = "https://oilprices.pk/api/latest";
const OILPRICES_DOCS = "https://oilprices.pk/fuel-price-api-pakistan";

let cachedRate: { value: OgRaFuelRate; expiresAt: number } | null = null;

function getNewestNotice(html: string): ArchiveItem | null {
  const listItem = html.match(/<li\b[^>]*>[\s\S]{0,1200}?Notification Petroleum Products Prices Effective Dated\s+([^<]+)<\/p>[\s\S]{0,800}?href=["']https?:\/\/www\.ogra\.org\.pk\/download\/(\d+)/i);
  if (!listItem) return null;
  const id = Number(listItem[2]);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return { id, date: listItem[1].replace(/\s+/g, " ").trim() };
}

function extractOfficialPetrolPrice(pdfText: string): number | null {
  const text = pdfText.replace(/[\u00a0\s]+/g, " ").replace(/,/g, " ");
  const start = text.search(/Total\s+Petrol\s+Price\s*\(\s*excl/i);
  const endOfPetrol = text.search(/Diesel\s*\(\s*HSD\s*\)\s*Price|Total\s+Diesel\s+Price/i);
  if (start < 0) return null;
  const end = endOfPetrol > start ? Math.min(endOfPetrol, start + 900) : start + 350;
  const section = text.slice(start, end);
  const values = [...section.matchAll(/\b(\d{2,3}(?:\.\d{1,2})?)\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 150 && value <= 1200);

  // Use only a rate immediately within OGRA's labelled petrol-price block.
  // A scanned notification, an outlet list or an unlabelled number is rejected.
  const price = values.at(-1);
  return price && price > 0 ? price : null;
}

async function downloadPdfPrice(documentId: number, date: string): Promise<OgRaFuelRate | null> {
  const documentUrl = `${OGRA_ORIGIN}/download/${documentId}?lang=en`;
  try {
    const response = await fetch(documentUrl, {
      signal: AbortSignal.timeout(8500),
      cache: "no-store",
      headers: { "User-Agent": "RahPakistanHolidayPlanner/1.0 (official fuel-rate lookup)" },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const hostname = new URL(response.url).hostname;
    if (hostname !== "www.ogra.org.pk" && hostname !== "ogra.org.pk") return null;
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > 9_000_000) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength < 1000 || bytes.byteLength > 9_000_000 || bytes.subarray(0, 4).toString() !== "%PDF") return null;
    const parsed = await pdfParse(bytes, { max: 2 });
    const pricePkr = extractOfficialPetrolPrice(parsed.text);
    if (!pricePkr) return null;
    return {
      pricePkr,
      effectiveDate: date,
      documentUrl,
      archiveUrl: OGRA_ARCHIVE,
      sourceName: "OGRA · official price-components PDF",
    };
  } catch {
    return null;
  }
}

async function readOfficialArchive(): Promise<OgRaFuelRate | null> {
  try {
    const response = await fetch(OGRA_ARCHIVE, {
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
      headers: { "User-Agent": "RahPakistanHolidayPlanner/1.0 (official fuel-rate lookup)" },
    });
    if (!response.ok) return null;
    const notice = getNewestNotice(await response.text());
    if (!notice) return null;

    // The archive's notice is sometimes an image scan. Only accept a nearby
    // OGRA PDF if it contains the actual labelled nationwide petrol-price block.
    const candidates = [notice.id - 2, notice.id - 1, notice.id + 1, notice.id + 2];
    for (const documentId of candidates) {
      if (documentId < 1) continue;
      const rate = await downloadPdfPrice(documentId, notice.date);
      if (rate) return rate;
    }
  } catch {
    return null;
  }
  return null;
}

async function readOgraMirror(): Promise<OgRaFuelRate | null> {
  try {
    const response = await fetch(OILPRICES_API, {
      signal: AbortSignal.timeout(5500),
      cache: "no-store",
      headers: { "Accept": "application/json", "User-Agent": "RahPakistanHolidayPlanner/1.0 (OGRA fuel estimate)" },
    });
    if (!response.ok || !["oilprices.pk", "www.oilprices.pk"].includes(new URL(response.url).hostname)) return null;
    const data = await response.json() as MirrorLatest;
    const effectiveDate = typeof data.effectiveDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.effectiveDate)
      ? data.effectiveDate
      : null;
    const petrol = data.products?.find((product) =>
      typeof product.product === "string" && /motor\s+spirit|petrol/i.test(product.product) &&
      typeof product.unit === "string" && /litre|liter/i.test(product.unit),
    );
    const pricePkr = Number(petrol?.pricePkr);
    if (!effectiveDate || !Number.isFinite(pricePkr) || pricePkr < 150 || pricePkr > 1200) return null;

    const effectiveAt = Date.parse(`${effectiveDate}T00:00:00Z`);
    const ageMs = Date.now() - effectiveAt;
    if (!Number.isFinite(effectiveAt) || ageMs > 45 * 24 * 60 * 60 * 1000 || ageMs < -2 * 24 * 60 * 60 * 1000) return null;

    return {
      pricePkr,
      effectiveDate,
      documentUrl: OILPRICES_DOCS,
      archiveUrl: OGRA_ARCHIVE,
      sourceName: "OGRA-sourced · OilPrices.pk mirror (CC BY 4.0)",
    };
  } catch {
    return null;
  }
}

export async function getOgraPetrolRate(): Promise<OgRaFuelRate | null> {
  if (cachedRate && cachedRate.expiresAt > Date.now()) return cachedRate.value;

  const officialRate = await readOfficialArchive();
  if (officialRate) {
    cachedRate = { value: officialRate, expiresAt: Date.now() + 30 * 60 * 1000 };
    return officialRate;
  }

  const attributedMirrorRate = await readOgraMirror();
  if (attributedMirrorRate) {
    cachedRate = { value: attributedMirrorRate, expiresAt: Date.now() + 5 * 60 * 1000 };
    return attributedMirrorRate;
  }
  return null;
}
