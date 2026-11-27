import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import {
  BillParticipant,
  CreateBillPreset,
  CreateBillStep,
  Group,
  Member,
  UserSession,
} from '../types';
import { AvatarBadge, AvatarStack } from './BrandPrimitives';
import { WalletNeededIllustration } from './Illustrations';

interface CreateBillWizardProps {
  user: UserSession;
  groups: Group[];
  initialGroupId: string;
  initialStep?: CreateBillStep;
  preset?: CreateBillPreset;
  onCancel: () => void;
  onConnectWallet: () => void;
  onSubmitBill: (params: {
    groupId: string;
    title: string;
    totalAmount: number;
    paidById: string;
    splitMode: 'equal' | 'custom';
    yourShare: number;
    participants: BillParticipant[];
  }) => void;
}

export const CreateBillWizard: React.FC<CreateBillWizardProps> = ({
  user,
  groups,
  initialGroupId,
  initialStep = 'details',
  preset = null,
  onCancel,
  onConnectWallet,
  onSubmitBill,
}) => {
  const [step, setStep] = useState<CreateBillStep>(initialStep);
  const [title, setTitle] = useState('Dinner at Olive & Co');
  const [amountInput, setAmountInput] = useState('100.00');
  const [groupId, setGroupId] = useState(initialGroupId || groups[0]?.id || 'housemates');

  // Participants (Step 2)
  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? groups[0],
    [groups, groupId]
  );

  const selectableMembers: Member[] = useMemo(() => {
    return selectedGroup?.members ?? [];
  }, [selectedGroup]);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() =>
    selectableMembers.slice(0, 4).map((m) => m.id)
  );

  // Split (Step 3)
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Validation errors
  const [detailsError, setDetailsError] = useState('');
  const [peopleError, setPeopleError] = useState('');

  // Sync preset scenarios when navigating via Floating Pagination Nav
  useEffect(() => {
    setStep(initialStep);
    setDetailsError('');
    setPeopleError('');

    if (preset === 'missing-amount') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('0.00');
      setDetailsError('Enter the total on the receipt.');
    } else if (preset === 'no-wallet') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
    } else if (preset === 'nobody-selected') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSelectedMemberIds([]);
      setPeopleError('Pick at least two people to split with.');
    } else if (preset === 'split-equal') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSplitType('equal');
      setSelectedMemberIds(selectableMembers.slice(0, 4).map((m) => m.id));
    } else if (preset === 'split-uneven') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSplitType('equal');
      setSelectedMemberIds(selectableMembers.slice(0, 3).map((m) => m.id));
    } else if (preset === 'split-custom') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSplitType('custom');
      const ids = selectableMembers.slice(0, 3).map((m) => m.id);
      setSelectedMemberIds(ids);
      setCustomShares({
        [ids[0] ?? 'alex']: '40.00',
        [ids[1] ?? 'sam']: '40.00',
        [ids[2] ?? 'jo']: '20.00',
      });
    } else if (preset === 'split-custom-error') {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSplitType('custom');
      const ids = selectableMembers.slice(0, 3).map((m) => m.id);
      setSelectedMemberIds(ids);
      setCustomShares({
        [ids[0] ?? 'alex']: '45.00',
        [ids[1] ?? 'sam']: '40.00',
        [ids[2] ?? 'jo']: '20.00',
      });
    } else {
      setTitle('Dinner at Olive & Co');
      setAmountInput('100.00');
      setSplitType('equal');
      setSelectedMemberIds(selectableMembers.slice(0, 4).map((m) => m.id));
    }
  }, [initialStep, preset, selectableMembers]);

  const parsedTotal = useMemo(() => {
    const num = parseFloat(amountInput);
    return Number.isNaN(num) || num < 0 ? 0 : num;
  }, [amountInput]);

  const activeParticipants = useMemo(
    () => selectableMembers.filter((m) => selectedMemberIds.includes(m.id)),
    [selectableMembers, selectedMemberIds]
  );

  // Equal split math: distribute extra cents onto first person(s)
  const equalAllocation = useMemo(() => {
    const count = activeParticipants.length;
    if (count === 0 || parsedTotal <= 0) return {};
    const totalCents = Math.round(parsedTotal * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents - baseCents * count;
    const map: Record<string, number> = {};
    activeParticipants.forEach((m, idx) => {
      map[m.id] = (baseCents + (idx < remainder ? 1 : 0)) / 100;
    });
    return map;
  }, [activeParticipants, parsedTotal]);

  const isUnevenEqual = useMemo(() => {
    const count = activeParticipants.length;
    if (count <= 1 || parsedTotal <= 0) return false;
    const totalCents = Math.round(parsedTotal * 100);
    return totalCents % count !== 0;
  }, [activeParticipants.length, parsedTotal]);

  // Custom split math
  const customTotals = useMemo(() => {
    const assigned = activeParticipants.reduce((sum, m) => {
      const val = parseFloat(customShares[m.id] ?? '');
      return sum + (Number.isNaN(val) || val < 0 ? 0 : val);
    }, 0);
    const roundedAssigned = Math.round(assigned * 100) / 100;
    const roundedTotal = Math.round(parsedTotal * 100) / 100;
    const diff = Math.round((roundedTotal - roundedAssigned) * 100) / 100;
    return {
      assigned: roundedAssigned,
      diff,
      matches: Math.abs(diff) < 0.005 && roundedTotal > 0,
    };
  }, [activeParticipants, customShares, parsedTotal]);

  const walletAvailable = user.walletConnected && preset !== 'no-wallet';

  const handleStep1Continue = () => {
    if (!title.trim()) {
      setDetailsError('Enter what the bill is for.');
      return;
    }
    if (parsedTotal <= 0) {
      setDetailsError('Enter the total on the receipt.');
      return;
    }
    setDetailsError('');
    setStep('people');
  };

  const handleToggleMember = (id: string) => {
    setPeopleError('');
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectOrClearAll = () => {
    setPeopleError('');
    if (selectedMemberIds.length === selectableMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(selectableMembers.map((m) => m.id));
    }
  };

  const handleStep2Continue = () => {
    if (selectedMemberIds.length < 2) {
      setPeopleError('Pick at least two people to split with.');
      return;
    }
    // Pre-seed custom shares with equal values if empty
    setCustomShares((prev) => {
      const next = { ...prev };
      activeParticipants.forEach((m) => {
        if (next[m.id] === undefined) {
          next[m.id] = (equalAllocation[m.id] ?? 0).toFixed(2);
        }
      });
      return next;
    });
    setPeopleError('');
    setStep('split');
  };

  const handleCreateBill = () => {
    if (splitType === 'custom' && !customTotals.matches) return;
    const participants: BillParticipant[] = activeParticipants.map((m) => {
      const share =
        splitType === 'equal'
          ? equalAllocation[m.id] ?? 0
          : Math.max(0, parseFloat(customShares[m.id] ?? '0') || 0);
      const isCreator = m.id === 'sam' || Boolean(m.isYou);
      return {
        memberId: m.id,
        name: isCreator ? 'You' : m.name,
        initial: m.initial,
        avatarBg: m.avatarBg,
        avatarText: m.avatarText,
        share,
        isPayer: isCreator,
        isYou: isCreator,
        status: isCreator ? 'payer' : 'unpaid',
        paidAtLabel: isCreator ? 'Paid the bill' : 'Not paid yet',
      };
    });

    const yourShare =
      participants.find((p) => p.isYou)?.share ??
      Number((parsedTotal / Math.max(1, participants.length)).toFixed(2));

    onSubmitBill({
      groupId: selectedGroup.id,
      title: title.trim(),
      totalAmount: parsedTotal,
      paidById: 'sam',
      splitMode: splitType,
      yourShare,
      participants,
    });
  };

  const stepIndex = step === 'details' ? 1 : step === 'people' ? 2 : 3;

  const canCreateCustom = splitType === 'equal' || customTotals.matches;

  return (
    <div className="space-y-6 pb-28 md:pb-10">
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (step === 'details') onCancel();
            else if (step === 'people') setStep('details');
            else setStep('people');
          }}
          className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'details' ? 'Back' : step === 'people' ? 'Details' : 'Participants'}</span>
        </button>
        <span className="font-num text-[14px] font-medium text-[#57534E]">{stepIndex} of 3</span>
      </div>

      {/* DESKTOP HEADER + STEPPER */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 text-[14px] text-[#57534E] hover:text-[#1C1917] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {selectedGroup?.name}</span>
          </button>
          <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[#1C1917]">
            Create shared bill
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 bg-white/90 border border-[#0F4024]/10 rounded-full px-3 py-1.5 shadow-xs">
          {[
            { id: 'details' as const, num: 1, label: 'Details' },
            { id: 'people' as const, num: 2, label: 'People' },
            { id: 'split' as const, num: 3, label: 'Split' },
          ].map((item, idx) => {
            const active = step === item.id;
            const done = stepIndex > item.num;
            return (
              <React.Fragment key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (item.num <= stepIndex) setStep(item.id);
                  }}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#DCFCE7] text-[#14532D]'
                      : done
                        ? 'text-[#15803D]'
                        : 'text-[#78716C]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px] font-num ${
                      active
                        ? 'bg-[#15803D] text-white'
                        : done
                          ? 'bg-[#22C55E] text-white'
                          : 'bg-[#E7E5E4] text-[#57534E]'
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : item.num}
                  </span>
                  <span>{item.label}</span>
                </button>
                {idx < 2 && <span className="w-4 h-[1px] bg-[#D6D3D1]" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* MAIN 2-COLUMN DESKTOP / SINGLE-COLUMN MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* STEP 1: DETAILS */}
          {step === 'details' && (
            <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-5">
              <div className="md:hidden">
                <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1917]">
                  Create shared bill
                </h1>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="wizard-title" className="block text-[14px] font-medium text-[#57534E]">
                  What is the bill for?
                </label>
                <input
                  id="wizard-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDetailsError('');
                  }}
                  placeholder="Dinner at Olive & Co"
                  className="w-full h-12 px-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:outline-none text-[16px] text-[#1C1917]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="wizard-total" className="block text-[14px] font-medium text-[#57534E]">
                  Total
                </label>
                <div
                  className={`flex items-center justify-between h-16 px-4 rounded-[12px] bg-[#FAFAF9] border ${
                    detailsError ? 'border-[#B91C1C] bg-[#FEF2F2]/40' : 'border-[#0F4024]/15 focus-within:border-[#15803D] focus-within:bg-white'
                  }`}
                >
                  <input
                    id="wizard-total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setDetailsError('');
                    }}
                    className="font-num w-full bg-transparent text-[28px] font-semibold text-[#1C1917] focus:outline-none"
                  />
                  <span className="font-num text-[16px] font-semibold text-[#57534E] pl-3 shrink-0">
                    USDC
                  </span>
                </div>

                {detailsError && (
                  <div className="flex items-center gap-2 pt-1 text-[14px] text-[#B91C1C] font-medium">
                    <span className="w-5 h-5 rounded-full bg-[#FEE2E2] text-[#B91C1C] inline-flex items-center justify-center shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </span>
                    <span>{detailsError}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="wizard-group" className="block text-[14px] font-medium text-[#57534E]">
                  Group
                </label>
                <div className="relative">
                  <select
                    id="wizard-group"
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

              {/* Paid to card OR Wallet needed card */}
              {walletAvailable ? (
                <div className="rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/[0.08] p-4 space-y-1">
                  <p className="text-[13px] font-medium text-[#57534E]">Paid to</p>
                  <p className="font-num text-[15px] font-semibold text-[#1C1917]">
                    Your wallet · {user.walletAddress}
                  </p>
                  <p className="text-[13px] text-[#57534E]">
                    Everyone pays this wallet directly.
                  </p>
                </div>
              ) : (
                <div className="rounded-[14px] bg-[#F0FDF4] border border-[#86EFAC] p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <WalletNeededIllustration className="w-24 h-20 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-[16px] font-semibold text-[#14532D]">
                      Connect a wallet to get paid
                    </h3>
                    <p className="text-[14px] text-[#166534]">
                      Everyone pays you directly, so the bill needs a wallet to send to.
                    </p>
                  </div>
                </div>
              )}

              {/* Desktop inline action buttons */}
              <div className="hidden md:flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                {walletAvailable ? (
                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Connect wallet
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PARTICIPANTS */}
          {step === 'people' && (
            <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-5">
              <div className="md:hidden space-y-1">
                <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1917]">
                  Add participants
                </h1>
                <p className="text-[14px] text-[#57534E]">
                  <span className="font-semibold text-[#1C1917]">{title}</span> ·{' '}
                  <span className="font-num">{parsedTotal.toFixed(2)} USDC</span> · {selectedGroup?.name}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-num text-[14px] font-semibold text-[#1C1917]">
                  {selectedMemberIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleSelectOrClearAll}
                  className="text-[14px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                >
                  {selectedMemberIds.length === selectableMembers.length ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="divide-y divide-black/[0.06] border border-[#0F4024]/[0.08] rounded-[12px] overflow-hidden bg-white">
                {selectableMembers.map((member) => {
                  const checked = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleMember(member.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarBadge
                          initial={member.initial}
                          bg={member.avatarBg}
                          text={member.avatarText}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                            {member.name}
                          </p>
                          {(member.id === 'sam' || member.invited) && (
                            <p className="text-[13px] text-[#57534E] truncate">
                              {member.id === 'sam'
                                ? 'Paying this bill'
                                : 'Invited · not joined yet'}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`w-6 h-6 rounded-[7px] inline-flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-[#15803D] text-white'
                            : 'bg-[#FAFAF9] border border-[#A8A29E]'
                        }`}
                        aria-hidden="true"
                      >
                        {checked && <Check className="w-4 h-4 stroke-[2.5]" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {peopleError && (
                <div className="flex items-center gap-2 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 text-[14px] text-[#B91C1C] font-medium">
                  <span className="w-5 h-5 rounded-full bg-[#FEE2E2] inline-flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <span>{peopleError}</span>
                </div>
              )}

              <div className="hidden md:flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SPLIT */}
          {step === 'split' && (
            <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-5">
              <div className="md:hidden space-y-1">
                <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1917]">
                  Split bill
                </h1>
                <p className="text-[14px] text-[#57534E]">
                  <span className="font-semibold text-[#1C1917]">{title}</span> ·{' '}
                  <span className="font-num">{parsedTotal.toFixed(2)} USDC</span>
                </p>
              </div>

              {/* Segmented Split Type */}
              <div className="grid grid-cols-2 p-1 rounded-[12px] bg-[#F5F5F4] border border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  className={`h-10 rounded-[9px] text-[14px] font-semibold transition-all cursor-pointer ${
                    splitType === 'equal'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('custom')}
                  className={`h-10 rounded-[9px] text-[14px] font-semibold transition-all cursor-pointer ${
                    splitType === 'custom'
                      ? 'bg-white text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Participant Shares */}
              <div className="divide-y divide-black/[0.06] border border-[#0F4024]/[0.08] rounded-[12px] bg-white">
                {activeParticipants.map((member) => {
                  const equalVal = equalAllocation[member.id] ?? 0;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarBadge
                          initial={member.initial}
                          bg={member.avatarBg}
                          text={member.avatarText}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                            {member.name}
                          </p>
                          {member.id === 'sam' && (
                            <p className="text-[12px] text-[#57534E]">Paying this bill</p>
                          )}
                        </div>
                      </div>

                      {splitType === 'equal' ? (
                        <span className="font-num text-[16px] font-semibold text-[#1C1917] shrink-0">
                          {equalVal.toFixed(2)} USDC
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`${member.name} share`}
                            value={customShares[member.id] ?? ''}
                            onChange={(e) =>
                              setCustomShares((prev) => ({
                                ...prev,
                                [member.id]: e.target.value,
                              }))
                            }
                            className="font-num w-24 h-10 px-3 rounded-[10px] border border-[#0F4024]/20 focus:border-[#15803D] focus:outline-none text-right text-[15px] font-semibold text-[#1C1917]"
                          />
                          <span className="font-num text-[13px] text-[#57534E]">USDC</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Uneven Equal Split Helper Note */}
              {splitType === 'equal' && isUnevenEqual && (
                <div className="rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/[0.08] p-3.5 text-[13px] leading-5 text-[#57534E]">
                  <span className="font-num">{parsedTotal.toFixed(2)}</span> does not divide evenly
                  by {activeParticipants.length}, so the extra <span className="font-num">0.01</span>{' '}
                  goes to the first person.
                </div>
              )}

              {/* Custom Split Ledger Summary */}
              {splitType === 'custom' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[14px] rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/[0.08] px-4 py-3">
                    <span className="font-num text-[#57534E]">
                      Assigned {customTotals.assigned.toFixed(2)} of {parsedTotal.toFixed(2)} USDC
                    </span>
                    {customTotals.diff >= 0 ? (
                      <span
                        className={`font-num font-semibold ${
                          customTotals.matches ? 'text-[#15803D]' : 'text-[#92400E]'
                        }`}
                      >
                        Remaining {customTotals.diff.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-num font-semibold text-[#B91C1C]">
                        Over by {Math.abs(customTotals.diff).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {!customTotals.matches && (
                    <div className="flex items-start gap-2 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-[14px] text-[#B91C1C] font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        {customTotals.diff < 0
                          ? `The shares add up to ${customTotals.assigned.toFixed(2)} USDC. Take off ${Math.abs(customTotals.diff).toFixed(2)} to continue.`
                          : `The shares add up to ${customTotals.assigned.toFixed(2)} USDC. Add ${customTotals.diff.toFixed(2)} more to continue.`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden md:flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('people')}
                  className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canCreateCustom}
                  onClick={handleCreateBill}
                  className={`px-6 h-11 rounded-[12px] text-[15px] font-semibold transition-colors ${
                    canCreateCustom
                      ? 'bg-[#15803D] hover:bg-[#166534] text-white shadow-btn-primary cursor-pointer'
                      : 'bg-[#E7E5E4] text-[#78716C] cursor-not-allowed'
                  }`}
                >
                  Create bill
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DESKTOP LIVE SUMMARY CARD */}
        <aside className="hidden lg:block lg:col-span-5">
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-6 space-y-5 sticky top-6">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#57534E]">Summary</span>
              <span className="text-[13px] font-medium text-[#15803D]">{selectedGroup?.name}</span>
            </div>

            <div>
              <h2 className="text-[20px] font-semibold text-[#1C1917]">
                {title.trim() || 'Untitled bill'}
              </h2>
              <p className="font-num text-[32px] font-semibold tracking-tight text-[#1C1917] mt-1">
                {parsedTotal.toFixed(2)} <span className="text-[18px] text-[#57534E]">USDC</span>
              </p>
            </div>

            <div className="border-t border-black/[0.06] pt-4 space-y-3">
              {step === 'details' ? (
                <p className="text-[14px] text-[#57534E]">Pick people next.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#57534E]">
                      {activeParticipants.length}{' '}
                      {activeParticipants.length === 1 ? 'person' : 'people'}
                    </span>
                    <AvatarStack members={activeParticipants} size="sm" />
                  </div>
                  {step === 'split' && activeParticipants.length > 0 && (
                    <div className="text-[14px] text-[#14532D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3.5 py-2.5">
                      {splitType === 'equal'
                        ? `${(equalAllocation[activeParticipants[0]?.id] ?? 0).toFixed(2)} USDC each`
                        : `Custom split · ${customTotals.assigned.toFixed(2)} of ${parsedTotal.toFixed(2)} USDC`}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-black/[0.08] px-5 py-3.5">
        {step === 'details' &&
          (walletAvailable ? (
            <button
              type="button"
              onClick={handleStep1Continue}
              className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
            >
              Connect wallet
            </button>
          ))}

        {step === 'people' && (
          <button
            type="button"
            onClick={handleStep2Continue}
            className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
          >
            Continue
          </button>
        )}

        {step === 'split' && (
          <button
            type="button"
            disabled={!canCreateCustom}
            onClick={handleCreateBill}
            className={`w-full h-12 rounded-[12px] text-[16px] font-semibold transition-colors ${
              canCreateCustom
                ? 'bg-[#15803D] hover:bg-[#166534] text-white shadow-btn-primary cursor-pointer'
                : 'bg-[#E7E5E4] text-[#78716C] cursor-not-allowed'
            }`}
          >
            Create bill
          </button>
        )}
      </div>
    </div>
  );
};
