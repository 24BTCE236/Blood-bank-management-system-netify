import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

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

    donors.forEach((donor) => {
      // naive geocoding fallback: try to extract a lat/lng from address if present (not available),
      // instead we'll use a simple hash-to-latlng to spread markers deterministically for demo.
      const seed = donor.id.split('-').pop() ? parseInt(donor.id.split('-').pop() || '1', 10) : Math.floor(Math.random() * 1000);
      const lat = 8 + (seed % 20) + (seed % 10) * 0.03;
      const lng = 68 + (seed % 30) + (seed % 7) * 0.04;
      const marker = L.marker([lat, lng]);
      marker.bindPopup(`<strong>${donor.name}</strong><br/>${donor.bloodGroup}<br/>${donor.contact ?? ''}<br/>${donor.address ?? ''}`);
      if (markers) markers.addLayer(marker);
      else marker.addTo(map);
    });

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
      // do not remove map instance to preserve tiles across re-renders
    };
  }, [donors]);

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }} />;
};

export default AddressWithMap;
