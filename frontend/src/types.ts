export type AppView =
  | 'landing'
  | 'invite'
  | 'auth'
  | 'account-created'
  | 'dashboard'
  | 'global-state';

export type GlobalStateVariant =
  | 'network-error'
  | 'session-expired'
  | 'not-found'
  | 'no-access';

export type InviteVariant =
  | 'locked'
  | 'signed-in'
  | 'share-updated'
  | 'already-member'
  | 'settled'
  | 'expired'
  | 'invalid';

export type AuthMode =
  | 'login'
  | 'signup'
  | 'check-email'
  | 'forgot-password'
  | 'reset-link-sent'
  | 'set-new-password';

export type AuthErrorType =
  | null
  | 'wrong-password'
  | 'no-account'
  | 'password-short'
  | 'email-not-verified'
  | 'invalid-email'
  | 'missing-name';

export type DashboardScreen =
  | 'home'
  | 'groups'
  | 'group-detail'
  | 'create-bill'
  | 'bill-details'
  | 'edit-bill'
  | 'create-group'
  | 'group-created'
  | 'group-settings'
  | 'history'
  | 'account'
  | 'notifications';

export type GroupMobileTab = 'bills' | 'members' | 'activity';

export type HomeStateMode = 'default' | 'no-wallet' | 'first-use';
export type GroupsListMode = 'default' | 'many';
export type GroupStateMode = 'default' | 'first-use' | 'all-settled' | 'pay-states';

export type CreateBillStep = 'details' | 'people' | 'split';
export type CreateBillPreset =
  | null
  | 'missing-amount'
  | 'no-wallet'
  | 'nobody-selected'
  | 'split-equal'
  | 'split-uneven'
  | 'split-custom'
  | 'split-custom-error';

export type BillDetailPreset =
  | 'live'
  | 'you-owe'
  | 'confirming'
  | 'you-paid'
  | 'being-paid'
  | 'settled'
  | 'edited'
  | 'cancel-confirm'
  | 'cancel-blocked'
  | 'cancelled';

export type EditBillPreset = 'unlocked' | 'locked-paid';

export type WalletPayStep =
  | 'connect'
  | 'confirm'
  | 'waiting'
  | 'insufficient'
  | 'sending'
  | 'slow'
  | 'paid'
  | 'failed'
  | 'timeout'
  | 'network-trouble'
  | 'already-paid';

export type HistoryPreset =
  | 'default'
  | 'pending'
  | 'first-use'
  | 'filtered-empty'
  | 'error'
  | 'tx-detail';

export type GroupSettingsPreset =
  | 'default'
  | 'remove-confirm'
  | 'remove-blocked'
  | 'leave-blocked'
  | 'revoke-link';

export type AccountPreset = 'default' | 'disconnect-confirm' | 'logout-confirm';

export type NotificationsPreset = 'default' | 'empty';

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  unread: boolean;
  targetGroupId?: string;
  targetBillId?: string;
}

export interface Member {
  id: string;
  name: string;
  initial: string;
  isYou?: boolean;
  invited?: boolean;
  avatarBg: string;
  avatarText: string;
  balanceNote: string;
  walletAddress: string;
}

export interface BillParticipant {
  memberId: string;
  name: string;
  initial: string;
  avatarBg: string;
  avatarText: string;
  share: number;
  isPayer?: boolean;
  isYou?: boolean;
  status: 'payer' | 'paid' | 'confirming' | 'unpaid';
  paidAtLabel?: string;
  txHash?: string;
}

export interface Bill {
  id: string;
  groupId: string;
  title: string;
  paidById: string;
  paidByLabel: string;
  paidToWallet?: string;
  totalAmount: number;
  yourShare: number;
  paidCount: number;
  totalMembers: number;
  status: 'you-owe' | 'confirming' | 'failed' | 'paid' | 'waiting' | 'settled' | 'cancelled';
  waitingOnName?: string;
  userPaid: boolean;
  createdAt: string;
  splitType?: 'equal' | 'custom';
  participants?: BillParticipant[];
  editedNotice?: {
    editorName: string;
    fromShare: number;
    toShare: number;
  };
}

export interface ActivityItem {
  id: string;
  groupId: string;
  actorInitial: string;
  avatarBg: string;
  avatarText: string;
  title: string;
  subtitle: string;
  timestamp: string;
  dayGroup?: 'Today' | 'Yesterday' | 'Earlier';
  txHash?: string;
}

export interface RecentPaymentItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  direction: 'in' | 'out';
  txHash?: string;
  counterpartyName?: string;
  counterpartyInitial?: string;
  avatarBg?: string;
  avatarText?: string;
  groupName?: string;
  billTitle?: string;
  dayGroup?: 'Today' | 'Earlier';
  dateLabel?: string;
  status?: 'confirmed' | 'pending' | 'failed';
  feeLabel?: string;
  toWallet?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  category?: string;
  location?: string;
  icon?: string;
  coverColor?: string;
  members: Member[];
  statusSummary?: string;
  inviteCode?: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  category?: string;
  location?: string;
  icon?: string;
  coverColor?: string;
  firstMember?: string;
  first_member?: string;
  inviteCode?: string;
  invite_code?: string;
}

export interface UserSession {
  id?: number;
  username?: string;
  name: string;
  email: string;
  walletConnected: boolean;
  walletAddress: string;
  fullWalletAddress?: string;
  walletProvider?: string;
  usdcBalance?: number;
  nativeXlmBalance?: number;
  onchainUsdcBalance?: number;
  verified: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface WorkspacePayload {
  user: UserSession;
  groups: Group[];
  bills: Bill[];
  activity: ActivityItem[];
  payments: RecentPaymentItem[];
  notifications: NotificationItem[];
  faqItems: FaqItem[];
  withoutRabaPoints: string[];
  withRabaPoints: string[];
  smartContract?: Record<string, unknown>;
  isAuthenticated?: boolean;
}

export interface PageCatalogItem {
  id: string;
  section: string;
  title: string;
  shortTitle: string;
}

