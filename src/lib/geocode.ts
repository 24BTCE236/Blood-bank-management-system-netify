export const GEOCODE_STORAGE = 'bbms-geocache-v1';

type Geo = { lat: number; lon: number };

const readCache = (): Record<string, Geo> => {
  try {
    const raw = localStorage.getItem(GEOCODE_STORAGE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<string, Geo>) => {
  try {
    localStorage.setItem(GEOCODE_STORAGE, JSON.stringify(cache));
  } catch {}
};

export const getCached = (address: string): Geo | null => {
  const cache = readCache();
  return cache[address] ?? null;
};

export const cacheCoords = (address: string, geo: Geo) => {
  const cache = readCache();
  cache[address] = geo;
  writeCache(cache);
};

export const geocodeAddress = async (address: string): Promise<Geo | null> => {
  try {
    const encoded = encodeURIComponent(address);
    // Use the proxied path so local dev bypasses CORS via Vite devServer proxy.
    // In production the proxy won't be present; direct requests may be blocked by CORS.
    const url = `/nominatim/search?format=json&q=${encoded}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json) && json.length > 0) {
      const item = json[0];
      const geo = { lat: Number(item.lat), lon: Number(item.lon) };
      cacheCoords(address, geo);
      return geo;
    }
    return null;
  } catch {
    return null;
  }
};
