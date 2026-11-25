-- CivicLens Production PostgreSQL / Supabase Schema Migration
-- Includes all 17 relational tables, foreign keys, indexes, constraints, and Row Level Security (RLS) policies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'moderator', 'content_admin', 'super_admin')),
  home_location_id UUID,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  avatar_initials TEXT,
  privacy_hide_profile BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('country', 'state', 'district', 'city', 'municipal', 'ward', 'locality')),
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  ward_number TEXT,
  pin_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  data_coverage TEXT NOT NULL DEFAULT 'partial' CHECK (data_coverage IN ('pilot_active', 'partial', 'directory_only')),
  civic_overview TEXT,
  announcements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. sources
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  source_category TEXT NOT NULL CHECK (source_category IN ('central_gov', 'state_gov', 'municipal', 'district', 'open_data', 'project_report', 'public_portal')),
  verification_label TEXT NOT NULL CHECK (verification_label IN ('Officially Published or Confirmed', 'Independently Verified', 'Citizen Submitted', 'AI Generated')),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  department_type TEXT NOT NULL CHECK (department_type IN ('central', 'state', 'municipal_corporation', 'municipal_council', 'urban_local_body', 'district_admin', 'water_supply', 'electricity', 'sanitation', 'public_works', 'transport')),
  description TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT,
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  civic_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  official_website TEXT,
  complaint_portal TEXT,
  published_contact TEXT,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  data_origin TEXT NOT NULL DEFAULT 'Officially Published or Confirmed',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. civic_issues
CREATE TABLE IF NOT EXISTS civic_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Verified', 'Forwarded to Authority', 'In Progress', 'Resolved', 'Rejected')),
  verification_status TEXT NOT NULL DEFAULT 'Unverified' CHECK (verification_status IN ('Unverified', 'Under Review', 'Verified', 'Rejected')),
  data_origin TEXT NOT NULL DEFAULT 'Citizen Submitted',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  pin_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  observed_date DATE NOT NULL,
  additional_notes TEXT,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  responsible_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  official_reference TEXT,
  duplicate_of_issue_id UUID REFERENCES civic_issues(id) ON DELETE SET NULL,
  support_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. issue_media
CREATE TABLE IF NOT EXISTS issue_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. issue_updates
CREATE TABLE IF NOT EXISTS issue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official_authority_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  published_budget TEXT NOT NULL,
  start_date TEXT NOT NULL,
  expected_completion TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Planned', 'Approved', 'In Progress', 'Completed', 'Delayed')),
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  image_url TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  data_origin TEXT NOT NULL DEFAULT 'Officially Published or Confirmed',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. project_updates
CREATE TABLE IF NOT EXISTS project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  source_url TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. discussions
CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  locality_name TEXT NOT NULL,
  city TEXT NOT NULL,
  related_issue_id UUID REFERENCES civic_issues(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'flagged', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. reactions
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('issue', 'discussion', 'article')),
  target_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('support', 'save', 'follow')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id, reaction_type)
);

-- 13. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. knowledge_articles
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_en TEXT NOT NULL,
  summary_kn TEXT,
  summary_hi TEXT,
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  image_url TEXT,
  references_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_origin TEXT NOT NULL DEFAULT 'Independently Verified',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  locality_context TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. ai_messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  structured_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_civic_issues_location ON civic_issues(state, city, locality);
CREATE INDEX IF NOT EXISTS idx_civic_issues_status ON civic_issues(status, category);
CREATE INDEX IF NOT EXISTS idx_projects_city_status ON projects(city, status);
CREATE INDEX IF NOT EXISTS idx_departments_state_type ON departments(state, department_type);
CREATE INDEX IF NOT EXISTS idx_discussions_city ON discussions(city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Row Level Security (Supabase / PostgreSQL)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read civic issues" ON civic_issues FOR SELECT USING (true);
CREATE POLICY "Authenticated insert civic issues" ON civic_issues FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own AI conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator', 'content_admin', 'super_admin'))
);
