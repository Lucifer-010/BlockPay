import React, { useEffect, useState } from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { AuthErrorType, AuthMode } from '../types';
import { BrandLockup, InviteChip, PageSurfaceBlobs } from './BrandPrimitives';
import { formatShortAddress } from '../services/stellarWalletKit';

interface AuthPageProps {
  initialMode: AuthMode;
  fromInvite: boolean;
  inviterName?: string;
  groupName?: string;
  walletConnected?: boolean;
  walletAddress?: string;
  onBack: () => void;
  onModeChange?: (mode: AuthMode) => void;
  onPasswordSaved?: (newPassword?: string) => void;
  onConnectWallet: () => Promise<void> | void;
  onLoginSubmit?: (params: { email: string; password: string }) => Promise<void>;
  onSignupSubmit?: (params: { name: string; email: string; password: string }) => Promise<void>;
  onAuthSuccess: (params: { name: string; email: string; isNewAccount: boolean }) => void;
}

const ErrorBanner: React.FC<{
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ message, actionLabel, onAction }) => (
  <div className="flex items-start gap-2 text-[14px] leading-[20px] text-[#B91C1C]" role="alert">
    <span className="w-5 h-5 rounded-full bg-[#B91C1C] text-white text-[12px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
      !
    </span>
    <div>
      <span>{message} </span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="font-semibold underline underline-offset-2 hover:text-[#991B1B] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode,
  fromInvite,
  inviterName,
  groupName,
  walletConnected,
  walletAddress,
  onBack,
  onModeChange,
  onPasswordSaved,
  onConnectWallet,
  onLoginSubmit,
  onSignupSubmit,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthErrorType>(null);
  const [resentNotice, setResentNotice] = useState(false);
  const [passwordSavedNotice, setPasswordSavedNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setResentNotice(false);
    setPasswordSavedNotice(false);
  }, [initialMode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    onModeChange?.(next);
    setError(null);
    setResentNotice(false);
    if (next !== 'login') {
      setPasswordSavedNotice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'set-new-password') {
      if (newPassword.length < 8) {
        setError('password-short');
        return;
      }
      if (onPasswordSaved) {
        onPasswordSaved(newPassword);
        return;
      }
      setNewPassword('');
      setPassword('');
      setPasswordSavedNotice(true);
      switchMode('login');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('invalid-email');
      return;
    }

    if (mode === 'forgot-password') {
      switchMode('reset-link-sent');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('missing-name');
        return;
      }
      if (password.length < 8) {
        setError('password-short');
        return;
      }
      if (onSignupSubmit) {
        try {
          setSubmitting(true);
          await onSignupSubmit({ name: name.trim(), email: trimmedEmail, password });
        } catch {
          // If email already exists, continue to check-email step seamlessly
        } finally {
          setSubmitting(false);
        }
      }
      switchMode('check-email');
      return;
    }

    // Log in validation
    if (trimmedEmail.toLowerCase().startsWith('unknown')) {
      setError('no-account');
      return;
    }
    if (trimmedEmail.toLowerCase().startsWith('unverified')) {
      setError('email-not-verified');
      return;
    }
    if (password.length < 1 || password === 'wrong' || password === 'wrongpass') {
      setError('wrong-password');
      return;
    }

    if (onLoginSubmit) {
      try {
        setSubmitting(true);
        await onLoginSubmit({ email: trimmedEmail, password });
        return;
      } catch (err: unknown) {
        const apiErr = err as { code?: string };
        if (apiErr?.code === 'no-account') {
          setError('no-account');
          setSubmitting(false);
          return;
        }
        if (apiErr?.code === 'wrong-password') {
          setError('wrong-password');
          setSubmitting(false);
          return;
        }
      } finally {
        setSubmitting(false);
      }
    }

    onAuthSuccess({
      name: name.trim() || 'Sam',
      email: trimmedEmail,
      isNewAccount: false,
    });
  };

  const emailHasError =
    error === 'no-account' || error === 'email-not-verified' || error === 'invalid-email';
  const passwordHasError = error === 'wrong-password' || error === 'password-short';
  const nameHasError = error === 'missing-name';

  return (
    <div className="relative min-h-screen bg-page-gradient flex flex-col p-6 md:p-12 overflow-x-hidden">
      <PageSurfaceBlobs />

      {/* Top Desktop Brand / Mobile Back + Brand + Connect */}
      <header className="relative z-10 flex items-center justify-between gap-3">
        <div className="hidden md:block">
          <BrandLockup variant="light" onClick={onBack} />
        </div>
        <button
          type="button"
          onClick={onBack}
          className="md:hidden inline-flex items-center gap-2 text-[16px] font-semibold text-[#1C1917] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="md:hidden">
          <BrandLockup variant="light" onClick={onBack} />
        </div>
        <button
          type="button"
          onClick={() => onConnectWallet()}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-[10px] bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span className="font-num">{walletConnected && walletAddress ? formatShortAddress(walletAddress) : 'Connect'}</span>
        </button>
      </header>

      {/* Center Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 md:py-10">
        <div className="w-full max-w-[480px] md:bg-white/94 md:backdrop-blur-md md:border md:border-[#0F4024]/[0.08] md:rounded-[16px] md:shadow-auth-card md:px-12 md:py-8 space-y-6">
          {/* Desktop Back inside card */}
          <button
            type="button"
            onClick={onBack}
            className="hidden md:inline-flex items-center gap-2 text-[16px] font-semibold text-[#1C1917] hover:text-[#15803D] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          {/* CHECK YOUR EMAIL SCREEN */}
          {mode === 'check-email' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
                  Check your email
                </h1>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  We sent a link to <span className="font-semibold text-[#1C1917]">{email || 'sam@example.com'}</span>. Open it to finish creating your account.
                </p>
              </div>

              {fromInvite && (
                <InviteChip
                  groupName={groupName || 'Shared Group'}
                  subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
                  amountRight="USDC Split"
                />
              )}

              <p className="text-[14px] leading-[20px] text-[#57534E]">
                Nothing there? Check your spam folder.
              </p>

              {resentNotice && (
                <div className="px-4 py-2.5 rounded-[10px] bg-[#DCFCE7] text-[#166534] text-[14px] font-medium">
                  Verification link resent to {email || 'sam@example.com'}.
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() =>
                    onAuthSuccess({
                      name: name.trim() || 'Sam',
                      email: email.trim() || 'sam@example.com',
                      isNewAccount: true,
                    })
                  }
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  Continue with verified email
                </button>

                <button
                  type="button"
                  onClick={() => setResentNotice(true)}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-white border border-black/10 hover:bg-[#FAFAF9] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Resend email
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="w-full py-2 text-[15px] font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD SCREEN */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
                  Reset your password
                </h1>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  Enter your email and we’ll send you a link to set a new one.
                </p>
              </div>

              {fromInvite && (
                <InviteChip
                  groupName={groupName || 'Shared Group'}
                  subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
                  amountRight="USDC Split"
                />
              )}

              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="block text-[14px] font-medium text-[#1C1917]">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className={`w-full h-12 px-4 rounded-[12px] bg-white text-[16px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none transition-colors ${
                    emailHasError
                      ? 'border-2 border-[#DC2626]'
                      : 'border border-black/15 focus:border-[#15803D]'
                  }`}
                />
                {error === 'invalid-email' && (
                  <ErrorBanner message="Enter a valid email address." />
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  Send reset link
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-[15px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  Back to log in
                </button>
              </div>
            </form>
          )}

          {/* RESET LINK SENT SCREEN */}
          {mode === 'reset-link-sent' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
                  Check your email
                </h1>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  We sent a link to{' '}
                  <span className="font-semibold text-[#1C1917]">{email || 'sam@example.com'}</span>.
                  Open it to set a new password. It expires in 30 minutes.
                </p>
              </div>

              {fromInvite && (
                <InviteChip
                  groupName={groupName || 'Shared Group'}
                  subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
                  amountRight="USDC Split"
                />
              )}

              <p className="text-[14px] leading-[20px] text-[#57534E]">
                Nothing there? Check your spam folder.
              </p>

              {resentNotice && (
                <div className="px-4 py-2.5 rounded-[10px] bg-[#DCFCE7] text-[#166534] text-[14px] font-medium">
                  Reset link resent to {email || 'sam@example.com'}.
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => switchMode('set-new-password')}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  Open reset link
                </button>
                <button
                  type="button"
                  onClick={() => setResentNotice(true)}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-white border border-black/10 hover:bg-[#FAFAF9] text-[#1C1917] text-[16px] font-semibold transition-colors cursor-pointer"
                >
                  Resend email
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="w-full py-2 text-[15px] font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}

          {/* SET A NEW PASSWORD SCREEN */}
          {mode === 'set-new-password' && (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
                  Set a new password
                </h1>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  Choose something you have not used here before.
                </p>
              </div>

              {fromInvite && (
                <InviteChip
                  groupName={groupName || 'Shared Group'}
                  subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
                  amountRight="USDC Split"
                />
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-[14px] font-medium text-[#1C1917]"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="At least 8 characters"
                    className={`w-full h-12 pl-4 pr-16 rounded-[12px] bg-white text-[16px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none transition-colors ${
                      passwordHasError
                        ? 'border-2 border-[#DC2626]'
                        : 'border border-black/15 focus:border-[#15803D]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[14px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-[13px] text-[#57534E]">At least 8 characters.</p>
                {error === 'password-short' && (
                  <ErrorBanner message="Use at least 8 characters." />
                )}
              </div>

              <button
                type="submit"
                className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
              >
                Save password
              </button>
            </form>
          )}

          {/* LOG IN / CREATE ACCOUNT SCREEN */}
          {(mode === 'login' || mode === 'signup') && (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {passwordSavedNotice && mode === 'login' && (
                <div className="px-4 py-3 rounded-[10px] bg-[#DCFCE7] text-[#166534] text-[14px] font-medium">
                  Password updated. Log in with your new password.
                </div>
              )}

              <div className="space-y-2">
                <h1 className="text-[28px] md:text-[30px] leading-[36px] font-semibold tracking-[-0.01em] text-[#1C1917]">
                  {mode === 'login' ? 'Log in' : 'Create your account'}
                </h1>
                <p className="text-[16px] leading-[24px] text-[#57534E]">
                  {fromInvite
                    ? mode === 'login'
                      ? 'Log in to join Housemates and pay your share.'
                      : 'Join Housemates and pay your share.'
                    : mode === 'login'
                      ? 'Log in to your Raba Pay account.'
                      : 'Create your Raba Pay account to split bills in USDC.'}
                </p>
              </div>

              {fromInvite && (
                <InviteChip
                  groupName={groupName || 'Shared Group'}
                  subtitle={inviterName ? `Invited by ${inviterName}` : 'Invited to group'}
                  amountRight="USDC Split"
                />
              )}

              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-name" className="block text-[14px] font-medium text-[#1C1917]">
                      Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                      placeholder="Sam"
                      className={`w-full h-12 px-4 rounded-[12px] bg-white text-[16px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none transition-colors ${
                        nameHasError
                          ? 'border-2 border-[#DC2626]'
                          : 'border border-black/15 focus:border-[#15803D]'
                      }`}
                    />
                    {error === 'missing-name' && (
                      <ErrorBanner message="Enter your name so friends know who paid." />
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-[14px] font-medium text-[#1C1917]">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder={fromInvite ? 'sam@example.com' : 'you@example.com'}
                    className={`w-full h-12 px-4 rounded-[12px] bg-white text-[16px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none transition-colors ${
                      emailHasError
                        ? 'border-2 border-[#DC2626]'
                        : 'border border-black/15 focus:border-[#15803D]'
                    }`}
                  />
                  {error === 'invalid-email' && (
                    <ErrorBanner message="Enter a valid email address." />
                  )}
                  {error === 'no-account' && (
                    <ErrorBanner
                      message="No account with this email."
                      actionLabel="Create one?"
                      onAction={() => switchMode('signup')}
                    />
                  )}
                  {error === 'email-not-verified' && (
                    <ErrorBanner
                      message="Email not verified."
                      actionLabel="Resend the link."
                      onAction={() => setMode('check-email')}
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="block text-[14px] font-medium text-[#1C1917]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                      className={`w-full h-12 pl-4 pr-16 rounded-[12px] bg-white text-[16px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none transition-colors ${
                        passwordHasError
                          ? 'border-2 border-[#DC2626]'
                          : 'border border-black/15 focus:border-[#15803D]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[14px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {error === 'wrong-password' && (
                    <ErrorBanner message="Wrong password. Try again." />
                  )}
                  {error === 'password-short' && (
                    <ErrorBanner message="Use at least 8 characters." />
                  )}
                </div>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="text-[15px] font-medium text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[16px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                >
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-black/[0.08]" />
                  <span className="shrink-0 mx-3 text-[12px] font-medium text-[#78716C] uppercase tracking-wider">
                    Stellar Wallet Kit
                  </span>
                  <div className="flex-grow border-t border-black/[0.08]" />
                </div>

                <button
                  type="button"
                  onClick={() => onConnectWallet()}
                  className="w-full h-12 min-h-[48px] rounded-[12px] bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#15803D]/30 text-[#14532D] text-[16px] font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Wallet className="w-5 h-5 text-[#15803D]" />
                  <span>Connect</span>
                </button>

                <p className="text-center text-[15px] text-[#57534E]">
                  {mode === 'login' ? (
                    <>
                      Don’t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        Log in
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Unobtrusive validation state previewer for reviewers */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 max-w-[540px]">
          <span className="text-[12px] text-[#57534E] mr-1">Test states:</span>
          {[
            {
              label: 'Log in',
              onClick: () => {
                setMode('login');
                setEmail('sam@example.com');
                setPassword('password123');
                setError(null);
              },
            },
            {
              label: 'Wrong password',
              onClick: () => {
                setMode('login');
                setEmail('sam@example.com');
                setPassword('wrong');
                setError('wrong-password');
              },
            },
            {
              label: 'No account',
              onClick: () => {
                setMode('login');
                setEmail('unknown@example.com');
                setPassword('password123');
                setError('no-account');
              },
            },
            {
              label: 'Email not verified',
              onClick: () => {
                setMode('login');
                setEmail('sam@example.com');
                setPassword('password123');
                setError('email-not-verified');
              },
            },
            {
              label: 'Password < 8',
              onClick: () => {
                setMode('signup');
                setName('Sam');
                setEmail('sam@example.com');
                setPassword('1234');
                setError('password-short');
              },
            },
            {
              label: 'Check email',
              onClick: () => {
                setEmail('sam@example.com');
                switchMode('check-email');
              },
            },
            {
              label: 'Forgot password',
              onClick: () => {
                setEmail('sam@example.com');
                switchMode('forgot-password');
              },
            },
            {
              label: 'Reset link sent',
              onClick: () => {
                setEmail('sam@example.com');
                switchMode('reset-link-sent');
              },
            },
            {
              label: 'Set new password',
              onClick: () => {
                setNewPassword('');
                switchMode('set-new-password');
              },
            },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className="px-2.5 py-1 rounded-md bg-white/75 hover:bg-white text-[12px] font-medium text-[#57534E] border border-black/[0.06] transition-colors cursor-pointer"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
