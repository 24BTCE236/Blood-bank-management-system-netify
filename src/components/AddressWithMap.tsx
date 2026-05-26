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
};

const AddressWithMap: React.FC<{ donors: Donor[]; height?: number }> = ({ donors, height = 420 }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const [selected, setSelected] = useState<Donor | null>(null);
  const modalMapRef = useRef<L.Map | null>(null);
  const [processed, setProcessed] = useState(0);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const ctx = useBloodBank();

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
        <div ref={mapRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />
        <div className="absolute right-3 top-3 z-40 rounded-full bg-white/80 px-3 py-1 text-sm text-slate-800">
          Geocode: {geocodedCount}/{donors.length} • Processed: {processed}/{donors.length}
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-[90%] max-w-2xl rounded-xl bg-white p-6 text-slate-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <div className="text-sm text-slate-600">{selected.bloodGroup} · {selected.contact}</div>
              </div>
              <button className="ml-4 p-2" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="mt-4 text-sm text-slate-700">{selected.address}</div>
            <div className="mt-4">
              <div style={{ width: '100%', height: 240, borderRadius: 8, overflow: 'hidden' }} id="modal-map" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AddressWithMap;

