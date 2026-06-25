export interface RawBusiness {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: string | null;
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

export async function searchBusinesses(params: {
  city: string;
  niche: string;
  limit?: number;
}): Promise<{ results: RawBusiness[]; area: GeoArea | null }> {
  const limit = params.limit ?? 25;
  const area = await geocodeCity(params.city);
  if (!area) return { results: [], area: null };

  const query = buildQuery(area.areaId, params.niche, limit * 2);
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
      phone: tags.phone || tags["contact:phone"] || null,
      email: tags.email || tags["contact:email"] || null,
      website: tags.website || tags["contact:website"] || tags.url || null,
      workingHours: tags.opening_hours || null,
      lat,
      lng,
      source: "openstreetmap",
    });
    if (results.length >= limit) break;
  }

  return { results, area };
}
