'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, MapPin, Heart, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [areaName, setAreaName] = useState('');
  const [city, setCity] = useState('');
  const [feederRole, setFeederRole] = useState('Daily Stray Feeder');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaName,
          city,
          feederRole,
          bio,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at top, rgba(5, 150, 105, 0.08), transparent 70%), var(--bg-app)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '32px',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--brand-primary-light)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Welcome to Feeder.life!</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Set your neighborhood and role to start discovering nearby feeding rounds.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Primary Neighborhood / Area</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Indiranagar, Koramangala, Bandra West"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                required
              />
              <MapPin size={16} color="var(--brand-primary)" style={{ position: 'absolute', right: '12px', top: '12px' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              🛡️ Exact house numbers are NEVER shared. Only approximate area is used.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">City</label>
            <input
              type="text"
              className="form-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Welfare Focus / Role</label>
            <select
              className="form-select"
              value={feederRole}
              onChange={(e) => setFeederRole(e.target.value)}
            >
              <option value="Daily Stray Feeder">🐾 Daily Street Animal Feeder</option>
              <option value="Colony TNR Caretaker">🐈 Feline Colony & TNR Guardian</option>
              <option value="Emergency Rescue Volunteer">🚨 Emergency Rescue Driver / Volunteer</option>
              <option value="Veterinary Professional">🩺 Veterinary Professional / Clinic</option>
              <option value="Community Supporter">❤️ Community Supporter & Sponsor</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Short Bio (Displayed on your profile)</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other animal guardians about your feeding rounds or rescue experience..."
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Saving Profile...' : 'Complete Profile & Open Feed'}
          </button>
        </form>
      </div>
    </div>
  );
}
