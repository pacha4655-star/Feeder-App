import React from 'react';
import Link from 'next/link';
import FeederLogo from '@/components/common/FeederLogo';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-app)',
        textAlign: 'center',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px 24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <FeederLogo variant="responsive" height={40} />
        </div>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐾</div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
          The page you are looking for might have been moved, deleted, or does not exist.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Home size={16} /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
