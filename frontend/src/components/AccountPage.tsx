import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AccountPreset, UserSession } from '../types';

interface AccountPageProps {
  user: UserSession;
  preset?: AccountPreset;
  onBack: () => void;
  onResetPreset?: () => void;
  onUpdateName: (name: string) => void;
  onChangePassword: () => void;
  onChangeWallet: () => void;
  onDisconnectWallet: () => void;
  onLogOut: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  user,
  preset = 'default',
  onBack,
  onResetPreset,
  onUpdateName,
  onChangePassword,
  onChangeWallet,
  onDisconnectWallet,
  onLogOut,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(
    preset === 'disconnect-confirm'
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(preset === 'logout-confirm');

  useEffect(() => {
    setShowDisconnectConfirm(preset === 'disconnect-confirm');
    setShowLogoutConfirm(preset === 'logout-confirm');
  }, [preset]);

  useEffect(() => {
    setDraftName(user.name);
  }, [user.name]);

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(user.fullWalletAddress || user.walletAddress || '').catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 1800);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onUpdateName(trimmed);
    setEditingName(false);
  };

  const closeDisconnectModal = () => {
    setShowDisconnectConfirm(false);
    if (preset === 'disconnect-confirm') onResetPreset?.();
  };

  const closeLogoutModal = () => {
    setShowLogoutConfirm(false);
    if (preset === 'logout-confirm') onResetPreset?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-[#1C1917] hover:bg-black/5 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[24px] md:text-[30px] leading-[32px] md:leading-[38px] font-semibold tracking-tight text-[#1C1917]">
            Account
          </h1>
        </div>
      </div>

      {/* Main Responsive Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account Card + Log out */}
        <div className="lg:col-span-6 space-y-4">
          <section className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] leading-[27px] font-semibold text-[#1C1A17]">Account</h2>
            </div>

            {/* Name Row */}
            {editingName ? (
              <form onSubmit={handleSaveName} className="space-y-2">
                <label htmlFor="account-name-input" className="block text-[14px] text-[#57544F]">
                  Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="account-name-input"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-[10px] bg-white border border-black/15 text-[15px] text-[#1C1917] focus:outline-none focus:border-[#15803D]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3.5 h-10 rounded-[10px] bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(user.name);
                      setEditingName(false);
                    }}
                    className="px-3 h-10 rounded-[10px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] leading-[19px] text-[#57544F]">Name</p>
                  <p className="text-[16px] leading-[22px] font-medium text-[#1C1A17] truncate">
                    {user.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="text-[16px] font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Email Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] leading-[19px] text-[#57544F]">Email</p>
                <p className="text-[16px] leading-[22px] font-medium text-[#1C1A17] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Password Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] leading-[19px] text-[#57544F]">Password</p>
                <p className="text-[16px] leading-[22px] font-medium text-[#1C1A17] tracking-wider">
                  ••••••••
                </p>
              </div>
              <button
                type="button"
                onClick={onChangePassword}
                className="text-[16px] font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
              >
                Change password
              </button>
            </div>
          </section>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-12 min-h-[48px] rounded-[12px] bg-white hover:bg-[#FAFAF9] border border-[#0F4024]/[0.08] shadow-glass-card text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
          >
            Log out
          </button>
        </div>

        {/* Right Column: Wallet Card */}
        <div className="lg:col-span-6">
          <section className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[20px] leading-[27px] font-semibold text-[#1C1A17]">Wallet</h2>
              <span className="text-[14px] text-[#57544F]">Testnet</span>
            </div>

            {user.walletConnected ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] leading-[19px] text-[#57544F]">Address</p>
                    <p className="font-num text-[16px] leading-[22px] font-medium text-[#1C1A17]">
                      {user.walletAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#14532D] hover:underline shrink-0 cursor-pointer"
                  >
                    {copiedAddress && <Check className="w-4 h-4" />}
                    <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div>
                  <p className="text-[14px] leading-[19px] text-[#57544F]">Network</p>
                  <p className="text-[16px] leading-[22px] font-medium text-[#1C1A17]">
                    Stellar Testnet
                  </p>
                </div>

                <div>
                  <p className="text-[14px] leading-[19px] text-[#57544F]">Balance</p>
                  <p className="font-num text-[16px] leading-[22px] font-medium text-[#1C1A17]">
                    {(user.onchainUsdcBalance !== undefined && user.onchainUsdcBalance !== null ? user.onchainUsdcBalance : (user.usdcBalance ?? 0)).toFixed(2)} USDC
                  </p>
                  {typeof user.nativeXlmBalance === 'number' && user.nativeXlmBalance > 0 && (
                    <p className="font-num text-[13px] text-[#57544F] mt-0.5">
                      {user.nativeXlmBalance.toFixed(2)} XLM (testnet native)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <button
                    type="button"
                    onClick={onChangeWallet}
                    className="text-[16px] font-semibold text-[#14532D] hover:underline cursor-pointer"
                  >
                    Change wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="text-[16px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="space-y-1">
                  <p className="text-[14px] text-[#57544F]">Status</p>
                  <p className="text-[16px] font-medium text-[#1C1A17]">Not connected</p>
                  <p className="text-[14px] text-[#57534E] pt-1">
                    Connect a Stellar Testnet wallet to pay your share or receive USDC.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onChangeWallet}
                  className="w-full h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  Connect wallet
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* DISCONNECT WALLET CONFIRM MODAL */}
      <AnimatePresence>
        {showDisconnectConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeDisconnectModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-5"
            >
              <div className="space-y-2">
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#1C1917]">
                  Disconnect this wallet?
                </h3>
                <p className="text-[15px] leading-[22px] text-[#57534E]">
                  You won’t be able to pay or get paid until you connect one. Bills you have already
                  paid keep their record.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onDisconnectWallet();
                    closeDisconnectModal();
                  }}
                  className="w-full h-12 rounded-[12px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
                <button
                  type="button"
                  onClick={closeDisconnectModal}
                  className="w-full h-12 rounded-[12px] bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOG OUT CONFIRM MODAL */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeLogoutModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[420px] rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-5"
            >
              <div className="space-y-2">
                <h3 className="text-[22px] leading-[28px] font-semibold text-[#1C1917]">
                  Log out of Raba Pay?
                </h3>
                <p className="text-[15px] leading-[22px] text-[#57534E]">
                  You can log back in any time with your email and password. Your wallet stays
                  yours.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    closeLogoutModal();
                    onLogOut();
                  }}
                  className="w-full h-12 rounded-[12px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Log out
                </button>
                <button
                  type="button"
                  onClick={closeLogoutModal}
                  className="w-full h-12 rounded-[12px] bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Stay logged in
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
