'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertTriangle, Users2, MapPin, Utensils } from 'lucide-react';

export default function MobileNavigation() {
  const pathname = usePathname();

  const items = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Communities', href: '/communities', icon: Users2 },
    { label: 'SOS', href: '/sos', icon: AlertTriangle, isSos: true },
    { label: 'Nearby', href: '/nearby', icon: MapPin },
    { label: 'Feeding', href: '/feeding', icon: Utensils },
  ];

  return (
    <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
      {items.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const Icon = item.icon;

        if (item.isSos) {
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'translateY(-12px)',
                textDecoration: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
              title="Animal SOS Emergency"
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--brand-sos)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px var(--brand-sos-glow)',
                  border: '3px solid var(--bg-card)',
                }}
              >
                <Icon size={22} strokeWidth={2.5} />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--brand-sos)',
                  marginTop: '2px',
                  letterSpacing: '0.04em',
                }}
              >
                SOS
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              minWidth: '48px',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
              transition: 'color 0.15s ease',
            }}
          >
            <Icon
              size={20}
              color={isActive ? 'var(--brand-primary)' : 'currentColor'}
              fill={isActive && item.href === '/' ? 'currentColor' : 'none'}
            />
            <span style={{ fontSize: '10.5px' }}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
