import React from 'react';
import { GlobalStateVariant } from '../types';
import { BrandLockup } from './BrandPrimitives';
import {
  ExpiredClockIllustration,
  InvalidDocIllustration,
  NetworkErrorIllustration,
} from './Illustrations';

interface GlobalStatePageProps {
  variant: GlobalStateVariant;
  onRetry: () => void;
  onLogIn: () => void;
  onGoHome: () => void;
  onBackLanding: () => void;
}

const CONFIG: Record<
  GlobalStateVariant,
  {
    title: string;
    subtitle: string;
    label: string;
    description: string;
    ctaLabel: string;
    Illustration: React.FC<{ className?: string }>;
  }
> = {
  'network-error': {
    title: 'Can’t reach Raba Pay',
    subtitle: 'Check your connection.',
    label: 'What happened',
    description:
      'Nothing was submitted. If you were paying, check History before trying again so you don’t pay twice.',
    ctaLabel: 'Try again',
    Illustration: NetworkErrorIllustration,
  },
  'session-expired': {
    title: 'You were signed out',
    subtitle: 'We sign you out after a while to keep your account safe.',
    label: 'What to do',
    description:
      'Log in again to continue. Anything you were typing was not saved.',
    ctaLabel: 'Log in',
    Illustration: ExpiredClockIllustration,
  },
  'not-found': {
    title: 'We can’t find this page',
    subtitle: 'The bill or group may have been removed.',
    label: 'What to do',
    description: 'Go back to Home and open it from your groups.',
    ctaLabel: 'Go to Home',
    Illustration: InvalidDocIllustration,
  },
  'no-access': {
    title: 'You’re not in this group',
    subtitle: 'Only members can open it.',
    label: 'What to do',
    description: 'Ask the person who invited you to send a new link.',
    ctaLabel: 'Go to Home',
    Illustration: InvalidDocIllustration,
  },
};

export const GlobalStatePage: React.FC<GlobalStatePageProps> = ({
  variant,
  onRetry,
  onLogIn,
  onGoHome,
  onBackLanding,
}) => {
  const cfg = CONFIG[variant];
  const Illustration = cfg.Illustration;

  const handleAction = () => {
    if (variant === 'network-error') onRetry();
    else if (variant === 'session-expired') onLogIn();
    else onGoHome();
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-page-gradient">
      {/* DARK HERO SIDE (Mobile Top / Desktop Left) */}
      <section className="bg-hero-dark text-white px-6 py-8 md:p-12 lg:p-16 flex flex-col justify-between min-h-[300px] md:min-h-screen relative overflow-hidden">
        <BrandLockup variant="dark" onClick={onBackLanding} />

        <div className="my-auto py-8 md:py-0 max-w-md space-y-6">
          <div className="w-28 h-24 rounded-[20px] bg-white/10 border border-white/15 flex items-center justify-center p-3">
            <Illustration className="w-20 h-20" />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-semibold tracking-[-0.02em] leading-tight">
              {cfg.title}
            </h1>
            <p className="text-[16px] sm:text-[18px] text-[#BBF7D0]/90 leading-7">
              {cfg.subtitle}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-white/60">
          Raba Pay · Simulated USDC on Stellar Testnet
        </p>
      </section>

      {/* LIGHT ACTION SIDE (Mobile Bottom / Desktop Right) */}
      <section className="px-6 py-10 md:p-12 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#57534E]">
              {cfg.label}
            </span>
            <p className="text-[16px] leading-6 text-[#1C1917]">{cfg.description}</p>
          </div>

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleAction}
              className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
            >
              {cfg.ctaLabel}
            </button>

            {variant === 'network-error' && (
              <button
                type="button"
                onClick={onGoHome}
                className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
              >
                Go to Home
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
