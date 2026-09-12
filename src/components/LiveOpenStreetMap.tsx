import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Plus, Minus } from 'lucide-react';

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
    | 'grooming'
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
  heightClass = 'h-[450px]',
  showAccuracyCircle = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // 1. Initialize Leaflet Map Instance with Premium Modern Tile Theme (CartoDB Voyager)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const targetCoords = centerCoords || userCoords;
    const initialLat = targetCoords?.lat ?? 20.0;
    const initialLng = targetCoords?.lng ?? 0.0;
    const initialZoom = targetCoords ? 14 : 3;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    // Premium CartoDB Voyager Map Tiles: Clean, modern, soft neutral background with legible roads & subtle water
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersMapRef.current.clear();
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

    if (!centerCoords) {
      map.setView([userCoords.lat, userCoords.lng], 14, { animate: true });
    }

    // Feeder Brand Green Pulsing User Location Beacon
    const userIcon = L.divIcon({
      className: 'user-feeder-gps-marker',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: #16a34a; opacity: 0.3; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 16px; height: 16px; border-radius: 50%; background: #15803d; border: 3px solid #ffffff; box-shadow: 0 3px 10px rgba(21,128,61,0.5);"></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 700; color: #15803d; text-align: center; padding: 2px;">
            📍 Your Current Location
          </div>
        `);
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
          fillOpacity: 0.12,
          weight: 1.5,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng([userCoords.lat, userCoords.lng]);
        accuracyCircleRef.current.setRadius(accuracyMeters);
      }
    }
  }, [userCoords, centerCoords, accuracyMeters, showAccuracyCircle]);

  // 4. Render Place and Event Markers with Distinguishable Category Pins & Rich Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersMapRef.current.clear();

    markers.forEach(item => {
      let iconColor = '#2563eb';
      let iconEmoji = '📍';
      let badgeLabel = item.categoryLabel || 'Animal Care';
      let isUrgent = false;

      if (item.type === 'emergency_vet') {
        iconColor = '#dc2626';
        iconEmoji = '🚨';
        badgeLabel = 'Emergency Vet';
        isUrgent = true;
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
      } else if (item.type === 'grooming') {
        iconColor = '#0d9488';
        iconEmoji = '✂️';
        badgeLabel = 'Pet Grooming';
      } else if (item.type === 'pet_pharmacy') {
        iconColor = '#0891b2';
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
        isUrgent = true;
      } else if (item.type === 'help') {
        iconColor = '#ea580c';
        iconEmoji = '🆘';
        badgeLabel = 'Emergency Rescue';
        isUrgent = true;
      } else if (item.type === 'animal') {
        iconColor = '#d97706';
        iconEmoji = '🐾';
        badgeLabel = 'Community Animal';
      }

      const isSelected = selectedMarkerId === item.id;

      const customIcon = L.divIcon({
        className: `feeder-pin-${item.id}`,
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            ${isUrgent ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: #dc2626; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
            <div style="
              background: ${iconColor};
              width: ${isSelected ? '40px' : '34px'};
              height: ${isSelected ? '40px' : '34px'};
              border-radius: 14px;
              border: ${isSelected ? '3px solid #facc15' : '2.5px solid #ffffff'};
              box-shadow: 0 4px 14px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${isSelected ? '18px' : '15px'};
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            ">
              ${iconEmoji}
            </div>
          </div>
        `,
        iconSize: isSelected ? [42, 42] : [36, 36],
        iconAnchor: isSelected ? [21, 21] : [18, 18],
      });

      // Escape helper
      const safeTitle = item.title.replace(/"/g, '&quot;');
      const safeAddress = (item.address || '').replace(/"/g, '&quot;');
      const safePhone = item.phone ? item.phone.replace(/"/g, '&quot;') : null;
      const safeHours = item.openHours ? item.openHours.replace(/"/g, '&quot;') : null;
      const safeWeb = item.website ? item.website.replace(/"/g, '&quot;') : null;
      const safeDir = item.directionUrl || `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

      const popupContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 210px; max-width: 270px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
            <span style="display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: ${iconColor}18; color: ${iconColor}; padding: 2.5px 7px; border-radius: 6px;">
              ${badgeLabel}
            </span>
            ${item.distanceFormatted ? `<span style="font-size: 11px; font-weight: 800; color: #15803d; white-space: nowrap;">📍 ${item.distanceFormatted}</span>` : ''}
          </div>
          <div style="font-weight: 800; font-size: 13.5px; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
            ${safeTitle}
          </div>
          ${safeAddress ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.35;">${safeAddress}</div>` : ''}
          ${safeHours ? `<div style="font-size: 10.5px; font-weight: 600; color: #0284c7; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">🕒 ${safeHours}</div>` : ''}
          <div style="display: flex; gap: 6px; margin-top: 8px;">
            ${safePhone ? `<a href="tel:${safePhone}" style="flex: 1; padding: 6px 8px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-size: 10.5px; font-weight: 700; text-align: center; display: inline-block;">📞 Call</a>` : ''}
            ${safeWeb ? `<a href="${safeWeb}" target="_blank" rel="noopener noreferrer" style="flex: 1; padding: 6px 8px; background: #0284c7; color: white; text-decoration: none; border-radius: 8px; font-size: 10.5px; font-weight: 700; text-align: center; display: inline-block;">🌐 Web</a>` : ''}
            <a href="${safeDir}" target="_blank" rel="noopener noreferrer" style="flex: 1.2; padding: 6px 8px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 10.5px; font-weight: 700; text-align: center; display: inline-block;">Directions ↗</a>
          </div>
        </div>
      `;

      const marker = L.marker([item.lat, item.lng], { icon: customIcon })
        .addTo(layer)
        .bindPopup(popupContent, { maxWidth: 280, closeButton: true });

      marker.on('click', () => {
        if (onMarkerSelect) onMarkerSelect(item);
      });

      markersMapRef.current.set(item.id, marker);

      if (selectedMarkerId === item.id) {
        marker.openPopup();
      }
    });
  }, [markers, selectedMarkerId, onMarkerSelect]);

  // Handle selectedMarkerId updates to open popup and center view
  useEffect(() => {
    if (!selectedMarkerId) return;
    const marker = markersMapRef.current.get(selectedMarkerId);
    if (marker && mapInstanceRef.current) {
      marker.openPopup();
      mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedMarkerId]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && userCoords) {
      mapInstanceRef.current.setView([userCoords.lat, userCoords.lng], 15, { animate: true });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs bg-slate-100 font-sans`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Modern Floating Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 shadow-md rounded-xl overflow-hidden border border-slate-200/80 bg-white/95 backdrop-blur-xs">
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 w-full" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors active:scale-95"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Recenter to My Location Button */}
      {userCoords && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-10 py-2 px-3 bg-white/95 hover:bg-white text-slate-800 rounded-xl shadow-md border border-slate-200/80 backdrop-blur-xs flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all text-slate-700 hover:text-green-700"
          title="Center on my GPS location"
        >
          <Navigation className="w-3.5 h-3.5 text-green-600 fill-green-600" />
          <span>My Location</span>
        </button>
      )}
    </div>
  );
};
