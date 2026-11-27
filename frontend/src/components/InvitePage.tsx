import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { InviteVariant } from '../types';
import { BrandLockup, PageSurfaceBlobs } from './BrandPrimitives';
import {
  AlreadyMemberIllustration,
  ExpiredClockIllustration,
  InvalidDocIllustration,
  InviteFriendsIllustration,
  SettledCelebrationIllustration,
} from './Illustrations';

interface InvitePageProps {
  variant: InviteVariant;
  isSignedIn: boolean;
  userName: string;
  inviteData?: {
    name?: string;
    creatorName?: string;
    icon?: string;
    memberCount?: number;
    description?: string;
  } | null;
  onChangeVariant: (v: InviteVariant) => void;
  onBackHome: () => void;
  onSignUp: () => void;
  onLogIn: () => void;
  onJoinGroup: () => void;
  onOpenGroup: () => void;
}

const INVITE_VARIANTS: { id: InviteVariant; label: string }[] = [
  { id: 'locked', label: 'Signed out' },
  { id: 'signed-in', label: 'Signed in' },
  { id: 'share-updated', label: 'Share updated' },
  { id: 'already-member', label: 'Already a member' },
  { id: 'settled', label: 'Settled' },
  { id: 'expired', label: 'Expired' },
  { id: 'invalid', label: 'Invalid' },
];

export const InvitePage: React.FC<InvitePageProps> = ({
  variant,
  isSignedIn,
  userName,
  inviteData,
  onChangeVariant,
  onBackHome,
  onSignUp,
  onLogIn,
  onJoinGroup,
  onOpenGroup,
}) => {
  const effectiveVariant: InviteVariant =
    variant === 'locked' && isSignedIn ? 'signed-in' : variant;

  const isErrorState = effectiveVariant === 'expired' || effectiveVariant === 'invalid';
  const isSummaryState =
    effectiveVariant === 'already-member' || effectiveVariant === 'settled';

  const groupTitle = inviteData?.name || 'Shared Group';
  const creatorTitle = inviteData?.creatorName || 'Your friend';

  const heroTitle = (() => {
    switch (effectiveVariant) {
      case 'expired':
        return 'This invite has expired';
      case 'invalid':
        return 'We can’t find this invite';
      case 'already-member':
        return `You’re already in ${groupTitle}`;
      case 'settled':
        return `${groupTitle} is settled`;
      case 'share-updated':
        return `${creatorTitle} changed the split`;
      default:
        return `${creatorTitle} invited you to join ${groupTitle}`;
    }
  })();

  const heroSubtitle = (() => {
    switch (effectiveVariant) {
      case 'expired':
        return 'Invite links stop working after a while.';
      case 'invalid':
        return 'The link may be wrong, or the group may no longer exist.';
      case 'already-member':
        return `${creatorTitle} invited you to ${groupTitle}.`;
      case 'settled':
        return `Everyone in ${groupTitle} has paid.`;
      default:
        return `${groupTitle} · ${inviteData?.memberCount ?? 1} member${(inviteData?.memberCount ?? 1) === 1 ? '' : 's'}`;
    }
  })();

  const shareMeta = (() => {
    if (effectiveVariant === 'share-updated') {
      return {
        label: 'Your share is now',
        amount: '28.00',
        was: 'Was 25.00 USDC',
      };
    }
    if (effectiveVariant === 'already-member') {
      return { label: 'You owe', amount: '25.00', was: null };
    }
    if (effectiveVariant === 'settled') {
      return { label: 'Total settled', amount: '100.00', was: null };
    }
    if (isErrorState) return null;
    return { label: 'Your share', amount: '25.00', was: null };
  })();

  const renderLeftIllustration = () => {
    switch (effectiveVariant) {
      case 'expired':
        return <ExpiredClockIllustration className="w-28 h-28 md:w-40 md:h-40 mx-auto" />;
      case 'invalid':
        return <InvalidDocIllustration className="w-28 h-28 md:w-40 md:h-40 mx-auto" />;
      case 'already-member':
        return <AlreadyMemberIllustration className="w-28 h-28 md:w-40 md:h-40 mx-auto" />;
      case 'settled':
        return <SettledCelebrationIllustration className="w-32 h-28 md:w-44 md:h-40 mx-auto" />;
      default:
        return <InviteFriendsIllustration className="w-full max-w-[380px] h-auto mx-auto" />;
    }
  };

  return (
    <div className="relative min-h-screen bg-page-gradient flex flex-col">
      <PageSurfaceBlobs />

      {/* Top subtle state switcher bar for effortless previewing across all invite states */}
      <div className="relative z-20 bg-white/85 backdrop-blur-md border-b border-black/[0.06] px-4 py-2.5">
        <div className="max-w-[1344px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1C1917] hover:text-[#15803D] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
            <span className="text-[12px] font-medium text-[#57534E] whitespace-nowrap mr-1">
              Invite state:
            </span>
            {INVITE_VARIANTS.map((item) => {
              const active = effectiveVariant === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeVariant(item.id)}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#F5F5F4] text-[#57534E] hover:bg-[#E7E5E4]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Split (Desktop) / Stacked (Mobile & Tablet) Invite Container */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT / TOP DARK HERO PANEL */}
        <section className="relative bg-hero-dark text-white px-6 py-8 sm:px-10 md:px-14 lg:px-16 lg:py-12 flex flex-col justify-between gap-8 overflow-hidden">
          <div
            className="pointer-events-none absolute -top-44 right-[-60px] w-[360px] h-[360px] md:w-[440px] md:h-[440px] rounded-full bg-[#22C55E] opacity-28 blur-[60px]"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <BrandLockup variant="dark" onClick={onBackHome} />
          </div>

          <div className="relative z-10 py-2 md:py-6 flex items-center justify-center">
            {renderLeftIllustration()}
          </div>

          <div className="relative z-10 space-y-6 max-w-[540px]">
            <div className="space-y-2">
              <h1 className="text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-white">
                {heroTitle}
              </h1>
              <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#D6D3D1]">
                {heroSubtitle}
              </p>
            </div>

            {shareMeta && (
              <div className="space-y-1.5">
                <p className="text-[15px] md:text-[16px] text-[#D6D3D1]">{shareMeta.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-num text-[48px] md:text-[60px] font-semibold tracking-[-0.02em] leading-none text-white">
                    {shareMeta.amount}
                  </span>
                  <span className="font-num text-[16px] md:text-[18px] font-semibold text-[#D6D3D1]">
                    USDC
                  </span>
                </div>
                {shareMeta.was && (
                  <p className="font-num text-[14px] text-[#A8A29E] line-through">
                    {shareMeta.was}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT / BOTTOM ACTION PANEL */}
        <section className="relative px-6 py-8 sm:px-10 md:px-14 lg:px-16 lg:py-12 flex items-center justify-center">
          <div className="w-full max-w-[460px] rounded-[20px] bg-white/94 backdrop-blur-md border border-[#0F4024]/[0.08] p-6 sm:p-8 shadow-auth-card space-y-6">
            {/* Case 1: Expired / Invalid */}
            {isErrorState && (
              <>
                <div className="space-y-2">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-[#1C1917]">
                    What to do
                  </h2>
                  <p className="text-[16px] leading-[24px] text-[#57534E]">
                    {effectiveVariant === 'expired'
                      ? `Ask ${creatorTitle} to send you a new link, then open it here.`
                      : `Check that you copied the whole link from ${creatorTitle}’s message, or request a fresh invite.`}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={onLogIn}
                    className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                  >
                    Back to Raba Pay
                  </button>
                </div>
              </>
            )}

            {/* Case 2: Already a member / Settled */}
            {isSummaryState && (
              <>
                <div className="space-y-4">
                  <h2 className="text-[20px] leading-[28px] font-semibold text-[#1C1917]">
                    {effectiveVariant === 'settled' ? 'Bill summary' : 'Current status'}
                  </h2>

                  <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] divide-y divide-black/[0.06]">
                    {effectiveVariant === 'already-member' ? (
                      <>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">Group</span>
                          <span className="font-semibold text-[#1C1917]">{groupTitle}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">Paid so far</span>
                          <span className="font-num font-semibold text-[#1C1917]">2 of 4</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">You owe</span>
                          <span className="font-num font-semibold text-[#92400E]">25.00 USDC</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">Total</span>
                          <span className="font-num font-semibold text-[#1C1917]">100.00 USDC</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">Paid so far</span>
                          <span className="font-num font-semibold text-[#166534]">4 of 4</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 text-[15px]">
                          <span className="text-[#57534E]">Your share</span>
                          <span className="font-num font-semibold text-[#166534]">
                            25.00 USDC, paid
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenGroup}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  Open group
                </button>
              </>
            )}

            {/* Case 3: Locked / Signed-in / Share updated */}
            {!isErrorState && !isSummaryState && (
              <>
                <h2 className="text-[20px] leading-[28px] font-semibold text-[#1C1917]">
                  How it works
                </h2>

                <ol className="space-y-4">
                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#14532D] font-num text-[13px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#1C1917] leading-6">
                        {effectiveVariant === 'signed-in' ? 'Join the group' : 'Create your account'}
                      </p>
                      <p className="text-[14px] text-[#57534E] leading-5">
                        {effectiveVariant === 'signed-in'
                          ? `You are signed in as ${userName}.`
                          : 'Name, email and a password.'}
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#14532D] font-num text-[13px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#1C1917] leading-6">
                        Connect your wallet
                      </p>
                      <p className="text-[14px] text-[#57534E] leading-5">
                        We never hold your USDC.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-full bg-[#DCFCE7] text-[#14532D] font-num text-[13px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="text-[16px] font-semibold text-[#1C1917] leading-6">
                        Pay your share
                      </p>
                      <p className="text-[14px] text-[#57534E] leading-5">
                        {effectiveVariant === 'share-updated'
                          ? `Pay updated share to ${creatorTitle}, simulated in USDC.`
                          : `Split and settle directly with ${creatorTitle} in USDC.`}
                      </p>
                    </div>
                  </li>
                </ol>

                {effectiveVariant === 'signed-in' ? (
                  <button
                    type="button"
                    onClick={onJoinGroup}
                    className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                  >
                    Join group
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={onSignUp}
                      className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                    >
                      Sign up
                    </button>
                    <button
                      type="button"
                      onClick={onLogIn}
                      className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                    >
                      Log in
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
