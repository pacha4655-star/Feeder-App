'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, ShieldCheck, AlertTriangle, Utensils, Users2, Filter, Compass, Loader2 } from 'lucide-react';
import type { UserSession } from '@/lib/auth/session';

interface NearbyItem {
  id: string;
  type: 'FEEDER' | 'SOS' | 'WATER';
  title: string;
  subtitle: string;
  approxLocation: string;
  distanceKm: number;
  badge: string;
  icon: string;
  color: string;
}

interface NearbyClientProps {
  user: UserSession | null;
}

export default function NearbyClient({ user }: NearbyClientProps) {
  const [selectedArea, setSelectedArea] = useState(user?.areaName || 'Local Neighborhood');
  const [radiusKm, setRadiusKm] = useState(10);
  const [filterType, setFilterType] = useState<'ALL' | 'FEEDERS' | 'SOS'>('ALL');
  const [items, setItems] = useState<NearbyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNearby = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/nearby?radius=${radiusKm}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch nearby activity:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNearby();
  }, [radiusKm]);

  const filteredItems = items.filter((item) => {
    if (filterType === 'FEEDERS') return item.type === 'FEEDER';
    if (filterType === 'SOS') return item.type === 'SOS';
    return true;
  });

  return (
    <div>
      {/* 1. Header & Location Privacy Guarantee */}
      <div
        className="card"
        style={{
          padding: '20px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass color="#0ea5e9" />
              <span>Nearby Welfare Discovery</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <ShieldCheck size={16} color="var(--brand-primary)" />
              <span>
                <strong>Privacy Guaranteed:</strong> Approximate zone coordinates only. Exact house locations are never exposed.
              </span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ width: 'auto', fontSize: '13px', fontWeight: 600 }}
            >
              <option value={2}>Within 2 km</option>
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
            </select>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="feed-tabs-bar" style={{ marginTop: '16px', marginBottom: 0 }}>
          {[
            { id: 'ALL', label: 'All Activity' },
            { id: 'FEEDERS', label: '🐾 Feeding Logs' },
            { id: 'SOS', label: '🚨 Emergency Alerts' },
          ].map((f) => (
            <button
              key={f.id}
              className={`feed-filter-chip ${filterType === f.id ? 'active' : ''}`}
              onClick={() => setFilterType(f.id as any)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Radar Canvas */}
      <div
        className="card"
        style={{
          padding: '20px',
          marginBottom: '16px',
          background: 'radial-gradient(circle, var(--bg-card) 20%, var(--bg-secondary) 100%)',
          textAlign: 'center',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700 }}>
            {selectedArea} &bull; {radiusKm} km Zone Radar
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filteredItems.length} active animal-care points
          </div>
        </div>

        {/* Radar Graphic Container */}
        <div
          style={{
            position: 'relative',
            height: '240px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(5, 150, 105, 0.04)',
            border: '1px dashed var(--border-subtle)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Concentric distance rings */}
          <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.15)' }} />
          <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.25)' }} />
          <div style={{ position: 'absolute', width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(5, 150, 105, 0.35)' }} />

          {/* Center Point (User) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              background: 'var(--brand-primary)',
              color: 'white',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 0 12px var(--brand-primary-glow)',
            }}
          >
            Your Zone
          </div>

          {/* Dynamically plot real items */}
          {filteredItems.slice(0, 6).map((item, idx) => {
            const angle = (idx * (360 / Math.max(filteredItems.length, 1))) * (Math.PI / 180);
            const distRatio = Math.min(Math.max((item.distanceKm || 1) / radiusKm, 0.2), 0.85);
            const x = Math.cos(angle) * (100 * distRatio);
            const y = Math.sin(angle) * (80 * distRatio);

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px)`,
                  background: item.color,
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  zIndex: 3,
                }}
              >
                {item.icon} {item.title.split(' ')[0]} ({(item.distanceKm || 0).toFixed(1)} km)
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Nearby Activity Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div className="card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 8px auto', color: 'var(--brand-primary)' }} />
            <div>Scanning neighborhood welfare activity...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📍</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              No nearby activity yet.
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
              There are no recorded feeding rounds or emergencies within {radiusKm} km right now. Be the first local volunteer to log care in this neighborhood.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/feeding" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Log a Feeding
              </Link>
              <Link href="/sos" className="btn btn-sos" style={{ textDecoration: 'none' }}>
                Report SOS
              </Link>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.subtitle}</div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    background: item.color,
                    color: 'white',
                  }}
                >
                  {(item.distanceKm || 0).toFixed(1)} km away
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <MapPin size={14} color="var(--brand-primary)" />
                <span>Approximate Zone: <strong>{item.approxLocation}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
