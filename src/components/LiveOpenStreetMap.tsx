import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type:
    | 'user'
    | 'accident'
    | 'hospital'
    | 'clinic'
    | 'emergency_vet'
    | 'pet_shop'
    | 'shelter'
    | 'rescue'
    | 'pet_pharmacy'
    | 'welfare_org'
    | 'animal'
    | 'help'
    | 'feeder';
  categoryLabel?: string;
  address?: string;
  phone?: string | null;
  distanceFormatted?: string;
  openHours?: string | null;
  isOpen?: boolean | null;
  website?: string | null;
  directionUrl?: string;
}

interface LiveOpenStreetMapProps {
  userCoords: { lat: number; lng: number } | null;
  centerCoords?: { lat: number; lng: number } | null;
  accuracyMeters?: number | null;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string | null;
  onMarkerSelect?: (marker: MapMarkerItem) => void;
  heightClass?: string;
  showAccuracyCircle?: boolean;
}

export const LiveOpenStreetMap: React.FC<LiveOpenStreetMapProps> = ({
  userCoords,
  centerCoords,
  accuracyMeters,
  markers = [],
  selectedMarkerId,
  onMarkerSelect,
  heightClass = 'h-[420px]',
  showAccuracyCircle = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Leaflet Map Instance with Neutral World View (no hardcoded country/city)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const targetCoords = centerCoords || userCoords;
    const initialLat = targetCoords?.lat ?? 20.0;
    const initialLng = targetCoords?.lng ?? 0.0;
    const initialZoom = targetCoords ? 14 : 2;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Add standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Pan when centerCoords changes (e.g., search location or city change)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const target = centerCoords || userCoords;
    if (target) {
      map.setView([target.lat, target.lng], 14, { animate: true });
    }
  }, [centerCoords]);

  // 3. Update User Marker and Accuracy Circle on GPS update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userCoords) return;

    // Pan map to new user location if no explicit manual search center is active
    if (!centerCoords) {
      map.setView([userCoords.lat, userCoords.lng], 14, { animate: true });
    }

    // Custom Blue-Green Pulsing User Location Marker
    const userIcon = L.divIcon({
      className: 'user-gps-marker',
      html: `
        <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: #16a34a; opacity: 0.35; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 15px; height: 15px; border-radius: 50%; background: #15803d; border: 2.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.35);"></div>
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<strong style="font-size: 12px; color: #166534;">📍 You Are Here</strong>');
    } else {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    }

    // Accuracy Circle
    if (showAccuracyCircle && accuracyMeters && accuracyMeters > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([userCoords.lat, userCoords.lng], {
          radius: accuracyMeters,
          color: '#16a34a',
          fillColor: '#22c55e',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng([userCoords.lat, userCoords.lng]);
        accuracyCircleRef.current.setRadius(accuracyMeters);
      }
    }
  }, [userCoords, centerCoords, accuracyMeters, showAccuracyCircle]);

  // 4. Render Place and Event Markers with Distinguishable Category Icons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    markers.forEach(item => {
      let iconColor = '#2563eb';
      let iconEmoji = '📍';
      let badgeLabel = item.categoryLabel || 'Service';

      if (item.type === 'emergency_vet') {
        iconColor = '#dc2626';
        iconEmoji = '🚨';
        badgeLabel = 'Emergency Vet';
      } else if (item.type === 'hospital') {
        iconColor = '#e11d48';
        iconEmoji = '🏥';
        badgeLabel = 'Vet Hospital';
      } else if (item.type === 'clinic') {
        iconColor = '#4f46e5';
        iconEmoji = '🩺';
        badgeLabel = 'Vet Clinic';
      } else if (item.type === 'pet_shop') {
        iconColor = '#059669';
        iconEmoji = '🐶';
        badgeLabel = 'Pet Shop';
      } else if (item.type === 'shelter') {
        iconColor = '#d97706';
        iconEmoji = '🏠';
        badgeLabel = 'Animal Shelter';
      } else if (item.type === 'rescue') {
        iconColor = '#9333ea';
        iconEmoji = '🛟';
        badgeLabel = 'Rescue Center';
      } else if (item.type === 'pet_pharmacy') {
        iconColor = '#0d9488';
        iconEmoji = '💊';
        badgeLabel = 'Pet Pharmacy';
      } else if (item.type === 'welfare_org') {
        iconColor = '#0284c7';
        iconEmoji = '🤝';
        badgeLabel = 'Animal Welfare';
      } else if (item.type === 'accident') {
        iconColor = '#b91c1c';
        iconEmoji = '🚨';
        badgeLabel = 'Accident';
      } else if (item.type === 'help') {
        iconColor = '#ea580c';
        iconEmoji = '🆘';
        badgeLabel = 'Emergency Rescue';
      } else if (item.type === 'animal') {
        iconColor = '#d97706';
        iconEmoji = '🐾';
        badgeLabel = 'Community Animal';
      }

      const isSelected = selectedMarkerId === item.id;

      const customIcon = L.divIcon({
        className: `custom-pin-${item.id}`,
        html: `
          <div style="
            background: ${iconColor};
            width: ${isSelected ? '36px' : '32px'};
            height: ${isSelected ? '36px' : '32px'};
            border-radius: 12px;
            border: ${isSelected ? '3px solid #facc15' : '2px solid white'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '16px' : '14px'};
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
          ">
            ${iconEmoji}
          </div>
        `,
        iconSize: isSelected ? [36, 36] : [32, 32],
        iconAnchor: isSelected ? [18, 18] : [16, 16],
      });

      const popupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px; max-width: 260px; padding: 3px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
            <span style="display: inline-block; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: ${iconColor}20; color: ${iconColor}; padding: 2px 6px; border-radius: 6px;">
              ${badgeLabel}
            </span>
            ${item.distanceFormatted ? `<span style="font-size: 11px; font-weight: 800; color: #15803d;">📍 ${item.distanceFormatted}</span>` : ''}
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 3px; line-height: 1.3;">
            ${item.title}
          </div>
          ${item.address ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.35;">${item.address}</div>` : ''}
          ${item.openHours ? `<div style="font-size: 10px; font-weight: 600; color: #0369a1; margin-bottom: 6px;">🕒 ${item.openHours}</div>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            ${item.phone ? `<a href="tel:${item.phone}" style="flex: 1; padding: 5px 8px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 10px; font-weight: 700; text-align: center; display: inline-block;">📞 Call</a>` : ''}
            ${item.directionUrl ? `<a href="${item.directionUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; padding: 5px 8px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 10px; font-weight: 700; text-align: center; display: inline-block;">Directions ↗</a>` : ''}
          </div>
        </div>
      `;

      const marker = L.marker([item.lat, item.lng], { icon: customIcon })
        .addTo(layer)
        .bindPopup(popupContent);

      marker.on('click', () => {
        if (onMarkerSelect) onMarkerSelect(item);
      });

      if (selectedMarkerId === item.id) {
        marker.openPopup();
      }
    });
  }, [markers, selectedMarkerId, onMarkerSelect]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && userCoords) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
    }
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 font-sans`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Recenter to GPS Button */}
      {userCoords && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-10 p-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all"
          title="Center on my GPS location"
        >
          <Navigation className="w-4 h-4 text-green-700 fill-green-700" />
          <span>My GPS</span>
        </button>
      )}
    </div>
  );
};
