import React from 'react';
import { BrandLockup, InviteChip, PageSurfaceBlobs } from './BrandPrimitives';
import { WelcomeReadyIllustration } from './Illustrations';

interface AccountCreatedPageProps {
  userName: string;
  fromInvite: boolean;
  inviterName?: string;
  groupName?: string;
  onJoinGroup: () => void;
  onGoToDashboard: () => void;
  onBackHome: () => void;
}

export const AccountCreatedPage: React.FC<AccountCreatedPageProps> = ({
  userName,
  fromInvite,
  inviterName,
  groupName,
  onJoinGroup,
  onGoToDashboard,
  onBackHome,
}) => {
  return (
    <div className="relative min-h-screen bg-page-gradient flex flex-col p-6 md:p-12 overflow-x-hidden">
      <PageSurfaceBlobs />

      <header className="relative z-10 flex items-center justify-between">
        <BrandLockup variant="light" onClick={onBackHome} />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-[480px] md:bg-white/94 md:backdrop-blur-md md:border md:border-[#0F4024]/[0.08] md:rounded-[16px] md:shadow-auth-card md:px-12 md:py-10 flex flex-col items-center text-center gap-6">
          <WelcomeReadyIllustration className="w-36 h-28" />

          <div className="space-y-2">
            <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
              Your account is ready, {userName || 'Friend'}
            </h1>
            <p className="text-[16px] leading-[24px] text-[#57534E]">
              {fromInvite
                ? `${inviterName || 'Your friend'} invited you to ${groupName || 'a group'}. Join it now, or look around first.`
                : 'Make a group, add a bill, and invite the people you share costs with.'}
            </p>
          </div>

          {fromInvite && (
            <div className="w-full text-left">
              <InviteChip
                groupName={groupName || 'Shared Group'}
                subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
              />
            </div>
          )}

          <div className="w-full space-y-3 pt-1">
            <button
              type="button"
              onClick={onJoinGroup}
              className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
            >
              {fromInvite ? `Join ${groupName || 'Group'}` : 'Create your first group'}
            </button>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="w-full h-12 min-h-[48px] rounded-[12px] bg-white border border-black/10 hover:bg-[#FAFAF9] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
