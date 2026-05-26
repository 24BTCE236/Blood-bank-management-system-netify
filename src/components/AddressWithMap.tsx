import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { getCached, geocodeAddress } from '../lib/geocode';
import { useBloodBank } from '../context/BloodBankContext';

type Donor = {
  id: string;
  name: string;
  address?: string;
  bloodGroup: string;
  contact?: string;
  lastDonationDate?: string;
  medicalEligibility?: string[];
  createdAt?: string;
  lat?: number;
  lng?: number;
};

const AddressWithMap: React.FC<{ donors: Donor[]; height?: number }> = ({ donors, height = 420 }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const [selected, setSelected] = useState<Donor | null>(null);
  const modalMapRef = useRef<L.Map | null>(null);
  const [processed, setProcessed] = useState(0);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const ctx = useBloodBank();
  const mapHeightClass = height >= 500 ? 'h-[520px]' : 'h-[420px]';

  useEffect(() => {
    if (!mapRef.current) return;

    // create map once
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        center: [20.5937, 78.9629], // India center
        zoom: 5,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;
      const coordsRef = (map as any).__coordsRef || {};
      (map as any).__coordsRef = coordsRef;

    // clear existing marker clusters
    const layers = [] as L.Layer[];
    map.eachLayer((layer) => {
      // keep tile layers only
      if (!(layer instanceof L.TileLayer)) layers.push(layer);
    });
    layers.forEach((l) => map.removeLayer(l));

    // re-add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // marker cluster group
    // @ts-ignore - markerCluster plugin augments L
    const markers = (L as any).markerClusterGroup ? (L as any).markerClusterGroup() : null;

    const addMarkerAt = (lat: number, lng: number, donor: Donor, fromGeocode = false) => {
      const marker = L.marker([lat, lng]);
      marker.on('click', () => setSelected(donor));
      marker.bindPopup(`<strong>${donor.name}</strong><br/>${donor.bloodGroup}<br/>${donor.contact ?? ''}<br/>${donor.address ?? ''}`);
      if (markers) markers.addLayer(marker);
      else marker.addTo(map);
      coordsRef[donor.id] = { lat, lon: lng };
      // persist coords if available and context allows
      try {
        if (fromGeocode && ctx?.updateDonor) {
          ctx.updateDonor(donor.id, { lat, lng });
        }
      } catch {}
    };

    const processDonor = async (donor: Donor) => {
      // try cache
      if (donor.address) {
        const cached = getCached(donor.address);
        if (cached) {
          addMarkerAt(cached.lat, cached.lon, donor, true);
          setGeocodedCount((c) => c + 1);
          setProcessed((p) => p + 1);
          return;
        }

        // geocode with polite delay
        const geo = await geocodeAddress(donor.address);
        if (geo) {
          addMarkerAt(geo.lat, geo.lon, donor, true);
          setGeocodedCount((c) => c + 1);
          setProcessed((p) => p + 1);
          return;
        }
      }

      // fallback deterministic placement
      const seed = donor.id.split('-').pop() ? parseInt(donor.id.split('-').pop() || '1', 10) : Math.floor(Math.random() * 1000);
      const lat = 8 + (seed % 20) + (seed % 10) * 0.03;
      const lng = 68 + (seed % 30) + (seed % 7) * 0.04;
      addMarkerAt(lat, lng, donor, false);
      setProcessed((p) => p + 1);
    };

    (async () => {
      // sequential geocode to be polite to Nominatim
      for (const donor of donors) {
        // eslint-disable-next-line no-await-in-loop
        await processDonor(donor);
        // small delay
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
      }
    })();

    if (markers) {
      markers.addTo(map);
      // fit bounds
      try {
        const groupBounds = markers.getBounds();
        if (groupBounds.isValid()) map.fitBounds(groupBounds.pad(0.1));
      } catch {}
    }

    return () => {
      // cleanup optional
    };
  }, [donors]);

  useEffect(() => {
    if (!selected) return;
    const map = leafletMap.current;
    const coords = (map as any).__coordsRef?.[selected.id];
    const el = document.getElementById('modal-map');
    if (!el) return;

    // create or reuse small map
    if ((el as any).__map) {
      try { (el as any).__map.remove(); } catch {}
      (el as any).__map = null;
    }

    const lat = coords?.lat ?? (8 + (parseInt(selected.id.split('-').pop() || '1', 10) % 20));
    const lon = coords?.lon ?? (68 + (parseInt(selected.id.split('-').pop() || '1', 10) % 30));

    const modalMap = L.map(el, { center: [lat, lon], zoom: 12, attributionControl: false, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMap);
    const m = L.marker([lat, lon]).addTo(modalMap);
    (el as any).__map = modalMap;

    return () => {
      try {
        modalMap.remove();
        (el as any).__map = null;
      } catch {}
    };
  }, [selected]);

  return (
    <>
      <div className="relative">
        <div ref={mapRef} className={`donor-map-canvas w-full overflow-hidden rounded-2xl ${mapHeightClass}`} />

        <div className="absolute left-4 top-4 z-40 w-80 rounded-xl bg-white/6 backdrop-blur-md p-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div>
                <div className="text-xs text-slate-300">Geocoding donors</div>
                <div className="text-sm font-semibold text-white">{geocodedCount} geocoded • {processed} processed</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {processed < donors.length ? (
                <svg className="w-5 h-5 animate-spin text-white/90" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              ) : (
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
            {Array.from({ length: 20 }).map((_, index) => {
              const filled = index < Math.ceil((processed / Math.max(1, donors.length)) * 20);
              return (
                <span
                  key={index}
                  className={`h-2 rounded-full transition-colors ${filled ? 'bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400' : 'bg-white/10'}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-[92%] max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-rose-500 to-amber-400 flex items-center justify-center text-white font-bold text-lg">{selected.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
                <div>
                  <h3 className="text-xl font-semibold">{selected.name}</h3>
                  <div className="text-sm text-slate-600">{selected.bloodGroup} · {selected.contact}</div>
                  <div className="text-xs text-slate-400">Last donation: {selected.lastDonationDate ?? 'N/A'}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="premium-button" onClick={() => setSelected(null)}>Allow donation</button>
                <button className="premium-button-secondary" onClick={() => setSelected(null)}>Edit</button>
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-700">{selected.address}</div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="donor-modal-map h-[240px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50" id="modal-map" />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Medical eligibility</h4>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                  {(selected.medicalEligibility ?? []).map((m, i) => (
                    <li key={i} className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                      {m}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-sm text-slate-500">Member since: {new Date(selected.createdAt ?? Date.now()).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AddressWithMap;

