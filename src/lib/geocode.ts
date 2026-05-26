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
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'bbms-demo/1.0' } });
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
