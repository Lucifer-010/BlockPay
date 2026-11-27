import React, { useState } from 'react';
import { Check, Minus, Plus, Wallet, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ActivityItem, Bill, FaqItem, Member } from '../types';
import { formatShortAddress } from '../services/stellarWalletKit';
import { BrandLockup, PageSurfaceBlobs } from './BrandPrimitives';
import { HeroProductPreview } from './HeroProductPreview';
import {
  DinnersIllustration,
  GroupsTableIllustration,
  HousematesIllustration,
  LedgerRecordIllustration,
  SplitBarsIllustration,
  TeamsIllustration,
  TripsIllustration,
  WalletTransferIllustration,
} from './Illustrations';

interface LandingPageProps {
  bills: Bill[];
  members: Member[];
  activity: ActivityItem[];
  faqItems: FaqItem[];
  withoutRabaPoints: string[];
  withRabaPoints: string[];
  isSignedIn: boolean;
  walletConnected?: boolean;
  walletAddress?: string;
  onConnectWallet: () => void;
  onSignUp: () => void;
  onLogIn: () => void;
  onOpenWorkspace: () => void;
  onOpenInvite: () => void;
}

type InfoModalTopic = 'privacy' | 'terms' | 'contact' | null;

export const LandingPage: React.FC<LandingPageProps> = ({
  bills,
  members,
  activity,
  faqItems,
  withoutRabaPoints,
  withRabaPoints,
  isSignedIn,
  walletConnected,
  walletAddress,
  onConnectWallet,
  onSignUp,
  onLogIn,
  onOpenWorkspace,
  onOpenInvite,
}) => {
  const [openFaqId, setOpenFaqId] = useState<string>('real-money');
  const [infoModal, setInfoModal] = useState<InfoModalTopic>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? '' : id));
  };

  return (
    <div className="relative min-h-screen bg-page-gradient text-[#1C1917] overflow-x-hidden">
      <PageSurfaceBlobs />

      {/* HERO */}
      <section className="relative bg-hero-dark overflow-hidden pt-6 md:pt-8">
        {/* Ambient green glow */}
        <div
          className="pointer-events-none absolute w-[360px] h-[360px] md:w-[480px] md:h-[480px] -top-[180px] md:-top-[240px] right-[-100px] md:right-[8%] rounded-full bg-[#22C55E] opacity-28 blur-[60px]"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-[1248px] mx-auto px-6 md:px-12 lg:px-16 flex flex-col items-center">
          {/* Header */}
          <header className="w-full h-12 flex items-center justify-between gap-4">
            <BrandLockup variant="dark" />

            <nav
              className="hidden md:flex items-center gap-8 text-[16px] text-[#D6D3D1]"
              aria-label="Primary navigation"
            >
              <a href="#how-it-works" className="hover:text-white transition-colors whitespace-nowrap">
                How it works
              </a>
              <a href="#features" className="hover:text-white transition-colors whitespace-nowrap">
                Features
              </a>
              <a href="#faq" className="hover:text-white transition-colors whitespace-nowrap">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={walletConnected ? onOpenWorkspace : onConnectWallet}
                className="inline-flex items-center gap-2 px-4 md:px-5 h-11 md:h-12 md:min-h-[48px] rounded-[12px] bg-[#DDF3E4] hover:bg-white text-[#14532D] text-[14px] md:text-[15px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                title={walletConnected ? `Connected: ${walletAddress}` : 'Connect Stellar Wallet'}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span className="font-num">
                  {walletConnected && walletAddress ? formatShortAddress(walletAddress) : 'Connect'}
                </span>
              </button>
              {isSignedIn || walletConnected ? (
                <button
                  type="button"
                  onClick={onOpenWorkspace}
                  className="px-5 h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] md:text-[16px] font-semibold shadow-btn-primary whitespace-nowrap transition-colors cursor-pointer"
                >
                  Open dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onLogIn}
                    className="px-5 md:px-6 h-11 md:h-12 md:min-h-[48px] rounded-[12px] bg-white hover:bg-[#F5F5F4] text-[#1C1917] text-[15px] md:text-[16px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="hidden sm:inline-flex items-center justify-center px-6 h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary whitespace-nowrap transition-colors cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Hero Copy & CTAs */}
          <div className="mt-10 md:mt-12 max-w-[760px] text-center flex flex-col items-center gap-4">
            <h1 className="text-[36px] leading-[40px] sm:text-[42px] sm:leading-[46px] md:text-[48px] md:leading-[52px] font-semibold tracking-[-0.02em] text-white">
              Split a bill. Pay your share.
            </h1>
            <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#D6D3D1] max-w-[660px]">
              Share a cost with friends or housemates, see who has paid, and settle up in USDC.
            </p>
          </div>

          <div className="mt-7 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={isSignedIn || walletConnected ? onOpenWorkspace : onSignUp}
              className="px-6 h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary whitespace-nowrap transition-colors cursor-pointer"
            >
              {isSignedIn || walletConnected ? 'Open dashboard' : 'Sign up'}
            </button>
            <button
              type="button"
              onClick={isSignedIn ? onOpenInvite : onLogIn}
              className="px-6 h-12 min-h-[48px] rounded-[12px] bg-white hover:bg-[#F5F5F4] text-[#1C1917] text-[16px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              {isSignedIn ? 'Preview invite link' : 'Log in'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[14px] text-[#D6D3D1]">
            <span>Runs on a test network. No real money moves.</span>
            <button
              type="button"
              onClick={onOpenInvite}
              className="text-[#86EFAC] hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
            >
              Preview invite flow
            </button>
          </div>

          {/* Interactive Mobile / Desktop Product Preview */}
          <div className="mt-10 md:mt-12 w-full">
            <HeroProductPreview
              bills={bills}
              members={members}
              activity={activity}
              onOpenWorkspace={isSignedIn ? onOpenWorkspace : onLogIn}
              onOpenInvite={onOpenInvite}
            />
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="relative z-10 max-w-[1440px] mx-auto">
        {/* COMPARE SECTION */}
        <section id="how-it-works" className="px-6 py-12 md:px-12 lg:px-24 md:py-24 space-y-6 md:space-y-8">
          <h2 className="text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-[#1C1917] md:text-center">
            Splitting costs should not be this hard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Without Raba Pay */}
            <div className="rounded-[16px] bg-[#FAFAF9] p-6 md:p-8 space-y-4 border border-black/[0.04]">
              <h3 className="text-[20px] leading-[28px] font-semibold text-[#1C1917]">
                Without Raba Pay
              </h3>
              <ul className="space-y-3">
                {withoutRabaPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[16px] leading-[24px] text-[#57534E]">
                    <X className="w-4 h-4 mt-1 shrink-0 text-[#57534E]" strokeWidth={1.8} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* With Raba Pay */}
            <div className="rounded-[16px] bg-green-card p-6 md:p-8 space-y-4 text-white">
              <h3 className="text-[20px] leading-[28px] font-semibold text-white">
                With Raba Pay
              </h3>
              <ul className="space-y-3">
                {withRabaPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[16px] leading-[24px] text-white">
                    <Check className="w-4 h-4 mt-1 shrink-0 text-white" strokeWidth={2} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="px-6 py-12 md:px-12 lg:px-24 md:py-16 space-y-6 md:space-y-8">
          <h2 className="text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-[#1C1917] md:text-center">
            Everything you need to split a bill
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="rounded-[24px] bg-feature-card p-6 md:p-8 shadow-card-soft flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-[22px] md:text-[24px] leading-[30px] md:leading-[32px] font-semibold text-[#1C1917]">
                  Groups for the people you share with
                </h3>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  Invite housemates, friends or a team and keep every shared bill in one place.
                </p>
              </div>
              <div className="rounded-[16px] overflow-hidden flex items-center justify-center pt-2">
                <GroupsTableIllustration className="w-full max-w-[360px] h-auto" />
              </div>
            </article>

            <article className="rounded-[24px] bg-feature-card p-6 md:p-8 shadow-card-soft flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-[22px] md:text-[24px] leading-[30px] md:leading-[32px] font-semibold text-[#1C1917]">
                  Bills with a clear split
                </h3>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  Split equally or set custom amounts, and see exactly what each person owes.
                </p>
              </div>
              <div className="rounded-[16px] overflow-hidden flex items-center justify-center pt-2">
                <SplitBarsIllustration className="w-full max-w-[360px] h-auto" />
              </div>
            </article>

            <article className="rounded-[24px] bg-feature-card p-6 md:p-8 shadow-card-soft flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-[22px] md:text-[24px] leading-[30px] md:leading-[32px] font-semibold text-[#1C1917]">
                  Pay from your own wallet
                </h3>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  Raba Pay never holds your USDC. You approve each payment in your wallet.
                </p>
              </div>
              <div className="rounded-[16px] overflow-hidden flex items-center justify-center pt-2">
                <WalletTransferIllustration className="w-full max-w-[360px] h-auto" />
              </div>
            </article>

            <article className="rounded-[24px] bg-feature-card p-6 md:p-8 shadow-card-soft flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-[22px] md:text-[24px] leading-[30px] md:leading-[32px] font-semibold text-[#1C1917]">
                  A record of every payment
                </h3>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  See what you paid and what you received, across every group.
                </p>
              </div>
              <div className="rounded-[16px] overflow-hidden flex items-center justify-center pt-2">
                <LedgerRecordIllustration className="w-full max-w-[360px] h-auto" />
              </div>
            </article>
          </div>
        </section>

        {/* TRUST SECTION */}
        <section className="px-6 py-4 md:px-12 lg:px-24 md:py-12">
          <div className="rounded-[24px] bg-white p-6 md:p-10 shadow-card-soft flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
            <div className="space-y-2 max-w-[540px]">
              <h2 className="text-[24px] leading-[32px] font-semibold text-[#1C1917]">
                Your wallet, your funds
              </h2>
              <p className="text-[16px] leading-[24px] text-[#57534E]">
                Raba Pay never holds your USDC. Nothing moves until you approve it in your wallet.
              </p>
            </div>

            <ul className="space-y-3 shrink-0">
              <li className="flex items-start gap-3 text-[16px] leading-[24px] text-[#1C1917]">
                <Check className="w-4 h-4 mt-1 shrink-0 text-[#1C1917]" strokeWidth={2} />
                <span>You approve every payment</span>
              </li>
              <li className="flex items-start gap-3 text-[16px] leading-[24px] text-[#1C1917]">
                <Check className="w-4 h-4 mt-1 shrink-0 text-[#1C1917]" strokeWidth={2} />
                <span>Testnet only, so no real money moves</span>
              </li>
            </ul>
          </div>
        </section>

        {/* USE CASES SECTION */}
        <section className="px-6 py-12 md:px-12 lg:px-24 md:py-16 space-y-6 md:space-y-8">
          <h2 className="text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-[#1C1917] md:text-center">
            Built for how you actually split costs
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                title: 'Housemates',
                desc: 'Rent extras, bills and groceries.',
                illustration: <HousematesIllustration />,
              },
              {
                title: 'Trips',
                desc: 'Stays, rides and shared meals.',
                illustration: <TripsIllustration />,
              },
              {
                title: 'Dinners',
                desc: 'One bill, split fairly.',
                illustration: <DinnersIllustration />,
              },
              {
                title: 'Teams',
                desc: 'Shared tools and team lunches.',
                illustration: <TeamsIllustration />,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[16px] bg-[#FAFAF9] p-4 sm:p-6 flex flex-col justify-between gap-4 border border-black/[0.04]"
              >
                <div className="hidden sm:flex items-center justify-center rounded-[12px] bg-[#F1F8F3] py-3">
                  {item.illustration}
                </div>
                <div className="space-y-1">
                  <h3 className="text-[18px] leading-[28px] font-semibold text-[#1C1917]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] leading-[24px] text-[#57534E]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="px-6 py-12 md:px-12 lg:px-24 md:py-16 space-y-6 md:space-y-8">
          <h2 className="text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-[#1C1917] md:text-center">
            Questions? We have answers.
          </h2>

          <div className="max-w-[800px] mx-auto space-y-3">
            {faqItems.map((item) => {
              const isOpen = openFaqId === item.id;
              return (
                <div
                  key={item.id}
                  className="rounded-[12px] bg-[#FAFAF9] border border-black/[0.04] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleFaq(item.id)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-black/[0.02] transition-colors"
                  >
                    <span className="text-[16px] leading-[24px] font-semibold text-[#1C1917]">
                      {item.question}
                    </span>
                    <span className="shrink-0 text-[#57534E]">
                      {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 md:px-6 md:pb-6 text-[16px] leading-[24px] text-[#57534E]">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-6 py-6 md:px-12 lg:px-24">
          <div className="relative overflow-hidden rounded-[24px] bg-hero-dark px-6 py-8 md:p-16 flex flex-col items-center text-center gap-6">
            <div
              className="pointer-events-none absolute -top-32 right-0 w-72 h-72 rounded-full bg-[#22C55E] opacity-20 blur-[60px]"
              aria-hidden="true"
            />
            <h2 className="relative z-10 text-[30px] leading-[36px] md:text-[36px] md:leading-[40px] font-semibold tracking-[-0.02em] text-white">
              Ready to split your first bill?
            </h2>
            <p className="relative z-10 text-[16px] leading-[24px] text-[#DCFCE7] max-w-[520px]">
              Create an account, make a group and invite the people you share costs with.
            </p>
            <div className="relative z-10 w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={isSignedIn || walletConnected ? onOpenWorkspace : onSignUp}
                className="px-6 h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary whitespace-nowrap transition-colors cursor-pointer"
              >
                {isSignedIn || walletConnected ? 'Open dashboard' : 'Sign up'}
              </button>
              <button
                type="button"
                onClick={isSignedIn ? onOpenInvite : onLogIn}
                className="px-6 h-12 min-h-[48px] rounded-[12px] bg-white hover:bg-[#F5F5F4] text-[#1C1917] text-[16px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
              >
                {isSignedIn ? 'Preview invite flow' : 'Log in'}
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-6 pt-8 pb-12 md:px-12 lg:px-24 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <BrandLockup variant="light" />

          <p className="text-[14px] leading-[20px] text-[#57534E]">
            Testnet only. No real money moves.
          </p>

          <div className="flex items-center gap-6 text-[14px] leading-[20px] text-[#57534E]">
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-[#1C1917] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('terms')}
              className="hover:text-[#1C1917] transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('contact')}
              className="hover:text-[#1C1917] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>
        </footer>
      </main>

      {/* Lightweight Footer Info Modal */}
      <AnimatePresence>
        {infoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setInfoModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-card-soft space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#1C1917] capitalize">
                  {infoModal}
                </h3>
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="p-2 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[15px] leading-6 text-[#57534E]">
                {infoModal === 'privacy' &&
                  'Raba Pay only shares bill splits and settlement activity with members inside your invited groups. Your wallet keys never leave your browser.'}
                {infoModal === 'terms' &&
                  'Raba Pay runs strictly on a test network using simulated USDC. No real funds are transferred or custodied.'}
                {infoModal === 'contact' &&
                  'Questions or feedback about the testnet preview? Reach our product team at hello@rabapay.example.'}
              </p>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className="w-full h-11 rounded-[12px] bg-[#15803D] text-white font-semibold hover:bg-[#166534] transition-colors cursor-pointer"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
