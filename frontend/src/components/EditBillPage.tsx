import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Lock } from 'lucide-react';
import { Bill, EditBillPreset, Group } from '../types';

interface EditBillPageProps {
  bill: Bill;
  groups: Group[];
  preset?: EditBillPreset;
  onCancel: () => void;
  onSave: (params: { billId: string; title: string; totalAmount: number; groupId: string }) => void;
}

export const EditBillPage: React.FC<EditBillPageProps> = ({
  bill,
  groups,
  preset = 'unlocked',
  onCancel,
  onSave,
}) => {
  const isLocked =
    preset === 'locked-paid' || (preset === 'unlocked' && bill.paidCount > 1 && false);

  const [title, setTitle] = useState(bill.title);
  const [amountInput, setAmountInput] = useState(bill.totalAmount.toFixed(2));
  const [groupId, setGroupId] = useState(bill.groupId);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(bill.title);
    setAmountInput(bill.totalAmount.toFixed(2));
    setGroupId(bill.groupId);
    setError('');
  }, [bill, preset]);

  const parsedTotal = useMemo(() => {
    const n = parseFloat(amountInput);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }, [amountInput]);

  const selectedGroup = groups.find((g) => g.id === groupId) ?? groups[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Enter what the bill is for.');
      return;
    }
    if (!isLocked && parsedTotal <= 0) {
      setError('Enter the total on the receipt.');
      return;
    }
    onSave({
      billId: bill.id,
      title: title.trim(),
      totalAmount: isLocked ? bill.totalAmount : parsedTotal,
      groupId: isLocked ? bill.groupId : groupId,
    });
  };

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      {/* Header */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{bill.title}</span>
        </button>
        <h1 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.02em] text-[#1C1917]">
          Edit bill
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-5"
        >
          {isLocked && (
            <div className="rounded-[12px] bg-[#F5F5F4] border border-black/[0.06] p-4 flex items-start gap-3 text-[14px] leading-5 text-[#1C1917]">
              <Lock className="w-4 h-4 text-[#57534E] shrink-0 mt-0.5" />
              <span>
                Jo has paid. The amount and group are locked. You can still change the title.
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="edit-bill-title" className="block text-[14px] font-medium text-[#57534E]">
              What is the bill for?
            </label>
            <input
              id="edit-bill-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              className="w-full h-12 px-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:outline-none text-[16px] text-[#1C1917]"
            />
          </div>

          <div className={`space-y-1.5 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <label htmlFor="edit-bill-total" className="block text-[14px] font-medium text-[#57534E]">
              Total
            </label>
            <div className="flex items-center justify-between h-16 px-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus-within:border-[#15803D] focus-within:bg-white">
              <input
                id="edit-bill-total"
                type="number"
                step="0.01"
                min="0"
                disabled={isLocked}
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setError('');
                }}
                className="font-num w-full bg-transparent text-[28px] font-semibold text-[#1C1917] focus:outline-none"
              />
              <span className="font-num text-[16px] font-semibold text-[#57534E] pl-3 shrink-0">
                USDC
              </span>
            </div>
          </div>

          <div className={`space-y-1.5 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <label htmlFor="edit-bill-group" className="block text-[14px] font-medium text-[#57534E]">
              Group
            </label>
            <div className="relative">
              <select
                id="edit-bill-group"
                disabled={isLocked}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full h-12 pl-4 pr-10 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:outline-none text-[16px] font-medium text-[#1C1917] appearance-none"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#57534E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {error && <p className="text-[14px] font-medium text-[#B91C1C]">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
            >
              Save changes
            </button>
          </div>
        </form>

        {/* Desktop Summary */}
        <aside className="hidden lg:block lg:col-span-5">
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-6 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#57534E]">Summary</span>
              <span className="text-[13px] font-medium text-[#15803D]">{selectedGroup?.name}</span>
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-[#1C1917]">
                {title.trim() || bill.title}
              </h2>
              <p className="font-num text-[32px] font-semibold tracking-tight text-[#1C1917] mt-1">
                {(isLocked ? bill.totalAmount : parsedTotal).toFixed(2)}{' '}
                <span className="text-[18px] text-[#57534E]">USDC</span>
              </p>
            </div>
            <div className="border-t border-black/[0.06] pt-4 text-[14px] leading-5 text-[#57534E]">
              {isLocked
                ? 'Jo has paid, so the amount is locked.'
                : 'Changes apply to everyone in the group. People who owe are told.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
