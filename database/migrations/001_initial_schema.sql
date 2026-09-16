-- PostgreSQL + PostGIS Production Migration: 001_initial_schema.sql
-- Feeder.life Production Database Architecture

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TYPE user_role AS ENUM ('USER', 'MODERATOR', 'COMMUNITY_ADMIN', 'PLATFORM_MODERATOR', 'PLATFORM_ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE community_category AS ENUM ('DOGS', 'CATS', 'RESCUE', 'BIRDS', 'COMMUNITY', 'LARGE_ANIMALS', 'GENERAL');
CREATE TYPE membership_role AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
CREATE TYPE membership_status AS ENUM ('PENDING', 'APPROVED', 'BANNED');
CREATE TYPE post_content_type AS ENUM ('NORMAL', 'PHOTO', 'VIDEO', 'FEEDING_UPDATE', 'HELP_REQUEST', 'SOS_PREVIEW');
CREATE TYPE content_visibility AS ENUM ('PUBLIC', 'COMMUNITY', 'FOLLOWERS', 'PRIVATE');
CREATE TYPE post_status AS ENUM ('PUBLISHED', 'UNDER_REVIEW', 'REMOVED');
CREATE TYPE reaction_kind AS ENUM ('SUPPORT', 'HELPFUL', 'THANK_YOU', 'CARE');
CREATE TYPE sos_emergency_type AS ENUM ('INJURED_ANIMAL', 'ACCIDENT', 'ABANDONED', 'ANIMAL_IN_DANGER', 'TRAPPED', 'CRUELTY', 'OTHER');
CREATE TYPE sos_urgency_level AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE sos_status_enum AS ENUM ('OPEN', 'HELP_REQUESTED', 'RESPONDING', 'RESOLVED', 'CLOSED');
CREATE TYPE report_reason AS ENUM ('SPAM', 'HARASSMENT', 'ANIMAL_CRUELTY', 'DANGEROUS_CONTENT', 'FRAUD', 'FALSE_SOS', 'ILLEGAL', 'GRAPHIC', 'PRIVACY_VIOLATION', 'OTHER');
CREATE TYPE report_status AS ENUM ('PENDING', 'UNDER_REVIEW', 'ACTIONED', 'REJECTED', 'ESCALATED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(30),
  is_verified BOOLEAN DEFAULT FALSE,
  role user_role DEFAULT 'USER',
  status user_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  area_name VARCHAR(150),
  city VARCHAR(100),
  approx_location GEOMETRY(Point, 4326),
  feeder_level VARCHAR(50) DEFAULT 'Grassroots Feeder',
  feeding_count INTEGER DEFAULT 0,
  sos_responses_count INTEGER DEFAULT 0,
  community_contributions_count INTEGER DEFAULT 0,
  cover_url TEXT,
  badges JSONB DEFAULT '["Volunteer Feeder"]'::jsonb,
  privacy_settings JSONB DEFAULT '{"show_approx_location": true, "allow_messages": true}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category community_category NOT NULL,
  location_area VARCHAR(150),
  cover_image TEXT,
  avatar_image TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  rules_text TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER DEFAULT 1,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role DEFAULT 'MEMBER',
  status membership_status DEFAULT 'APPROVED',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  content_type post_content_type DEFAULT 'NORMAL',
  title VARCHAR(255),
  body TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  location_name VARCHAR(150),
  approx_location GEOMETRY(Point, 4326),
  visibility content_visibility DEFAULT 'PUBLIC',
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  status post_status DEFAULT 'PUBLISHED',
  safety_score NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type reaction_kind NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  status post_status DEFAULT 'PUBLISHED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feeding_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  animal_type VARCHAR(100) NOT NULL,
  animal_count INTEGER DEFAULT 1,
  food_type VARCHAR(150) NOT NULL,
  quantity_desc VARCHAR(100),
  approx_location_name VARCHAR(150) NOT NULL,
  approx_location GEOMETRY(Point, 4326),
  notes TEXT,
  photo_url TEXT,
  visibility content_visibility DEFAULT 'PUBLIC',
  fed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sos_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emergency_type sos_emergency_type NOT NULL,
  animal_type VARCHAR(100) NOT NULL,
  urgency sos_urgency_level NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  approx_location_name VARCHAR(150) NOT NULL,
  approx_location GEOMETRY(Point, 4326) NOT NULL,
  media_urls JSONB DEFAULT '[]'::jsonb,
  contact_preference VARCHAR(50) DEFAULT 'IN_APP',
  status sos_status_enum DEFAULT 'OPEN',
  responder_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID NOT NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status DEFAULT 'PENDING',
  resolution_notes TEXT,
  moderator_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geospatial and performance indexes
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_sos_urgency ON sos_cases(urgency, status);
CREATE INDEX idx_sos_geo ON sos_cases USING GIST (approx_location);
CREATE INDEX idx_feeding_geo ON feeding_logs USING GIST (approx_location);
