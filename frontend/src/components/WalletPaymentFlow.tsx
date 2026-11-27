import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Bill, UserSession, WalletPayStep } from '../types';
import { AlertTriangleIllustration } from './Illustrations';
import { signContractPaymentWithWallet } from '../services/stellarWalletKit';

interface WalletPaymentFlowProps {
  open: boolean;
  bill: Bill | null;
  groupName: string;
  user: UserSession;
  initialStep?: WalletPayStep;
  isCatalogPreset?: boolean;
  onClose: () => void;
  onConnectWallet: (providerId?: string) => void;
  onTopUpTestnet?: () => void;
  onCompletePayment: (
    billId: string,
    txDetails?: { tx_hash?: string; signed_tx_xdr?: string }
  ) => Promise<unknown> | void;
  onPaymentFailed: (billId: string) => void;
  onMarkSlowConfirming?: (billId: string) => void;
}

const WALLETS = [
  {
    id: 'freighter',
    name: 'Freighter',
    subtitle: 'Browser extension',
    badge: 'F',
    badgeBg: '#E0F2FE',
    badgeText: '#0369A1',
  },
  {
    id: 'albedo',
    name: 'Albedo',
    subtitle: 'Web wallet',
    badge: 'A',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
  },
  {
    id: 'xbull',
    name: 'xBull',
    subtitle: 'Mobile app',
    badge: 'X',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
];

export const WalletPaymentFlow: React.FC<WalletPaymentFlowProps> = ({
  open,
  bill,
  groupName,
  user,
  initialStep = 'confirm',
  isCatalogPreset = false,
  onClose,
  onConnectWallet,
  onTopUpTestnet,
  onCompletePayment,
  onPaymentFailed,
  onMarkSlowConfirming,
}) => {
  const [step, setStep] = useState<WalletPayStep>(initialStep);
  const [selectedProvider, setSelectedProvider] = useState<string>('Freighter');
  const [toppedUpTestnet, setToppedUpTestnet] = useState(false);
  const [showExplorerCard, setShowExplorerCard] = useState(false);
  const [payErrorReason, setPayErrorReason] = useState<string>('');
  const [activeTxHash, setActiveTxHash] = useState<string>('');
  const isSigningRef = React.useRef(false);

  const latestPropsRef = React.useRef({
    bill,
    user,
    selectedProvider,
    onCompletePayment,
    onPaymentFailed,
  });
  latestPropsRef.current = {
    bill,
    user,
    selectedProvider,
    onCompletePayment,
    onPaymentFailed,
  };

  useEffect(() => {
    if (open) {
      setStep(initialStep);
      setToppedUpTestnet(false);
      setShowExplorerCard(false);
      setPayErrorReason('');
      setActiveTxHash('');
      isSigningRef.current = false;
    } else {
      isSigningRef.current = false;
    }
  }, [open, initialStep]);

  // Real Stellar Testnet payment signing and submission:
  // Triggered only once upon transitioning to 'waiting' state
  useEffect(() => {
    if (!open || isCatalogPreset) return;

    if (step === 'waiting') {
      if (isSigningRef.current) return;
      isSigningRef.current = true;

      const triggerWalletSigning = async () => {
        const currentProps = latestPropsRef.current;
        const currentBill = currentProps.bill;
        const currentUser = currentProps.user;
        if (!currentBill) {
          isSigningRef.current = false;
          return;
        }

        try {
          const payerAddr = currentUser.fullWalletAddress || currentUser.walletAddress;
          const targetRecipient = currentBill.paidToFullWallet || currentBill.paidToWallet;
          const signingResult = await signContractPaymentWithWallet({
            billId: currentBill.id,
            contractBillId: currentBill.contractBillId,
            payerAddress: payerAddr,
            recipientAddress: targetRecipient,
            amount: currentBill.yourShare,
            memo: `RABA-${currentBill.id}`,
            preferredProvider: currentProps.selectedProvider,
          });

          setActiveTxHash(signingResult.txHash);
          setStep('sending');

          // Send payment settlement to backend API with confirmed on-chain transaction hash
          await currentProps.onCompletePayment(currentBill.id, {
            tx_hash: signingResult.txHash,
            signed_tx_xdr: signingResult.signedTxXdr,
          });

          setStep('paid');
        } catch (err: unknown) {
          const apiErr = err as { payload?: { detail?: string }; message?: string };
          const detail =
            apiErr?.payload?.detail ||
            apiErr?.message ||
            'Payment approval cancelled or failed.';
          setPayErrorReason(detail);
          currentProps.onPaymentFailed(currentBill.id);
          setStep('failed');
        } finally {
          isSigningRef.current = false;
        }
      };

      triggerWalletSigning();
    }
  }, [open, isCatalogPreset, step]);

  if (!bill) return null;

  const payAmount = bill.yourShare;
  const recipientName = bill.paidByLabel === 'you' ? 'Recipient' : bill.paidByLabel;
  const recipientWallet = bill.paidToWallet || 'Connected wallet';
  const senderWallet = user.fullWalletAddress || user.walletAddress || 'Your connected wallet';

  const formatShortWallet = (addr?: string) => {
    if (!addr) return '';
    const trimmed = addr.trim();
    if (trimmed.startsWith('G') && trimmed.length === 56) {
      return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
    }
    if (trimmed.length > 20) {
      return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
    }
    return trimmed;
  };

  const shortSender = formatShortWallet(senderWallet);
  const shortRecipient = formatShortWallet(recipientWallet);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[460px] max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-5"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
                <span className="text-[12px] font-semibold text-[#57534E]">
                  Stellar Testnet · {selectedProvider}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. CONNECT A WALLET */}
            {step === 'connect' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Connect a wallet
                  </h2>
                  <p className="text-[14px] text-[#57534E]">
                    Pick a wallet to pay{' '}
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>{' '}
                    for {bill.title}.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {WALLETS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(w.name);
                        onConnectWallet(w.id);
                        setStep('confirm');
                      }}
                      className="w-full rounded-[14px] bg-[#FAFAF9] hover:bg-[#F0FDF4] border border-[#0F4024]/[0.08] hover:border-[#15803D]/40 p-4 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center font-semibold text-[16px]"
                          style={{ backgroundColor: w.badgeBg, color: w.badgeText }}
                        >
                          {w.badge}
                        </span>
                        <div>
                          <p className="text-[15px] font-semibold text-[#1C1917]">{w.name}</p>
                          <p className="text-[13px] text-[#57534E]">{w.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[13px] font-semibold text-[#15803D]">Connect</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 text-[13px] text-[#14532D]">
                  <span className="font-semibold">Testnet only:</span> This is simulated USDC. No
                  real money moves.
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* 2. CONFIRM PAYMENT */}
            {step === 'confirm' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Confirm payment
                  </h2>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-num text-[34px] font-semibold tracking-tight text-[#1C1917]">
                      {payAmount.toFixed(2)}
                    </span>
                    <span className="font-num text-[18px] font-medium text-[#57534E]">USDC</span>
                  </div>
                  {toppedUpTestnet && (
                    <p className="mt-1.5 text-[13px] font-medium text-[#15803D]">
                      Added 100.00 test USDC to your wallet. Ready to pay.
                    </p>
                  )}
                </div>

                <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-2.5 text-[14px]">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[#57534E] shrink-0">To</span>
                    <span
                      className="font-semibold text-[#1C1917] text-right truncate min-w-0"
                      title={recipientWallet}
                    >
                      {recipientName} · <span className="font-num">{shortRecipient}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[#57534E] shrink-0">For</span>
                    <span
                      className="font-semibold text-[#1C1917] text-right truncate min-w-0"
                      title={bill.title}
                    >
                      {bill.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[#57534E] shrink-0">From</span>
                    <span
                      className="font-num text-[#1C1917] text-right truncate min-w-0"
                      title={senderWallet}
                    >
                      Your wallet · {shortSender}
                    </span>
                  </div>
                </div>

                <div className="rounded-[12px] bg-[#F5F5F4] p-3.5 text-[13px] text-[#57534E] leading-5">
                  Testnet only: Simulated USDC. Raba Pay never holds your funds—you approve every
                  transfer in your wallet.
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setStep('waiting')}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                  >
                    Confirm in wallet
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="pt-2 border-t border-black/[0.06] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-[#78716C]">
                  <button
                    type="button"
                    onClick={() => setStep('insufficient')}
                    className="hover:text-[#1C1917] underline cursor-pointer"
                  >
                    Test low balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('slow')}
                    className="hover:text-[#1C1917] underline cursor-pointer"
                  >
                    Test slow network
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('timeout')}
                    className="hover:text-[#B91C1C] underline cursor-pointer"
                  >
                    Test wallet timeout
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('network-trouble')}
                    className="hover:text-[#B91C1C] underline cursor-pointer"
                  >
                    Test network trouble
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('already-paid')}
                    className="hover:text-[#B91C1C] underline cursor-pointer"
                  >
                    Test already paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPaymentFailed(bill.id);
                      setStep('failed');
                    }}
                    className="hover:text-[#B91C1C] underline cursor-pointer"
                  >
                    Test wallet cancel
                  </button>
                </div>
              </div>
            )}

            {/* 3. WAITING FOR YOUR WALLET */}
            {step === 'waiting' && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[#15803D] animate-spin" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Approve in your wallet
                  </h2>
                  <p className="text-[14px] leading-6 text-[#57534E] max-w-sm mx-auto">
                    Open your wallet and approve the payment of{' '}
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>{' '}
                    to {recipientName}.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">To</span>
                    <span className="font-semibold text-[#1C1917]">{recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">For</span>
                    <span className="font-semibold text-[#1C1917]">{bill.title}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isCatalogPreset && (
                    <button
                      type="button"
                      onClick={() => setStep('sending')}
                      className="w-full h-11 rounded-[12px] bg-[#15803D] text-white text-[15px] font-semibold cursor-pointer"
                    >
                      Continue to Sending
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onPaymentFailed(bill.id);
                      setStep('failed');
                    }}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 4. NOT ENOUGH USDC */}
            {step === 'insufficient' && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-[#DC2626]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Not enough USDC
                  </h2>
                  <p className="text-[14px] leading-6 text-[#57534E] max-w-sm mx-auto">
                    Your wallet has{' '}
                    <span className="font-num font-semibold">
                      {(user.onchainUsdcBalance !== undefined && user.onchainUsdcBalance !== null
                        ? user.onchainUsdcBalance
                        : (user.usdcBalance ?? 0)
                      ).toFixed(2)}
                    </span>{' '}
                    test USDC. You need{' '}
                    <span className="font-num font-semibold">{payAmount.toFixed(2)}</span>.
                    Get free test USDC, then try again.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Wallet balance</span>
                    <span className="font-num font-semibold text-[#B91C1C]">
                      {(user.onchainUsdcBalance !== undefined && user.onchainUsdcBalance !== null
                        ? user.onchainUsdcBalance
                        : (user.usdcBalance ?? 0)
                      ).toFixed(2)}{' '}
                      USDC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716C]">Needed for {bill.title}</span>
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onTopUpTestnet?.();
                      setToppedUpTestnet(true);
                      setStep('confirm');
                    }}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Get test USDC
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 5. SENDING & 6. TAKING LONGER */}
            {(step === 'sending' || step === 'slow') && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[12px] font-semibold">
                    {step === 'slow' ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-[#92400E]" />
                        <span className="text-[#92400E]">Still confirming</span>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>In progress</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917] pt-1">
                    {step === 'slow'
                      ? 'Still confirming'
                      : `Sending ${payAmount.toFixed(2)} USDC`}
                  </h2>
                  <p className="text-[14px] leading-6 text-[#57534E]">
                    {step === 'slow'
                      ? 'This is taking longer than usual. Do not pay again. We are still checking.'
                      : `Your payment is on its way to ${recipientName}.`}
                  </p>
                </div>

                {/* 3-step live tracker */}
                <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#15803D] text-white inline-flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1C1917]">
                        Approved in your wallet
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5 ${
                        step === 'slow'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#DCFCE7] text-[#15803D]'
                      }`}
                    >
                      {step === 'slow' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1C1917]">
                        Confirming on the network
                      </p>
                      <p
                        className={`text-[13px] ${
                          step === 'slow' ? 'text-[#92400E] font-medium' : 'text-[#57534E]'
                        }`}
                      >
                        {step === 'slow' ? 'Started 40 seconds ago' : 'Usually a few seconds'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 opacity-55">
                    <span className="w-6 h-6 rounded-full border-2 border-[#D6D3D1] inline-flex items-center justify-center shrink-0 mt-0.5" />
                    <p className="text-[14px] font-medium text-[#57534E]">Done</p>
                  </div>
                </div>

                {step === 'slow' && (
                  <div className="rounded-[12px] bg-[#FEF3C7] border border-[#D9991A]/35 p-3.5 text-[13px] text-[#78360F] font-medium">
                    Do not pay again. Sending another transfer could result in paying twice.
                  </div>
                )}

                <div className="space-y-2">
                  {isCatalogPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        onCompletePayment(bill.id);
                        setStep('paid');
                      }}
                      className="w-full h-11 rounded-[12px] bg-[#15803D] text-white text-[15px] font-semibold cursor-pointer"
                    >
                      Mark confirmed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'slow' && onMarkSlowConfirming) {
                        onMarkSlowConfirming(bill.id);
                      }
                      onClose();
                    }}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Back to bill
                  </button>
                </div>
              </div>
            )}

            {/* 7. PAID */}
            {step === 'paid' && (
              <div className="space-y-5 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#DCFCE7] flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#15803D]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-[24px] font-semibold tracking-tight text-[#1C1917]">
                    Paid <span className="font-num">{payAmount.toFixed(2)} USDC</span>
                  </h2>
                  <p className="text-[14px] text-[#57534E]">
                    {recipientName} has been paid for {bill.title}.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FAFAF9] border border-black/[0.06] p-4 space-y-2.5 text-[14px] text-left">
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <span className="text-[#57534E] shrink-0">To</span>
                    <span
                      className="font-semibold text-[#1C1917] text-right truncate min-w-0"
                      title={recipientWallet}
                    >
                      {recipientName} · <span className="font-num">{shortRecipient}</span>
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#57534E]">Amount</span>
                    <span className="font-num font-semibold text-[#15803D]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#57534E]">Date</span>
                    <span className="font-num text-[#1C1917]">
                      {new Date().toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#57534E]">Transaction</span>
                    <span className="font-num font-semibold text-[#1C1917]" title={activeTxHash}>
                      {activeTxHash
                        ? `${activeTxHash.slice(0, 6)}…${activeTxHash.slice(-4)}`
                        : '7a3f…c91e'}
                    </span>
                  </div>
                </div>

                {showExplorerCard && (
                  <div className="rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 text-left text-[13px] text-[#14532D] space-y-1">
                    <p className="font-semibold">Stellar Testnet Explorer</p>
                    <p className="font-num break-all">
                      {activeTxHash
                        ? `Tx: ${activeTxHash}`
                        : 'Contract: CCDT474DVAO4LYDJ7UE4ZPPBN6UBNJHIRPCYAK3TEOHFGC46KNNEOEPK'}
                    </p>
                    <p className="font-num text-[11px] text-[#15803D]">
                      Fee 0.00001 XLM · Smart Contract Confirmed
                    </p>
                  </div>
                )}

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Back to {groupName}
                  </button>
                  {activeTxHash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${activeTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View on Stellar Expert</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowExplorerCard((v) => !v)}
                      className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{showExplorerCard ? 'Hide explorer details' : 'View on explorer'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 8. FAILED */}
            {step === 'failed' && (
              <div className="space-y-5 text-center">
                <AlertTriangleIllustration className="w-16 h-16 mx-auto" />

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Payment failed
                  </h2>
                  <p className="text-[14px] text-[#57534E]">
                    Nothing was sent. Your USDC is still in your wallet.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Reason</span>
                    <span className="font-semibold text-[#B91C1C]">
                      {payErrorReason || 'Cancelled in your wallet'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Amount</span>
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setStep('confirm')}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Back to bill
                  </button>
                </div>
              </div>
            )}

            {/* 9. WALLET DID NOT RESPOND */}
            {step === 'timeout' && (
              <div className="space-y-5 text-center">
                <AlertTriangleIllustration className="w-16 h-16 mx-auto" />

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Your wallet didn’t respond
                  </h2>
                  <p className="text-[14px] text-[#57534E]">
                    Nothing was sent. Open your wallet and try again.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Reason</span>
                    <span className="font-semibold text-[#B91C1C]">No answer after 2 minutes</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Amount</span>
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setStep('waiting')}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 10. NETWORK TROUBLE */}
            {step === 'network-trouble' && (
              <div className="space-y-5 text-center">
                <AlertTriangleIllustration className="w-16 h-16 mx-auto" />

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    Payment failed
                  </h2>
                  <p className="text-[14px] text-[#57534E]">
                    Nothing was sent. The network was busy. Your USDC is still in your wallet.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Reason</span>
                    <span className="font-semibold text-[#B91C1C]">Network trouble</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Amount</span>
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setStep('confirm')}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 11. ALREADY PAID, SECOND PAYMENT BLOCKED */}
            {step === 'already-paid' && (
              <div className="space-y-5 text-center">
                <AlertTriangleIllustration className="w-16 h-16 mx-auto" />

                <div className="space-y-1.5">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1C1917]">
                    You already paid this
                  </h2>
                  <p className="text-[14px] leading-6 text-[#57534E]">
                    Your payment for {bill.title} is already confirming. We block a second payment so
                    you never pay twice.
                  </p>
                </div>

                <div className="rounded-[14px] bg-[#FEF3C7]/70 border border-[#FDE68A] p-4 space-y-2 text-[14px] text-left">
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Status</span>
                    <span className="font-semibold text-[#92400E]">Confirming</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#78716C]">Amount</span>
                    <span className="font-num font-semibold text-[#1C1917]">
                      {payAmount.toFixed(2)} USDC
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-12 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Back to bill
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
