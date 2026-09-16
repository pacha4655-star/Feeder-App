'use client';

import React, { useState, useEffect } from 'react';
import FeedingLogModal from './FeedingLogModal';
import { Utensils, Plus, Calendar, Award, Flame, MapPin, CheckCircle2 } from 'lucide-react';
import { formatFullDate } from '@/lib/utils/date';
import type { UserSession } from '@/lib/auth/session';
import FeederAvatar from '@/components/common/FeederAvatar';

interface FeedingClientProps {
  user: UserSession | null;
}

export default function FeedingClient({ user }: FeedingClientProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalAnimalsFed: 0, totalFeedingRounds: 0, weeklyStreakDays: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/feeding');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      {/* 1. Header & Stats Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid #a7f3d0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils />
              <span>Feeding Log & Impact Tracker</span>
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Maintain daily feeding consistency, record animal counts, and coordinate neighborhood nutrition.
            </p>
          </div>

          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Log Feeding Round</span>
          </button>
        </div>

        {/* Impact Counters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)' }}>
              {stats.totalAnimalsFed ?? 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Animals Fed</div>
          </div>

          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Flame size={22} />
              <span>{stats.weeklyStreakDays ?? 0} Days</span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Feeding Streak</div>
          </div>

          <div className="card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0ea5e9' }}>
              {stats.totalFeedingRounds ?? 0}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Rounds Logged</div>
          </div>
        </div>
      </div>

      {/* 2. Feeding Logs Timeline */}
      <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '20px 0 12px 0' }}>
        Verified Feeding History
      </h2>

      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading feeding records...
        </div>
      ) : logs.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Utensils size={40} color="var(--brand-primary)" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontWeight: 700, fontSize: '16px' }}>No feeding logs recorded yet</div>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: '4px 0 14px 0' }}>
            Start your feeding streak today and inspire your neighborhood welfare circle.
          </p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            Record First Feed
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {logs.map((log) => (
            <div key={log.id} className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FeederAvatar
                    src={log.user_avatar || user?.avatarUrl}
                    alt={log.user_name}
                    size={38}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{log.user_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatFullDate(log.fed_at)}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: 'var(--brand-primary-light)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  🐾 {log.animal_count} {log.animal_type}
                </span>
              </div>

              <div style={{ margin: '8px 0', fontSize: '14px' }}>
                <div><strong>Food:</strong> {log.food_type} {log.quantity_desc && `(${log.quantity_desc})`}</div>
                {log.notes && <p style={{ marginTop: '4px', color: 'var(--text-main)', lineHeight: 1.5 }}>{log.notes}</p>}
              </div>

              {log.photo_url && (
                <img
                  src={log.photo_url}
                  alt=""
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }}
                />
              )}

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
                <MapPin size={13} color="var(--brand-primary)" />
                <span>Area: <strong>{log.approx_location_name}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feeding Modal */}
      <FeedingLogModal
        user={user}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFeedLogged={fetchLogs}
      />
    </div>
  );
}
