import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AccountCreatedPage } from './components/AccountCreatedPage';
import { AuthPage } from './components/AuthPage';
import { DashboardPage } from './components/DashboardPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalStatePage } from './components/GlobalStatePage';
import { InvitePage } from './components/InvitePage';
import { LandingPage } from './components/LandingPage';
import { clearAuthTokens, getAccessToken, rabaApi } from './services/api';
import { connectWithStellarWalletsKit, queryLiveStellarBalances } from './services/stellarWalletKit';
import { clearInviteFromUrl } from './utils/inviteLink';
import {
  AccountPreset,
  ActivityItem,
  AppView,
  AuthMode,
  Bill,
  BillDetailPreset,
  BillParticipant,
  CreateBillPreset,
  CreateBillStep,
  CreateGroupInput,
  DashboardScreen,
  EditBillPreset,
  FaqItem,
  GlobalStateVariant,
  Group,
  GroupMobileTab,
  GroupSettingsPreset,
  GroupStateMode,
  GroupsListMode,
  HistoryPreset,
  HomeStateMode,
  InviteVariant,
  Member,
  NotificationItem,
  NotificationsPreset,
  RecentPaymentItem,
  UserSession,
  WalletPayStep,
  WorkspacePayload,
} from './types';

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    try {
      const saved = sessionStorage.getItem('rabapay_current_view') as AppView | null;
      if (saved && (saved === 'dashboard' || saved === 'account-created' || saved === 'invite') && getAccessToken()) {
        return saved;
      }
    } catch {
      // ignore
    }
    return Boolean(getAccessToken()) ? 'dashboard' : 'landing';
  });
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [fromInvite, setFromInvite] = useState<boolean>(false);
  const [inviteVariant, setInviteVariant] = useState<InviteVariant>('locked');
  const [globalStateVariant] = useState<GlobalStateVariant>('network-error');
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => Boolean(getAccessToken()));

  // Dashboard & Flow state
  const [dashboardScreen, setDashboardScreen] = useState<DashboardScreen>('home');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [mobileGroupTab, setMobileGroupTab] = useState<GroupMobileTab>('bills');
  const [homeMode, setHomeMode] = useState<HomeStateMode>('default');
  const [groupsListMode, setGroupsListMode] = useState<GroupsListMode>('default');
  const [groupMode, setGroupMode] = useState<GroupStateMode>('default');
  const [createBillStep] = useState<CreateBillStep>('details');
  const [createBillPreset, setCreateBillPreset] = useState<CreateBillPreset>(null);
  const [billDetailPreset, setBillDetailPreset] = useState<BillDetailPreset>('live');
  const [editBillPreset, setEditBillPreset] = useState<EditBillPreset>('unlocked');
  const [historyPreset, setHistoryPreset] = useState<HistoryPreset>('default');
  const [groupSettingsPreset, setGroupSettingsPreset] = useState<GroupSettingsPreset>('default');
  const [accountPreset, setAccountPreset] = useState<AccountPreset>('default');
  const [notificationsPreset, setNotificationsPreset] = useState<NotificationsPreset>('default');
  const [passwordResetFromAccount, setPasswordResetFromAccount] = useState<boolean>(false);
  const [walletPayOpen, setWalletPayOpen] = useState<boolean>(false);
  const [walletPayStepPreset] = useState<WalletPayStep>('confirm');
  const [isWalletCatalogPreset, setIsWalletCatalogPreset] = useState<boolean>(false);

  const [user, setUser] = useState<UserSession>({
    name: '',
    email: '',
    walletConnected: false,
    walletAddress: '',
    verified: false,
  });

  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('join') || urlParams.get('invite');
      if (code) return code;
      const pathMatch = window.location.pathname.match(/\/join\/([^/?#]+)/);
      if (pathMatch) return pathMatch[1];
      return sessionStorage.getItem('rabapay_pending_invite');
    } catch {
      return null;
    }
  });

  const [inviteGroupData, setInviteGroupData] = useState<{
    id?: number;
    slug?: string;
    name?: string;
    description?: string;
    category?: string;
    location?: string;
    icon?: string;
    coverColor?: string;
    inviteCode?: string;
    creatorName?: string;
    memberCount?: number;
    isMember?: boolean;
  } | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [payments, setPayments] = useState<RecentPaymentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [withoutRabaPoints, setWithoutRabaPoints] = useState<string[]>([]);
  const [withRabaPoints, setWithRabaPoints] = useState<string[]>([]);

  const applyWorkspace = useCallback((ws: WorkspacePayload) => {
    if (!ws) return;
    if (ws.user) setUser(ws.user);
    if (Array.isArray(ws.groups)) {
      setGroups(ws.groups);
      setSelectedGroupId((prev) =>
        prev && ws.groups.some((g) => g.id === prev) ? prev : (ws.groups[0]?.id ?? '')
      );
    }
    if (Array.isArray(ws.bills)) {
      setBills(ws.bills);
      setSelectedBillId((prev) =>
        prev && ws.bills.some((b) => b.id === prev) ? prev : (ws.bills[0]?.id ?? '')
      );
    }
    if (Array.isArray(ws.activity)) setActivity(ws.activity);
    if (Array.isArray(ws.payments)) setPayments(ws.payments);
    if (Array.isArray(ws.notifications)) setNotifications(ws.notifications);
    if (Array.isArray(ws.faqItems)) setFaqItems(ws.faqItems);
    if (Array.isArray(ws.withoutRabaPoints)) setWithoutRabaPoints(ws.withoutRabaPoints);
    if (Array.isArray(ws.withRabaPoints)) setWithRabaPoints(ws.withRabaPoints);
  }, []);

  useEffect(() => {
    // If pending invite detected in URL or session, fetch group details immediately
    if (pendingInviteCode) {
      try {
        sessionStorage.setItem('rabapay_pending_invite', pendingInviteCode);
      } catch {}
      rabaApi
        .getGroupByInvite(pendingInviteCode)
        .then((data) => {
          setInviteGroupData(data);
          if (data.isMember) {
            setInviteVariant('already-member');
            clearInviteFromUrl();
            setPendingInviteCode(null);
          } else {
            setInviteVariant('locked');
          }
          setView('invite');
        })
        .catch(() => {
          setInviteVariant('invalid');
          setView('invite');
        });
    }

    rabaApi
      .fetchWorkspace()
      .then((ws) => {
        applyWorkspace(ws);
        if (ws.isAuthenticated) {
          setIsSignedIn(true);
          if (pendingInviteCode) {
            // Check if already member after auth known
            rabaApi
              .getGroupByInvite(pendingInviteCode)
              .then((data) => {
                setInviteGroupData(data);
                if (data.isMember) {
                  setInviteVariant('already-member');
                  clearInviteFromUrl();
                  setPendingInviteCode(null);
                } else {
                  setInviteVariant('signed-in');
                }
                setView('invite');
              })
              .catch(() => {});
          }
          const addr = ws.user?.fullWalletAddress || ws.user?.walletAddress;
          if (addr && addr.startsWith('G')) {
            queryLiveStellarBalances(addr)
              .then((live) => {
                if (live.funded) {
                  setUser((prev) => ({
                    ...prev,
                    nativeXlmBalance: live.nativeXlm,
                    onchainUsdcBalance: live.usdc,
                    usdcBalance: live.usdc,
                  }));
                }
              })
              .catch(() => {});
          }
        } else {
          setIsSignedIn(false);
          clearAuthTokens();
          try {
            sessionStorage.removeItem('rabapay_current_view');
          } catch {
            // ignore
          }
          if (!pendingInviteCode && view === 'dashboard') {
            setView('landing');
          }
        }
      })
      .catch(() => {
        setIsSignedIn(false);
        clearAuthTokens();
        try {
          sessionStorage.removeItem('rabapay_current_view');
        } catch {
          // ignore
        }
        if (!pendingInviteCode && view === 'dashboard') {
          setView('landing');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic poll for live on-chain balances when wallet is connected
  useEffect(() => {
    const addr = user.fullWalletAddress || user.walletAddress;
    if (!addr || !addr.startsWith('G')) return;

    const interval = setInterval(() => {
      queryLiveStellarBalances(addr)
        .then((live) => {
          if (live.funded) {
            setUser((prev) => ({
              ...prev,
              nativeXlmBalance: live.nativeXlm,
              onchainUsdcBalance: live.usdc,
              usdcBalance: live.usdc,
            }));
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [user.fullWalletAddress, user.walletAddress]);

  useEffect(() => {
    const isAuthed = isSignedIn || Boolean(getAccessToken());
    if (view === 'dashboard') {
      clearInviteFromUrl();
      setPendingInviteCode(null);
      if (!isAuthed) {
        setView('landing');
      }
    }
  }, [view, isSignedIn]);

  const clearPresets = () => {
    setHomeMode('default');
    setGroupsListMode('default');
    setGroupMode('default');
    setCreateBillPreset(null);
    setBillDetailPreset('live');
    setEditBillPreset('unlocked');
    setHistoryPreset('default');
    setGroupSettingsPreset('default');
    setAccountPreset('default');
    setNotificationsPreset('default');
    setPasswordResetFromAccount(false);
    setWalletPayOpen(false);
    setIsWalletCatalogPreset(false);
  };

  const navigateTo = (nextView: AppView) => {
    const isAuthed = isSignedIn || Boolean(getAccessToken());
    if (nextView === 'dashboard' && !isAuthed) {
      openAuth('login', false);
      return;
    }
    if (nextView === 'dashboard') {
      clearInviteFromUrl();
      setPendingInviteCode(null);
    }
    try {
      sessionStorage.setItem('rabapay_current_view', nextView);
    } catch {
      // ignore
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: AuthMode, inviteContext: boolean) => {
    setAuthMode(mode);
    setFromInvite(inviteContext);
    navigateTo('auth');
  };

  const handleLoginSubmit = async ({ email, password }: { email: string; password: string }) => {
    const res = await rabaApi.login({ email, password });
    setIsSignedIn(true);
    applyWorkspace(res.workspace);
    clearPresets();
    clearInviteFromUrl();
    setPendingInviteCode(null);
    setDashboardScreen('home');
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignupSubmit = async ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const res = await rabaApi.register({ name, email, password });
    setIsSignedIn(true);
    applyWorkspace(res.workspace);
  };

  const handleAuthSuccess = ({
    name,
    email,
    isNewAccount,
  }: {
    name: string;
    email: string;
    isNewAccount: boolean;
  }) => {
    setIsSignedIn(true);
    setUser((prev) => ({
      ...prev,
      name,
      email,
      verified: true,
      walletConnected: !isNewAccount ? prev.walletConnected : false,
    }));

    if (isNewAccount) {
      navigateTo('account-created');
    } else if (pendingInviteCode) {
      rabaApi
        .joinGroupByInvite(pendingInviteCode)
        .then((res) => {
          if (res.workspace) applyWorkspace(res.workspace);
          if (res.group_id) setSelectedGroupId(res.group_id);
          clearInviteFromUrl();
          setPendingInviteCode(null);
          clearPresets();
          setDashboardScreen('group-detail');
          setView('dashboard');
        })
        .catch(() => {
          clearInviteFromUrl();
          setPendingInviteCode(null);
          clearPresets();
          setDashboardScreen('home');
          setView('dashboard');
        });
    } else {
      clearPresets();
      setDashboardScreen('home');
      setView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleJoinInviteGroup = async () => {
    if (!isSignedIn) {
      openAuth('login', true);
      return;
    }
    const code = pendingInviteCode || inviteGroupData?.slug || '';
    if (!code) {
      clearPresets();
      setDashboardScreen(groups.length > 0 ? 'group-detail' : 'create-group');
      navigateTo('dashboard');
      return;
    }
    try {
      const res = await rabaApi.joinGroupByInvite(code);
      if (res.workspace) {
        applyWorkspace(res.workspace);
      }
      if (res.group_id) {
        setSelectedGroupId(res.group_id);
      }
      clearInviteFromUrl();
      setPendingInviteCode(null);
      clearPresets();
      setDashboardScreen('group-detail');
      navigateTo('dashboard');
    } catch (err) {
      console.error('Failed to join group:', err);
      clearInviteFromUrl();
      setPendingInviteCode(null);
      clearPresets();
      setDashboardScreen(groups.length > 0 ? 'group-detail' : 'create-group');
      navigateTo('dashboard');
    }
  };

  const handleOpenInviteGroup = () => {
    clearPresets();
    clearInviteFromUrl();
    setPendingInviteCode(null);
    if (inviteGroupData?.slug) {
      setSelectedGroupId(inviteGroupData.slug);
    }
    setDashboardScreen('group-detail');
    navigateTo('dashboard');
  };

  const handleConnectWallet = async (preferredProvider?: string) => {
    try {
      const connected = await connectWithStellarWalletsKit(preferredProvider);
      if (!connected || !connected.address) {
        return;
      }

      setHomeMode('default');
      if (createBillPreset === 'no-wallet') {
        setCreateBillPreset(null);
      }

      // Immediately reflect wallet connection & short address
      setUser((prev) => ({
        ...prev,
        walletConnected: true,
        walletAddress: connected.shortAddress,
        fullWalletAddress: connected.address,
        walletProvider: connected.provider,
        verified: true,
      }));
      setIsSignedIn(true);

      const res = await rabaApi.authenticateWithWallet({
        stellar_address: connected.address,
        wallet_provider: connected.provider,
        name: user.name || undefined,
      });

      setIsSignedIn(true);
      applyWorkspace(res.workspace);

      // Also query live on-chain testnet balances directly from Horizon
      queryLiveStellarBalances(connected.address)
        .then((live) => {
          if (live.funded) {
            setUser((prev) => ({
              ...prev,
              nativeXlmBalance: live.nativeXlm,
              onchainUsdcBalance: live.usdc,
            }));
          }
        })
        .catch(() => {});
      clearPresets();
      setDashboardScreen('home');
      try {
        sessionStorage.setItem('rabapay_current_view', 'dashboard');
      } catch {
        // ignore
      }
      setView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const handleDisconnectWallet = () => {
    setUser((prev) => ({
      ...prev,
      walletConnected: false,
      walletAddress: '',
      fullWalletAddress: '',
    }));
    rabaApi
      .disconnectWallet()
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleUpdateName = (nextName: string) => {
    setUser((prev) => ({ ...prev, name: nextName }));
    rabaApi
      .updateProfile({ name: nextName })
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    rabaApi
      .markAllNotificationsRead()
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    rabaApi
      .markNotificationRead(id)
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handlePayBill = async (
    billId: string,
    txDetails?: { tx_hash?: string; signed_tx_xdr?: string }
  ) => {
    try {
      const res = await rabaApi.payBillShare({
        billId,
        tx_hash: txDetails?.tx_hash,
        signed_tx_xdr: txDetails?.signed_tx_xdr,
        payer_stellar_address: user.fullWalletAddress || user.walletAddress,
      });
      if (res.workspace) {
        applyWorkspace(res.workspace);
      }
      // Immediately refresh live on-chain balances from Horizon
      const addr = user.fullWalletAddress || user.walletAddress;
      if (addr && addr.startsWith('G')) {
        queryLiveStellarBalances(addr)
          .then((live) => {
            if (live.funded) {
              setUser((prev) => ({
                ...prev,
                nativeXlmBalance: live.nativeXlm,
                onchainUsdcBalance: live.usdc,
                usdcBalance: live.usdc,
              }));
            }
          })
          .catch(() => {});
      }
      return res;
    } catch (err) {
      console.error('Payment error:', err);
      throw err;
    }
  };

  const handleCreateBill = ({
    groupId,
    title,
    totalAmount,
    paidById,
    splitMode,
    yourShare,
    participants,
  }: {
    groupId: string;
    title: string;
    totalAmount: number;
    paidById: string;
    splitMode: 'equal' | 'custom';
    yourShare: number;
    participants?: BillParticipant[];
  }) => {
    rabaApi
      .createBill({
        groupId,
        title,
        totalAmount,
        paidById,
        splitMode,
        yourShare,
        participants,
      })
      .then((res) => {
        applyWorkspace(res.workspace);
      })
      .catch(() => {});
  };

  const handleEditBillSave = ({
    billId,
    title,
    totalAmount,
    groupId,
  }: {
    billId: string;
    title: string;
    totalAmount: number;
    groupId: string;
  }) => {
    rabaApi
      .editBill({ billId, title, totalAmount, groupId })
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleCancelBill = (billId: string) => {
    rabaApi
      .cancelBill(billId)
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleCreateGroup = (
    nameOrParams: string | CreateGroupInput,
    legacyDesc?: string
  ): Group => {
    const isObj = typeof nameOrParams === 'object' && nameOrParams !== null;
    const name = isObj ? nameOrParams.name : nameOrParams;
    const description = isObj
      ? (nameOrParams.description || 'Shared expenses settled in simulated USDC.')
      : (legacyDesc || 'Shared expenses settled in simulated USDC.');
    const category = isObj ? (nameOrParams.category || 'Home & Rent') : 'Home & Rent';
    const location = isObj ? (nameOrParams.location || '') : '';
    const icon = isObj ? (nameOrParams.icon || '🏠') : '🏠';
    const coverColor = isObj ? (nameOrParams.coverColor || '#15803D') : '#15803D';
    const firstMember = isObj ? (nameOrParams.firstMember || nameOrParams.first_member || '') : '';
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'grp';

    const optimisticMembers: Member[] = [
      {
        id: 'sam',
        name: `${user.name || 'You'} (you)`,
        initial: ((user.name || 'Y')[0] || 'Y').toUpperCase(),
        isYou: true,
        avatarBg: '#166534',
        avatarText: '#FFFFFF',
        balanceNote: 'You',
        walletAddress: user.walletAddress || 'No wallet',
        fullWalletAddress: user.fullWalletAddress || user.walletAddress || '',
      },
    ];

    if (firstMember.trim()) {
      const clean = firstMember.trim();
      let memName = clean;
      let memEmail = '';
      let memAddr = '';

      if (clean.includes('(') && clean.includes(')')) {
        const parts = clean.split('(');
        memName = parts[0].trim();
        const inner = parts[1].replace(')', '').trim();
        if (inner.includes('@')) memEmail = inner;
        else if (inner.startsWith('G')) memAddr = inner;
      } else if (clean.includes('@')) {
        memEmail = clean;
        memName = memEmail.split('@')[0];
        memName = memName.charAt(0).toUpperCase() + memName.slice(1);
      } else if (clean.startsWith('G') && clean.length === 56) {
        memAddr = clean;
        memName = `${clean.slice(0, 4)}…${clean.slice(-4)}`;
      }

      optimisticMembers.push({
        id: `invited-${Date.now()}`,
        name: memName,
        initial: (memName[0] || 'M').toUpperCase(),
        isYou: false,
        invited: true,
        avatarBg: '#059669',
        avatarText: '#FFFFFF',
        balanceNote: 'Invited',
        walletAddress: memAddr ? `${memAddr.slice(0, 4)}…${memAddr.slice(-4)}` : 'Invited',
        fullWalletAddress: memAddr,
      });
    }

    const codeToken = `${slug}${Math.random().toString(36).substring(2, 6)}`;
    const generatedInviteCode = `raba.pay/join/${codeToken}`;

    const optimisticGroup: Group = {
      id: `group-${Date.now()}`,
      name,
      description,
      category,
      location,
      icon,
      coverColor,
      members: optimisticMembers,
      statusSummary: 'No bills yet',
      inviteCode: generatedInviteCode,
    };
    setGroups((prev) => [optimisticGroup, ...prev]);

    rabaApi
      .createGroup({
        name,
        description,
        category,
        location,
        icon,
        coverColor,
        firstMember,
        invite_code: generatedInviteCode,
      })
      .then((res) => {
        applyWorkspace(res.workspace);
        if (res.slug) {
          setSelectedGroupId(res.slug);
        }
      })
      .catch(() => {});

    return optimisticGroup;
  };

  const handleInviteMember = async (params: {
    groupId: string;
    name?: string;
    email?: string;
    stellar_address?: string;
    participants?: Array<{ address: string; name?: string; email?: string }>;
  }) => {
    const res = await rabaApi.inviteGroupMember(params);
    if (res.workspace) {
      applyWorkspace(res.workspace);
    }
    return res;
  };

  const handleSaveGroupName = (groupId: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)));
    rabaApi
      .updateGroupName(groupId, name)
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleRemoveMember = (groupId: string, memberId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
          : g
      )
    );
    rabaApi
      .removeGroupMember(groupId, memberId)
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
  };

  const handleRevokeInviteLink = (groupId: string): string => {
    const nextCode = `raba.pay/join/${Math.random().toString(36).slice(2, 8)}`;
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, inviteCode: nextCode } : g))
    );
    rabaApi
      .revokeGroupInvite(groupId)
      .then((res) => applyWorkspace(res.workspace))
      .catch(() => {});
    return nextCode;
  };

  const landingMembers = useMemo(
    () => (groups[0]?.members ?? []).filter((m) => !m.invited),
    [groups]
  );

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <LandingPage
              bills={bills}
              members={landingMembers}
              activity={activity}
              faqItems={faqItems}
              withoutRabaPoints={withoutRabaPoints}
              withRabaPoints={withRabaPoints}
              isSignedIn={isSignedIn}
              walletConnected={user.walletConnected}
              walletAddress={user.walletAddress}
              onConnectWallet={() => handleConnectWallet()}
              onSignUp={() => openAuth('signup', false)}
              onLogIn={() => openAuth('login', false)}
              onOpenWorkspace={() => {
                const isAuthed = isSignedIn || user.walletConnected || Boolean(getAccessToken());
                if (!isAuthed) {
                  openAuth('login', false);
                  return;
                }
                clearPresets();
                setDashboardScreen('home');
                try {
                  sessionStorage.setItem('rabapay_current_view', 'dashboard');
                } catch {
                  // ignore
                }
                setView('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenInvite={() => {
                setInviteVariant(isSignedIn ? 'signed-in' : 'locked');
                navigateTo('invite');
              }}
            />
          </motion.div>
        )}

        {view === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <InvitePage
              variant={inviteVariant}
              isSignedIn={isSignedIn}
              userName={user.name}
              inviteData={inviteGroupData}
              onChangeVariant={setInviteVariant}
              onBackHome={() => navigateTo('landing')}
              onSignUp={() => openAuth('signup', true)}
              onLogIn={() => openAuth('login', true)}
              onJoinGroup={handleJoinInviteGroup}
              onOpenGroup={handleOpenInviteGroup}
            />
          </motion.div>
        )}

        {view === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AuthPage
              initialMode={authMode}
              fromInvite={fromInvite}
              inviterName={inviteGroupData?.creatorName}
              groupName={inviteGroupData?.name}
              walletConnected={user.walletConnected}
              walletAddress={user.walletAddress}
              onBack={() => {
                if (passwordResetFromAccount && isSignedIn) {
                  setPasswordResetFromAccount(false);
                  setDashboardScreen('account');
                  navigateTo('dashboard');
                } else {
                  setPasswordResetFromAccount(false);
                  navigateTo(fromInvite ? 'invite' : 'landing');
                }
              }}
              onModeChange={setAuthMode}
              onConnectWallet={() => handleConnectWallet()}
              onLoginSubmit={handleLoginSubmit}
              onSignupSubmit={handleSignupSubmit}
              onPasswordSaved={
                passwordResetFromAccount
                  ? (newPassword) => {
                      if (newPassword) {
                        rabaApi
                          .updateProfile({ password: newPassword })
                          .then((res) => applyWorkspace(res.workspace))
                          .catch(() => {});
                      }
                      setPasswordResetFromAccount(false);
                      if (isSignedIn) {
                        setDashboardScreen('account');
                        navigateTo('dashboard');
                      } else {
                        navigateTo('landing');
                      }
                    }
                  : undefined
              }
              onAuthSuccess={handleAuthSuccess}
            />
          </motion.div>
        )}

        {view === 'account-created' && (
          <motion.div
            key="account-created"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AccountCreatedPage
              userName={user.name}
              fromInvite={fromInvite}
              inviterName={inviteGroupData?.creatorName}
              groupName={inviteGroupData?.name}
              onJoinGroup={() => {
                if (!isSignedIn) {
                  openAuth('login', false);
                  return;
                }
                if (pendingInviteCode || inviteGroupData) {
                  handleJoinInviteGroup();
                  return;
                }
                clearPresets();
                setDashboardScreen('create-group');
                navigateTo('dashboard');
              }}
              onGoToDashboard={() => {
                if (!isSignedIn) {
                  openAuth('login', false);
                  return;
                }
                clearPresets();
                setDashboardScreen('home');
                navigateTo('dashboard');
              }}
              onBackHome={() => navigateTo('landing')}
            />
          </motion.div>
        )}

        {view === 'global-state' && (
          <motion.div
            key="global-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <GlobalStatePage
              variant={globalStateVariant}
              onRetry={() => {
                rabaApi
                  .fetchWorkspace()
                  .then((ws) => applyWorkspace(ws))
                  .catch(() => {});
                if (!isSignedIn) {
                  openAuth('login', false);
                  return;
                }
                clearPresets();
                setDashboardScreen('home');
                navigateTo('dashboard');
              }}
              onLogIn={() => openAuth('login', false)}
              onGoHome={() => {
                if (!isSignedIn) {
                  navigateTo('landing');
                  return;
                }
                clearPresets();
                setDashboardScreen('home');
                navigateTo('dashboard');
              }}
              onBackLanding={() => navigateTo('landing')}
            />
          </motion.div>
        )}

        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ErrorBoundary fallbackTitle="Dashboard Error" onReset={() => setView('landing')}>
              <DashboardPage
              user={user}
              groups={groups}
              bills={bills}
              activity={activity}
              payments={payments}
              notifications={notifications}
              screen={dashboardScreen}
              onScreenChange={(next) => {
                setDashboardScreen(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              selectedGroupId={selectedGroupId}
              onSelectGroupId={setSelectedGroupId}
              selectedBillId={selectedBillId}
              onSelectBillId={setSelectedBillId}
              homeMode={homeMode}
              onHomeModeChange={setHomeMode}
              groupsListMode={groupsListMode}
              onGroupsListModeChange={setGroupsListMode}
              groupMode={groupMode}
              onGroupModeChange={setGroupMode}
              mobileGroupTab={mobileGroupTab}
              onMobileGroupTabChange={setMobileGroupTab}
              createBillStep={createBillStep}
              createBillPreset={createBillPreset}
              billDetailPreset={billDetailPreset}
              editBillPreset={editBillPreset}
              historyPreset={historyPreset}
              groupSettingsPreset={groupSettingsPreset}
              accountPreset={accountPreset}
              notificationsPreset={notificationsPreset}
              walletPayOpen={walletPayOpen}
              walletPayStepPreset={walletPayStepPreset}
              isWalletCatalogPreset={isWalletCatalogPreset}
              onCloseWalletPay={() => {
                setWalletPayOpen(false);
                setIsWalletCatalogPreset(false);
              }}
              onClearPresets={clearPresets}
              onBackToLanding={() => navigateTo('landing')}
              onLogOut={() => {
                clearAuthTokens();
                try {
                  sessionStorage.removeItem('rabapay_current_view');
                } catch {
                  // ignore
                }
                setIsSignedIn(false);
                setUser({
                  name: '',
                  email: '',
                  walletConnected: false,
                  walletAddress: '',
                  verified: false,
                });
                setGroups([]);
                setBills([]);
                setActivity([]);
                setPayments([]);
                setNotifications([]);
                navigateTo('landing');
              }}
              onOpenInvite={() => {
                setInviteVariant('signed-in');
                navigateTo('invite');
              }}
              onConnectWallet={(providerId) => handleConnectWallet(providerId)}
              onTopUpTestnet={() => {
                rabaApi
                  .faucetUsdc(100)
                  .then((res) => applyWorkspace(res.workspace))
                  .catch(() => {});
              }}
              onDisconnectWallet={handleDisconnectWallet}
              onUpdateName={handleUpdateName}
              onChangePassword={() => {
                setPasswordResetFromAccount(true);
                setAuthMode('set-new-password');
                setFromInvite(false);
                navigateTo('auth');
              }}
              onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
              onMarkNotificationRead={handleMarkNotificationRead}
              onPayBill={handlePayBill}
              onCreateBill={handleCreateBill}
              onEditBillSave={handleEditBillSave}
              onCancelBill={handleCancelBill}
              onCreateGroup={handleCreateGroup}
              onInviteMember={handleInviteMember}
              onSaveGroupName={handleSaveGroupName}
              onRemoveMember={handleRemoveMember}
              onRevokeInviteLink={handleRevokeInviteLink}
            />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
