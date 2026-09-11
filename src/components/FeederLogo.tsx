import React from 'react';

interface FeederLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  tagline?: boolean;
  className?: string;
  variant?: 'inline' | 'badge';
}

export const FeederLogo: React.FC<FeederLogoProps> = ({
  size = 'md',
  showText = true,
  textColor = 'text-slate-800',
  tagline = false,
  className = '',
  variant = 'badge'
}) => {
  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const badgeSizes = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2 rounded-xl',
    lg: 'p-3 rounded-2xl',
    xl: 'p-4 rounded-3xl'
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
    xl: 'text-4xl font-extrabold tracking-tight'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* High Density Green Badge with Heart Paw SVG matching Design HTML */}
      <div className={`bg-green-600 text-white ${badgeSizes[size]} flex items-center justify-center shadow-xs flex-shrink-0`}>
        <svg viewBox="0 0 24 24" fill="white" className={iconSizes[size]}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold font-['Outfit',sans-serif] ${textColor} ${textSizes[size]} leading-none`}>
            Feeder
          </span>
          {tagline && (
            <span className="text-[10px] font-medium text-slate-500 mt-0.5 tracking-normal">
              Community for ethical animal care
            </span>
          )}
        </div>
      )}
    </div>
  );
};
