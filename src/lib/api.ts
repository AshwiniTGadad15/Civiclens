import type {
  AiConversationRecord,
  AuditLogRecord,
  CivicIssue,
  DepartmentRecord,
  DiscussionComment,
  DiscussionRecord,
  KnowledgeArticle,
  LocationRecord,
  NotificationRecord,
  PlatformStats,
  ProjectRecord,
  PublicUser,
  StructuredAiResponse,
} from '../types/civic';

// Auth token is strictly held in JS memory (never localStorage/sessionStorage)
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Unexpected server response' };
  }

  if (!res.ok) {
    const errMsg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return data as T;
}

export const api = {
  getStats: () => request<PlatformStats>('/api/stats'),

  // Auth
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    homeLocationSlug?: string;
    preferredLanguage?: string;
  }) => request<{ token: string; user: PublicUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  requestPasswordReset: (email: string) =>
    request<{ message: string }>('/api/auth/reset-request', { method: 'POST', body: JSON.stringify({ email }) }),

  getMe: () => request<{ user: PublicUser }>('/api/auth/me'),

  updateProfile: (payload: {
    fullName?: string;
    homeLocationSlug?: string;
    preferredLanguage?: string;
    privacyHideProfile?: boolean;
  }) => request<{ user: PublicUser }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteAccount: () => request<{ deleted: boolean }>('/api/auth/account', { method: 'DELETE' }),

  // Locations
  getLocations: (params?: { q?: string; state?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.state) sp.set('state', params.state);
    const qs = sp.toString();
    return request<LocationRecord[]>(`/api/locations${qs ? `?${qs}` : ''}`);
  },

  getLocalityDetail: (slug: string) =>
    request<{
      location: LocationRecord;
      issues: CivicIssue[];
      projects: ProjectRecord[];
      departments: DepartmentRecord[];
      discussions: DiscussionRecord[];
    }>(`/api/locations/${encodeURIComponent(slug)}`),

  toggleFollowLocation: (slug: string) =>
    request<{ following: boolean; followedLocations: string[] }>(`/api/locations/${encodeURIComponent(slug)}/follow`, {
      method: 'POST',
    }),

  // Issues
  getIssues: (params?: {
    q?: string;
    category?: string;
    status?: string;
    city?: string;
    state?: string;
    locality?: string;
    includeDemo?: boolean;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.category) sp.set('category', params.category);
    if (params?.status) sp.set('status', params.status);
    if (params?.city) sp.set('city', params.city);
    if (params?.state) sp.set('state', params.state);
    if (params?.locality) sp.set('locality', params.locality);
    if (params?.includeDemo === false) sp.set('includeDemo', 'false');
    const qs = sp.toString();
    return request<CivicIssue[]>(`/api/issues${qs ? `?${qs}` : ''}`);
  },

  getIssueDetail: (id: string) => request<{ issue: CivicIssue; related: CivicIssue[] }>(`/api/issues/${encodeURIComponent(id)}`),

  createIssue: (payload: Record<string, unknown>) =>
    request<CivicIssue>('/api/issues', { method: 'POST', body: JSON.stringify(payload) }),

  toggleSupportIssue: (id: string) =>
    request<{ supported: boolean; supportCount: number }>(`/api/issues/${encodeURIComponent(id)}/support`, {
      method: 'POST',
    }),

  toggleSaveIssue: (id: string) =>
    request<{ saved: boolean; savedIssueIds: string[] }>(`/api/issues/${encodeURIComponent(id)}/save`, {
      method: 'POST',
    }),

  // Departments & Projects
  getDepartments: (params?: { q?: string; state?: string; type?: string; category?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.state) sp.set('state', params.state);
    if (params?.type) sp.set('type', params.type);
    if (params?.category) sp.set('category', params.category);
    const qs = sp.toString();
    return request<DepartmentRecord[]>(`/api/departments${qs ? `?${qs}` : ''}`);
  },

  getProjects: (params?: { q?: string; status?: string; city?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.status) sp.set('status', params.status);
    if (params?.city) sp.set('city', params.city);
    const qs = sp.toString();
    return request<ProjectRecord[]>(`/api/projects${qs ? `?${qs}` : ''}`);
  },

  // Discussions
  getDiscussions: (params?: { category?: string; locality?: string; sort?: 'latest' | 'trending' }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.locality) sp.set('locality', params.locality);
    if (params?.sort) sp.set('sort', params.sort);
    const qs = sp.toString();
    return request<DiscussionRecord[]>(`/api/discussions${qs ? `?${qs}` : ''}`);
  },

  createDiscussion: (payload: Record<string, unknown>) =>
    request<DiscussionRecord>('/api/discussions', { method: 'POST', body: JSON.stringify(payload) }),

  addComment: (discussionId: string, body: string) =>
    request<DiscussionComment>(`/api/discussions/${encodeURIComponent(discussionId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  toggleSupportDiscussion: (discussionId: string) =>
    request<{ supported: boolean; supportCount: number }>(`/api/discussions/${encodeURIComponent(discussionId)}/support`, {
      method: 'POST',
    }),

  flagDiscussion: (discussionId: string) =>
    request<{ flagged: boolean }>(`/api/discussions/${encodeURIComponent(discussionId)}/flag`, { method: 'POST' }),

  // Knowledge Hub
  getKnowledgeArticles: (params?: { q?: string; category?: string }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.category) sp.set('category', params.category);
    const qs = sp.toString();
    return request<KnowledgeArticle[]>(`/api/knowledge${qs ? `?${qs}` : ''}`);
  },

  toggleBookmarkArticle: (articleId: string) =>
    request<{ bookmarked: boolean; bookmarkedArticleIds: string[] }>(
      `/api/knowledge/${encodeURIComponent(articleId)}/bookmark`,
      { method: 'POST' }
    ),

  // Notifications & Dashboard
  getNotifications: () => request<NotificationRecord[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<NotificationRecord>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),

  getDashboard: () =>
    request<{
      user: PublicUser;
      myReports: CivicIssue[];
      savedIssues: CivicIssue[];
      followedLocations: LocationRecord[];
      notifications: NotificationRecord[];
      aiConversations: AiConversationRecord[];
      myDiscussions: DiscussionRecord[];
      bookmarkedArticles: KnowledgeArticle[];
    }>('/api/dashboard'),

  // CivicLens AI
  askAi: (payload: {
    question: string;
    localityContext?: string;
    language?: string;
    conversationId?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  }) => request<{ conversationId?: string; structured: StructuredAiResponse }>('/api/ai/ask', { method: 'POST', body: JSON.stringify(payload) }),

  getAiConversations: () => request<AiConversationRecord[]>('/api/ai/conversations'),

  deleteAiConversation: (id: string) =>
    request<{ deleted: boolean }>(`/api/ai/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Admin
  getAdminBootstrapStatus: () =>
    request<{
      envPasscodeConfigured: boolean;
      adminClaimed: boolean;
      canBootstrapClaim: boolean;
      isCurrentUserAdmin: boolean;
      currentUserRole: string | null;
    }>('/api/admin/bootstrap-status'),

  claimAdmin: (passcode: string) =>
    request<{ token: string; user: PublicUser }>('/api/admin/claim', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  getAdminOverview: () =>
    request<{
      stats: PlatformStats;
      users: PublicUser[];
      issues: CivicIssue[];
      discussions: DiscussionRecord[];
      departments: DepartmentRecord[];
      projects: ProjectRecord[];
      locations: LocationRecord[];
      articles: KnowledgeArticle[];
      auditLogs: AuditLogRecord[];
    }>('/api/admin/overview'),

  moderateIssue: (id: string, payload: Record<string, unknown>) =>
    request<CivicIssue>(`/api/admin/issues/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  moderateDiscussion: (id: string, moderationStatus: 'approved' | 'flagged' | 'removed') =>
    request<DiscussionRecord>(`/api/admin/discussions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ moderationStatus }),
    }),

  updateUserRole: (id: string, role: string) =>
    request<PublicUser>(`/api/admin/users/${encodeURIComponent(id)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  createAdminProject: (payload: Record<string, unknown>) =>
    request<ProjectRecord>('/api/admin/projects', { method: 'POST', body: JSON.stringify(payload) }),

  createAdminDepartment: (payload: Record<string, unknown>) =>
    request<DepartmentRecord>('/api/admin/departments', { method: 'POST', body: JSON.stringify(payload) }),

  createAdminArticle: (payload: Record<string, unknown>) =>
    request<KnowledgeArticle>('/api/admin/articles', { method: 'POST', body: JSON.stringify(payload) }),
};
