import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Bill, BillDetailPreset, BillParticipant } from '../types';
import { AvatarBadge, SegmentedProgress } from './BrandPrimitives';

interface BillDetailsPageProps {
  bill: Bill;
  groupName: string;
  preset?: BillDetailPreset;
  onBack: () => void;
  onPayBill: (billId: string) => void;
  onCancelBill: (billId: string) => void;
  onEditBill: (bill: Bill) => void;
}

export const BillDetailsPage: React.FC<BillDetailsPageProps> = ({
  bill,
  groupName,
  preset = 'live',
  onBack,
  onPayBill,
  onCancelBill,
  onEditBill,
}) => {
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [txModalHash, setTxModalHash] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<'confirm' | 'blocked' | null>(() =>
    preset === 'cancel-confirm' ? 'confirm' : preset === 'cancel-blocked' ? 'blocked' : null
  );

  React.useEffect(() => {
    if (preset === 'cancel-confirm') setCancelModal('confirm');
    else if (preset === 'cancel-blocked') setCancelModal('blocked');
    else setCancelModal(null);
  }, [preset]);

  // Derive effective display bill based on preset (or live bill state)
  const effectiveStatus =
    preset === 'live'
      ? bill.status
      : preset === 'you-owe' || preset === 'edited'
        ? 'you-owe'
        : preset === 'confirming'
          ? 'confirming'
          : preset === 'you-paid'
            ? 'paid'
            : preset === 'being-paid' || preset === 'cancel-confirm' || preset === 'cancel-blocked'
              ? 'waiting'
              : preset === 'cancelled'
                ? 'cancelled'
                : 'settled';

  const isEdited = preset === 'edited' || Boolean(bill.editedNotice);
  const isCreator =
    preset === 'being-paid' ||
    preset === 'cancel-confirm' ||
    preset === 'cancel-blocked' ||
    preset === 'cancelled' ||
    (preset === 'live' && bill.paidById === 'sam');

  const displayTitle =
    preset === 'being-paid' ||
    preset === 'cancel-confirm' ||
    preset === 'cancel-blocked' ||
    preset === 'cancelled'
      ? 'Groceries'
      : bill.title;
  const displayTotal =
    preset === 'being-paid' ||
    preset === 'cancel-confirm' ||
    preset === 'cancel-blocked' ||
    preset === 'cancelled'
      ? 80.0
      : bill.totalAmount;
  const displayPaidCount =
    preset === 'cancel-confirm' || preset === 'cancelled'
      ? 1
      : effectiveStatus === 'settled'
        ? bill.totalMembers
        : effectiveStatus === 'paid' || effectiveStatus === 'waiting'
          ? Math.max(3, bill.paidCount)
          : bill.paidCount;

  const defaultParticipants: BillParticipant[] = bill.participants ?? [
    {
      memberId: 'alex',
      name: isCreator ? 'You' : 'Alex',
      initial: isCreator ? 'S' : 'A',
      avatarBg: isCreator ? '#166534' : '#DBEAFE',
      avatarText: isCreator ? '#FFFFFF' : '#1E40AF',
      share: displayTotal / bill.totalMembers,
      isPayer: true,
      isYou: isCreator,
      status: 'payer',
      paidAtLabel: 'Paid the bill',
    },
    {
      memberId: 'jo',
      name: 'Jo',
      initial: 'J',
      avatarBg: '#EDE9FE',
      avatarText: '#5B21B6',
      share: displayTotal / bill.totalMembers,
      status: preset === 'cancel-confirm' || preset === 'cancelled' ? 'unpaid' : 'paid',
      paidAtLabel:
        preset === 'cancel-confirm' || preset === 'cancelled' ? 'Not paid yet' : 'Paid · 2h ago',
      txHash:
        preset === 'cancel-confirm' || preset === 'cancelled' ? undefined : '0x9a4f…31bc',
    },
    {
      memberId: 'sam',
      name: isCreator ? 'Alex' : 'Sam (you)',
      initial: isCreator ? 'A' : 'S',
      avatarBg: isCreator ? '#DBEAFE' : '#166534',
      avatarText: isCreator ? '#1E40AF' : '#FFFFFF',
      share: displayTotal / bill.totalMembers,
      isYou: !isCreator,
      status:
        effectiveStatus === 'confirming'
          ? 'confirming'
          : effectiveStatus === 'paid' || effectiveStatus === 'settled' || isCreator
            ? 'paid'
            : 'unpaid',
      paidAtLabel:
        effectiveStatus === 'confirming'
          ? 'Confirming, takes a few seconds'
          : effectiveStatus === 'paid'
            ? 'Paid · just now'
            : effectiveStatus === 'settled'
              ? 'Paid · 2h ago'
              : isCreator
                ? 'Paid · Yesterday'
                : 'Not paid yet',
      txHash:
        effectiveStatus === 'paid' || effectiveStatus === 'settled' || isCreator
          ? '0x4d8e…72ca'
          : undefined,
    },
    {
      memberId: 'mia',
      name: 'Mia',
      initial: 'M',
      avatarBg: '#FFE4E6',
      avatarText: '#9F1239',
      share: displayTotal / bill.totalMembers,
      status: effectiveStatus === 'settled' ? 'paid' : 'unpaid',
      paidAtLabel: effectiveStatus === 'settled' ? 'Paid · 1h ago' : 'Not paid yet',
      txHash: effectiveStatus === 'settled' ? '0x2f71…50de' : undefined,
    },
  ];

  const handleCopyWallet = () => {
    if (bill.paidToWallet) {
      navigator.clipboard?.writeText(bill.paidToWallet).catch(() => {});
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 1800);
    }
  };

  const handleRequestCancel = () => {
    if (displayPaidCount > 1) {
      setCancelModal('blocked');
    } else {
      setCancelModal('confirm');
    }
  };

  const renderStatusPill = () => {
    if (effectiveStatus === 'cancelled') {
      return (
        <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
          Cancelled
        </span>
      );
    }
    if (effectiveStatus === 'you-owe') {
      return (
        <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
          You owe {bill.yourShare.toFixed(2)}
        </span>
      );
    }
    if (effectiveStatus === 'confirming') {
      return (
        <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
          Confirming
        </span>
      );
    }
    if (effectiveStatus === 'paid') {
      return (
        <span className="px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[13px] font-medium whitespace-nowrap">
          You paid
        </span>
      );
    }
    if (effectiveStatus === 'waiting') {
      return (
        <span className="px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
          Waiting on {bill.waitingOnName ?? 'Mia'}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[13px] font-medium whitespace-nowrap">
        Settled
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      {/* TOP BREADCRUMB + HEADER */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{groupName}</span>
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.02em] text-[#1C1917]">
              {displayTitle}
            </h1>
            {isEdited && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] border border-[#D9991A]/35 text-[#78360F] text-[12px] font-semibold">
                Edited
              </span>
            )}
          </div>
          {renderStatusPill()}
        </div>
      </div>

      {/* EDITED BY CREATOR BANNER */}
      {isEdited && (
        <div className="rounded-[12px] bg-[#FEF3C7] border border-[#D9991A]/35 p-4 text-[#78360F] space-y-1">
          <p className="text-[15px] font-semibold">
            {bill.editedNotice?.editorName ?? 'Alex'} edited this bill
          </p>
          <p className="text-[14px]">
            Your share changed from{' '}
            <span className="font-num font-semibold">
              {(bill.editedNotice?.fromShare ?? 20).toFixed(2)}
            </span>{' '}
            to{' '}
            <span className="font-num font-semibold">
              {(bill.editedNotice?.toShare ?? 25).toFixed(2)} USDC
            </span>
            .
          </p>
        </div>
      )}

      {/* 2-COLUMN DESKTOP / STACKED MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: AMOUNT, PROGRESS, PAID TO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-4">
            <div>
              <p className="font-num text-[32px] font-semibold tracking-tight text-[#1C1917]">
                {displayTotal.toFixed(2)}{' '}
                <span className="text-[18px] text-[#57534E] font-medium">USDC</span>
              </p>
              <p className="text-[14px] text-[#57534E] mt-1">
                {groupName} · Created by {isCreator ? 'you' : bill.paidByLabel} · {bill.createdAt}
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-black/[0.05]">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-num font-medium text-[#1C1917]">
                  {displayPaidCount} of {bill.totalMembers} paid
                </span>
                {renderStatusPill()}
              </div>
              <SegmentedProgress paid={displayPaidCount} total={bill.totalMembers} />
            </div>
          </div>

          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#57534E]">Paid to</p>
              <p className="text-[15px] font-semibold text-[#1C1917] mt-0.5">
                {isCreator ? 'Your wallet' : bill.paidByLabel}
              </p>
              <p className="font-num text-[13px] text-[#57534E]">
                {bill.paidToWallet || 'Wallet pending'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyWallet}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[13px] font-semibold shrink-0 transition-colors cursor-pointer"
            >
              {copiedWallet ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWallet ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* DESKTOP CREATOR ACTIONS OR PAY CTA */}
          <div className="hidden lg:block space-y-2.5">
            {effectiveStatus === 'you-owe' && (
              <button
                type="button"
                onClick={() => onPayBill(bill.id)}
                className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
              >
                Pay {bill.yourShare.toFixed(2)} USDC
              </button>
            )}
            {effectiveStatus === 'confirming' && (
              <button
                type="button"
                disabled
                className="w-full h-12 rounded-[12px] bg-[#E7E5E4] text-[#78716C] text-[16px] font-semibold cursor-not-allowed"
              >
                Confirming payment…
              </button>
            )}
            {isCreator && effectiveStatus !== 'settled' && effectiveStatus !== 'cancelled' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditBill(bill)}
                  className="flex-1 h-11 rounded-[12px] bg-white border border-[#0F4024]/15 hover:bg-[#FAFAF9] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                >
                  Edit bill
                </button>
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  className="px-4 h-11 rounded-[12px] text-[#DC2626] hover:bg-[#FEF2F2] text-[15px] font-semibold cursor-pointer"
                >
                  Cancel bill
                </button>
              </div>
            )}
            {effectiveStatus === 'cancelled' && (
              <div className="rounded-[12px] bg-[#FEF3C7] border border-[#D9991A]/35 p-4 text-[14px] text-[#78360F]">
                This bill was cancelled. Everyone in {groupName} was notified and nothing is owed.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: WHO OWES WHAT */}
        <div className="lg:col-span-7">
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">Who owes what</h2>
              <span className="text-[13px] text-[#57534E]">
                {bill.splitType === 'custom' ? 'Custom split' : 'Split equally'}
              </span>
            </div>

            <div className="divide-y divide-black/[0.06]">
              {defaultParticipants.map((p) => (
                <div key={p.memberId} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarBadge
                      initial={p.initial}
                      bg={p.avatarBg}
                      text={p.avatarText}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                        {p.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-[#57534E]">
                        <span
                          className={
                            p.status === 'confirming'
                              ? 'text-[#92400E] font-medium'
                              : p.status === 'paid'
                                ? 'text-[#15803D] font-medium'
                                : ''
                          }
                        >
                          {p.paidAtLabel}
                        </span>
                        {p.txHash && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => setTxModalHash(p.txHash!)}
                              className="inline-flex items-center gap-1 font-medium text-[#15803D] hover:underline cursor-pointer"
                            >
                              <span>View transaction</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="font-num text-[15px] font-semibold text-[#1C1917] shrink-0">
                    {p.share.toFixed(2)} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      {(effectiveStatus === 'you-owe' ||
        effectiveStatus === 'confirming' ||
        (isCreator && effectiveStatus !== 'settled' && effectiveStatus !== 'cancelled')) && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/[0.08] px-5 py-3.5">
          {effectiveStatus === 'you-owe' && (
            <button
              type="button"
              onClick={() => onPayBill(bill.id)}
              className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
            >
              Pay {bill.yourShare.toFixed(2)} USDC
            </button>
          )}
          {effectiveStatus === 'confirming' && (
            <button
              type="button"
              disabled
              className="w-full h-12 rounded-[12px] bg-[#E7E5E4] text-[#78716C] text-[16px] font-semibold cursor-not-allowed"
            >
              Confirming payment…
            </button>
          )}
          {isCreator && effectiveStatus !== 'you-owe' && effectiveStatus !== 'confirming' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  className="px-4 h-12 rounded-[12px] text-[#DC2626] font-semibold text-[15px] cursor-pointer"
                >
                  Cancel bill
                </button>
                <button
                  type="button"
                  onClick={() => onEditBill(bill)}
                  className="flex-1 h-12 rounded-[12px] bg-[#15803D] text-white font-semibold text-[15px] shadow-btn-primary cursor-pointer"
                >
                  Edit bill
                </button>
              </div>
            )}
        </div>
      )}

      {/* TESTNET TRANSACTION DETAILS MODAL */}
      <AnimatePresence>
        {txModalHash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setTxModalHash(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[18px] bg-white p-6 shadow-card-soft space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold text-[#1C1917]">Testnet transaction</h3>
                <button
                  type="button"
                  onClick={() => setTxModalHash(null)}
                  className="p-1.5 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-[12px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Network</span>
                  <span className="font-semibold text-[#15803D]">Stellar Testnet (Simulated)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Hash</span>
                  <span className="font-num font-semibold text-[#1C1917]">{txModalHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">Status</span>
                  <span className="font-semibold text-[#15803D]">Confirmed</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTxModalHash(null)}
                className="w-full h-11 rounded-[12px] bg-[#15803D] text-white text-[15px] font-semibold cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CANCEL BILL CONFIRM OR BLOCKED MODAL */}
      <AnimatePresence>
        {cancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setCancelModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-4"
            >
              {cancelModal === 'confirm' ? (
                <>
                  <h3 className="text-[20px] font-semibold text-[#1C1917]">Cancel this bill?</h3>
                  <p className="text-[15px] leading-6 text-[#57534E]">
                    {displayTitle},{' '}
                    <span className="font-num font-semibold text-[#1C1917]">
                      {displayTotal.toFixed(2)} USDC
                    </span>
                    . Nobody has paid yet, so nobody loses money. Everyone in {groupName} is told
                    it was cancelled.
                  </p>
                  <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCancelModal(null);
                        onCancelBill(bill.id);
                      }}
                      className="flex-1 h-11 rounded-[12px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-[15px] cursor-pointer"
                    >
                      Cancel bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelModal(null)}
                      className="flex-1 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] font-semibold text-[15px] cursor-pointer"
                    >
                      Keep bill
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-[20px] font-semibold text-[#1C1917]">
                    You can’t cancel this bill
                  </h3>
                  <p className="text-[15px] leading-6 text-[#57534E]">
                    Jo has already paid{' '}
                    <span className="font-num font-semibold text-[#1C1917]">20.00 USDC</span>. Bills
                    with payments can’t be cancelled, so nobody’s money is lost.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCancelModal(null)}
                    className="w-full h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-[15px] shadow-btn-primary cursor-pointer"
                  >
                    Got it
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
