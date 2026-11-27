import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Home,
  LogOut,
  MapPin,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { buildInviteLink, formatInviteDisplay } from '../utils/inviteLink';
import {
  AccountPreset,
  ActivityItem,
  Bill,
  BillDetailPreset,
  BillParticipant,
  CreateBillPreset,
  CreateBillStep,
  CreateGroupInput,
  DashboardScreen,
  EditBillPreset,
  Group,
  GroupMobileTab,
  GroupSettingsPreset,
  GroupStateMode,
  GroupsListMode,
  HistoryPreset,
  HomeStateMode,
  NotificationItem,
  NotificationsPreset,
  RecentPaymentItem,
  UserSession,
  WalletPayStep,
} from '../types';
import { AccountPage } from './AccountPage';
import { formatShortAddress } from '../services/stellarWalletKit';
import {
  AvatarBadge,
  AvatarStack,
  BrandLockup,
  PageSurfaceBlobs,
  SegmentedProgress,
} from './BrandPrimitives';
import { BillDetailsPage } from './BillDetailsPage';
import { CreateBillWizard } from './CreateBillWizard';
import { CreateGroupScreen, GroupCreatedScreen } from './CreateGroupFlow';
import { EditBillPage } from './EditBillPage';
import { GroupSettingsPage } from './GroupSettingsPage';
import { HistoryView } from './HistoryView';
import {
  EmptyBillIllustration,
  SettledPersonIllustration,
  WalletNeededIllustration,
} from './Illustrations';
import { NotificationsPage } from './NotificationsPage';
import { WalletPaymentFlow } from './WalletPaymentFlow';

interface DashboardPageProps {
  user: UserSession;
  groups: Group[];
  bills: Bill[];
  activity: ActivityItem[];
  payments?: RecentPaymentItem[];
  notifications?: NotificationItem[];
  screen: DashboardScreen;
  onScreenChange: (screen: DashboardScreen) => void;
  selectedGroupId: string;
  onSelectGroupId: (groupId: string) => void;
  selectedBillId: string;
  onSelectBillId: (billId: string) => void;
  homeMode: HomeStateMode;
  onHomeModeChange: (mode: HomeStateMode) => void;
  groupsListMode: GroupsListMode;
  onGroupsListModeChange: (mode: GroupsListMode) => void;
  groupMode: GroupStateMode;
  onGroupModeChange: (mode: GroupStateMode) => void;
  mobileGroupTab: GroupMobileTab;
  onMobileGroupTabChange: (tab: GroupMobileTab) => void;
  createBillStep: CreateBillStep;
  createBillPreset: CreateBillPreset;
  billDetailPreset: BillDetailPreset;
  editBillPreset?: EditBillPreset;
  historyPreset?: HistoryPreset;
  groupSettingsPreset?: GroupSettingsPreset;
  accountPreset?: AccountPreset;
  notificationsPreset?: NotificationsPreset;
  walletPayOpen?: boolean;
  walletPayStepPreset?: WalletPayStep;
  isWalletCatalogPreset?: boolean;
  onCloseWalletPay?: () => void;
  onClearPresets: () => void;
  onBackToLanding: () => void;
  onLogOut: () => void;
  onOpenInvite: () => void;
  onConnectWallet: (providerId?: string) => void;
  onTopUpTestnet?: () => void;
  onDisconnectWallet?: () => void;
  onUpdateName?: (name: string) => void;
  onChangePassword?: () => void;
  onMarkAllNotificationsRead?: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onPayBill: (
    billId: string,
    txDetails?: { tx_hash?: string; signed_tx_xdr?: string }
  ) => Promise<unknown> | void;
  onCreateBill: (params: {
    groupId: string;
    title: string;
    totalAmount: number;
    paidById: string;
    splitMode: 'equal' | 'custom';
    yourShare: number;
    participants?: BillParticipant[];
  }) => void;
  onEditBillSave?: (params: {
    billId: string;
    title: string;
    totalAmount: number;
    groupId: string;
  }) => void;
  onCancelBill: (billId: string) => void;
  onCreateGroup: (nameOrParams: string | CreateGroupInput, description?: string) => Group;
  onInviteMember?: (params: {
    groupId: string;
    name?: string;
    email?: string;
    stellar_address?: string;
    participants?: Array<{ address: string; name?: string; email?: string }>;
  }) => Promise<unknown> | void;
  onSaveGroupName?: (groupId: string, name: string) => void;
  onRemoveMember?: (groupId: string, memberId: string) => void;
  onRevokeInviteLink?: (groupId: string) => string;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  groups,
  bills,
  activity,
  payments = [],
  notifications = [],
  screen,
  onScreenChange,
  selectedGroupId,
  onSelectGroupId,
  selectedBillId,
  onSelectBillId,
  homeMode,
  groupsListMode,
  groupMode,
  onGroupModeChange,
  mobileGroupTab,
  onMobileGroupTabChange,
  createBillStep,
  createBillPreset,
  billDetailPreset,
  editBillPreset = 'unlocked',
  historyPreset = 'default',
  groupSettingsPreset = 'default',
  accountPreset = 'default',
  notificationsPreset = 'default',
  walletPayOpen = false,
  walletPayStepPreset = 'confirm',
  isWalletCatalogPreset = false,
  onCloseWalletPay,
  onClearPresets,
  onBackToLanding,
  onLogOut,
  onOpenInvite,
  onConnectWallet,
  onTopUpTestnet,
  onDisconnectWallet,
  onUpdateName,
  onChangePassword,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onPayBill,
  onCreateBill,
  onEditBillSave,
  onCancelBill,
  onCreateGroup,
  onInviteMember,
  onSaveGroupName,
  onRemoveMember,
  onRevokeInviteLink,
}) => {
  const [groupSearch, setGroupSearch] = useState('');
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [walletStepOverride, setWalletStepOverride] = useState<WalletPayStep | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Record<string, boolean>>({});
  const [failedPayId, setFailedPayId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteNotice, setInviteNotice] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedChris, setCopiedChris] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [mobileProfilePopupOpen, setMobileProfilePopupOpen] = useState(false);
  const [inviteRows, setInviteRows] = useState<
    Array<{ id: string; address: string; name: string }>
  >([{ id: 'row-1', address: '', name: '' }]);
  const [isSubmittingInvites, setIsSubmittingInvites] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group>(groups[0]);

  useEffect(() => {
    if (createdGroup) {
      const live = groups.find((g) => g.id === createdGroup.id || g.name === createdGroup.name);
      if (live && live.inviteCode && live.inviteCode !== createdGroup.inviteCode) {
        setCreatedGroup(live);
      }
    }
  }, [groups, createdGroup]);

  const handleCopyAddress = (addr?: string) => {
    if (!addr) return;
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const displayedGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, groupSearch]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? groups[0],
    [groups, selectedGroupId]
  );

  const groupBills = useMemo(
    () => bills.filter((b) => b.groupId === activeGroup?.id),
    [bills, activeGroup]
  );

  const groupActivity = useMemo(
    () => activity.filter((a) => a.groupId === activeGroup?.id),
    [activity, activeGroup]
  );

  const activeBill = useMemo(
    () => bills.find((b) => b.id === selectedBillId) ?? groupBills[0] ?? bills[0],
    [bills, groupBills, selectedBillId]
  );

  const computeBalances = (list: Bill[]) => {
    const owedBills = list.filter(
      (b) => !b.userPaid && b.paidById !== 'sam' && b.status !== 'settled' && b.status !== 'cancelled'
    );
    const owedAmount = owedBills.reduce((sum, b) => sum + b.yourShare, 0);

    const receivableBills = list.filter(
      (b) => b.paidById === 'sam' && b.paidCount < b.totalMembers && b.status !== 'cancelled'
    );
    const receivableAmount = receivableBills.reduce(
      (sum, b) => sum + b.yourShare * (b.totalMembers - b.paidCount),
      0
    );

    return {
      owedCount: owedBills.length,
      owedAmount,
      receivableCount: receivableBills.length,
      receivableAmount,
    };
  };

  const allBalances = computeBalances(bills);
  const groupBalances = computeBalances(groupBills);

  const actionBills = useMemo(
    () => bills.filter((b) => b.status === 'you-owe' && !b.userPaid),
    [bills]
  );

  const handleOpenBillDetails = (bill: Bill) => {
    onClearPresets();
    onSelectBillId(bill.id);
    onScreenChange('bill-details');
  };

  const handleOpenCreateBill = () => {
    onClearPresets();
    onScreenChange('create-bill');
  };

  const handleOpenCreateGroup = () => {
    onClearPresets();
    onScreenChange('create-group');
  };

  const handleCopyInvite = () => {
    const link = buildInviteLink(activeGroup?.inviteCode);
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  const handleCopyChrisLink = () => {
    const link = buildInviteLink(activeGroup?.inviteCode);
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedChris(true);
    setTimeout(() => setCopiedChris(false), 1800);
  };

  const sidebarNavActive = (
    id: 'home' | 'groups' | 'history' | 'notifications' | 'account'
  ) => {
    if (id === 'home') return screen === 'home';
    if (id === 'history') return screen === 'history';
    if (id === 'notifications') return screen === 'notifications';
    if (id === 'account') return screen === 'account';
    return (
      screen === 'groups' ||
      screen === 'group-detail' ||
      screen === 'create-bill' ||
      screen === 'bill-details' ||
      screen === 'edit-bill' ||
      screen === 'create-group' ||
      screen === 'group-created' ||
      screen === 'group-settings'
    );
  };

  const walletConnectedEffective =
    homeMode === 'no-wallet' ? false : user.walletConnected;

  // Group activity by Today / Yesterday / Earlier
  const groupedActivity = useMemo(() => {
    const sections: Array<{ label: 'Today' | 'Yesterday' | 'Earlier'; items: ActivityItem[] }> = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Earlier', items: [] },
    ];
    groupActivity.forEach((item) => {
      const bucket = item.dayGroup ?? (item.timestamp === 'Just now' || item.timestamp.includes('h ago') ? 'Today' : item.timestamp === 'Yesterday' ? 'Yesterday' : 'Earlier');
      const target = sections.find((s) => s.label === bucket);
      target?.items.push(item);
    });
    return sections.filter((s) => s.items.length > 0);
  }, [groupActivity]);

  return (
    <div className="relative min-h-screen bg-page-gradient text-[#1C1917] flex flex-col md:flex-row overflow-x-hidden">
      <PageSurfaceBlobs />

      {/* DESKTOP / TABLET SIDEBAR */}
      <aside className="hidden md:flex md:w-[248px] lg:w-[272px] shrink-0 bg-white border-r border-[#0F4024]/[0.08] shadow-glass-card p-6 flex-col justify-between relative z-20">
        <div className="space-y-8">
          <BrandLockup variant="light" onClick={onBackToLanding} />

          <nav className="space-y-1.5" aria-label="Workspace navigation">
            {[
              { id: 'home' as const, label: 'Home', Icon: Home },
              { id: 'groups' as const, label: 'Groups', Icon: Users },
              { id: 'history' as const, label: 'History', Icon: Clock },
              {
                id: 'notifications' as const,
                label: 'Notifications',
                Icon: Bell,
                badge: unreadNotificationsCount,
              },
              { id: 'account' as const, label: 'Account', Icon: User },
            ].map(({ id, label, Icon, badge }) => {
              const active = sidebarNavActive(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onClearPresets();
                    onScreenChange(id);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] text-[15px] transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#DCFCE7] text-[#14532D] font-semibold'
                      : 'text-[#57534E] font-medium hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </span>
                  {badge !== undefined && badge > 0 && (
                    <span className="font-num px-2 py-0.5 rounded-full bg-[#15803D] text-white text-[11px] font-semibold leading-4">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Group Quick Switcher */}
          <div className="space-y-2 pt-3 border-t border-black/[0.06]">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-semibold text-[#57534E]">Your groups</span>
              <button
                type="button"
                onClick={handleOpenCreateGroup}
                className="p-1 rounded-md text-[#15803D] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                aria-label="Create group"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {groups.map((g) => {
                const isSelected = g.id === activeGroup?.id && screen === 'group-detail';
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      onClearPresets();
                      onSelectGroupId(g.id);
                      onScreenChange('group-detail');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[14px] text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0FDF4] text-[#14532D] font-semibold border border-[#BBF7D0]'
                        : 'text-[#57534E] hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span>{g.icon || '🏠'}</span>
                      <span className="truncate">{g.name}</span>
                    </span>
                    <span className="font-num text-[12px] text-[#78716C] shrink-0">
                      {g.members?.length ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* User / Wallet Profile Footer */}
        <div className="pt-3 border-t border-black/[0.06]">
          {walletConnectedEffective && (user.walletAddress || user.fullWalletAddress) ? (
            <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.1] shadow-glass-card p-3.5 space-y-3">
              {/* Profile Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <AvatarBadge
                      initial={(user.name?.[0] || 'S').toUpperCase()}
                      bg="#166534"
                      text="#FFFFFF"
                      size="md"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white"
                      title="Stellar Testnet Connected"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1C1917] leading-4 truncate">
                      {user.name || 'Stellar Account'}
                    </p>
                    <p className="text-[11px] text-[#15803D] font-medium leading-4 mt-0.5 flex items-center gap-1">
                      <span>Stellar Testnet</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClearPresets();
                      onScreenChange('account');
                    }}
                    className="p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-black/5 transition-colors cursor-pointer"
                    title="Account Settings"
                    aria-label="Account Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onLogOut}
                    className="p-1.5 rounded-lg text-[#57534E] hover:text-[#DC2626] hover:bg-black/5 transition-colors cursor-pointer"
                    title="Log out"
                    aria-label="Log out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Copiable Address Box */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-[10px] bg-[#FAFAF9] border border-black/[0.06]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Wallet className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                  <span className="font-num text-[12px] font-medium text-[#1C1917] truncate">
                    {formatShortAddress(user.fullWalletAddress || user.walletAddress)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyAddress(user.fullWalletAddress || user.walletAddress)
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-white border border-black/10 hover:border-[#15803D] text-[11px] font-semibold text-[#15803D] shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title="Copy full address"
                >
                  {copiedAddress ? (
                    <Check className="w-3 h-3 text-[#15803D]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Balance & Explorer Quick Actions */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.04] text-[12px]">
                <div>
                  <p className="text-[10px] text-[#78716C] uppercase font-semibold tracking-wider">Wallet Balance</p>
                  <p className="font-num font-semibold text-[#1C1917]">
                    {(user.onchainUsdcBalance !== undefined && user.onchainUsdcBalance !== null ? user.onchainUsdcBalance : (user.usdcBalance ?? 0)).toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-[#57534E]">USDC</span>
                  </p>
                  {typeof user.nativeXlmBalance === 'number' && user.nativeXlmBalance > 0 && (
                    <p className="font-num text-[10px] text-[#78716C]">
                      {user.nativeXlmBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} XLM (Testnet)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onTopUpTestnet?.()}
                    className="px-2 py-1 rounded-[6px] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#065F46] font-semibold text-[11px] border border-[#A7F3D0] transition-colors cursor-pointer"
                    title="Top up testnet account from faucet"
                  >
                    + Faucet
                  </button>
                  {user.fullWalletAddress && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${user.fullWalletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-[6px] text-[#78716C] hover:text-[#1C1917] hover:bg-black/5 transition-colors cursor-pointer"
                      title="View on Stellar Expert"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.1] shadow-glass-card p-3.5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C]">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#1C1917] leading-4 truncate">
                    {user.name || 'No wallet connected'}
                  </p>
                  <p className="text-[11px] text-[#78716C]">Connect to pay bills</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onConnectWallet()}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-[10px] bg-[#15803D] hover:bg-[#166534] text-white text-[13px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Wallet</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE TOP BAR FOR HOME / GROUPS / HISTORY */}
      {screen !== 'group-detail' &&
        screen !== 'create-bill' &&
        screen !== 'bill-details' &&
        screen !== 'edit-bill' &&
        screen !== 'create-group' &&
        screen !== 'group-created' &&
        screen !== 'group-settings' &&
        screen !== 'account' &&
        screen !== 'notifications' && (
          <div className="md:hidden relative z-10 bg-hero-dark text-white px-5 pt-4 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <BrandLockup variant="dark" compact onClick={onBackToLanding} />
              {/* Clean Profile / Account Trigger */}
              <button
                type="button"
                onClick={() => setMobileProfilePopupOpen(true)}
                className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 transition-all cursor-pointer relative"
                aria-label="Open profile and wallet menu"
              >
                <div className="relative">
                  <AvatarBadge
                    initial={(user.name?.[0] || 'S').toUpperCase()}
                    bg="#166534"
                    text="#FFFFFF"
                    size="sm"
                  />
                  {walletConnectedEffective && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[#052E16]"
                      title="Wallet connected"
                    />
                  )}
                </div>
                <span className="text-[13px] font-semibold text-white max-w-[90px] truncate">
                  {user.name ? user.name.split(' ')[0] : 'Profile'}
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[#33C773]" />
                )}
              </button>
            </div>

            {screen === 'home' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h1 className="text-[24px] font-semibold tracking-tight">Hi {user.name || 'there'}</h1>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[12px] p-3.5 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[12px] text-white/90">You owe</p>
                    <p className="font-num text-[20px] font-semibold text-white leading-6 mt-0.5">
                      {homeMode === 'first-use' ? '0.00' : allBalances.owedAmount.toFixed(2)} USDC
                    </p>
                    <p className="text-[12px] text-white/85 mt-0.5">
                      {homeMode === 'first-use'
                        ? '0 bills'
                        : `${allBalances.owedCount} ${allBalances.owedCount === 1 ? 'bill' : 'bills'}`}
                    </p>
                  </div>

                  <div className="rounded-[12px] p-3.5 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[12px] text-white/90">You are owed</p>
                    <p className="font-num text-[20px] font-semibold text-white leading-6 mt-0.5">
                      {homeMode === 'first-use' ? '0.00' : allBalances.receivableAmount.toFixed(2)}{' '}
                      USDC
                    </p>
                    <p className="text-[12px] text-white/85 mt-0.5">
                      {homeMode === 'first-use'
                        ? '0 bills'
                        : `${allBalances.receivableCount} ${
                            allBalances.receivableCount === 1 ? 'bill' : 'bills'
                          }`}
                    </p>
                  </div>
                </div>
              </>
            )}

            {screen === 'groups' && (
              <div className="flex items-center justify-between">
                <h1 className="text-[24px] font-semibold tracking-tight">Groups</h1>
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-[#33C773] text-[#052E16] text-[13px] font-semibold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create group</span>
                </button>
              </div>
            )}

            {screen === 'history' && (
              <div>
                <h1 className="text-[24px] font-semibold tracking-tight">History</h1>
                <p className="text-[13px] text-[#BBF7D0]/85">Simulated USDC payments & activity</p>
              </div>
            )}
          </div>
        )}

      {/* MOBILE TOP HERO FOR GROUP DETAIL */}
      {screen === 'group-detail' && activeGroup && (
        <div className="md:hidden relative z-10 bg-hero-dark text-white px-5 pt-4 pb-5 space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClearPresets();
                onScreenChange('groups');
              }}
              className="inline-flex items-center gap-1.5 text-[14px] text-white/85 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Groups</span>
            </button>
            <div className="flex items-center gap-2">
              <AvatarStack members={(activeGroup?.members || []).slice(0, 4)} size="sm" />
              <button
                type="button"
                onClick={() => {
                  onClearPresets();
                  onScreenChange('group-settings');
                }}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                aria-label="Group settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeGroup.icon || '🏠'}</span>
            <h1 className="text-[26px] font-semibold tracking-tight leading-8">{activeGroup.name}</h1>
          </div>
          {(activeGroup.category || activeGroup.location) && (
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/85">
              {activeGroup.category && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 font-medium">
                  {activeGroup.category}
                </span>
              )}
              {activeGroup.location && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/20 border border-white/15 font-medium">
                  📍 {activeGroup.location}
                </span>
              )}
            </div>
          )}

          {groupMode === 'first-use' ? (
            <div className="rounded-[14px] bg-white/10 border border-white/15 p-4 space-y-3">
              <div>
                <p className="text-[18px] font-semibold">No bills yet</p>
                <p className="text-[14px] text-white/80">
                  Create a shared bill to start splitting.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateBill}
                className="w-full h-11 rounded-[12px] bg-white text-[#14532D] text-[15px] font-semibold cursor-pointer"
              >
                Create shared bill
              </button>
            </div>
          ) : groupMode === 'all-settled' ? (
            <div className="rounded-[14px] bg-[#14532D]/70 border border-[#33C773]/40 p-4 flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div>
                  <p className="text-[20px] font-semibold text-white">All settled</p>
                  <p className="text-[13px] text-[#DCFCE7]">Nothing owed either way.</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateBill}
                  className="px-4 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold cursor-pointer"
                >
                  Create shared bill
                </button>
              </div>
              <SettledPersonIllustration className="w-20 h-20 shrink-0" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] p-3.5 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                  <p className="text-[12px] text-white/90">
                    You owe · {groupBalances.owedCount}{' '}
                    {groupBalances.owedCount === 1 ? 'bill' : 'bills'}
                  </p>
                  <p className="font-num text-[20px] font-semibold leading-6 mt-0.5">
                    {groupBalances.owedAmount.toFixed(2)} USDC
                  </p>
                </div>
                <div className="rounded-[12px] p-3.5 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                  <p className="text-[12px] text-white/90">
                    You are owed · {groupBalances.receivableCount}{' '}
                    {groupBalances.receivableCount === 1 ? 'bill' : 'bills'}
                  </p>
                  <p className="font-num text-[20px] font-semibold leading-6 mt-0.5">
                    {groupBalances.receivableAmount.toFixed(2)} USDC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateBill}
                className="w-full h-11 rounded-[12px] bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold hover:bg-white transition-colors cursor-pointer"
              >
                Create shared bill
              </button>
            </div>
          )}
        </div>
      )}

      {/* MAIN WORKSPACE CONTENT */}
      <main className="relative z-10 flex-1 px-5 py-6 pb-36 md:p-8 lg:p-10 md:pb-20 max-w-[1160px] w-full mx-auto space-y-6">
        {/* ==================== HOME SCREEN ==================== */}
        {screen === 'home' && (
          <div className="space-y-6">
            {/* DESKTOP HERO BAND */}
            <section className="hidden md:block rounded-[20px] bg-hero-desktop text-white p-7 lg:p-8 shadow-glass-card space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Hi {user.name || 'there'}</h1>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onConnectWallet()}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#33C773] hover:bg-[#22C55E] text-[#052E16] text-[13px] font-semibold transition-colors cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="font-num">
                      {walletConnectedEffective && (user.walletAddress || user.fullWalletAddress) ? formatShortAddress(user.walletAddress || user.fullWalletAddress) : 'Connect'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-1 rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                  <p className="text-[13px] text-white/90">You owe</p>
                  <p className="font-num text-[22px] font-semibold mt-0.5">
                    {homeMode === 'first-use' ? '0.00' : allBalances.owedAmount.toFixed(2)} USDC
                  </p>
                  <p className="text-[12px] text-white/85 mt-0.5">
                    {homeMode === 'first-use'
                      ? '0 bills'
                      : `${allBalances.owedCount} ${allBalances.owedCount === 1 ? 'bill' : 'bills'}`}
                  </p>
                </div>

                <div className="lg:col-span-1 rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                  <p className="text-[13px] text-white/90">You are owed</p>
                  <p className="font-num text-[22px] font-semibold mt-0.5">
                    {homeMode === 'first-use' ? '0.00' : allBalances.receivableAmount.toFixed(2)}{' '}
                    USDC
                  </p>
                  <p className="text-[12px] text-white/85 mt-0.5">
                    {homeMode === 'first-use'
                      ? '0 bills'
                      : `${allBalances.receivableCount} ${
                          allBalances.receivableCount === 1 ? 'bill' : 'bills'
                        }`}
                  </p>
                </div>

                {/* 3 Secondary Stats Cards */}
                <div className="rounded-[14px] p-4 bg-white/10 border border-white/15">
                  <p className="text-[13px] text-[#BBF7D0]">Groups</p>
                  <p className="font-num text-[24px] font-semibold text-white mt-1">
                    {homeMode === 'first-use' ? 0 : groups.length}
                  </p>
                </div>
                <div className="rounded-[14px] p-4 bg-white/10 border border-white/15">
                  <p className="text-[13px] text-[#BBF7D0]">Open bills</p>
                  <p className="font-num text-[24px] font-semibold text-white mt-1">
                    {homeMode === 'first-use'
                      ? 0
                      : bills.filter((b) => b.status !== 'settled').length}
                  </p>
                </div>
                <div className="rounded-[14px] p-4 bg-white/10 border border-white/15">
                  <p className="text-[13px] text-[#BBF7D0]">Payments</p>
                  <p className="font-num text-[24px] font-semibold text-white mt-1">
                    {homeMode === 'first-use' ? 0 : payments.length}
                  </p>
                </div>
              </div>
            </section>

            {/* MOBILE 3-UP STATS STRIP */}
            <div className="grid grid-cols-3 gap-2.5 md:hidden">
              <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-3">
                <p className="text-[12px] text-[#57534E]">Groups</p>
                <p className="font-num text-[20px] font-semibold text-[#1C1917] mt-0.5">
                  {homeMode === 'first-use' ? 0 : groups.length}
                </p>
              </div>
              <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-3">
                <p className="text-[12px] text-[#57534E]">Open bills</p>
                <p className="font-num text-[20px] font-semibold text-[#1C1917] mt-0.5">
                  {homeMode === 'first-use' ? 0 : bills.filter((b) => b.status !== 'settled').length}
                </p>
              </div>
              <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-3">
                <p className="text-[12px] text-[#57534E]">Payments</p>
                <p className="font-num text-[20px] font-semibold text-[#1C1917] mt-0.5">
                  {homeMode === 'first-use' ? 0 : payments.length}
                </p>
              </div>
            </div>

            {/* NO WALLET CONNECTED BANNER */}
            {!walletConnectedEffective && (
              <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.1] shadow-glass-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <WalletNeededIllustration className="w-24 h-20 shrink-0" />
                  <div className="space-y-1">
                    <h2 className="text-[17px] font-semibold text-[#1C1917]">
                      Connect a wallet to pay and get paid
                    </h2>
                    <p className="text-[14px] text-[#57534E]">
                      Raba Pay never holds your USDC. Payments go from your wallet to theirs.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onConnectWallet()}
                  className="w-full sm:w-auto px-5 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Connect
                </button>
              </div>
            )}

            {/* FIRST USE, NO GROUPS EMPTY STATE */}
            {homeMode === 'first-use' || groups.length === 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-7 text-center space-y-4">
                  <EmptyBillIllustration className="w-28 h-24 mx-auto" />
                  <div className="space-y-1">
                    <h2 className="text-[19px] font-semibold text-[#1C1917]">
                      Your groups will appear here.
                    </h2>
                    <p className="text-[14px] text-[#57534E] max-w-sm mx-auto">
                      Create a group to split your first bill, or open an invite link from a friend.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateGroup}
                    className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                  >
                    Create group
                  </button>
                </div>

                <div className="lg:col-span-5 rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-6 space-y-2">
                  <h3 className="text-[16px] font-semibold text-[#1C1917]">Recent payments</h3>
                  <p className="text-[14px] text-[#57534E]">No payments yet</p>
                </div>
              </div>
            ) : (
              /* DEFAULT HOME COLUMNS: Needs your action + Recent payments | Your groups */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-6 space-y-6">
                  {/* Needs your action */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[17px] font-semibold text-[#1C1917]">Needs your action</h2>
                      <span className="font-num text-[13px] text-[#57534E]">
                        {actionBills.length} {actionBills.length === 1 ? 'bill' : 'bills'}
                      </span>
                    </div>

                    {actionBills.length === 0 ? (
                      <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 text-[14px] text-[#57534E]">
                        You are all caught up across every group.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {actionBills.map((bill) => {
                          const grp = groups.find((g) => g.id === bill.groupId);
                          return (
                            <div
                              key={bill.id}
                              onClick={() => handleOpenBillDetails(bill)}
                              className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[#15803D]/35 transition-colors"
                            >
                              <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                                  {bill.title}
                                </p>
                                <p className="text-[13px] text-[#57534E] truncate">
                                  {grp?.name ?? 'Housemates'} ·{' '}
                                  <span className="font-num">{bill.yourShare.toFixed(2)} USDC</span>{' '}
                                  to {bill.paidByLabel}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayingBill(bill);
                                }}
                                className="px-4 h-9 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-[13px] font-semibold shrink-0 cursor-pointer"
                              >
                                Pay
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Recent payments */}
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[17px] font-semibold text-[#1C1917]">Recent payments</h2>
                      <button
                        type="button"
                        onClick={() => onScreenChange('history')}
                        className="text-[13px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        See all
                      </button>
                    </div>

                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card divide-y divide-black/[0.06]">
                      {payments.length === 0 ? (
                        <div className="p-4 text-[14px] text-[#57534E]">
                          No payments yet.
                        </div>
                      ) : (
                        payments.slice(0, 3).map((p) => (
                          <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                                {p.title}
                              </p>
                              <p className="text-[13px] text-[#57534E] truncate">{p.subtitle}</p>
                            </div>
                            <span
                              className={`font-num text-[14px] font-semibold shrink-0 ${
                                p.direction === 'in' ? 'text-[#15803D]' : 'text-[#1C1917]'
                              }`}
                            >
                              {p.direction === 'in' ? '+' : '-'}
                              {p.amount.toFixed(2)} USDC
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                {/* Your groups */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold text-[#1C1917]">Your groups</h2>
                    <button
                      type="button"
                      onClick={() => onScreenChange('groups')}
                      className="text-[13px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                    >
                      See all
                    </button>
                  </div>

                  <div className="space-y-3">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          onClearPresets();
                          onSelectGroupId(g.id);
                          onScreenChange('group-detail');
                        }}
                        className="w-full rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 flex items-center justify-between gap-3 text-left hover:border-[#15803D]/35 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="w-10 h-10 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-xl shrink-0 shadow-xs">
                            {g.icon || '🏠'}
                          </span>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[15px] font-semibold text-[#1C1917] truncate">
                                {g.name}
                              </p>
                              {g.category && (
                                <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] text-[11px] font-medium border border-[#A7F3D0]">
                                  {g.category}
                                </span>
                              )}
                              {g.location && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#78716C]">
                                  <MapPin className="w-3 h-3 text-[#15803D]" />
                                  <span className="truncate max-w-[120px]">{g.location}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[12px]">
                              <AvatarStack members={(g.members || []).slice(0, 4)} size="sm" />
                              <span className="text-[#78716C]">· {g.members?.length ?? 0} members ·</span>
                              <span
                                className={`text-[12px] font-medium ${
                                  g.statusSummary?.includes('owe ')
                                    ? 'text-[#92400E]'
                                    : g.statusSummary?.includes('owed')
                                      ? 'text-[#15803D]'
                                      : 'text-[#57534E]'
                                }`}
                              >
                                {g.statusSummary ?? 'All settled'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#78716C] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== GROUPS LIST SCREEN ==================== */}
        {screen === 'groups' && (
          <div className="space-y-6">
            <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[#1C1917]">
                  Groups
                </h1>
                <p className="text-[15px] text-[#57534E]">
                  Open a group to see shared bills, members, and activity.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateGroup}
                className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold shadow-btn-primary cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create group</span>
              </button>
            </div>

            {groupsListMode === 'many' && (
              <div className="relative max-w-[440px]">
                <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  placeholder="Search groups"
                  className="w-full h-11 pl-10 pr-4 rounded-[12px] bg-white border border-[#A8A29E] focus:border-[#15803D] focus:outline-none text-[15px] text-[#1C1917]"
                />
              </div>
            )}

            {displayedGroups.length === 0 ? (
              <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-8 text-center space-y-4">
                <EmptyBillIllustration className="w-28 h-24 mx-auto" />
                <div className="space-y-1">
                  <h2 className="text-[19px] font-semibold text-[#1C1917]">
                    No groups yet
                  </h2>
                  <p className="text-[14px] text-[#57534E] max-w-sm mx-auto">
                    Create your first group to start splitting expenses in simulated USDC.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateGroup}
                  className="px-6 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                >
                  Create group
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    onClearPresets();
                    onSelectGroupId(g.id);
                    onScreenChange('group-detail');
                  }}
                  className="rounded-[14px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-5 flex items-center justify-between gap-3 text-left hover:border-[#15803D]/35 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span className="w-11 h-11 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      {g.icon || '🏠'}
                    </span>
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[16px] font-semibold text-[#1C1917] truncate">
                          {g.name}
                        </p>
                        {g.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] text-[11px] font-medium border border-[#A7F3D0]">
                            {g.category}
                          </span>
                        )}
                        {g.location && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-[#78716C]">
                            <MapPin className="w-3.5 h-3.5 text-[#15803D]" />
                            <span className="truncate max-w-[140px]">{g.location}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-[13px]">
                        <AvatarStack members={(g.members || []).slice(0, 4)} size="sm" />
                        <span className="text-[#78716C]">· {g.members?.length ?? 0} members ·</span>
                        <span
                          className={`font-medium ${
                            g.statusSummary?.includes('owe ')
                              ? 'text-[#92400E]'
                              : g.statusSummary?.includes('owed')
                                ? 'text-[#15803D]'
                                : 'text-[#57534E]'
                          }`}
                        >
                          {g.statusSummary ?? 'All settled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#78716C] shrink-0" />
                </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== GROUP DASHBOARD SCREEN ==================== */}
        {screen === 'group-detail' && activeGroup && (
          <div className="space-y-6">
            {/* DESKTOP HERO BAND */}
            <section className="hidden md:block rounded-[20px] bg-hero-desktop text-white p-7 shadow-glass-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClearPresets();
                      onScreenChange('groups');
                    }}
                    className="inline-flex items-center gap-1.5 text-[14px] text-[#BBF7D0] hover:text-white cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Groups</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{activeGroup.icon || '🏠'}</span>
                    <h1 className="text-[30px] font-semibold tracking-[-0.02em]">
                      {activeGroup.name}
                    </h1>
                    <AvatarStack members={(activeGroup?.members || []).slice(0, 4)} size="sm" />
                    {activeGroup.category && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-[12px] font-medium">
                        {activeGroup.category}
                      </span>
                    )}
                    {activeGroup.location && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-white/80">
                        <MapPin className="w-3.5 h-3.5 text-[#BBF7D0]" />
                        <span>{activeGroup.location}</span>
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[12px] font-medium">
                      Testnet
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearPresets();
                      onScreenChange('group-settings');
                    }}
                    className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white cursor-pointer"
                    aria-label="Group settings"
                    title="Group settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-[14px] font-semibold cursor-pointer"
                  >
                    Invite people
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateBill}
                    className="px-4 h-10 rounded-full bg-white text-[#14532D] hover:bg-[#F0FDF4] text-[14px] font-semibold cursor-pointer"
                  >
                    Create shared bill
                  </button>
                </div>
              </div>

              {groupMode === 'first-use' ? (
                <div className="rounded-[14px] bg-white/10 border border-white/15 p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[18px] font-semibold">No bills yet</p>
                    <p className="text-[14px] text-white/80">
                      Create a shared bill to start splitting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateBill}
                    className="px-5 h-10 rounded-full bg-white text-[#14532D] text-[14px] font-semibold cursor-pointer"
                  >
                    Create shared bill
                  </button>
                </div>
              ) : groupMode === 'all-settled' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[13px] text-white/90">You owe · 0 bills</p>
                    <p className="font-num text-[24px] font-semibold mt-0.5">0.00 USDC</p>
                  </div>
                  <div className="rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[13px] text-white/90">You are owed · 0 bills</p>
                    <p className="font-num text-[24px] font-semibold mt-0.5">0.00 USDC</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[13px] text-white/90">
                      You owe · {groupBalances.owedCount}{' '}
                      {groupBalances.owedCount === 1 ? 'bill' : 'bills'}
                    </p>
                    <p className="font-num text-[24px] font-semibold mt-0.5">
                      {groupBalances.owedAmount.toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="rounded-[14px] p-4 bg-[#33C773] border border-[#86EFAC]/45 shadow-balance-green">
                    <p className="text-[13px] text-white/90">
                      You are owed · {groupBalances.receivableCount}{' '}
                      {groupBalances.receivableCount === 1 ? 'bill' : 'bills'}
                    </p>
                    <p className="font-num text-[24px] font-semibold mt-0.5">
                      {groupBalances.receivableAmount.toFixed(2)} USDC
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* BILL CARD STATES SHOWCASE (Matches 6 · Bill card states) */}
            {groupMode === 'pay-states' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[#1C1917]">
                    Bill card payment states
                  </h2>
                  <button
                    type="button"
                    onClick={() => onGroupModeChange('default')}
                    className="text-[13px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                  >
                    Back to live bills
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Default, you owe */}
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#57534E]">1 · Default, you owe</p>
                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[#1C1917]">
                            Dinner at Olive & Co
                          </h3>
                          <p className="text-[13px] text-[#57534E]">
                            Your share 25.00 USDC · 2 of 4 paid
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[12px] font-medium">
                          You owe 25.00
                        </span>
                      </div>
                      <SegmentedProgress paid={2} total={4} />
                      <button
                        type="button"
                        onClick={() => setPayingBill(groupBills[0] ?? bills[0])}
                        className="w-full h-11 rounded-[10px] bg-[#15803D] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                      >
                        Pay 25.00 USDC
                      </button>
                    </div>
                  </div>

                  {/* 2. Confirming */}
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#57534E]">
                      2 · Confirming (a few seconds)
                    </p>
                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[#1C1917]">
                            Dinner at Olive & Co
                          </h3>
                          <p className="text-[13px] text-[#57534E]">
                            Your share 25.00 USDC · 2 of 4 paid
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[12px] font-medium">
                          Confirming
                        </span>
                      </div>
                      <SegmentedProgress paid={2} total={4} />
                      <button
                        type="button"
                        disabled
                        className="w-full h-11 rounded-[10px] bg-[#E7E5E4] text-[#78716C] text-[15px] font-semibold cursor-not-allowed"
                      >
                        Confirming payment…
                      </button>
                    </div>
                  </div>

                  {/* 3. Failed */}
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#57534E]">
                      3 · Failed (only the payer sees this)
                    </p>
                    <div className="rounded-[12px] bg-white/95 border border-[#FECACA] shadow-glass-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[#1C1917]">
                            Dinner at Olive & Co
                          </h3>
                          <p className="text-[13px] text-[#57534E]">
                            Your share 25.00 USDC · 2 of 4 paid
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[12px] font-medium">
                          Payment failed
                        </span>
                      </div>
                      <SegmentedProgress paid={2} total={4} />
                      <div className="flex items-center gap-2 text-[13px] text-[#B91C1C] font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Nothing was sent. Your USDC is still in your wallet.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPayingBill(groupBills[0] ?? bills[0])}
                        className="w-full h-11 rounded-[10px] bg-[#15803D] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  </div>

                  {/* 4. Paid */}
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-[#57534E]">4 · Paid</p>
                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-[16px] font-semibold text-[#1C1917]">
                            Dinner at Olive & Co
                          </h3>
                          <p className="text-[13px] text-[#57534E]">
                            Your share 25.00 USDC · 3 of 4 paid
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[12px] font-medium">
                          You paid
                        </span>
                      </div>
                      <SegmentedProgress paid={3} total={4} />
                      <p className="text-[13px] font-medium text-[#15803D] pt-1">
                        You paid 25.00 USDC · 2h ago
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* LIVE GROUP DASHBOARD COLUMNS / TABS */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* BILLS COLUMN */}
                <div
                  className={`lg:col-span-7 space-y-3 ${
                    mobileGroupTab !== 'bills' ? 'hidden md:block' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-[#1C1917]">Bills</h2>
                    <span className="font-num text-[13px] text-[#57534E]">
                      {groupMode === 'first-use'
                        ? '0 bills'
                        : `${groupBills.length} ${groupBills.length === 1 ? 'bill' : 'bills'}`}
                    </span>
                  </div>

                  {groupMode === 'first-use' || groupBills.length === 0 ? (
                    <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-8 text-center space-y-4">
                      <EmptyBillIllustration className="w-28 h-24 mx-auto" />
                      <p className="text-[15px] text-[#57534E] max-w-xs mx-auto">
                        Nothing to split yet. Invite the others, then create the first bill.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="px-5 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold shadow-btn-primary cursor-pointer"
                      >
                        Invite people
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupBills.map((bill) => {
                        const isConfirming = Boolean(confirmingIds[bill.id]);
                        const isFailed = failedPayId === bill.id;
                        const effectiveBillStatus =
                          groupMode === 'all-settled'
                            ? 'settled'
                            : isConfirming
                              ? 'confirming'
                              : isFailed
                                ? 'failed'
                                : bill.status;
                        const effectivePaidCount =
                          groupMode === 'all-settled' ? bill.totalMembers : bill.paidCount;

                        return (
                          <div
                            key={bill.id}
                            onClick={() => handleOpenBillDetails(bill)}
                            className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-3 cursor-pointer hover:border-[#15803D]/35 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-[16px] font-semibold text-[#1C1917] leading-6">
                                  {bill.title}
                                </h3>
                                <p className="text-[14px] text-[#57534E] leading-5">
                                  {bill.paidById === 'sam'
                                    ? `Paid by you · ${bill.yourShare.toFixed(2)} USDC each`
                                    : `Your share ${bill.yourShare.toFixed(2)} USDC`}{' '}
                                  · {effectivePaidCount} of {bill.totalMembers} paid
                                </p>
                              </div>

                              {effectiveBillStatus === 'you-owe' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
                                  You owe {bill.yourShare.toFixed(2)}
                                </span>
                              )}
                              {effectiveBillStatus === 'confirming' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
                                  Confirming
                                </span>
                              )}
                              {effectiveBillStatus === 'failed' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[13px] font-medium whitespace-nowrap">
                                  Payment failed
                                </span>
                              )}
                              {effectiveBillStatus === 'paid' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[13px] font-medium whitespace-nowrap">
                                  You paid
                                </span>
                              )}
                              {effectiveBillStatus === 'waiting' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
                                  Waiting on {bill.waitingOnName ?? 'Mia'}
                                </span>
                              )}
                              {effectiveBillStatus === 'settled' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#166534] text-[13px] font-medium whitespace-nowrap">
                                  Settled
                                </span>
                              )}
                              {effectiveBillStatus === 'cancelled' && (
                                <span className="shrink-0 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] text-[13px] font-medium whitespace-nowrap">
                                  Cancelled
                                </span>
                              )}
                            </div>

                            <SegmentedProgress
                              paid={effectivePaidCount}
                              total={bill.totalMembers}
                            />

                            {effectiveBillStatus === 'you-owe' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPayingBill(bill);
                                }}
                                className="w-full h-11 rounded-[10px] bg-[#15803D] hover:bg-[#166534] text-white text-[15px] font-semibold shadow-btn-primary transition-colors cursor-pointer"
                              >
                                Pay {bill.yourShare.toFixed(2)} USDC
                              </button>
                            )}

                            {effectiveBillStatus === 'confirming' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWalletStepOverride('already-paid');
                                  setPayingBill(bill);
                                }}
                                className="w-full h-11 rounded-[10px] bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#57534E] text-[15px] font-semibold transition-colors cursor-pointer"
                              >
                                Confirming payment…
                              </button>
                            )}

                            {effectiveBillStatus === 'failed' && (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2 text-[13px] text-[#B91C1C] font-medium">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>
                                    Nothing was sent. Your USDC is still in your wallet.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPayingBill(bill);
                                  }}
                                  className="w-full h-11 rounded-[10px] bg-[#15803D] text-white text-[15px] font-semibold shadow-btn-primary cursor-pointer"
                                >
                                  Try again
                                </button>
                              </div>
                            )}

                            {effectiveBillStatus === 'paid' && (
                              <p className="text-[13px] font-medium text-[#15803D]">
                                You paid {bill.yourShare.toFixed(2)} USDC · Just now
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* MEMBERS & ACTIVITY RIGHT COLUMN */}
                <div className="lg:col-span-5 space-y-6">
                  {/* MEMBERS */}
                  <div
                    className={`space-y-3 ${
                      mobileGroupTab !== 'members' ? 'hidden md:block' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[16px] font-semibold text-[#1C1917]">Members</h2>
                        <span className="text-[14px] text-[#57534E]">
                          {(activeGroup?.members || []).length} people
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#E7E5E4] hover:bg-[#D6D3D1] text-[#1C1917] text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Invite people</span>
                      </button>
                    </div>

                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-3.5">
                      {(activeGroup?.members || []).map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarBadge
                              initial={m.initial}
                              bg={m.avatarBg}
                              text={m.avatarText}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-[15px] font-semibold text-[#1C1917] leading-5 truncate">
                                {m.name}
                              </p>
                              <p className="text-[13px] text-[#57534E] leading-4 truncate">
                                {groupMode === 'all-settled' && !m.isYou && !m.invited
                                  ? 'All settled'
                                  : m.balanceNote}
                              </p>
                            </div>
                          </div>
                          {m.invited ? (
                            <button
                              type="button"
                              onClick={handleCopyChrisLink}
                              className="px-3 py-1.5 rounded-full bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[12px] font-semibold shrink-0 cursor-pointer"
                            >
                              {copiedChris ? 'Copied' : 'Copy link'}
                            </button>
                          ) : (
                            <span className="font-num text-[12px] text-[#78716C] shrink-0">
                              {m.walletAddress}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTIVITY (Grouped by Today, Yesterday, Earlier) */}
                  <div
                    className={`space-y-3 ${
                      mobileGroupTab !== 'activity' ? 'hidden md:block' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-[16px] font-semibold text-[#1C1917]">Activity</h2>
                      <button
                        type="button"
                        onClick={() => onScreenChange('history')}
                        className="text-[14px] font-semibold text-[#15803D] hover:underline cursor-pointer"
                      >
                        See all
                      </button>
                    </div>

                    <div className="rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-4 space-y-4">
                      {groupedActivity.length === 0 ? (
                        <p className="text-[14px] text-[#57534E]">No activity in this group yet.</p>
                      ) : (
                        groupedActivity.map((section) => (
                          <div key={section.label} className="space-y-2.5">
                            <p className="text-[12px] font-semibold text-[#78716C]">
                              {section.label}
                            </p>
                            <div className="space-y-3">
                              {section.items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3">
                                  <AvatarBadge
                                    initial={item.actorInitial}
                                    bg={item.avatarBg}
                                    text={item.avatarText}
                                    size="md"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[15px] font-semibold text-[#1C1917] leading-5">
                                      {item.title}
                                    </p>
                                    <p className="text-[13px] text-[#57534E] leading-4">
                                      {item.subtitle}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== CREATE SHARED BILL WIZARD ==================== */}
        {screen === 'create-bill' && (
          <CreateBillWizard
            user={user}
            groups={groups}
            initialGroupId={activeGroup?.id ?? groups[0]?.id ?? 'housemates'}
            initialStep={createBillStep}
            preset={createBillPreset}
            onCancel={() => {
              onClearPresets();
              onScreenChange('group-detail');
            }}
            onConnectWallet={() => onConnectWallet()}
            onSubmitBill={(params) => {
              onCreateBill(params);
              onClearPresets();
              onSelectGroupId(params.groupId);
              onScreenChange('group-detail');
            }}
          />
        )}

        {/* ==================== BILL DETAILS PAGE ==================== */}
        {screen === 'bill-details' && activeBill && (
          <BillDetailsPage
            bill={activeBill}
            groupName={
              groups.find((g) => g.id === activeBill.groupId)?.name ??
              activeGroup?.name ??
              'Housemates'
            }
            preset={billDetailPreset}
            onBack={() => {
              onClearPresets();
              onScreenChange('group-detail');
            }}
            onPayBill={(billId) => {
              const target = bills.find((b) => b.id === billId) ?? activeBill;
              setPayingBill(target);
            }}
            onCancelBill={(billId) => {
              onCancelBill(billId);
              onClearPresets();
              onScreenChange('bill-details');
            }}
            onEditBill={(targetBill) => {
              onSelectBillId(targetBill.id);
              onClearPresets();
              onScreenChange('edit-bill');
            }}
          />
        )}

        {/* ==================== EDIT BILL SCREEN ==================== */}
        {screen === 'edit-bill' && activeBill && (
          <EditBillPage
            bill={activeBill}
            groups={groups}
            preset={editBillPreset}
            onCancel={() => {
              onClearPresets();
              onScreenChange('bill-details');
            }}
            onSave={(params) => {
              onEditBillSave?.(params);
              onClearPresets();
              onScreenChange('bill-details');
            }}
          />
        )}

        {/* ==================== CREATE GROUP SCREEN ==================== */}
        {screen === 'create-group' && (
          <CreateGroupScreen
            user={user}
            onCancel={() => onScreenChange('groups')}
            onCreate={(params) => {
              const newGrp = onCreateGroup(params);
              setCreatedGroup(newGrp);
              onSelectGroupId(newGrp.id);
              onScreenChange('group-created');
            }}
          />
        )}

        {/* ==================== GROUP CREATED SCREEN ==================== */}
        {screen === 'group-created' && (
          <GroupCreatedScreen
            group={createdGroup ?? activeGroup}
            onOpenGroup={() => {
              const target = createdGroup ?? activeGroup;
              if (target?.id) onSelectGroupId(target.id);
              onScreenChange('group-detail');
            }}
            onBackToGroups={() => onScreenChange('groups')}
          />
        )}

        {/* ==================== GROUP SETTINGS SCREEN ==================== */}
        {screen === 'group-settings' && activeGroup && (
          <GroupSettingsPage
            group={activeGroup}
            preset={groupSettingsPreset}
            onBack={() => {
              onClearPresets();
              onScreenChange('group-detail');
            }}
            onSaveGroupName={(gId, newName) => onSaveGroupName?.(gId, newName)}
            onRemoveMember={(gId, mId) => onRemoveMember?.(gId, mId)}
            onRevokeInviteLink={(gId) =>
              onRevokeInviteLink ? onRevokeInviteLink(gId) : 'raba.pay/join/new9x2'
            }
            onPayOwedBill={() => {
              const target =
                bills.find((b) => b.groupId === activeGroup?.id && b.status === 'you-owe') ??
                bills[0];
              if (target) {
                setPayingBill(target);
              }
            }}
          />
        )}

        {/* Fallback for group screens when no active group exists */}
        {(screen === 'group-detail' || screen === 'group-settings') && !activeGroup && (
          <div className="rounded-[16px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card p-8 text-center space-y-4 max-w-[540px] mx-auto my-8">
            <h2 className="text-[19px] font-semibold text-[#1C1917]">No active group selected</h2>
            <p className="text-[14px] text-[#57534E]">
              {groups.length === 0
                ? 'You do not have any groups yet. Create one or join with an invite link.'
                : 'Select a group from your groups list.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {groups.length > 0 && (
                <button
                  type="button"
                  onClick={() => onScreenChange('groups')}
                  className="px-5 h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] font-semibold text-[14px] transition-colors cursor-pointer"
                >
                  All Groups
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreateGroup}
                className="px-5 h-11 rounded-[12px] bg-[#15803D] hover:bg-[#166534] text-white font-semibold text-[14px] shadow-btn-primary transition-colors cursor-pointer"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
        {/* ==================== HISTORY SCREEN ==================== */}
        {screen === 'history' && (
          <HistoryView
            payments={payments}
            preset={historyPreset}
            onResetPreset={onClearPresets}
          />
        )}

        {/* ==================== ACCOUNT SCREEN ==================== */}
        {screen === 'account' && (
          <AccountPage
            user={user}
            preset={accountPreset}
            onBack={() => {
              onClearPresets();
              onScreenChange('home');
            }}
            onResetPreset={onClearPresets}
            onUpdateName={(newName) => onUpdateName?.(newName)}
            onChangePassword={() => onChangePassword?.()}
            onChangeWallet={() => {
              setWalletStepOverride('connect');
              setPayingBill(bills[0] ?? null);
            }}
            onDisconnectWallet={() => onDisconnectWallet?.()}
            onLogOut={onLogOut}
          />
        )}

        {/* ==================== NOTIFICATIONS SCREEN ==================== */}
        {screen === 'notifications' && (
          <NotificationsPage
            notifications={notifications}
            preset={notificationsPreset}
            onBack={() => {
              onClearPresets();
              onScreenChange('home');
            }}
            onMarkAllRead={() => onMarkAllNotificationsRead?.()}
            onSelectNotification={(item) => {
              onMarkNotificationRead?.(item.id);
              onClearPresets();
              if (item.targetBillId) {
                onSelectBillId(item.targetBillId);
                if (item.targetGroupId) onSelectGroupId(item.targetGroupId);
                onScreenChange('bill-details');
              } else if (item.targetGroupId) {
                onSelectGroupId(item.targetGroupId);
                onScreenChange('group-detail');
              }
            }}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      {screen !== 'create-bill' &&
        screen !== 'bill-details' &&
        screen !== 'edit-bill' &&
        screen !== 'create-group' &&
        screen !== 'group-created' &&
        screen !== 'group-settings' &&
        screen !== 'account' &&
        screen !== 'notifications' && (
          <nav
            className="md:hidden fixed bottom-3 left-4 right-4 z-30 bg-white/95 backdrop-blur-md border border-black/[0.06] rounded-[20px] p-1.5 flex items-center gap-1 shadow-bottom-nav"
            aria-label="Mobile navigation"
          >
            {screen === 'group-detail'
              ? [
                  { id: 'bills' as const, label: 'Bills', Icon: FileText },
                  { id: 'members' as const, label: 'Members', Icon: Users },
                  { id: 'activity' as const, label: 'Activity', Icon: Clock },
                ].map(({ id, label, Icon }) => {
                  const active = mobileGroupTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onMobileGroupTabChange(id)}
                      className={`flex-1 flex flex-col items-center justify-center py-2 rounded-[14px] transition-colors cursor-pointer ${
                        active ? 'bg-[#DDF3E4] text-[#14532D]' : 'text-[#57534E]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[12px] font-semibold mt-0.5">{label}</span>
                    </button>
                  );
                })
              : [
                  { id: 'home' as const, label: 'Home', Icon: Home },
                  { id: 'groups' as const, label: 'Groups', Icon: Users },
                  { id: 'history' as const, label: 'History', Icon: Clock },
                ].map(({ id, label, Icon }) => {
                  const active = screen === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onClearPresets();
                        onScreenChange(id);
                      }}
                      className={`flex-1 flex flex-col items-center justify-center py-2 rounded-[14px] transition-colors cursor-pointer ${
                        active ? 'bg-[#DDF3E4] text-[#14532D]' : 'text-[#57534E]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[12px] font-semibold mt-0.5">{label}</span>
                    </button>
                  );
                })}
          </nav>
        )}

      {/* WALLET PAYMENT & PROGRESS FLOW MODAL */}
      <WalletPaymentFlow
        open={Boolean(payingBill) || walletPayOpen}
        bill={payingBill ?? activeBill ?? bills[0] ?? null}
        groupName={
          groups.find((g) => g.id === (payingBill ?? activeBill)?.groupId)?.name ??
          activeGroup?.name ??
          'Housemates'
        }
        user={user}
        initialStep={
          walletPayOpen
            ? walletPayStepPreset
            : walletStepOverride ?? (walletConnectedEffective ? 'confirm' : 'connect')
        }
        isCatalogPreset={walletPayOpen && isWalletCatalogPreset}
        onClose={() => {
          if (payingBill) {
            setConfirmingIds((prev) => {
              const next = { ...prev };
              delete next[payingBill.id];
              return next;
            });
          }
          setPayingBill(null);
          setWalletStepOverride(null);
          onCloseWalletPay?.();
        }}
        onConnectWallet={onConnectWallet}
        onTopUpTestnet={onTopUpTestnet}
        onCompletePayment={(billId, txDetails) => {
          setFailedPayId(null);
          setConfirmingIds((prev) => {
            const next = { ...prev };
            delete next[billId];
            return next;
          });
          return onPayBill(billId, txDetails);
        }}
        onPaymentFailed={(billId) => {
          setFailedPayId(billId);
          setConfirmingIds((prev) => {
            const next = { ...prev };
            delete next[billId];
            return next;
          });
        }}
        onMarkSlowConfirming={(billId) => {
          setConfirmingIds((prev) => ({ ...prev, [billId]: true }));
        }}
      />

      {/* MODAL: INVITE PEOPLE */}
      <AnimatePresence>
        {showInviteModal && activeGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-t-[24px] sm:rounded-[20px] bg-white p-6 shadow-card-soft space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[20px] font-semibold text-[#1C1917]">
                  Invite to {activeGroup.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 rounded-lg text-[#57534E] hover:bg-black/5 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[14px] text-[#57534E]">
                Share this link or add multiple participants by their Stellar address below.
              </p>

              <div className="flex items-center gap-2 p-2.5 rounded-[12px] bg-[#FAFAF9] border border-black/[0.08]">
                <span
                  className="font-num text-[13px] text-[#57534E] truncate flex-1 px-1 select-all cursor-pointer"
                  title={buildInviteLink(activeGroup?.inviteCode)}
                  onClick={handleCopyInvite}
                >
                  {buildInviteLink(activeGroup?.inviteCode)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#15803D] text-white text-[13px] font-semibold whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? 'Copied' : 'Copy link'}</span>
                </button>
              </div>

              {onInviteMember && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const rowsToSubmit = inviteRows.filter((r) => r.address.trim().length > 0);
                    if (rowsToSubmit.length === 0) {
                      setInviteNotice('Please enter at least one participant Stellar address.');
                      return;
                    }
                    const invalidRow = rowsToSubmit.find(
                      (r) => !r.address.trim().startsWith('G') || r.address.trim().length !== 56
                    );
                    if (invalidRow) {
                      setInviteNotice(
                        'Compulsory address must be a valid 56-character Stellar public key (starting with G).'
                      );
                      return;
                    }
                    setIsSubmittingInvites(true);
                    setInviteNotice('');
                    try {
                      await onInviteMember({
                        groupId: activeGroup.id,
                        participants: rowsToSubmit.map((r) => ({
                          address: r.address.trim(),
                          name: r.name.trim() || undefined,
                        })),
                      });
                      setInviteRows([{ id: `row-${Date.now()}`, address: '', name: '' }]);
                      setInviteNotice(
                        `Successfully added ${rowsToSubmit.length} participant${
                          rowsToSubmit.length === 1 ? '' : 's'
                        } to ${activeGroup.name}!`
                      );
                      setTimeout(() => setInviteNotice(''), 3000);
                    } catch (err: unknown) {
                      const apiErr = err as { payload?: { detail?: string }; message?: string };
                      setInviteNotice(
                        apiErr?.payload?.detail ||
                          apiErr?.message ||
                          'Failed to add participants. Please check addresses.'
                      );
                    } finally {
                      setIsSubmittingInvites(false);
                    }
                  }}
                  className="space-y-4 pt-3 border-t border-black/[0.06]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-[#1C1917]">
                        Add participants collection
                      </p>
                      <p className="text-[12px] text-[#78716C]">
                        Only <span className="font-semibold text-[#15803D]">Stellar address is compulsory</span>. Name is optional.
                      </p>
                    </div>
                    <span className="text-[12px] font-medium text-[#15803D] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      {inviteRows.filter((r) => r.address.trim().length > 0).length} staged
                    </span>
                  </div>

                  {/* List of participant rows */}
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {inviteRows.map((row, idx) => {
                      const isValidAddr =
                        row.address.trim().startsWith('G') && row.address.trim().length === 56;
                      return (
                        <div
                          key={row.id}
                          className="p-3 rounded-[12px] bg-[#FAFAF9] border border-black/[0.08] space-y-2 text-left"
                        >
                          <div className="flex items-center justify-between text-[12px] font-medium text-[#57534E]">
                            <span>Participant #{idx + 1}</span>
                            {inviteRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setInviteRows((prev) => prev.filter((r) => r.id !== row.id))
                                }
                                className="text-[#DC2626] hover:text-[#B91C1C] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-8 relative">
                              <input
                                type="text"
                                value={row.address}
                                onChange={(e) => {
                                  const val = e.target.value.trim();
                                  setInviteRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, address: val } : r))
                                  );
                                }}
                                placeholder="Stellar address G... (Compulsory)"
                                className={`w-full h-9.5 px-3 rounded-[8px] bg-white border text-[13px] text-[#1C1917] font-num focus:outline-none ${
                                  row.address.length > 0 && !isValidAddr
                                    ? 'border-[#EF4444] focus:border-[#EF4444]'
                                    : 'border-black/15 focus:border-[#15803D]'
                                }`}
                              />
                              {isValidAddr && (
                                <span className="absolute right-2.5 top-2.5 text-[#15803D]">
                                  <Check className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInviteRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, name: val } : r))
                                  );
                                }}
                                placeholder="Name (optional)"
                                className="w-full h-9.5 px-3 rounded-[8px] bg-white border border-black/15 text-[13px] text-[#1C1917] focus:outline-none focus:border-[#15803D]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setInviteRows((prev) => [
                        ...prev,
                        { id: `row-${Date.now()}-${prev.length}`, address: '', name: '' },
                      ])
                    }
                    className="w-full py-2 rounded-[10px] border border-dashed border-[#15803D]/40 text-[#15803D] hover:bg-[#F0FDF4] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add another participant</span>
                  </button>

                  {inviteNotice && (
                    <p
                      className={`text-[13px] font-medium ${
                        inviteNotice.includes('Successfully')
                          ? 'text-[#15803D]'
                          : 'text-[#DC2626]'
                      }`}
                    >
                      {inviteNotice}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingInvites}
                    className="w-full h-11 rounded-[10px] bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-[15px] font-semibold cursor-pointer shadow-btn-primary transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmittingInvites && <span className="animate-spin">⏳</span>}
                    <span>
                      Add{' '}
                      {inviteRows.filter((r) => r.address.trim().length > 0).length > 0
                        ? `${inviteRows.filter((r) => r.address.trim().length > 0).length} `
                        : ''}
                      Participant(s)
                    </span>
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  onOpenInvite();
                }}
                className="w-full h-11 rounded-[12px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#1C1917] text-[15px] font-semibold transition-colors cursor-pointer"
              >
                Preview invite link experience
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ==================== MOBILE PROFILE POPUP ==================== */}
        {mobileProfilePopupOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileProfilePopupOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Popup Sheet */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative z-10 w-full max-w-md bg-white text-[#1C1917] rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Sheet Header with Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarBadge
                    initial={(user.name?.[0] || 'S').toUpperCase()}
                    bg="#166534"
                    text="#FFFFFF"
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-[16px] font-bold text-[#1C1917] truncate leading-tight">
                      {user.name || 'Your Account'}
                    </p>
                    <p className="text-[13px] text-[#57534E] truncate">
                      {user.email || 'Stellar Testnet Account'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileProfilePopupOpen(false)}
                  className="p-2 rounded-full hover:bg-black/5 text-[#78716C] hover:text-[#1C1917] transition-colors cursor-pointer"
                  aria-label="Close profile menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wallet Section */}
              <div className="rounded-[16px] bg-[#F7FDF9] border border-[#0F4024]/10 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-[#15803D]" />
                    <span>Stellar Wallet</span>
                  </span>
                  {walletConnectedEffective ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#14532D] border border-[#86EFAC] text-[11px] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#F5F5F4] text-[#78716C] text-[11px] font-medium">
                      Not connected
                    </span>
                  )}
                </div>

                {walletConnectedEffective && (user.walletAddress || user.fullWalletAddress) ? (
                  <div className="space-y-3">
                    {/* Wallet address & Explorer */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-[10px] bg-white border border-black/[0.06]">
                      <span className="font-num text-[13px] text-[#1C1917] font-medium truncate">
                        {formatShortAddress(user.fullWalletAddress || user.walletAddress)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyAddress(user.fullWalletAddress || user.walletAddress)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[12px] font-medium text-[#1C1917] transition-colors cursor-pointer"
                        >
                          {copiedAddress ? (
                            <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                        </button>
                        {user.fullWalletAddress && (
                          <a
                            href={`https://stellar.expert/explorer/testnet/account/${user.fullWalletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-[6px] bg-[#F5F5F4] hover:bg-[#E7E5E4] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                            title="View on Stellar Expert"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Balance display */}
                    <div className="p-3 rounded-[12px] bg-white border border-[#0F4024]/10 shadow-xs space-y-1">
                      <p className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
                        Wallet Balance
                      </p>
                      <div className="flex items-baseline justify-between">
                        <p className="font-num text-[22px] font-bold text-[#14532D]">
                          {(user.onchainUsdcBalance !== undefined && user.onchainUsdcBalance !== null
                            ? user.onchainUsdcBalance
                            : (user.usdcBalance ?? 0)
                          ).toFixed(2)}{' '}
                          <span className="text-[13px] font-semibold text-[#15803D]">USDC</span>
                        </p>
                        {typeof user.nativeXlmBalance === 'number' && user.nativeXlmBalance > 0 && (
                          <p className="font-num text-[12px] text-[#78716C]">
                            {user.nativeXlmBalance.toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 2,
                            })}{' '}
                            XLM
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Faucet Top Up button */}
                    <button
                      type="button"
                      onClick={() => {
                        onTopUpTestnet?.();
                        setMobileProfilePopupOpen(false);
                      }}
                      className="w-full py-2.5 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16] text-[13px] font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Top Up 100 Testnet USDC (Faucet)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[13px] text-[#57534E]">
                      Connect your non-custodial Stellar wallet (Freighter, Albedo, xBull, etc.) to approve settlements.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileProfilePopupOpen(false);
                        onConnectWallet();
                      }}
                      className="w-full py-2.5 rounded-[10px] bg-[#15803D] hover:bg-[#166534] text-white text-[14px] font-semibold shadow-btn-primary flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Connect Wallet</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation Options */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileProfilePopupOpen(false);
                    onClearPresets();
                    onScreenChange('notifications');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-[12px] hover:bg-[#F5F5F4] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#15803D]">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1C1917]">Notifications</p>
                      <p className="text-[12px] text-[#78716C]">Payment and group updates</p>
                    </div>
                  </div>
                  {unreadNotificationsCount > 0 ? (
                    <span className="font-num px-2.5 py-0.5 rounded-full bg-[#15803D] text-white text-[11px] font-semibold">
                      {unreadNotificationsCount} new
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[#78716C]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileProfilePopupOpen(false);
                    onClearPresets();
                    onScreenChange('account');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-[12px] hover:bg-[#F5F5F4] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#F5F5F4] border border-black/[0.06] flex items-center justify-center text-[#57534E]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#1C1917]">Account Settings</p>
                      <p className="text-[12px] text-[#78716C]">Personal profile & security</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#78716C]" />
                </button>
              </div>

              {/* Log Out */}
              <div className="pt-2 border-t border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileProfilePopupOpen(false);
                    onLogOut();
                  }}
                  className="w-full py-2.5 rounded-[12px] hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
