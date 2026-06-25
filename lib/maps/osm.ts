export interface LeadSocials {
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  vk?: string;
  facebook?: string;
  youtube?: string;
}

export interface RawBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: string | null;
  socials: LeadSocials;
  /** True when OSM marks this POI as part of a brand/chain. */
  isChain: boolean;
  lat: number | null;
  lng: number | null;
  source: string;
}

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const UA = "ApolloFlowBot/1.0 (lead-finder)";

/** Maps a known niche to a set of Overpass tag filters. */
const NICHE_FILTERS: Record<string, string[]> = {
  "салон красоты": ['"shop"="beauty"', '"shop"="hairdresser"'],
  барбершоп: ['"shop"="hairdresser"'],
  "маникюрный салон": ['"shop"="beauty"', '"beauty"="nails"'],
  косметология: ['"shop"="beauty"', '"healthcare"="cosmetic"'],
  "магазин духов": ['"shop"="perfumery"', '"shop"="cosmetics"'],
  "цветочный магазин": ['"shop"="florist"'],
  автосервис: ['"shop"="car_repair"', '"amenity"="fuel"'],
  стоматология: ['"amenity"="dentist"', '"healthcare"="dentist"'],
  кафе: ['"amenity"="cafe"'],
  ресторан: ['"amenity"="restaurant"'],
  пиццерия: ['"cuisine"="pizza"'],
  "фитнес клуб": ['"leisure"="fitness_centre"', '"sport"="fitness"'],
  юрист: ['"office"="lawyer"'],
  недвижимость: ['"office"="estate_agent"'],
  "частная клиника": ['"amenity"="clinic"', '"healthcare"="clinic"'],
  "детский центр": ['"amenity"="kindergarten"', '"amenity"="childcare"'],
  школа: ['"amenity"="school"'],
  отель: ['"tourism"="hotel"'],
  spa: ['"leisure"="spa"', '"shop"="beauty"'],
  "магазин одежды": ['"shop"="clothes"'],
};

interface GeoArea {
  areaId: number;
  lat: number;
  lng: number;
  displayName: string;
}

async function geocodeCity(city: string): Promise<GeoArea | null> {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&accept-language=ru&q=${encodeURIComponent(
    city,
  )}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    osm_id: number;
    osm_type: string;
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!data.length) return null;
  const place = data[0];
  // Overpass area id: relation => 3600000000 + id, way => 2400000000 + id
  const base =
    place.osm_type === "relation"
      ? 3600000000
      : place.osm_type === "way"
        ? 2400000000
        : 0;
  if (!base) return null;
  return {
    areaId: base + place.osm_id,
    lat: Number(place.lat),
    lng: Number(place.lon),
    displayName: place.display_name,
  };
}

function buildQuery(areaId: number, niche: string, limit: number): string {
  const key = niche.trim().toLowerCase();
  const filters = NICHE_FILTERS[key];
  let selectors: string[];

  if (filters && filters.length) {
    selectors = filters.flatMap((f) => [
      `node[${f}](area.searchArea);`,
      `way[${f}](area.searchArea);`,
    ]);
  } else {
    // Unknown niche: fuzzy name match against named POIs.
    const safe = niche.replace(/["\\]/g, "");
    selectors = [
      `node["name"~"${safe}",i](area.searchArea);`,
      `way["name"~"${safe}",i](area.searchArea);`,
    ];
  }

  return `[out:json][timeout:25];
area(${areaId})->.searchArea;
(
  ${selectors.join("\n  ")}
);
out center tags ${limit};`;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:city"],
    tags["addr:street"],
    tags["addr:housenumber"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Picks the first present tag from a list of candidate keys. */
function pick(tags: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = tags[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

/** Turns a raw OSM contact value (handle or URL) into a usable URL. */
function toUrl(raw: string, base: string, handlePrefix = ""): string {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").replace(/^\/+/, "");
  return `${base}/${handlePrefix}${handle}`;
}

/** Extracts every social/contact channel OSM exposes for a POI. */
function extractSocials(tags: Record<string, string>): LeadSocials {
  const socials: LeadSocials = {};

  const tg = pick(tags, ["contact:telegram", "telegram", "contact:tg"]);
  if (tg) socials.telegram = toUrl(tg, "https://t.me");

  const wa = pick(tags, ["contact:whatsapp", "whatsapp"]);
  if (wa) {
    const digits = wa.replace(/[^\d]/g, "");
    socials.whatsapp = digits
      ? `https://wa.me/${digits}`
      : toUrl(wa, "https://wa.me");
  }

  const ig = pick(tags, ["contact:instagram", "instagram"]);
  if (ig) socials.instagram = toUrl(ig, "https://instagram.com");

  const vk = pick(tags, ["contact:vk", "contact:vkontakte", "vk"]);
  if (vk) socials.vk = toUrl(vk, "https://vk.com");

  const fb = pick(tags, ["contact:facebook", "facebook"]);
  if (fb) socials.facebook = toUrl(fb, "https://facebook.com");

  const yt = pick(tags, ["contact:youtube", "youtube"]);
  if (yt) socials.youtube = toUrl(yt, "https://youtube.com");

  return socials;
}

/** Detects whether a POI belongs to a brand/chain (to deprioritise). */
function detectChain(tags: Record<string, string>): boolean {
  return Boolean(
    tags["brand"] ||
      tags["brand:wikidata"] ||
      tags["brand:wikipedia"] ||
      tags["operator:wikidata"],
  );
}

export async function searchBusinesses(params: {
  city: string;
  niche: string;
  limit?: number;
}): Promise<{ results: RawBusiness[]; area: GeoArea | null }> {
  const limit = params.limit ?? 25;
  const area = await geocodeCity(params.city);
  if (!area) return { results: [], area: null };

  const query = buildQuery(area.areaId, params.niche, limit * 4);
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) return { results: [], area };

  const data = (await res.json()) as { elements: OverpassElement[] };
  const seen = new Set<string>();
  const results: RawBusiness[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name || tags["name:ru"];
    if (!name) continue;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const lat = el.lat ?? el.center?.lat ?? null;
    const lng = el.lon ?? el.center?.lon ?? null;

    results.push({
      name,
      address: buildAddress(tags),
      phone:
        pick(tags, ["phone", "contact:phone", "contact:mobile", "mobile"]) ??
        null,
      email: pick(tags, ["email", "contact:email"]) ?? null,
      website:
        pick(tags, ["website", "contact:website", "url", "contact:url"]) ??
        null,
      workingHours: tags.opening_hours || null,
      socials: extractSocials(tags),
      isChain: detectChain(tags),
      lat,
      lng,
      source: "openstreetmap",
    });
    if (results.length >= limit * 2) break;
  }

  // Prefer independent businesses with richer contact data; push big chains down.
  const contactScore = (b: RawBusiness) =>
    (b.phone ? 1 : 0) +
    (b.email ? 1 : 0) +
    (b.website ? 1 : 0) +
    Object.keys(b.socials).length;

  results.sort((a, b) => {
    if (a.isChain !== b.isChain) return a.isChain ? 1 : -1;
    return contactScore(b) - contactScore(a);
  });

  return { results: results.slice(0, limit), area };
}
