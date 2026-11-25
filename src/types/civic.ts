export type UserRole = 'citizen' | 'moderator' | 'content_admin' | 'super_admin';

export type DataOriginLabel =
  | 'Citizen Submitted'
  | 'AI Generated'
  | 'Independently Verified'
  | 'Officially Published or Confirmed';

export type IssueStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Verified'
  | 'Forwarded to Authority'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export type CivicCategory =
  | 'Roads and Infrastructure'
  | 'Water Supply'
  | 'Drainage and Sanitation'
  | 'Waste Management'
  | 'Streetlights'
  | 'Public Transportation'
  | 'Air and Noise Pollution'
  | 'Public Parks'
  | 'Public Safety Infrastructure'
  | 'Other Civic Problems';

export type ProjectStatus = 'Planned' | 'Approved' | 'In Progress' | 'Completed' | 'Delayed';

export type DepartmentType =
  | 'Central Government'
  | 'State Government'
  | 'Municipal Corporation'
  | 'Municipal Council'
  | 'Urban Local Body'
  | 'District Administration'
  | 'Water Supply Authority'
  | 'Electricity Authority'
  | 'Sanitation Department'
  | 'Public Works Department'
  | 'Transport Authority';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  homeLocationSlug?: string;
  preferredLanguage: string;
  privacyHideProfile: boolean;
  followedLocations: string[];
  savedIssueIds: string[];
  bookmarkedArticleIds: string[];
  createdAt: string;
}

export interface LocationRecord {
  id: string;
  slug: string;
  name: string;
  level: 'state' | 'district' | 'city' | 'municipal' | 'ward' | 'locality';
  state: string;
  district: string;
  city: string;
  wardNumber?: string;
  pinCode?: string;
  latitude: number;
  longitude: number;
  dataCoverage: 'pilot_active' | 'partial' | 'directory_only';
  civicOverview: string;
  infrastructureSummary: string[];
  announcements: {
    id: string;
    title: string;
    date: string;
    sourceName: string;
    sourceUrl: string;
    dataOrigin: DataOriginLabel;
  }[];
}

export interface IssueMedia {
  id: string;
  issueId: string;
  mediaType: 'image' | 'video';
  url: string;
  caption?: string;
  createdAt: string;
}

export interface IssueUpdate {
  id: string;
  issueId: string;
  status: IssueStatus;
  note: string;
  updatedByName: string;
  updatedByRole: UserRole;
  isOfficialAuthorityConfirmation: boolean;
  createdAt: string;
}

export interface CivicIssue {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: CivicCategory;
  subCategory?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  verificationStatus: 'Unverified' | 'Under Review' | 'Verified' | 'Rejected';
  dataOrigin: DataOriginLabel;
  isDemo: boolean;
  locationSlug: string;
  state: string;
  district: string;
  city: string;
  locality: string;
  pinCode?: string;
  latitude: number;
  longitude: number;
  observedDate: string;
  additionalNotes?: string;
  reporterUserId?: string;
  reporterName: string;
  responsibleDepartmentId?: string;
  responsibleDepartmentName?: string;
  officialReference?: string;
  duplicateOfIssueId?: string;
  supportCount: number;
  supportedByUserIds: string[];
  media: IssueMedia[];
  updates: IssueUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  shortName: string;
  departmentType: DepartmentType;
  description: string;
  jurisdiction: string;
  state: string;
  city: string;
  responsibilities: string[];
  civicCategories: CivicCategory[];
  officialWebsite: string;
  complaintPortal: string;
  publishedContact: string;
  sourceName: string;
  sourceUrl: string;
  dataOrigin: DataOriginLabel;
  lastUpdatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  locationSlug: string;
  state: string;
  city: string;
  locality: string;
  latitude: number;
  longitude: number;
  departmentId?: string;
  departmentName: string;
  publishedBudget: string;
  startDate: string;
  expectedCompletion: string;
  status: ProjectStatus;
  progressPercent: number;
  imageUrl?: string;
  sourceName: string;
  sourceUrl: string;
  dataOrigin: DataOriginLabel;
  lastUpdatedAt: string;
  updates: { id: string; summary: string; date: string; sourceUrl?: string }[];
}

export interface DiscussionComment {
  id: string;
  discussionId: string;
  authorUserId?: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DiscussionRecord {
  id: string;
  title: string;
  body: string;
  category: CivicCategory;
  locationSlug: string;
  localityName: string;
  city: string;
  relatedIssueId?: string;
  authorUserId?: string;
  authorName: string;
  isDemo: boolean;
  supportCount: number;
  supportedByUserIds: string[];
  flaggedCount: number;
  moderationStatus: 'approved' | 'flagged' | 'removed';
  comments: DiscussionComment[];
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  contentEn: string;
  summaryKn: string;
  summaryHi: string;
  readTimeMinutes: number;
  imageUrl?: string;
  references: { title: string; url: string }[];
  dataOrigin: DataOriginLabel;
  lastUpdatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface StructuredAiResponse {
  directAnswer: string;
  explanation: string;
  possibleCauses: string[];
  citizenImpact: string;
  likelyDepartment: {
    name: string;
    jurisdiction: string;
    confidenceNote: string;
  };
  recommendedSteps: string[];
  sources: {
    title: string;
    url: string;
    label: DataOriginLabel;
  }[];
  certaintyNote: string;
  languageName: string;
}

export interface AiMessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: StructuredAiResponse;
  createdAt: string;
}

export interface AiConversationRecord {
  id: string;
  userId?: string;
  title: string;
  localityContext: string;
  language: string;
  messages: AiMessageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId?: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface PlatformStats {
  totalReports: number;
  demoReports: number;
  liveCitizenReports: number;
  verifiedIssues: number;
  resolvedIssues: number;
  activeProjects: number;
  totalDepartments: number;
  totalLocations: number;
  totalDiscussions: number;
}
