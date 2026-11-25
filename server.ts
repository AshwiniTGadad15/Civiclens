import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { z } from 'zod';
import {
  hashPassword,
  optionalAuth,
  requireAuth,
  requireRoles,
  signToken,
  verifyPassword,
  type AuthRequest,
} from './src/server/auth.ts';
import { generateCivicAiAnswer } from './src/server/gemini.ts';
import { createRateLimiter } from './src/server/rateLimit.ts';
import {
  computeStats,
  createNotification,
  getDb,
  hasAnyAdmin,
  isAdminRole,
  persistState,
  recordAudit,
  toPublicUser,
} from './src/server/store.ts';
import type {
  CivicCategory,
  CivicIssue,
  DepartmentRecord,
  DiscussionRecord,
  IssueStatus,
  KnowledgeArticle,
  ProjectRecord,
  UserRole,
} from './src/types/civic.ts';

const ALLOWED_CATEGORIES = [
  'Roads and Infrastructure',
  'Water Supply',
  'Drainage and Sanitation',
  'Waste Management',
  'Streetlights',
  'Public Transportation',
  'Air and Noise Pollution',
  'Public Parks',
  'Public Safety Infrastructure',
  'Other Civic Problems',
] as const;

const ALLOWED_STATUSES = [
  'Submitted',
  'Under Review',
  'Verified',
  'Forwarded to Authority',
  'In Progress',
  'Resolved',
  'Rejected',
] as const;

const safeUrlSchema = z
  .string()
  .trim()
  .refine((val) => val === '' || /^https?:\/\//i.test(val), 'URL must start with http:// or https://');

const safeMediaDataUrlSchema = z
  .string()
  .max(6_500_000, 'Image file exceeds 5MB limit')
  .refine(
    (val) => /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(val),
    'Only JPEG, PNG, or WebP images are permitted'
  );

function generateTrackingId(city: string): string {
  const code = (city.replace(/[^a-zA-Z]/g, '').slice(0, 3) || 'IND').toUpperCase();
  const year = new Date().getFullYear();
  const suffix = crypto.randomInt(1000, 9999);
  return `CL-${code}-${year}-${suffix}`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '15mb' }));

  const authLimiter = createRateLimiter('auth', 25, 15 * 60 * 1000);
  const writeLimiter = createRateLimiter('write', 40, 10 * 60 * 1000);
  const aiLimiter = createRateLimiter('ai', 20, 5 * 60 * 1000);

  // --- Health & Platform Stats ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'CivicLens API' });
  });

  app.get('/api/stats', (_req, res) => {
    res.json(computeStats());
  });

  // --- Auth & Account ---
  const registerSchema = z.object({
    email: z.string().trim().email().max(160),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    fullName: z.string().trim().min(2).max(100),
    homeLocationSlug: z.string().trim().max(80).optional(),
    preferredLanguage: z.string().trim().max(12).optional(),
  });

  app.post('/api/auth/register', authLimiter, (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid registration data' });
      return;
    }
    const db = getDb();
    const emailLower = parsed.data.email.toLowerCase();
    if (db.users.some((u) => u.email === emailLower)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser = {
      id: `usr-${crypto.randomUUID()}`,
      email: emailLower,
      fullName: parsed.data.fullName,
      passwordHash: hashPassword(parsed.data.password),
      role: 'citizen' as UserRole,
      homeLocationSlug: parsed.data.homeLocationSlug || 'bengaluru',
      preferredLanguage: parsed.data.preferredLanguage || 'en',
      privacyHideProfile: false,
      followedLocations: [parsed.data.homeLocationSlug || 'bengaluru'],
      savedIssueIds: [],
      bookmarkedArticleIds: [],
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    persistState();
    createNotification(
      newUser.id,
      'Welcome to CivicLens',
      'Your citizen account is active. You can report civic issues, save updates, and join locality discussions.',
      '/dashboard'
    );
    recordAudit(newUser.email, 'USER_REGISTERED', 'user', newUser.id, 'New citizen account registered.', newUser.id);

    const token = signToken(newUser);
    res.status(201).json({ token, user: toPublicUser(newUser) });
  });

  const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  });

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid email and password.' });
      return;
    }
    const db = getDb();
    const emailLower = parsed.data.email.toLowerCase();
    const user = db.users.find((u) => u.email === emailLower);
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  });

  app.post('/api/auth/reset-request', authLimiter, (req, res) => {
    const schema = z.object({ email: z.string().trim().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    res.json({
      message:
        'If an account exists for this email, password recovery instructions would be sent via the configured transactional email provider. Contact your platform administrator for manual recovery in local mode.',
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: toPublicUser(req.currentUser!) });
  });

  app.patch('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
    const schema = z.object({
      fullName: z.string().trim().min(2).max(100).optional(),
      homeLocationSlug: z.string().trim().max(80).optional(),
      preferredLanguage: z.string().trim().max(12).optional(),
      privacyHideProfile: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid profile update.' });
      return;
    }
    const user = req.currentUser!;
    if (parsed.data.fullName !== undefined) user.fullName = parsed.data.fullName;
    if (parsed.data.homeLocationSlug !== undefined) user.homeLocationSlug = parsed.data.homeLocationSlug;
    if (parsed.data.preferredLanguage !== undefined) user.preferredLanguage = parsed.data.preferredLanguage;
    if (parsed.data.privacyHideProfile !== undefined) user.privacyHideProfile = parsed.data.privacyHideProfile;
    persistState();
    res.json({ user: toPublicUser(user) });
  });

  app.delete('/api/auth/account', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const userId = req.currentUser!.id;
    const email = req.currentUser!.email;
    db.users = db.users.filter((u) => u.id !== userId);
    db.notifications = db.notifications.filter((n) => n.userId !== userId);
    db.aiConversations = db.aiConversations.filter((c) => c.userId !== userId);
    recordAudit(email, 'USER_ACCOUNT_DELETED', 'user', userId, 'Citizen exercised data deletion right.');
    persistState();
    res.json({ deleted: true });
  });

  // --- Admin Bootstrap / Claim Status (Secure first-run admin claim or env ADMIN_PASSCODE) ---
  app.get('/api/admin/bootstrap-status', optionalAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const envConfigured = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
    const claimed = Boolean(db.adminClaimHash) || hasAnyAdmin();
    res.json({
      envPasscodeConfigured: envConfigured,
      adminClaimed: claimed,
      canBootstrapClaim: !envConfigured && !claimed,
      isCurrentUserAdmin: Boolean(req.currentUser && isAdminRole(req.currentUser.role)),
      currentUserRole: req.currentUser?.role ?? null,
    });
  });

  app.post('/api/admin/claim', requireAuth, authLimiter, (req: AuthRequest, res) => {
    const schema = z.object({
      passcode: z.string().min(8, 'Admin passcode must be at least 8 characters').max(128),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid passcode' });
      return;
    }

    const db = getDb();
    const user = req.currentUser!;
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();

    if (envPasscode) {
      const providedBuf = Buffer.from(parsed.data.passcode);
      const envBuf = Buffer.from(envPasscode);
      if (providedBuf.length !== envBuf.length || !crypto.timingSafeEqual(providedBuf, envBuf)) {
        res.status(403).json({ error: 'Invalid administrator passcode.' });
        return;
      }
      user.role = 'super_admin';
      persistState();
      recordAudit(user.email, 'ADMIN_UNLOCKED_ENV', 'user', user.id, 'Super admin unlocked via server ADMIN_PASSCODE.', user.id);
      const token = signToken(user);
      res.json({ token, user: toPublicUser(user) });
      return;
    }

    if (db.adminClaimHash) {
      if (!verifyPassword(parsed.data.passcode, db.adminClaimHash)) {
        res.status(403).json({ error: 'Invalid administrator passcode.' });
        return;
      }
      user.role = 'super_admin';
      persistState();
      recordAudit(user.email, 'ADMIN_UNLOCKED_CLAIM', 'user', user.id, 'Super admin verified against claimed passcode.', user.id);
      const token = signToken(user);
      res.json({ token, user: toPublicUser(user) });
      return;
    }

    if (hasAnyAdmin()) {
      res.status(403).json({ error: 'First-run admin claim is already locked. Request role assignment from an existing Super Administrator.' });
      return;
    }

    // One-time atomic first-run claim
    db.adminClaimHash = hashPassword(parsed.data.passcode);
    user.role = 'super_admin';
    persistState();
    recordAudit(user.email, 'ADMIN_FIRST_RUN_CLAIMED', 'user', user.id, 'First-run Super Administrator claimed and locked.', user.id);
    const token = signToken(user);
    res.json({ token, user: toPublicUser(user) });
  });

  // --- Locations ---
  app.get('/api/locations', (req, res) => {
    const db = getDb();
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const stateFilter = String(req.query.state ?? '').trim().toLowerCase();
    let list = db.locations;
    if (stateFilter) {
      list = list.filter((l) => l.state.toLowerCase() === stateFilter);
    }
    if (q) {
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.district.toLowerCase().includes(q) ||
          l.state.toLowerCase().includes(q) ||
          (l.pinCode && l.pinCode.includes(q))
      );
    }
    res.json(list);
  });

  app.get('/api/locations/:slug', (req, res) => {
    const db = getDb();
    const loc = db.locations.find((l) => l.slug === req.params.slug);
    if (!loc) {
      res.status(404).json({ error: 'Locality not found.' });
      return;
    }
    const issues = db.civicIssues.filter(
      (i) =>
        i.locationSlug === loc.slug ||
        (loc.level === 'city' && i.city.toLowerCase() === loc.city.toLowerCase())
    );
    const projects = db.projects.filter(
      (p) =>
        p.locationSlug === loc.slug ||
        p.city.toLowerCase() === loc.city.toLowerCase()
    );
    const departments = db.departments.filter(
      (d) =>
        d.city.toLowerCase() === loc.city.toLowerCase() ||
        d.state.toLowerCase() === loc.state.toLowerCase() ||
        d.state === 'All India'
    );
    const discussions = db.discussions.filter(
      (d) =>
        d.moderationStatus !== 'removed' &&
        (d.locationSlug === loc.slug || d.city.toLowerCase() === loc.city.toLowerCase())
    );
    res.json({ location: loc, issues, projects, departments, discussions });
  });

  app.post('/api/locations/:slug/follow', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const slug = String(req.params.slug);
    const exists = db.locations.some((l) => l.slug === slug);
    if (!exists) {
      res.status(404).json({ error: 'Location not found.' });
      return;
    }
    const user = req.currentUser!;
    const idx = user.followedLocations.indexOf(slug);
    let following = false;
    if (idx >= 0) {
      user.followedLocations.splice(idx, 1);
    } else {
      user.followedLocations.push(slug);
      following = true;
    }
    persistState();
    res.json({ following, followedLocations: user.followedLocations });
  });

  // --- Civic Issues ---
  app.get('/api/issues', (req, res) => {
    const db = getDb();
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const category = String(req.query.category ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const city = String(req.query.city ?? '').trim().toLowerCase();
    const state = String(req.query.state ?? '').trim().toLowerCase();
    const locality = String(req.query.locality ?? '').trim().toLowerCase();
    const includeDemo = req.query.includeDemo !== 'false';

    let list = [...db.civicIssues];
    if (!includeDemo) list = list.filter((i) => !i.isDemo);
    if (category) list = list.filter((i) => i.category === category);
    if (status) list = list.filter((i) => i.status === status);
    if (city) list = list.filter((i) => i.city.toLowerCase() === city);
    if (state) list = list.filter((i) => i.state.toLowerCase() === state);
    if (locality) list = list.filter((i) => i.locationSlug === locality || i.locality.toLowerCase().includes(locality));
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.trackingId.toLowerCase().includes(q) ||
          i.locality.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          (i.pinCode && i.pinCode.includes(q))
      );
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(list);
  });

  app.get('/api/issues/:id', (req, res) => {
    const db = getDb();
    const issue = db.civicIssues.find((i) => i.id === req.params.id || i.trackingId === req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Civic issue not found.' });
      return;
    }
    const related = db.civicIssues
      .filter((i) => i.id !== issue.id && (i.locationSlug === issue.locationSlug || i.category === issue.category))
      .slice(0, 4);
    res.json({ issue, related });
  });

  const createIssueSchema = z.object({
    title: z.string().trim().min(6, 'Title must be at least 6 characters').max(180),
    description: z.string().trim().min(20, 'Please provide at least 20 characters of detail').max(3000),
    category: z.enum(ALLOWED_CATEGORIES),
    subCategory: z.string().trim().max(80).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    observedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
    additionalNotes: z.string().trim().max(1000).optional(),
    state: z.string().trim().min(2).max(80),
    district: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    locality: z.string().trim().min(2).max(120),
    locationSlug: z.string().trim().max(100).optional(),
    pinCode: z
      .string()
      .trim()
      .regex(/^(\d{6})?$/, 'PIN code must be 6 digits')
      .optional(),
    latitude: z.number().min(6).max(38),
    longitude: z.number().min(68).max(98),
    media: z
      .array(
        z.object({
          url: safeMediaDataUrlSchema,
          caption: z.string().trim().max(180).optional(),
        })
      )
      .max(4, 'Maximum 4 evidence images allowed')
      .optional(),
  });

  app.post('/api/issues', requireAuth, writeLimiter, (req: AuthRequest, res) => {
    const parsed = createIssueSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid issue report payload' });
      return;
    }
    const db = getDb();
    const user = req.currentUser!;
    const data = parsed.data;

    const matchedDept = db.departments.find(
      (d) =>
        (d.city.toLowerCase() === data.city.toLowerCase() || d.state.toLowerCase() === data.state.toLowerCase()) &&
        d.civicCategories.includes(data.category)
    );

    const issueId = `iss-${crypto.randomUUID()}`;
    const trackingId = generateTrackingId(data.city);
    const now = new Date().toISOString();

    const newIssue: CivicIssue = {
      id: issueId,
      trackingId,
      title: data.title,
      description: data.description,
      category: data.category as CivicCategory,
      subCategory: data.subCategory,
      severity: data.severity,
      status: 'Submitted',
      verificationStatus: 'Unverified',
      dataOrigin: 'Citizen Submitted',
      isDemo: false,
      locationSlug: data.locationSlug || data.city.toLowerCase().replace(/\s+/g, '-'),
      state: data.state,
      district: data.district,
      city: data.city,
      locality: data.locality,
      pinCode: data.pinCode || undefined,
      latitude: data.latitude,
      longitude: data.longitude,
      observedDate: data.observedDate,
      additionalNotes: data.additionalNotes || undefined,
      reporterUserId: user.id,
      reporterName: user.privacyHideProfile ? 'Verified Citizen' : user.fullName,
      responsibleDepartmentId: matchedDept?.id,
      responsibleDepartmentName: matchedDept?.name,
      supportCount: 1,
      supportedByUserIds: [user.id],
      media: (data.media ?? []).map((m, idx) => ({
        id: `med-${issueId}-${idx}`,
        issueId,
        mediaType: 'image',
        url: m.url,
        caption: m.caption,
        createdAt: now,
      })),
      updates: [
        {
          id: `upd-${crypto.randomUUID()}`,
          issueId,
          status: 'Submitted',
          note: 'Report received on CivicLens and queued for community/moderator verification. Note: Official government filing requires submission via the respective authority portal.',
          updatedByName: user.privacyHideProfile ? 'Verified Citizen' : user.fullName,
          updatedByRole: user.role,
          isOfficialAuthorityConfirmation: false,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    db.civicIssues.unshift(newIssue);
    persistState();
    createNotification(
      user.id,
      `Report Submitted: ${trackingId}`,
      `Your civic issue "${newIssue.title}" has been recorded with tracking ID ${trackingId}.`,
      `/issues/${newIssue.id}`
    );
    recordAudit(user.email, 'ISSUE_CREATED', 'civic_issue', newIssue.id, `Submitted ${trackingId} (${newIssue.category})`, user.id);
    res.status(201).json(newIssue);
  });

  app.post('/api/issues/:id/support', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const issue = db.civicIssues.find((i) => i.id === req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }
    const uid = req.currentUser!.id;
    const idx = issue.supportedByUserIds.indexOf(uid);
    let supported = false;
    if (idx >= 0) {
      issue.supportedByUserIds.splice(idx, 1);
      issue.supportCount = Math.max(0, issue.supportCount - 1);
    } else {
      issue.supportedByUserIds.push(uid);
      issue.supportCount += 1;
      supported = true;
    }
    persistState();
    res.json({ supported, supportCount: issue.supportCount });
  });

  app.post('/api/issues/:id/save', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const id = String(req.params.id);
    if (!db.civicIssues.some((i) => i.id === id)) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }
    const user = req.currentUser!;
    const idx = user.savedIssueIds.indexOf(id);
    let saved = false;
    if (idx >= 0) {
      user.savedIssueIds.splice(idx, 1);
    } else {
      user.savedIssueIds.push(id);
      saved = true;
    }
    persistState();
    res.json({ saved, savedIssueIds: user.savedIssueIds });
  });

  // --- Departments ---
  app.get('/api/departments', (req, res) => {
    const db = getDb();
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const state = String(req.query.state ?? '').trim().toLowerCase();
    const type = String(req.query.type ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    let list = [...db.departments];
    if (state) list = list.filter((d) => d.state.toLowerCase() === state || d.state === 'All India');
    if (type) list = list.filter((d) => d.departmentType === type);
    if (category) list = list.filter((d) => d.civicCategories.includes(category as CivicCategory));
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.shortName.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.city.toLowerCase().includes(q) ||
          d.state.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });

  // --- Projects ---
  app.get('/api/projects', (req, res) => {
    const db = getDb();
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const status = String(req.query.status ?? '').trim();
    const city = String(req.query.city ?? '').trim().toLowerCase();
    let list = [...db.projects];
    if (status) list = list.filter((p) => p.status === status);
    if (city) list = list.filter((p) => p.city.toLowerCase() === city);
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.locality.toLowerCase().includes(q) ||
          p.departmentName.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });

  // --- Community Discussions ---
  app.get('/api/discussions', (req, res) => {
    const db = getDb();
    const category = String(req.query.category ?? '').trim();
    const locality = String(req.query.locality ?? '').trim().toLowerCase();
    const sort = String(req.query.sort ?? 'latest');
    let list = db.discussions.filter((d) => d.moderationStatus !== 'removed');
    if (category) list = list.filter((d) => d.category === category);
    if (locality) list = list.filter((d) => d.locationSlug === locality || d.city.toLowerCase() === locality);
    if (sort === 'trending') {
      list.sort((a, b) => b.supportCount + b.comments.length * 2 - (a.supportCount + a.comments.length * 2));
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    res.json(list);
  });

  const createDiscussionSchema = z.object({
    title: z.string().trim().min(6).max(180),
    body: z.string().trim().min(15).max(3000),
    category: z.enum(ALLOWED_CATEGORIES),
    locationSlug: z.string().trim().min(2).max(100),
    localityName: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(80),
    relatedIssueId: z.string().trim().max(100).optional(),
  });

  app.post('/api/discussions', requireAuth, writeLimiter, (req: AuthRequest, res) => {
    const parsed = createDiscussionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid discussion input' });
      return;
    }
    const db = getDb();
    const user = req.currentUser!;
    const newDisc: DiscussionRecord = {
      id: `disc-${crypto.randomUUID()}`,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category as CivicCategory,
      locationSlug: parsed.data.locationSlug,
      localityName: parsed.data.localityName,
      city: parsed.data.city,
      relatedIssueId: parsed.data.relatedIssueId || undefined,
      authorUserId: user.id,
      authorName: user.privacyHideProfile ? 'Verified Citizen' : user.fullName,
      isDemo: false,
      supportCount: 1,
      supportedByUserIds: [user.id],
      flaggedCount: 0,
      moderationStatus: 'approved',
      comments: [],
      createdAt: new Date().toISOString(),
    };
    db.discussions.unshift(newDisc);
    persistState();
    res.status(201).json(newDisc);
  });

  app.post('/api/discussions/:id/comments', requireAuth, writeLimiter, (req: AuthRequest, res) => {
    const schema = z.object({ body: z.string().trim().min(3).max(1500) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Comment must be between 3 and 1500 characters.' });
      return;
    }
    const db = getDb();
    const disc = db.discussions.find((d) => d.id === req.params.id && d.moderationStatus !== 'removed');
    if (!disc) {
      res.status(404).json({ error: 'Discussion not found.' });
      return;
    }
    const user = req.currentUser!;
    const comment = {
      id: `cmt-${crypto.randomUUID()}`,
      discussionId: disc.id,
      authorUserId: user.id,
      authorName: user.privacyHideProfile ? 'Verified Citizen' : user.fullName,
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
    };
    disc.comments.push(comment);
    if (disc.authorUserId && disc.authorUserId !== user.id) {
      createNotification(
        disc.authorUserId,
        'New reply on your civic discussion',
        `${comment.authorName} commented on "${disc.title}".`,
        '/community'
      );
    }
    persistState();
    res.status(201).json(comment);
  });

  app.post('/api/discussions/:id/support', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const disc = db.discussions.find((d) => d.id === req.params.id);
    if (!disc) {
      res.status(404).json({ error: 'Discussion not found.' });
      return;
    }
    const uid = req.currentUser!.id;
    const idx = disc.supportedByUserIds.indexOf(uid);
    let supported = false;
    if (idx >= 0) {
      disc.supportedByUserIds.splice(idx, 1);
      disc.supportCount = Math.max(0, disc.supportCount - 1);
    } else {
      disc.supportedByUserIds.push(uid);
      disc.supportCount += 1;
      supported = true;
    }
    persistState();
    res.json({ supported, supportCount: disc.supportCount });
  });

  app.post('/api/discussions/:id/flag', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const disc = db.discussions.find((d) => d.id === req.params.id);
    if (!disc) {
      res.status(404).json({ error: 'Discussion not found.' });
      return;
    }
    disc.flaggedCount += 1;
    disc.moderationStatus = 'flagged';
    persistState();
    recordAudit(req.currentUser!.email, 'DISCUSSION_FLAGGED', 'discussion', disc.id, 'Flagged by citizen for review.', req.currentUser!.id);
    res.json({ flagged: true });
  });

  // --- Knowledge Hub ---
  app.get('/api/knowledge', (req, res) => {
    const db = getDb();
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const category = String(req.query.category ?? '').trim();
    let list = [...db.knowledgeArticles];
    if (category) list = list.filter((a) => a.category === category);
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.contentEn.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });

  app.post('/api/knowledge/:id/bookmark', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const id = String(req.params.id);
    if (!db.knowledgeArticles.some((a) => a.id === id)) {
      res.status(404).json({ error: 'Article not found.' });
      return;
    }
    const user = req.currentUser!;
    const idx = user.bookmarkedArticleIds.indexOf(id);
    let bookmarked = false;
    if (idx >= 0) {
      user.bookmarkedArticleIds.splice(idx, 1);
    } else {
      user.bookmarkedArticleIds.push(id);
      bookmarked = true;
    }
    persistState();
    res.json({ bookmarked, bookmarkedArticleIds: user.bookmarkedArticleIds });
  });

  // --- Notifications ---
  app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const list = db.notifications.filter((n) => n.userId === req.currentUser!.id);
    res.json(list);
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.id === req.params.id && n.userId === req.currentUser!.id);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    notif.isRead = true;
    persistState();
    res.json(notif);
  });

  // --- CivicLens AI (Server-Side Gemini API) ---
  app.get('/api/ai/conversations', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const list = db.aiConversations.filter((c) => c.userId === req.currentUser!.id);
    res.json(list);
  });

  app.delete('/api/ai/conversations/:id', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    db.aiConversations = db.aiConversations.filter(
      (c) => !(c.id === req.params.id && c.userId === req.currentUser!.id)
    );
    persistState();
    res.json({ deleted: true });
  });

  const aiQuerySchema = z.object({
    question: z.string().trim().min(3, 'Please enter a civic question').max(1500),
    localityContext: z.string().trim().max(160).optional(),
    language: z.string().trim().max(10).optional(),
    conversationId: z.string().trim().max(100).optional(),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().max(1500),
        })
      )
      .max(10)
      .optional(),
  });

  app.post('/api/ai/ask', optionalAuth, aiLimiter, async (req: AuthRequest, res) => {
    const parsed = aiQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid AI question' });
      return;
    }
    try {
      const structured = await generateCivicAiAnswer({
        question: parsed.data.question,
        localityContext: parsed.data.localityContext,
        language: parsed.data.language,
        history: parsed.data.history,
      });

      const now = new Date().toISOString();
      let conversationId = parsed.data.conversationId;

      if (req.currentUser) {
        const db = getDb();
        let convo = conversationId
          ? db.aiConversations.find((c) => c.id === conversationId && c.userId === req.currentUser!.id)
          : undefined;
        if (!convo) {
          conversationId = `conv-${crypto.randomUUID()}`;
          convo = {
            id: conversationId,
            userId: req.currentUser.id,
            title: parsed.data.question.slice(0, 68),
            localityContext: parsed.data.localityContext || 'Bengaluru, Karnataka',
            language: parsed.data.language || 'en',
            messages: [],
            createdAt: now,
            updatedAt: now,
          };
          db.aiConversations.unshift(convo);
        }
        convo.messages.push(
          {
            id: `msg-${crypto.randomUUID()}`,
            conversationId: convo.id,
            role: 'user',
            content: parsed.data.question,
            createdAt: now,
          },
          {
            id: `msg-${crypto.randomUUID()}`,
            conversationId: convo.id,
            role: 'assistant',
            content: structured.directAnswer,
            structured,
            createdAt: new Date().toISOString(),
          }
        );
        convo.updatedAt = new Date().toISOString();
        persistState();
      }

      res.json({ conversationId, structured });
    } catch (error: unknown) {
      console.error('CivicLens AI error:', error);
      const message = error instanceof Error ? error.message : 'Unable to reach CivicLens AI right now.';
      res.status(502).json({ error: message });
    }
  });

  // --- Protected Citizen Dashboard Summary ---
  app.get('/api/dashboard', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.currentUser!;
    const myReports = db.civicIssues.filter((i) => i.reporterUserId === user.id);
    const savedIssues = db.civicIssues.filter((i) => user.savedIssueIds.includes(i.id));
    const followedLocations = db.locations.filter((l) => user.followedLocations.includes(l.slug));
    const notifications = db.notifications.filter((n) => n.userId === user.id);
    const aiConversations = db.aiConversations.filter((c) => c.userId === user.id);
    const myDiscussions = db.discussions.filter((d) => d.authorUserId === user.id);
    const bookmarkedArticles = db.knowledgeArticles.filter((a) => user.bookmarkedArticleIds.includes(a.id));

    res.json({
      user: toPublicUser(user),
      myReports,
      savedIssues,
      followedLocations,
      notifications,
      aiConversations,
      myDiscussions,
      bookmarkedArticles,
    });
  });

  // --- Protected Administration Routes (Server-Side Role Enforcement) ---
  const adminRoles: UserRole[] = ['moderator', 'content_admin', 'super_admin'];

  app.get('/api/admin/overview', requireRoles(adminRoles), (_req, res) => {
    const db = getDb();
    res.json({
      stats: computeStats(),
      users: db.users.map(toPublicUser),
      issues: db.civicIssues,
      discussions: db.discussions,
      departments: db.departments,
      projects: db.projects,
      locations: db.locations,
      articles: db.knowledgeArticles,
      auditLogs: db.auditLogs.slice(0, 100),
    });
  });

  const adminIssueUpdateSchema = z.object({
    status: z.enum(ALLOWED_STATUSES),
    verificationStatus: z.enum(['Unverified', 'Under Review', 'Verified', 'Rejected']),
    note: z.string().trim().min(4).max(800),
    responsibleDepartmentId: z.string().trim().optional(),
    officialReference: z.string().trim().max(120).optional(),
    duplicateOfIssueId: z.string().trim().max(100).optional(),
  });

  app.patch('/api/admin/issues/:id', requireRoles(adminRoles), (req: AuthRequest, res) => {
    const parsed = adminIssueUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update' });
      return;
    }
    const db = getDb();
    const issue = db.civicIssues.find((i) => i.id === req.params.id);
    if (!issue) {
      res.status(404).json({ error: 'Issue not found.' });
      return;
    }
    const actor = req.currentUser!;
    const data = parsed.data;
    issue.status = data.status as IssueStatus;
    issue.verificationStatus = data.verificationStatus;
    if (data.verificationStatus === 'Verified') {
      issue.dataOrigin = 'Independently Verified';
    }
    if (data.responsibleDepartmentId) {
      const dept = db.departments.find((d) => d.id === data.responsibleDepartmentId);
      if (dept) {
        issue.responsibleDepartmentId = dept.id;
        issue.responsibleDepartmentName = dept.name;
      }
    }
    if (data.officialReference !== undefined) {
      issue.officialReference = data.officialReference || undefined;
    }
    if (data.duplicateOfIssueId !== undefined) {
      issue.duplicateOfIssueId = data.duplicateOfIssueId || undefined;
    }
    issue.updatedAt = new Date().toISOString();
    issue.updates.push({
      id: `upd-${crypto.randomUUID()}`,
      issueId: issue.id,
      status: issue.status,
      note: data.note,
      updatedByName: actor.fullName,
      updatedByRole: actor.role,
      isOfficialAuthorityConfirmation: false,
      createdAt: issue.updatedAt,
    });

    if (issue.reporterUserId) {
      createNotification(
        issue.reporterUserId,
        `Issue ${issue.trackingId} updated to ${issue.status}`,
        data.note,
        `/issues/${issue.id}`
      );
    }

    recordAudit(
      actor.email,
      'ISSUE_MODERATED',
      'civic_issue',
      issue.id,
      `Status=${issue.status}, Verification=${issue.verificationStatus}`,
      actor.id
    );
    persistState();
    res.json(issue);
  });

  app.patch('/api/admin/discussions/:id', requireRoles(['moderator', 'super_admin']), (req: AuthRequest, res) => {
    const schema = z.object({ moderationStatus: z.enum(['approved', 'flagged', 'removed']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid moderation status' });
      return;
    }
    const db = getDb();
    const disc = db.discussions.find((d) => d.id === req.params.id);
    if (!disc) {
      res.status(404).json({ error: 'Discussion not found.' });
      return;
    }
    disc.moderationStatus = parsed.data.moderationStatus;
    recordAudit(
      req.currentUser!.email,
      'DISCUSSION_MODERATED',
      'discussion',
      disc.id,
      `Set moderationStatus=${disc.moderationStatus}`,
      req.currentUser!.id
    );
    persistState();
    res.json(disc);
  });

  app.patch('/api/admin/users/:id/role', requireRoles(['super_admin']), (req: AuthRequest, res) => {
    const schema = z.object({ role: z.enum(['citizen', 'moderator', 'content_admin', 'super_admin']) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    target.role = parsed.data.role;
    recordAudit(
      req.currentUser!.email,
      'USER_ROLE_CHANGED',
      'user',
      target.id,
      `Assigned role=${target.role}`,
      req.currentUser!.id
    );
    persistState();
    res.json(toPublicUser(target));
  });

  app.post('/api/admin/projects', requireRoles(['content_admin', 'super_admin']), (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().trim().min(5).max(200),
      description: z.string().trim().min(15).max(2000),
      category: z.string().trim().min(2).max(80),
      locationSlug: z.string().trim().min(2).max(100),
      state: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      locality: z.string().trim().min(2).max(120),
      latitude: z.number().min(6).max(38),
      longitude: z.number().min(68).max(98),
      departmentName: z.string().trim().min(2).max(160),
      publishedBudget: z.string().trim().min(2).max(160),
      startDate: z.string().trim().min(4).max(40),
      expectedCompletion: z.string().trim().min(4).max(80),
      status: z.enum(['Planned', 'Approved', 'In Progress', 'Completed', 'Delayed']),
      progressPercent: z.number().min(0).max(100),
      sourceName: z.string().trim().min(2).max(120),
      sourceUrl: safeUrlSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid project data' });
      return;
    }
    const db = getDb();
    const proj: ProjectRecord = {
      id: `proj-${crypto.randomUUID()}`,
      ...parsed.data,
      dataOrigin: 'Officially Published or Confirmed',
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
      updates: [],
    };
    db.projects.unshift(proj);
    recordAudit(req.currentUser!.email, 'PROJECT_PUBLISHED', 'project', proj.id, proj.name, req.currentUser!.id);
    persistState();
    res.status(201).json(proj);
  });

  app.post('/api/admin/departments', requireRoles(['content_admin', 'super_admin']), (req: AuthRequest, res) => {
    const schema = z.object({
      name: z.string().trim().min(3).max(180),
      shortName: z.string().trim().min(2).max(30),
      departmentType: z.enum([
        'Central Government',
        'State Government',
        'Municipal Corporation',
        'Municipal Council',
        'Urban Local Body',
        'District Administration',
        'Water Supply Authority',
        'Electricity Authority',
        'Sanitation Department',
        'Public Works Department',
        'Transport Authority',
      ]),
      description: z.string().trim().min(10).max(1200),
      jurisdiction: z.string().trim().min(2).max(160),
      state: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      officialWebsite: safeUrlSchema,
      complaintPortal: safeUrlSchema,
      publishedContact: z.string().trim().max(200),
      sourceName: z.string().trim().min(2).max(120),
      sourceUrl: safeUrlSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid department data' });
      return;
    }
    const db = getDb();
    const dept: DepartmentRecord = {
      id: `dept-${crypto.randomUUID()}`,
      ...parsed.data,
      responsibilities: [parsed.data.description],
      civicCategories: ['Other Civic Problems'],
      dataOrigin: 'Officially Published or Confirmed',
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
    };
    db.departments.unshift(dept);
    recordAudit(req.currentUser!.email, 'DEPARTMENT_ADDED', 'department', dept.id, dept.name, req.currentUser!.id);
    persistState();
    res.status(201).json(dept);
  });

  app.post('/api/admin/articles', requireRoles(['content_admin', 'super_admin']), (req: AuthRequest, res) => {
    const schema = z.object({
      title: z.string().trim().min(6).max(200),
      category: z.string().trim().min(3).max(120),
      summary: z.string().trim().min(15).max(500),
      contentEn: z.string().trim().min(40).max(12000),
      summaryKn: z.string().trim().max(500).optional(),
      summaryHi: z.string().trim().max(500).optional(),
      sourceTitle: z.string().trim().min(2).max(160),
      sourceUrl: safeUrlSchema,
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid article data' });
      return;
    }
    const db = getDb();
    const slug = parsed.data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
    const article: KnowledgeArticle = {
      id: `art-${crypto.randomUUID()}`,
      slug: `${slug}-${Date.now().toString(36)}`,
      title: parsed.data.title,
      category: parsed.data.category,
      summary: parsed.data.summary,
      contentEn: parsed.data.contentEn,
      summaryKn: parsed.data.summaryKn || parsed.data.summary,
      summaryHi: parsed.data.summaryHi || parsed.data.summary,
      readTimeMinutes: Math.max(3, Math.ceil(parsed.data.contentEn.split(/\s+/).length / 180)),
      references: [{ title: parsed.data.sourceTitle, url: parsed.data.sourceUrl }],
      dataOrigin: 'Independently Verified',
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
    };
    db.knowledgeArticles.unshift(article);
    recordAudit(req.currentUser!.email, 'ARTICLE_PUBLISHED', 'knowledge_article', article.id, article.title, req.currentUser!.id);
    persistState();
    res.status(201).json(article);
  });

  // --- Serve Vite Dev Middleware or Built SPA ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicLens server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
