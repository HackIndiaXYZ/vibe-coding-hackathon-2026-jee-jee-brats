/**
 * LoadKaro MapPinSelector Component (Web version)
 * Interactive Leaflet map using OpenStreetMap tiles — no API key needed!
 * Uses refs to avoid stale closure issues with Leaflet event handlers.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { GeoPoint } from '../lib/types';

interface MapPinSelectorProps {
  pickup: GeoPoint | null;
  dropoff: GeoPoint | null;
  onPickupChange: (point: GeoPoint) => void;
  onDropoffChange: (point: GeoPoint) => void;
  routeCoords?: GeoPoint[];
  style?: any;
}

export const MapPinSelector: React.FC<MapPinSelectorProps> = ({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  routeCoords,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const LRef = useRef<any>(null);

  // Use refs to always have latest values in Leaflet callbacks
  const pickupRef = useRef(pickup);
  const dropoffRef = useRef(dropoff);
  const onPickupChangeRef = useRef(onPickupChange);
  const onDropoffChangeRef = useRef(onDropoffChange);

  // Keep refs in sync with props
  useEffect(() => { pickupRef.current = pickup; }, [pickup]);
  useEffect(() => { dropoffRef.current = dropoff; }, [dropoff]);
  useEffect(() => { onPickupChangeRef.current = onPickupChange; }, [onPickupChange]);
  useEffect(() => { onDropoffChangeRef.current = onDropoffChange; }, [onDropoffChange]);

  // Load Leaflet CSS + JS dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // JS
    if ((window as any).L) {
      LRef.current = (window as any).L;
      setLeafletLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      LRef.current = (window as any).L;
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Initialize map once Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !containerRef.current || mapInstanceRef.current) return;
    const L = LRef.current;
    if (!L) return;

    const center: [number, number] = pickupRef.current
      ? [pickupRef.current.latitude, pickupRef.current.longitude]
      : [28.6139, 77.209];

    const map = L.map(containerRef.current, {
      zoomControl: true,
    }).setView(center, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // Click handler — uses refs so it always has latest state
    map.on('click', (e: any) => {
      const point: GeoPoint = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      if (!pickupRef.current) {
        onPickupChangeRef.current(point);
      } else {
        // Always set/update dropoff
        onDropoffChangeRef.current(point);
      }
    });

    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded]);

  // Create custom icons
  const createIcon = useCallback((color: string, label: string) => {
    const L = LRef.current;
    if (!L) return null;
    return L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};border:3px solid white;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;font-weight:bold;color:white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        cursor:grab;
      ">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  }, []);

  // Sync pickup marker
  useEffect(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    if (pickup) {
      const icon = createIcon('#10B981', 'P');
      const marker = L.marker([pickup.latitude, pickup.longitude], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        onPickupChangeRef.current({ latitude: lat, longitude: lng });
      });

      pickupMarkerRef.current = marker;
      map.flyTo([pickup.latitude, pickup.longitude], Math.max(map.getZoom(), 13), { duration: 0.8 });
    }
  }, [pickup, leafletLoaded, createIcon]);

  // Sync dropoff marker
  useEffect(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (dropoffMarkerRef.current) {
      map.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }

    if (dropoff) {
      const icon = createIcon('#EF4444', 'D');
      const marker = L.marker([dropoff.latitude, dropoff.longitude], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        onDropoffChangeRef.current({ latitude: lat, longitude: lng });
      });

      dropoffMarkerRef.current = marker;
    }

    // Fit bounds to show both markers
    if (pickup && dropoff) {
      map.fitBounds([
        [pickup.latitude, pickup.longitude],
        [dropoff.latitude, dropoff.longitude],
      ], { padding: [60, 60], maxZoom: 15 });
    }
  }, [dropoff, pickup, leafletLoaded, createIcon]);

  // Sync route polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (routeCoords && routeCoords.length > 0) {
      const latlngs = routeCoords.map((c: GeoPoint) => [c.latitude, c.longitude]);
      const polyline = L.polyline(latlngs, {
        color: '#000',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
      routeLineRef.current = polyline;
    }
  }, [routeCoords, leafletLoaded]);

  return (
    <View style={[styles.container, style]}>
      <div
        ref={containerRef as any}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

export default MapPinSelector;
