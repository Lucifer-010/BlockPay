import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, WifiOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { HistoryPreset, RecentPaymentItem } from '../types';
import { AvatarBadge } from './BrandPrimitives';
import { ReceiptEmptyIllustration } from './Illustrations';

interface HistoryViewProps {
  payments: RecentPaymentItem[];
  preset?: HistoryPreset;
  onResetPreset?: () => void;
}

const PENDING_DEMO_ITEM: RecentPaymentItem = {
  id: 'pay-pending-demo',
  title: 'Paying Alex',
  subtitle: 'Dinner at Olive & Co · Housemates · Just now',
  amount: 25.0,
  direction: 'out',
  txHash: 'Pending…',
  counterpartyName: 'Alex',
  counterpartyInitial: 'A',
  avatarBg: '#DBEAFE',
  avatarText: '#1E40AF',
  groupName: 'Housemates',
  billTitle: 'Dinner at Olive & Co',
  dayGroup: 'Today',
  dateLabel: 'Just now',
  status: 'pending',
  feeLabel: '0.00001 XLM',
  toWallet: 'GA4F…9K2L',
};

export const HistoryView: React.FC<HistoryViewProps> = ({
  payments,
  preset = 'default',
  onResetPreset,
}) => {
  const [filter, setFilter] = useState<'all' | 'out' | 'in'>(() =>
    preset === 'filtered-empty' ? 'in' : 'all'
  );
  const [selectedTx, setSelectedTx] = useState<RecentPaymentItem | null>(() =>
    preset === 'tx-detail' ? payments[0] ?? null : null
  );
  const [showExplorerCard, setShowExplorerCard] = useState(false);

  useEffect(() => {
    setShowExplorerCard(false);
    if (preset === 'filtered-empty') {
      setFilter('in');
      setSelectedTx(null);
    } else if (preset === 'tx-detail') {
      setFilter('all');
      setSelectedTx(payments[0] ?? null);
    } else {
      setFilter('all');
      setSelectedTx(null);
    }
  }, [preset, payments]);

  const effectivePayments = useMemo(() => {
    if (preset === 'first-use') return [];
    if (preset === 'filtered-empty') {
      return payments.filter((p) => p.direction === 'out');
    }
    if (preset === 'pending') {
      return [PENDING_DEMO_ITEM, ...payments];
    }
    return payments;
  }, [payments, preset]);

  const filtered = useMemo(() => {
    if (filter === 'all') return effectivePayments;
    return effectivePayments.filter((p) => p.direction === filter);
  }, [effectivePayments, filter]);

  const groupedMobile = useMemo(() => {
    const today = filtered.filter((p) => (p.dayGroup ?? 'Today') === 'Today');
    const earlier = filtered.filter((p) => p.dayGroup === 'Earlier');
    return [
      { label: 'Today', items: today },
      { label: 'Earlier', items: earlier },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  const renderStatusChip = (status: RecentPaymentItem['status']) => {
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[12px] font-medium">
          Pending
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] text-[12px] font-medium">
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] text-[12px] font-medium">
        Confirmed
      </span>
    );
  };

  if (preset === 'error') {
    return (
      <div className="space-y-5">
        <h1 className="hidden md:block text-[30px] font-semibold tracking-[-0.02em] text-[#1C1917]">
          History
        </h1>
        <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center">
            <WifiOff className="w-6 h-6 text-[#DC2626]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[20px] font-semibold text-[#1C1917]">
              We could not load your history.
            </h2>
            <p className="text-[14px] leading-6 text-[#57534E]">
              Check your connection and try again. Your payments are safe.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetPreset}
            className="inline-flex items-center gap-2 px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hidden md:block text-[30px] font-semibold tracking-[-0.02em] text-[#1C1917]">
            History
          </h1>
          <p className="text-[14px] md:text-[15px] text-[#57534E]">
            Simulated USDC payments you made and received.
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-[12px] bg-white/90 border border-[#0F4024]/10">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'out' as const, label: 'Paid' },
            { id: 'in' as const, label: 'Received' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors cursor-pointer ${
                filter === item.id
                  ? 'bg-[#DCFCE7] text-[#14532D]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty States: First use OR Nothing in this filter */}
      {filtered.length === 0 ? (
        <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-8 sm:p-12 text-center space-y-4">
          <ReceiptEmptyIllustration className="w-28 h-24 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-[19px] font-semibold text-[#1C1917]">
              {effectivePayments.length === 0
                ? 'No payments yet'
                : filter === 'in'
                  ? 'Nothing received yet'
                  : 'Nothing paid yet'}
            </h2>
            <p className="text-[14px] text-[#57534E] max-w-sm mx-auto">
              {effectivePayments.length === 0
                ? 'Payments you make and receive show up here.'
                : filter === 'in'
                  ? 'When someone pays you, it shows up here.'
                  : 'When you pay a bill, it shows up here.'}
            </p>
          </div>
          {effectivePayments.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="px-5 h-10 rounded-[10px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold cursor-pointer"
            >
              Show all
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE GROUPED LIST */}
          <div className="md:hidden space-y-5">
            {groupedMobile.map((section) => (
              <div key={section.label} className="space-y-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#78716C] px-1">
                  {section.label}
                </p>
                <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card divide-y divide-black/[0.06]">
                  {section.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedTx(p)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarBadge
                          initial={p.counterpartyInitial ?? p.title[0] ?? 'P'}
                          bg={p.avatarBg ?? '#DCFCE7'}
                          text={p.avatarText ?? '#166534'}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                            {p.title}
                          </p>
                          <p className="text-[13px] text-[#57534E] truncate">
                            {p.billTitle ?? p.subtitle} · {p.groupName ?? 'Housemates'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`font-num text-[14px] font-semibold ${
                            p.status === 'failed'
                              ? 'text-[#78716C] line-through'
                              : p.direction === 'in'
                                ? 'text-[#15803D]'
                                : 'text-[#1C1917]'
                          }`}
                        >
                          {p.direction === 'in' ? '+' : '−'}
                          {p.amount.toFixed(2)} USDC
                        </span>
                        {renderStatusChip(p.status)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP STRUCTURED TABLE */}
          <div className="hidden md:block rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#FAFAF9] text-[12px] font-semibold text-[#57534E]">
                  <th className="py-3.5 px-5">Person</th>
                  <th className="py-3.5 px-4">Bill</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedTx(p)}
                    className="hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <AvatarBadge
                          initial={p.counterpartyInitial ?? p.title[0] ?? 'P'}
                          bg={p.avatarBg ?? '#DCFCE7'}
                          text={p.avatarText ?? '#166534'}
                          size="sm"
                        />
                        <span className="text-[14px] font-semibold text-[#1C1917]">
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[14px] text-[#57534E]">
                      {p.billTitle ?? p.subtitle} · {p.groupName ?? 'Housemates'}
                    </td>
                    <td className="py-3.5 px-4 font-num text-[13px] text-[#57534E]">
                      {p.dateLabel ?? '24 Nov, 12:41'}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-num text-[14px] font-semibold ${
                        p.status === 'failed'
                          ? 'text-[#78716C]'
                          : p.direction === 'in'
                            ? 'text-[#15803D]'
                            : 'text-[#1C1917]'
                      }`}
                    >
                      {p.direction === 'in' ? '+' : '−'}
                      {p.amount.toFixed(2)} USDC
                    </td>
                    <td className="py-3.5 px-5 text-right">{renderStatusChip(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TRANSACTION DETAIL MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[440px] rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AvatarBadge
                    initial={selectedTx.counterpartyInitial ?? selectedTx.title[0] ?? 'P'}
                    bg={selectedTx.avatarBg ?? '#DCFCE7'}
                    text={selectedTx.avatarText ?? '#166534'}
                    size="md"
                  />
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#1C1917]">{selectedTx.title}</h3>
                    <p
                      className={`font-num text-[22px] font-semibold ${
                        selectedTx.direction === 'in' ? 'text-[#15803D]' : 'text-[#1C1917]'
                      }`}
                    >
                      {selectedTx.direction === 'in' ? '+' : '−'}
                      {selectedTx.amount.toFixed(2)} USDC
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="p-1.5 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-2.5 text-[14px]">
                <div className="flex justify-between gap-3">
                  <span className="text-[#57534E]">For</span>
                  <span className="font-semibold text-[#1C1917] text-right">
                    {selectedTx.billTitle ?? 'Dinner at Olive & Co'} ·{' '}
                    {selectedTx.groupName ?? 'Housemates'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#57534E]">To</span>
                  <span className="font-semibold text-[#1C1917] text-right">
                    {selectedTx.counterpartyName ?? 'Alex'} ·{' '}
                    <span className="font-num">{selectedTx.toWallet ?? 'GA4F…9K2L'}</span>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#57534E]">Fee</span>
                  <span className="font-num text-[#1C1917]">
                    {selectedTx.feeLabel ?? '0.00001 XLM'}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#57534E]">Date</span>
                  <span className="font-num text-[#1C1917]">
                    {selectedTx.dateLabel ?? '24 Nov, 12:41'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-[#57534E]">Status</span>
                  {renderStatusChip(selectedTx.status)}
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#57534E]">Transaction</span>
                  <span className="font-num font-semibold text-[#1C1917]">
                    {selectedTx.txHash ?? '7a3f…c91e'}
                  </span>
                </div>
              </div>

              {showExplorerCard && (
                <div className="rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 text-[13px] text-[#14532D] space-y-1">
                  <p className="font-semibold">Stellar Testnet Explorer</p>
                  <p className="font-num">
                    Tx {selectedTx.txHash ?? '7a3f…c91e'} · Simulated USDC Asset · Confirmed
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExplorerCard((v) => !v)}
                  className="flex-1 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{showExplorerCard ? 'Hide explorer' : 'View on explorer'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="flex-1 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
