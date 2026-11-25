import fs from 'fs';
import path from 'path';
import type {
  AiConversationRecord,
  AuditLogRecord,
  CivicIssue,
  DepartmentRecord,
  DiscussionRecord,
  KnowledgeArticle,
  LocationRecord,
  NotificationRecord,
  PlatformStats,
  ProjectRecord,
  PublicUser,
  UserRole,
} from '../types/civic.ts';
import {
  SEED_ARTICLES,
  SEED_DEPARTMENTS,
  SEED_DISCUSSIONS,
  SEED_ISSUES,
  SEED_LOCATIONS,
  SEED_PROJECTS,
} from './seedData.ts';

export interface StoredUser extends PublicUser {
  passwordHash: string;
}

export interface DatabaseState {
  adminClaimHash?: string;
  users: StoredUser[];
  locations: LocationRecord[];
  civicIssues: CivicIssue[];
  departments: DepartmentRecord[];
  projects: ProjectRecord[];
  discussions: DiscussionRecord[];
  notifications: NotificationRecord[];
  knowledgeArticles: KnowledgeArticle[];
  aiConversations: AiConversationRecord[];
  auditLogs: AuditLogRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'civiclens-db.json');

function createInitialState(): DatabaseState {
  return {
    users: [],
    locations: structuredClone(SEED_LOCATIONS),
    civicIssues: structuredClone(SEED_ISSUES),
    departments: structuredClone(SEED_DEPARTMENTS),
    projects: structuredClone(SEED_PROJECTS),
    discussions: structuredClone(SEED_DISCUSSIONS),
    notifications: [],
    knowledgeArticles: structuredClone(SEED_ARTICLES),
    aiConversations: [],
    auditLogs: [
      {
        id: 'audit-init',
        actorEmail: 'system@civiclens.in',
        action: 'PLATFORM_INITIALIZED',
        entityType: 'system',
        entityId: 'civiclens-pilot',
        details: 'Initialized CivicLens Bengaluru pilot and pan-India reference directory.',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

let state: DatabaseState | null = null;

function loadState(): DatabaseState {
  if (state) return state;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      const initial = createInitialState();
      state = {
        adminClaimHash: parsed.adminClaimHash,
        users: Array.isArray(parsed.users) ? parsed.users : initial.users,
        locations: Array.isArray(parsed.locations) && parsed.locations.length > 0 ? parsed.locations : initial.locations,
        civicIssues: Array.isArray(parsed.civicIssues) ? parsed.civicIssues : initial.civicIssues,
        departments: Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : initial.departments,
        projects: Array.isArray(parsed.projects) && parsed.projects.length > 0 ? parsed.projects : initial.projects,
        discussions: Array.isArray(parsed.discussions) ? parsed.discussions : initial.discussions,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        knowledgeArticles:
          Array.isArray(parsed.knowledgeArticles) && parsed.knowledgeArticles.length > 0
            ? parsed.knowledgeArticles
            : initial.knowledgeArticles,
        aiConversations: Array.isArray(parsed.aiConversations) ? parsed.aiConversations : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : initial.auditLogs,
      };
      return state;
    }
  } catch (err) {
    console.error('Failed to read CivicLens store; using fresh seed state:', err);
  }
  state = createInitialState();
  persistState();
  return state;
}

export function getDb(): DatabaseState {
  return loadState();
}

export function persistState(): void {
  if (!state) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error('Failed to persist CivicLens store:', err);
  }
}

export function toPublicUser(user: StoredUser): PublicUser {
  const { passwordHash: _passwordHash, ...pub } = user;
  return pub;
}

export function computeStats(): PlatformStats {
  const db = getDb();
  const totalReports = db.civicIssues.length;
  const demoReports = db.civicIssues.filter((i) => i.isDemo).length;
  const liveCitizenReports = totalReports - demoReports;
  const verifiedIssues = db.civicIssues.filter((i) => i.verificationStatus === 'Verified').length;
  const resolvedIssues = db.civicIssues.filter((i) => i.status === 'Resolved').length;
  const activeProjects = db.projects.filter((p) => p.status === 'In Progress' || p.status === 'Approved').length;
  return {
    totalReports,
    demoReports,
    liveCitizenReports,
    verifiedIssues,
    resolvedIssues,
    activeProjects,
    totalDepartments: db.departments.length,
    totalLocations: db.locations.length,
    totalDiscussions: db.discussions.filter((d) => d.moderationStatus !== 'removed').length,
  };
}

export function recordAudit(
  actorEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  actorUserId?: string
): void {
  const db = getDb();
  db.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorUserId,
    actorEmail,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
  if (db.auditLogs.length > 400) {
    db.auditLogs = db.auditLogs.slice(0, 400);
  }
  persistState();
}

export function createNotification(userId: string, title: string, message: string, link?: string): void {
  const db = getDb();
  db.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    title,
    message,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  if (db.notifications.length > 500) {
    db.notifications = db.notifications.slice(0, 500);
  }
  persistState();
}

export function hasAnyAdmin(): boolean {
  const db = getDb();
  return db.users.some((u) => u.role === 'super_admin' || u.role === 'moderator' || u.role === 'content_admin');
}

export function isAdminRole(role: UserRole): boolean {
  return role === 'moderator' || role === 'content_admin' || role === 'super_admin';
}
