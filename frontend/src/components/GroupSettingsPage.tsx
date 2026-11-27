import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, Link2, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Group, GroupSettingsPreset, Member } from '../types';
import { AvatarBadge } from './BrandPrimitives';
import { buildInviteLink } from '../utils/inviteLink';

interface GroupSettingsPageProps {
  group: Group;
  preset?: GroupSettingsPreset;
  onBack: () => void;
  onSaveGroupName: (groupId: string, name: string) => void;
  onRemoveMember: (groupId: string, memberId: string) => void;
  onRevokeInviteLink: (groupId: string) => string;
  onPayOwedBill: () => void;
}

type ModalMode =
  | null
  | { type: 'remove-confirm'; member: Member }
  | { type: 'remove-blocked'; member: Member }
  | { type: 'leave-blocked' }
  | { type: 'revoke-link' };

export const GroupSettingsPage: React.FC<GroupSettingsPageProps> = ({
  group,
  preset = 'default',
  onBack,
  onSaveGroupName,
  onRemoveMember,
  onRevokeInviteLink,
  onPayOwedBill,
}) => {
  const [groupName, setGroupName] = useState(group.name);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [revokedNotice, setRevokedNotice] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);

  const allMembers: Member[] = React.useMemo(() => {
    return group.members ?? [];
  }, [group.members]);

  useEffect(() => {
    setGroupName(group.name);
    setSavedNotice(false);
    setRevokedNotice(false);
    if (preset === 'remove-confirm') {
      const jo = allMembers.find((m) => m.id === 'jo') ?? allMembers[2] ?? allMembers[0];
      setModal({ type: 'remove-confirm', member: jo });
    } else if (preset === 'remove-blocked') {
      const mia = allMembers.find((m) => m.id === 'mia') ?? allMembers[3] ?? allMembers[0];
      setModal({ type: 'remove-blocked', member: mia });
    } else if (preset === 'leave-blocked') {
      setModal({ type: 'leave-blocked' });
    } else if (preset === 'revoke-link') {
      setModal({ type: 'revoke-link' });
    } else {
      setModal(null);
    }
  }, [group.id, group.name, preset, allMembers]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onSaveGroupName(group.id, groupName.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleCopyInvite = () => {
    const link = buildInviteLink(group.inviteCode);
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleClickRemoveMember = (member: Member) => {
    const owesMoney = member.balanceNote.toLowerCase().includes('owes');
    if (owesMoney) {
      setModal({ type: 'remove-blocked', member });
    } else {
      setModal({ type: 'remove-confirm', member });
    }
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{group.name}</span>
        </button>
        <h1 className="text-[26px] md:text-[32px] font-semibold tracking-[-0.02em] text-[#1C1917]">
          Group settings
        </h1>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Group Name & Members */}
        <div className="lg:col-span-7 space-y-5">
          {/* Group Name Form */}
          <form
            onSubmit={handleSaveName}
            className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="settings-group-name"
                className="block text-[14px] font-medium text-[#57534E]"
              >
                Group name
              </label>
              <input
                id="settings-group-name"
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setSavedNotice(false);
                }}
                className="w-full h-12 px-4 rounded-[12px] bg-[#FAFAF9] border border-[#0F4024]/15 focus:bg-white focus:border-[#15803D] focus:outline-none text-[16px] font-medium text-[#1C1917]"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              {savedNotice ? (
                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#15803D]">
                  <Check className="w-4 h-4" />
                  <span>Changes saved</span>
                </span>
              ) : (
                <span className="text-[13px] text-[#57534E]">
                  Visible to everyone in the group
                </span>
              )}
              <button
                type="submit"
                className="px-5 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </form>

          {/* Members List */}
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#1C1917]">Members</h2>
              <span className="text-[13px] text-[#57534E]">{allMembers.length} people</span>
            </div>

            <div className="divide-y divide-black/[0.06]">
              {allMembers.map((member) => {
                const isOwner = Boolean(member.isYou);
                return (
                  <div
                    key={member.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
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
                        <p className="text-[13px] text-[#57534E] truncate">
                          {isOwner
                            ? 'Owner'
                            : member.invited
                              ? 'Invited · not joined yet'
                              : 'Member'}
                        </p>
                      </div>
                    </div>

                    {isOwner ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[12px] font-semibold">
                        Owner
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClickRemoveMember(member)}
                        className="px-3 py-1.5 rounded-[8px] text-[13px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Invite Link & Leave Group */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#15803D]" />
              <h2 className="text-[16px] font-semibold text-[#1C1917]">Invite link</h2>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-[12px] bg-[#FAFAF9] border border-black/[0.08]">
              <span
                className="font-num text-[13px] text-[#1C1917] truncate flex-1 px-1 select-all cursor-pointer"
                title={buildInviteLink(group.inviteCode)}
                onClick={handleCopyInvite}
              >
                {buildInviteLink(group.inviteCode)}
              </span>
              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#15803D] text-white text-[13px] font-semibold cursor-pointer shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-[13px] leading-5 text-[#57534E]">
              Anyone with this link can join. Revoke it to stop new people joining.
            </p>

            {revokedNotice && (
              <p className="text-[13px] font-medium text-[#15803D]">
                Previous link revoked and a fresh invite link was generated.
              </p>
            )}

            <button
              type="button"
              onClick={() => setModal({ type: 'revoke-link' })}
              className="w-full h-11 rounded-[12px] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] text-[14px] font-semibold transition-colors cursor-pointer"
            >
              Revoke link
            </button>
          </div>

          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 sm:p-6 space-y-3">
            <h2 className="text-[16px] font-semibold text-[#1C1917]">Leave group</h2>
            <p className="text-[13px] leading-5 text-[#57534E]">
              You can leave once all of your open balances in {group.name} are settled.
            </p>
            <button
              type="button"
              onClick={() => setModal({ type: 'leave-blocked' })}
              className="w-full h-11 rounded-[12px] bg-white border border-black/[0.12] hover:bg-[#FAFAF9] text-[#DC2626] text-[14px] font-semibold transition-colors cursor-pointer"
            >
              Leave group
            </button>
          </div>
        </div>
      </div>

      {/* MODALS FOR REMOVE MEMBER / LEAVE GROUP / REVOKE LINK */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[20px] font-semibold text-[#1C1917] leading-7">
                  {modal.type === 'remove-confirm' &&
                    `Remove ${modal.member.name} from ${group.name}?`}
                  {modal.type === 'remove-blocked' && `You can’t remove ${modal.member.name} yet`}
                  {modal.type === 'leave-blocked' && 'You can’t leave yet'}
                  {modal.type === 'revoke-link' && 'Revoke this link?'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="p-1.5 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(modal.type === 'remove-blocked' || modal.type === 'leave-blocked') && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Open balance must be settled first</span>
                </div>
              )}

              <p className="text-[15px] leading-6 text-[#57534E]">
                {modal.type === 'remove-confirm' &&
                  `${modal.member.name} has nothing left to pay in this group. They lose access, and their past payments stay in History.`}
                {modal.type === 'remove-blocked' &&
                  `${modal.member.name} still owes you 20.00 USDC on Groceries. Settle that bill first, then remove her.`}
                {modal.type === 'leave-blocked' &&
                  `You owe Alex 25.00 USDC on Dinner at Olive & Co. Pay it first, then you can leave ${group.name}.`}
                {modal.type === 'revoke-link' &&
                  'The current link stops working right away. People already in the group stay. You can make a new link any time.'}
              </p>

              {/* Modal Actions */}
              {modal.type === 'remove-confirm' && (
                <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveMember(group.id, modal.member.id);
                      setModal(null);
                    }}
                    className="flex-1 h-11 rounded-[12px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[15px] font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {modal.type === 'remove-blocked' && (
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="w-full h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                >
                  Got it
                </button>
              )}

              {modal.type === 'leave-blocked' && (
                <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModal(null);
                      onPayOwedBill();
                    }}
                    className="flex-1 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Pay 25.00 USDC
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Stay
                  </button>
                </div>
              )}

              {modal.type === 'revoke-link' && (
                <div className="flex flex-col sm:flex-row-reverse gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onRevokeInviteLink(group.id);
                      setRevokedNotice(true);
                      setModal(null);
                    }}
                    className="flex-1 h-11 rounded-[12px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[15px] font-semibold cursor-pointer"
                  >
                    Revoke
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Keep link
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
