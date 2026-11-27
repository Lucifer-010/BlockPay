import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  FileText,
  Home,
  Users,
  Wifi,
} from 'lucide-react';
import { ActivityItem, Bill, GroupMobileTab, Member } from '../types';
import { AvatarBadge, AvatarStack, BrandLockup, SegmentedProgress } from './BrandPrimitives';

interface HeroProductPreviewProps {
  bills: Bill[];
  members: Member[];
  activity: ActivityItem[];
  onOpenWorkspace: () => void;
  onOpenInvite: () => void;
}

export const HeroProductPreview: React.FC<HeroProductPreviewProps> = ({
  bills,
  members,
  activity,
  onOpenWorkspace,
  onOpenInvite,
}) => {
  const [mobileTab, setMobileTab] = useState<GroupMobileTab>('bills');
  const [previewPaid, setPreviewPaid] = useState(false);

  const housematesBills = bills.filter((b) => b.groupId === 'housemates');
  const firstBill = housematesBills[0];

  const getBillDisplay = (bill: Bill, idx: number) => {
    const isOlivePaid = idx === 0 && previewPaid;
    const paidCount = isOlivePaid ? 3 : bill.paidCount;
    const status = isOlivePaid ? 'waiting' : bill.status;
    return { ...bill, paidCount, status };
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Mobile / Narrow Viewport: Authentic iPhone Group - Bills Mockup */}
      <div className="md:hidden w-full flex justify-center px-2">
        <div className="relative w-[300px] bg-[#1C1917] rounded-[42px] p-[10px] shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_90px_rgba(51,217,115,0.3)] border border-[#2A3832]">
          {/* Side hardware buttons */}
          <span className="absolute -left-[4px] top-[110px] w-[4px] h-8 bg-[#2A3832] rounded-l-sm" />
          <span className="absolute -left-[4px] top-[156px] w-[4px] h-14 bg-[#2A3832] rounded-l-sm" />
          <span className="absolute -left-[4px] top-[220px] w-[4px] h-14 bg-[#2A3832] rounded-l-sm" />
          <span className="absolute -right-[4px] top-[175px] w-[4px] h-20 bg-[#2A3832] rounded-r-sm" />

          {/* Screen */}
          <div className="relative w-full h-[548px] rounded-[34px] overflow-hidden bg-page-gradient flex flex-col">
            {/* Dynamic Island */}
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-30 w-[86px] h-[24px] bg-[#1C1917] rounded-full flex items-center justify-end pr-2.5">
              <span className="w-2 h-2 rounded-full bg-[#16201B]" />
            </div>

            {/* Dark Hero Header inside phone */}
            <div className="relative bg-hero-dark px-4 pt-3 pb-4 text-white shrink-0">
              {/* Status bar */}
              <div className="flex items-center justify-between text-[11px] font-num font-semibold mb-4 px-1">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-end gap-[1.5px]">
                    <span className="w-[2px] h-[3px] bg-white rounded-[0.5px]" />
                    <span className="w-[2px] h-[5px] bg-white rounded-[0.5px]" />
                    <span className="w-[2px] h-[7px] bg-white rounded-[0.5px]" />
                    <span className="w-[2px] h-[9px] bg-white rounded-[0.5px]" />
                  </div>
                  <Wifi className="w-3 h-3" />
                  <span className="inline-flex items-center w-4 h-2 border border-white rounded-[2px] p-[1px]">
                    <span className="w-full h-full bg-white rounded-[1px]" />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <ArrowLeft className="w-4 h-4 text-white/90" />
                <span className="text-[19px] font-semibold tracking-tight">Housemates</span>
              </div>

              <div className="flex items-center justify-between">
                <AvatarStack members={members} size="sm" />
                <button
                  type="button"
                  onClick={onOpenInvite}
                  className="text-[11px] font-medium text-[#86EFAC] hover:text-white transition-colors cursor-pointer"
                >
                  Open invite link →
                </button>
              </div>
            </div>

            {/* Phone body */}
            <div className="flex-1 overflow-y-auto px-3.5 py-3 pb-20 space-y-2.5">
              {/* Summary card */}
              <div className="rounded-[12px] p-3 bg-[#33C773] border border-[#86EFAC]/45 text-white shadow-balance-green">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-white/90">
                      {previewPaid ? 'You owe · 0 bills' : 'You owe · 1 bill'}
                    </p>
                    <p className="font-num text-[17px] font-semibold leading-6">
                      {previewPaid ? '0.00' : '25.00'} <span className="text-[12px]">USDC</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/90">You are owed · 1 bill</p>
                    <p className="font-num text-[17px] font-semibold leading-6">
                      20.00 <span className="text-[12px]">USDC</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="w-full py-2 rounded-[8px] bg-[#E7E5E4] text-[#1C1917] text-[11px] font-semibold hover:bg-white transition-colors cursor-pointer"
                >
                  Create shared bill
                </button>
              </div>

              {mobileTab === 'bills' && (
                <div className="space-y-2">
                  {housematesBills.slice(0, 3).map((rawBill, idx) => {
                    const bill = getBillDisplay(rawBill, idx);
                    return (
                      <div
                        key={bill.id}
                        className="rounded-[10px] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[#1C1917] truncate">
                              {bill.title}
                            </p>
                            <p className="text-[10px] text-[#57534E]">
                              {bill.paidById === 'sam'
                                ? `Paid by you · ${bill.yourShare.toFixed(2)} USDC each`
                                : `Your share ${bill.yourShare.toFixed(2)} USDC`}{' '}
                              · {bill.paidCount} of {bill.totalMembers} paid
                            </p>
                          </div>
                          {bill.status === 'you-owe' && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-medium whitespace-nowrap">
                              You owe {bill.yourShare.toFixed(2)}
                            </span>
                          )}
                          {bill.status === 'waiting' && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-medium whitespace-nowrap">
                              Waiting on {bill.waitingOnName ?? 'Alex'}
                            </span>
                          )}
                          {bill.status === 'settled' && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[10px] font-medium whitespace-nowrap">
                              Settled
                            </span>
                          )}
                        </div>
                        <SegmentedProgress paid={bill.paidCount} total={bill.totalMembers} />
                        {bill.status === 'you-owe' && (
                          <button
                            type="button"
                            onClick={() => setPreviewPaid(true)}
                            className="w-full py-2 rounded-[8px] bg-[#15803D] text-white text-[11px] font-semibold shadow-btn-primary hover:bg-[#166534] transition-colors cursor-pointer"
                          >
                            Pay {bill.yourShare.toFixed(2)} USDC
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {mobileTab === 'members' && (
                <div className="rounded-[10px] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)] space-y-2.5">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarBadge
                          initial={m.initial}
                          bg={m.avatarBg}
                          text={m.avatarText}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#1C1917] truncate">
                            {m.name}
                          </p>
                          <p className="text-[10px] text-[#57534E] truncate">{m.balanceNote}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mobileTab === 'activity' && (
                <div className="rounded-[10px] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.06)] space-y-2.5">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <AvatarBadge
                        initial={item.actorInitial}
                        bg={item.avatarBg}
                        text={item.avatarText}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#1C1917] leading-4">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[#57534E] leading-3.5">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Floating Bottom Nav inside phone */}
            <div className="absolute bottom-2.5 left-3 right-3 bg-white/92 backdrop-blur-md border border-white rounded-[16px] p-1.5 flex items-center gap-1 shadow-bottom-nav">
              {[
                { id: 'bills' as const, label: 'Bills', Icon: FileText },
                { id: 'members' as const, label: 'Members', Icon: Users },
                { id: 'activity' as const, label: 'Activity', Icon: Clock },
              ].map(({ id, label, Icon }) => {
                const active = mobileTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMobileTab(id)}
                    className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-[11px] transition-colors cursor-pointer ${
                      active ? 'bg-[#DDF3E4] text-[#14532D]' : 'text-[#57534E] hover:bg-black/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold mt-0.5">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tablet & Desktop Viewport: Desktop Group Dashboard Window */}
      <div className="hidden md:block w-full max-w-[920px] rounded-t-[16px] border-[1.5px] border-b-0 border-[#BFFFD9]/50 shadow-preview-glow overflow-hidden bg-page-gradient">
        <div className="relative flex min-h-[455px] text-left">
          {/* Sidebar */}
          <aside className="w-[180px] lg:w-[204px] shrink-0 bg-white/90 backdrop-blur-md p-4 flex flex-col justify-between border-r border-black/[0.04]">
            <div className="space-y-5">
              <BrandLockup variant="light" compact />
              <nav className="space-y-1" aria-label="Dashboard preview navigation">
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12px] font-medium text-[#57534E] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12px] font-semibold bg-[#DCFCE7] text-[#166534] cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Groups</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12px] font-medium text-[#57534E] hover:bg-black/5 transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>History</span>
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-2.5 pt-4">
              <AvatarBadge initial="S" bg="#166534" text="#FFFFFF" size="sm" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#1C1917] leading-4">Sam</p>
                <p className="font-num text-[11px] text-[#57534E] leading-4 truncate">
                  GA4F…9K2L
                </p>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Area */}
          <div className="flex-1 p-5 lg:p-7 space-y-5 min-w-0">
            {/* Group Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="inline-flex items-center gap-1 text-[12px] text-[#57534E] hover:text-[#1C1917] mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Groups</span>
                </button>
                <h3 className="text-[24px] font-semibold tracking-tight text-[#1C1917] leading-7">
                  Housemates
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <AvatarStack members={members} size="sm" />
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="px-3.5 py-2 rounded-full bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#1C1917] text-[12px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                >
                  Create shared bill
                </button>
              </div>
            </div>

            {/* Two Emerald Balance Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green text-white">
                <p className="text-[11px] text-white/90">
                  {previewPaid ? 'You owe · 0 bills' : 'You owe · 1 bill'}
                </p>
                <p className="font-num text-[22px] font-semibold tracking-tight leading-7 mt-0.5">
                  {previewPaid ? '0.00' : '25.00'} <span className="text-[15px]">USDC</span>
                </p>
              </div>
              <div className="rounded-[12px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green text-white">
                <p className="text-[11px] text-white/90">You are owed · 1 bill</p>
                <p className="font-num text-[22px] font-semibold tracking-tight leading-7 mt-0.5">
                  20.00 <span className="text-[15px]">USDC</span>
                </p>
              </div>
            </div>

            {/* Columns: Bills + Right Stack (Members & Activity) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Bills Column */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#1C1917]">Bills</span>
                  <span className="text-[12px] text-[#57534E]">3 bills</span>
                </div>

                {housematesBills.slice(0, 3).map((rawBill, idx) => {
                  const bill = getBillDisplay(rawBill, idx);
                  return (
                    <div
                      key={bill.id}
                      className="rounded-[10px] bg-white p-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.06)] space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1C1917] leading-5">
                            {bill.title}
                          </p>
                          <p className="text-[11px] text-[#57534E] leading-4">
                            {bill.paidById === 'sam'
                              ? `Paid by you · ${bill.yourShare.toFixed(2)} USDC each`
                              : `Your share ${bill.yourShare.toFixed(2)} USDC`}{' '}
                            · {bill.paidCount} of {bill.totalMembers} paid
                          </p>
                        </div>

                        {bill.status === 'you-owe' && (
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium whitespace-nowrap">
                            You owe {bill.yourShare.toFixed(2)}
                          </span>
                        )}
                        {bill.status === 'waiting' && (
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium whitespace-nowrap">
                            Waiting on {bill.waitingOnName ?? 'Alex'}
                          </span>
                        )}
                        {bill.status === 'settled' && (
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[11px] font-medium whitespace-nowrap">
                            Settled
                          </span>
                        )}
                      </div>

                      <SegmentedProgress paid={bill.paidCount} total={bill.totalMembers} />

                      {bill.status === 'you-owe' && firstBill?.id === bill.id && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewPaid(true)}
                            className="flex-1 py-2 rounded-[8px] bg-[#15803D] hover:bg-[#166534] text-white text-[12px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                          >
                            Pay {bill.yourShare.toFixed(2)} USDC
                          </button>
                          <button
                            type="button"
                            onClick={onOpenWorkspace}
                            className="px-3 py-2 rounded-[8px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Open workspace
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Members & Activity Column */}
              <div className="lg:col-span-5 space-y-4">
                {/* Members */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1C1917]">Members</span>
                      <span className="text-[11px] text-[#57534E]">4 people</span>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenInvite}
                      className="px-2.5 py-1 rounded-full bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#1C1917] text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Invite people
                    </button>
                  </div>

                  <div className="rounded-[10px] bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] space-y-2.5">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2.5">
                        <AvatarBadge
                          initial={m.initial}
                          bg={m.avatarBg}
                          text={m.avatarText}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#1C1917] leading-4 truncate">
                            {m.name}
                          </p>
                          <p className="text-[11px] text-[#57534E] leading-4 truncate">
                            {m.id === 'alex' && previewPaid ? 'All settled' : m.balanceNote}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#1C1917]">Activity</span>
                    <button
                      type="button"
                      onClick={onOpenWorkspace}
                      className="text-[11px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                    >
                      See all
                    </button>
                  </div>

                  <div className="rounded-[10px] bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] space-y-2.5">
                    {activity.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-start gap-2.5">
                        <AvatarBadge
                          initial={item.actorInitial}
                          bg={item.avatarBg}
                          text={item.avatarText}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#1C1917] leading-4 truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#57534E] leading-4 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
