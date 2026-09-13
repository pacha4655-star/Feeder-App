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
    lg: 'p-2.5 rounded-2xl',
    xl: 'p-3.5 rounded-3xl'
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
    xl: 'text-4xl font-extrabold tracking-tight'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official Feeder Paw Mark (4 pads + leaf) */}
      <div className={`bg-[#1E4D2B] text-white ${badgeSizes[size]} flex items-center justify-center shadow-xs flex-shrink-0`}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconSizes[size]}>
          <ellipse cx="6" cy="7.5" rx="1.9" ry="2.5" transform="rotate(-15 6 7.5)" />
          <ellipse cx="10" cy="5" rx="1.9" ry="2.7" />
          <ellipse cx="14" cy="5" rx="1.9" ry="2.7" />
          <ellipse cx="18" cy="7.5" rx="1.9" ry="2.5" transform="rotate(15 18 7.5)" />
          <path d="M12 10.5C9.5 10.5 7.5 13 7.5 15.8C7.5 18.5 9.5 20.5 12 20.5C14.5 20.5 16.5 18.5 16.5 15.8C16.5 13 14.5 10.5 12 10.5ZM12 18.2C10.7 18.2 9.6 17.1 9.6 15.8C9.6 14.4 10.8 13 12 12.2C13.2 13 14.4 14.4 14.4 15.8C14.4 17.1 13.3 18.2 12 18.2Z" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-extrabold font-['Outfit',sans-serif] ${textColor} ${textSizes[size]} leading-none tracking-tight`}>
            Feeder
          </span>
          {tagline && (
            <span className="text-[10px] font-medium text-slate-500 mt-0.5 tracking-normal">
              A kinder world for every animal.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
