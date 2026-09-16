import React from 'react';

interface FeederLogoProps {
  variant?: 'full' | 'icon' | 'responsive';
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

/**
 * Official Feeder Logo Component
 * Cleaned, geometrically balanced, transparent background vector SVG asset.
 * Preserves exact brand identity and aspect ratio without distortion or cropping.
 */
export default function FeederLogo({
  variant = 'responsive',
  height = 36,
  className = '',
  style,
}: FeederLogoProps) {
  const numericHeight = typeof height === 'number' ? height : parseInt(height as string, 10) || 36;
  
  // Full logo aspect ratio: 774 / 216 = 3.5833
  // Icon aspect ratio: 212 / 216 = 0.9815
  const fullWidth = Math.round(numericHeight * (774 / 216));
  const iconWidth = Math.round(numericHeight * (212 / 216));

  if (variant === 'icon') {
    return (
      <img
        src="/images/feeder-icon.svg"
        alt="Feeder"
        width={iconWidth}
        height={numericHeight}
        className={`feeder-logo-icon ${className}`.trim()}
        style={{
          height: `${numericHeight}px`,
          width: 'auto',
          aspectRatio: '212 / 216',
          objectFit: 'contain',
          display: 'block',
          ...style,
        }}
      />
    );
  }

  if (variant === 'full') {
    return (
      <img
        src="/images/feeder-logo.svg"
        alt="Feeder"
        width={fullWidth}
        height={numericHeight}
        className={`feeder-logo-full ${className}`.trim()}
        style={{
          height: `${numericHeight}px`,
          width: 'auto',
          aspectRatio: '774 / 216',
          objectFit: 'contain',
          display: 'block',
          ...style,
        }}
      />
    );
  }

  // Responsive variant: renders full logo on desktop/tablet,
  // and smoothly adapts on compact mobile without clipping or distortion
  return (
    <div
      className={`feeder-logo-responsive-container ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Full logo for Desktop & Tablet */}
      <img
        src="/images/feeder-logo.svg"
        alt="Feeder"
        width={fullWidth}
        height={numericHeight}
        className="feeder-logo-desktop"
        style={{
          height: `${numericHeight}px`,
          width: 'auto',
          aspectRatio: '774 / 216',
          objectFit: 'contain',
          display: 'block',
        }}
      />

      {/* Compact icon mark for very small mobile screens (< 400px) */}
      <img
        src="/images/feeder-icon.svg"
        alt="Feeder"
        width={Math.round(numericHeight * 0.95)}
        height={numericHeight}
        className="feeder-logo-mobile-icon"
        style={{
          height: `${numericHeight}px`,
          width: 'auto',
          aspectRatio: '212 / 216',
          objectFit: 'contain',
          display: 'none',
        }}
      />
    </div>
  );
}
