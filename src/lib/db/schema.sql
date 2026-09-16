-- Feeder.life Relational Database Schema
-- Compatible with SQLite & PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  is_verified INTEGER DEFAULT 0,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'MODERATOR', 'COMMUNITY_ADMIN', 'PLATFORM_MODERATOR', 'PLATFORM_ADMIN')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  area_name TEXT,
  city TEXT,
  approx_lat REAL,
  approx_lon REAL,
  feeder_level TEXT DEFAULT 'Grassroots Feeder',
  feeding_count INTEGER DEFAULT 0,
  sos_responses_count INTEGER DEFAULT 0,
  community_contributions_count INTEGER DEFAULT 0,
  cover_url TEXT,
  badges_json TEXT DEFAULT '["Volunteer Feeder"]',
  privacy_settings_json TEXT DEFAULT '{"show_approx_location": true, "allow_messages": true}',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('DOGS', 'CATS', 'RESCUE', 'BIRDS', 'COMMUNITY', 'LARGE_ANIMALS', 'GENERAL')),
  location_area TEXT,
  cover_image TEXT,
  avatar_image TEXT,
  is_private INTEGER DEFAULT 0,
  rules_text TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  post_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_members (
  id TEXT PRIMARY KEY,
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'MODERATOR', 'ADMIN')),
  status TEXT DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'BANNED')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id TEXT REFERENCES communities(id) ON DELETE CASCADE,
  content_type TEXT DEFAULT 'NORMAL' CHECK (content_type IN ('NORMAL', 'PHOTO', 'VIDEO', 'FEEDING_UPDATE', 'HELP_REQUEST', 'SOS_PREVIEW')),
  title TEXT,
  body TEXT NOT NULL,
  media_urls_json TEXT DEFAULT '[]',
  tags_json TEXT DEFAULT '[]',
  location_name TEXT,
  approx_lat REAL,
  approx_lon REAL,
  visibility TEXT DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'COMMUNITY', 'FOLLOWERS', 'PRIVATE')),
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  is_pinned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'UNDER_REVIEW', 'REMOVED')),
  safety_score REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('SUPPORT', 'HELPFUL', 'THANK_YOU', 'CARE')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'REMOVED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_shares (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('POST', 'SOS', 'FEEDING', 'COMMUNITY')),
  item_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS feeding_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_type TEXT NOT NULL,
  animal_count INTEGER DEFAULT 1,
  food_type TEXT NOT NULL,
  quantity_desc TEXT,
  approx_location_name TEXT NOT NULL,
  approx_lat REAL,
  approx_lon REAL,
  notes TEXT,
  photo_url TEXT,
  visibility TEXT DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'COMMUNITY', 'PRIVATE')),
  fed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sos_cases (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_type TEXT NOT NULL CHECK (emergency_type IN ('INJURED_ANIMAL', 'ACCIDENT', 'ABANDONED', 'ANIMAL_IN_DANGER', 'TRAPPED', 'CRUELTY', 'OTHER')),
  animal_type TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  approx_location_name TEXT NOT NULL,
  approx_lat REAL NOT NULL,
  approx_lon REAL NOT NULL,
  media_urls_json TEXT DEFAULT '[]',
  contact_preference TEXT DEFAULT 'IN_APP' CHECK (contact_preference IN ('IN_APP', 'PHONE_ON_REQUEST', 'COMMUNITY')),
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'HELP_REQUESTED', 'RESPONDING', 'RESOLVED', 'CLOSED')),
  responder_count INTEGER DEFAULT 0,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sos_responders (
  id TEXT PRIMARY KEY,
  sos_id TEXT NOT NULL REFERENCES sos_cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'COMMITTED' CHECK (status IN ('COMMITTED', 'ON_SITE', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sos_id, user_id)
);

CREATE TABLE IF NOT EXISTS sos_updates (
  id TEXT PRIMARY KEY,
  sos_id TEXT NOT NULL REFERENCES sos_cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  status_change TEXT,
  photo_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('COMMENT', 'REPLY', 'REACTION', 'COMMUNITY_INVITE', 'COMMUNITY_APPROVAL', 'SOS_NEARBY', 'SOS_UPDATE', 'FEEDING_ACTIVITY', 'SYSTEM')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('POST', 'COMMENT', 'COMMUNITY', 'SOS', 'USER')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('SPAM', 'HARASSMENT', 'ANIMAL_CRUELTY', 'DANGEROUS_CONTENT', 'FRAUD', 'FALSE_SOS', 'ILLEGAL', 'GRAPHIC', 'PRIVACY_VIOLATION', 'OTHER')),
  details TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'ACTIONED', 'REJECTED', 'ESCALATED')),
  resolution_notes TEXT,
  moderator_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS mutes (
  id TEXT PRIMARY KEY,
  muter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(muter_id, muted_id)
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM')),
  content TEXT NOT NULL,
  suggested_actions_json TEXT DEFAULT '[]',
  safety_flags_json TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  description TEXT NOT NULL,
  ip_address TEXT,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_sos_cases_status ON sos_cases(status);
CREATE INDEX IF NOT EXISTS idx_sos_cases_created ON sos_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_user ON feeding_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_created ON feeding_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Social Graph Relationships
CREATE TABLE IF NOT EXISTS user_relationships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('FOLLOW', 'FRIEND')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_id, relationship_type)
);
CREATE INDEX IF NOT EXISTS idx_relationships_user ON user_relationships(user_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON user_relationships(target_id, relationship_type);

-- 24h Temporary Stories
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO')),
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at DESC);

CREATE TABLE IF NOT EXISTS story_views (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, viewer_id)
);

-- User-to-User Conversations and Messaging
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'DIRECT' CHECK (type IN ('DIRECT', 'GROUP')),
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'MEMBER',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME,
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  media_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at ASC);
