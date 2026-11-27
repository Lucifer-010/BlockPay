import { BillParticipant, WorkspacePayload } from '../types';

const API_BASE_URL = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || '/api';

const ACCESS_TOKEN_KEY = 'rabapay_access_token';
const REFRESH_TOKEN_KEY = 'rabapay_refresh_token';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthTokens(access: string, refresh?: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.detail || 'API request failed') as Error & {
      status?: number;
      code?: string;
      payload?: unknown;
    };
    err.status = response.status;
    err.code = data.code;
    err.payload = data;
    throw err;
  }
  return data as T;
}

export const rabaApi = {
  async fetchWorkspace(): Promise<WorkspacePayload> {
    return apiRequest<WorkspacePayload>('/workspace/');
  },

  async login(params: { email: string; password: string }): Promise<{
    tokens: { access: string; refresh: string };
    workspace: WorkspacePayload;
  }> {
    const res = await apiRequest<{
      tokens: { access: string; refresh: string };
      workspace: WorkspacePayload;
    }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.tokens?.access) {
      setAuthTokens(res.tokens.access, res.tokens.refresh);
    }
    return res;
  },

  async register(params: {
    name: string;
    email: string;
    password: string;
    stellar_address?: string;
  }): Promise<{
    tokens: { access: string; refresh: string };
    workspace: WorkspacePayload;
  }> {
    const res = await apiRequest<{
      tokens: { access: string; refresh: string };
      workspace: WorkspacePayload;
    }>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.tokens?.access) {
      setAuthTokens(res.tokens.access, res.tokens.refresh);
    }
    return res;
  },

  async authenticateWithWallet(params: {
    stellar_address: string;
    wallet_provider?: string;
    name?: string;
  }): Promise<{
    tokens: { access: string; refresh: string };
    workspace: WorkspacePayload;
  }> {
    const res = await apiRequest<{
      tokens: { access: string; refresh: string };
      workspace: WorkspacePayload;
    }>('/auth/wallet/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (res.tokens?.access) {
      setAuthTokens(res.tokens.access, res.tokens.refresh);
    }
    return res;
  },

  async connectWallet(params: {
    stellar_address: string;
    wallet_provider?: string;
  }): Promise<WorkspacePayload> {
    await apiRequest('/users/connect-wallet/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return this.fetchWorkspace();
  },

  async disconnectWallet(): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>('/users/disconnect-wallet/', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async updateProfile(params: {
    name?: string;
    password?: string;
  }): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>('/users/me/', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  async createGroup(params: {
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
  }): Promise<{ id: number; slug: string; invite_code: string; workspace: WorkspacePayload }> {
    return apiRequest<{ id: number; slug: string; invite_code: string; workspace: WorkspacePayload }>(
      '/groups/',
      {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          cover_color: params.coverColor,
          first_member: params.firstMember || params.first_member,
          invite_code: params.inviteCode || params.invite_code,
        }),
      }
    );
  },

  async getGroupByInvite(code: string): Promise<{
    id: number;
    slug: string;
    name: string;
    description: string;
    category: string;
    location: string;
    icon: string;
    coverColor: string;
    inviteCode: string;
    creatorName: string;
    memberCount: number;
    isMember: boolean;
  }> {
    return apiRequest(`/groups/by-invite/?code=${encodeURIComponent(code)}`);
  },

  async joinGroupByInvite(code: string): Promise<{
    joined: boolean;
    already_member: boolean;
    group_id: string;
    workspace: WorkspacePayload;
  }> {
    return apiRequest('/groups/join/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async updateGroupName(groupId: string, name: string): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>(`/groups/${encodeURIComponent(groupId)}/`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async inviteGroupMember(params: {
    groupId: string;
    name?: string;
    email?: string;
    stellar_address?: string;
    participants?: Array<{ address: string; name?: string; email?: string }>;
  }): Promise<{ workspace: WorkspacePayload }> {
    const payload =
      params.participants && params.participants.length > 0
        ? {
            participants: params.participants.map((p) => ({
              stellar_address: p.address,
              name: p.name || undefined,
              email: p.email || undefined,
            })),
          }
        : {
            name: params.name,
            email: params.email,
            stellar_address: params.stellar_address,
          };
    return apiRequest<{ workspace: WorkspacePayload }>(
      `/groups/${encodeURIComponent(params.groupId)}/invite/`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async removeGroupMember(
    groupId: string,
    memberId: string
  ): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>(
      `/groups/${encodeURIComponent(groupId)}/remove-member/`,
      {
        method: 'POST',
        body: JSON.stringify({ member_id: memberId }),
      }
    );
  },

  async revokeGroupInvite(
    groupId: string
  ): Promise<{ invite_code: string; workspace: WorkspacePayload }> {
    return apiRequest<{ invite_code: string; workspace: WorkspacePayload }>(
      `/groups/${encodeURIComponent(groupId)}/revoke-invite/`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  },

  async createBill(params: {
    groupId: string;
    title: string;
    totalAmount: number;
    paidById: string;
    splitMode: 'equal' | 'custom';
    yourShare: number;
    participants?: BillParticipant[];
  }): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>('/bills/', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async editBill(params: {
    billId: string;
    title: string;
    totalAmount: number;
    groupId: string;
  }): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>(
      `/bills/${encodeURIComponent(params.billId)}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      }
    );
  },

  async cancelBill(billId: string): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>(
      `/bills/${encodeURIComponent(billId)}/cancel/`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  },

  async payBillShare(params: {
    billId: string;
    tx_hash?: string;
    signed_tx_xdr?: string;
    payer_stellar_address?: string;
    amount?: number;
    verify_on_horizon?: boolean;
  }): Promise<{
    settlement: { tx_hash: string; bill_status: string };
    workspace: WorkspacePayload;
  }> {
    return apiRequest<{
      settlement: { tx_hash: string; bill_status: string };
      workspace: WorkspacePayload;
    }>(`/bills/${encodeURIComponent(params.billId)}/pay/`, {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        verify_on_horizon: params.verify_on_horizon ?? true,
      }),
    });
  },

  async faucetUsdc(amount = 100): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>('/stellar/faucet/', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  async markNotificationRead(id: string): Promise<{ workspace: WorkspacePayload }> {
    const cleanId = id.replace(/^notif-/, '');
    return apiRequest<{ workspace: WorkspacePayload }>(
      `/notifications/${encodeURIComponent(cleanId)}/read/`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
  },

  async markAllNotificationsRead(): Promise<{ workspace: WorkspacePayload }> {
    return apiRequest<{ workspace: WorkspacePayload }>('/notifications/mark-all-read/', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
