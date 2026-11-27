import React from 'react';
import { Member } from '../types';

interface BrandLockupProps {
  variant?: 'dark' | 'light';
  compact?: boolean;
  onClick?: () => void;
}

export const BrandLockup: React.FC<BrandLockupProps> = ({
  variant = 'light',
  compact = false,
  onClick,
}) => {
  const isDark = variant === 'dark';

  const content = (
    <div className={`inline-flex items-center ${compact ? 'gap-2' : 'gap-3'} select-none`}>
      <span
        className={`font-semibold tracking-tight whitespace-nowrap ${
          compact ? 'text-[14px] leading-5' : 'text-[18px] leading-7'
        } ${isDark ? 'text-white' : 'text-[#1C1917]'}`}
      >
        Raba Pay
      </span>
      <span
        className={`inline-flex items-center justify-center rounded-full whitespace-nowrap ${
          compact ? 'px-2 py-0.5 text-[11px] leading-4' : 'px-3 py-1 text-[14px] leading-5'
        } ${
          isDark
            ? 'bg-white/20 border border-white/35 text-white font-medium backdrop-blur-md'
            : 'bg-[#E7E5E4] text-[#57534E] font-normal'
        }`}
      >
        Testnet
      </span>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] rounded-lg transition-opacity hover:opacity-90 cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return content;
};

export const PageSurfaceBlobs: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
    <div
      className="absolute rounded-full"
      style={{
        width: 864,
        height: 864,
        left: '35%',
        top: -90,
        background: 'rgba(227, 247, 234, 0.8)',
        filter: 'blur(121px)',
      }}
    />
    <div
      className="absolute rounded-full"
      style={{
        width: 1152,
        height: 1152,
        left: '45%',
        top: 558,
        background: 'rgba(165, 230, 191, 0.38)',
        filter: 'blur(161.5px)',
      }}
    />
    <div
      className="absolute rounded-full"
      style={{
        width: 1296,
        height: 1296,
        left: -360,
        top: 315,
        background: 'rgba(191, 239, 208, 0.5)',
        filter: 'blur(181.5px)',
      }}
    />
  </div>
);

interface AvatarBadgeProps {
  initial: string;
  bg: string;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  initial,
  bg,
  text,
  size = 'md',
  overlap = false,
}) => {
  const sizeClass =
    size === 'sm'
      ? 'w-7 h-7 text-[11px]'
      : size === 'lg'
        ? 'w-10 h-10 text-[15px]'
        : 'w-8 h-8 text-[13px]';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium shrink-0 select-none ${sizeClass} ${
        overlap ? 'border-2 border-white -ml-2 first:ml-0' : ''
      }`}
      style={{ backgroundColor: bg, color: text }}
    >
      {initial}
    </span>
  );
};

export const AvatarStack: React.FC<{ members: Member[]; size?: 'sm' | 'md' }> = ({
  members,
  size = 'md',
}) => (
  <div className="inline-flex items-center">
    {members.map((m) => (
      <AvatarBadge
        key={m.id}
        initial={m.initial}
        bg={m.avatarBg}
        text={m.avatarText}
        size={size}
        overlap
      />
    ))}
  </div>
);

interface InviteChipProps {
  groupName: string;
  subtitle: string;
  amountRight?: string;
}

export const InviteChip: React.FC<InviteChipProps> = ({
  groupName,
  subtitle,
  amountRight,
}) => (
  <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] shadow-[0px_2px_6px_rgba(13,64,31,0.04)]">
    <div className="flex items-center gap-3 min-w-0">
      <AvatarBadge initial="A" bg="#DBEAFE" text="#1E40AF" size="md" />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[#1C1917] leading-5 truncate">
          {groupName}
        </p>
        <p className="text-[13px] text-[#57534E] leading-4 truncate">{subtitle}</p>
      </div>
    </div>
    {amountRight && (
      <span className="font-num text-[14px] font-semibold text-[#1C1917] whitespace-nowrap shrink-0">
        {amountRight}
      </span>
    )}
  </div>
);

export const SegmentedProgress: React.FC<{ paid: number; total: number }> = ({
  paid,
  total,
}) => {
  const safeTotal = Math.max(1, total);
  return (
    <div className="w-full flex items-center gap-1" aria-label={`${paid} of ${safeTotal} paid`}>
      {Array.from({ length: safeTotal }).map((_, idx) => (
        <span
          key={idx}
          className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
            idx < paid ? 'bg-[#86EFAC]' : 'bg-[#E7E5E4]'
          }`}
        />
      ))}
    </div>
  );
};
