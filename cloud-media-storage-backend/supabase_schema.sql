-- ==============================================================================
-- Cloud Media Files Storage Service - Supabase PostgreSQL Schema
-- Migration from local db.ts to Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Supports custom IDs (e.g. 'usr_alice_01') or UUIDs
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- ==============================================================================
-- 2. FOLDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    color TEXT DEFAULT '#3b82f6',
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for folder queries (navigation, parent-child, trash, stars)
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders (user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_is_deleted ON public.folders (is_deleted);
CREATE INDEX IF NOT EXISTS idx_folders_is_starred ON public.folders (is_starred);

-- ==============================================================================
-- 3. FILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL, -- Supabase Storage object path or bucket relative path
    folder_id TEXT REFERENCES public.folders(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb, -- width, height, duration, extension, etc.
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for file queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files (user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON public.files (mime_type);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON public.files (is_deleted);
CREATE INDEX IF NOT EXISTS idx_files_is_starred ON public.files (is_starred);
CREATE INDEX IF NOT EXISTS idx_files_metadata ON public.files USING gin (metadata);

-- ==============================================================================
-- 4. SHARES TABLE (Collaborator Access)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shares (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id TEXT NOT NULL, -- Reference to files.id or folders.id
    owner_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    shared_with_user_id TEXT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    shared_with_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for share queries
CREATE INDEX IF NOT EXISTS idx_shares_resource ON public.shares (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner ON public.shares (owner_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with_user ON public.shares (shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with_email ON public.shares (shared_with_email);

-- ==============================================================================
-- 5. PUBLIC_LINKS TABLE (Shareable Links)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.public_links (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id TEXT NOT NULL, -- Reference to files.id or folders.id
    owner_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    allow_download BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for public link resolution
CREATE INDEX IF NOT EXISTS idx_public_links_token ON public.public_links (token);
CREATE INDEX IF NOT EXISTS idx_public_links_resource ON public.public_links (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_public_links_owner ON public.public_links (owner_id);

-- ==============================================================================
-- OPTIONAL HELPER: ACTIVITIES TABLE (Audit Log & Recent Activity)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('upload', 'create_folder', 'rename', 'move', 'delete', 'restore', 'share', 'star')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('file', 'folder')),
    resource_id TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON public.activities (user_id, created_at DESC);

-- ==============================================================================
-- SEED DATA (Alice & Bob with Initial Folder & File Structure)
-- ==============================================================================
INSERT INTO public.users (id, name, email, password_hash, avatar_color)
VALUES
    ('usr_alice_01', 'Alice Johnson', 'alice@example.com', '$2b$10$6qE/zS7hoX74lu/bWgBSj.5oKyh5kTaa6Ns.dK4n0RRbP7E88QJX6', '#3b82f6'),
    ('usr_bob_02', 'Bob Smith', 'bob@example.com', '$2b$10$6qE/zS7hoX74lu/bWgBSj.5oKyh5kTaa6Ns.dK4n0RRbP7E88QJX6', '#10b981')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.folders (id, name, parent_id, user_id, color, is_starred)
VALUES
    ('fld_docs_01', 'Documents', NULL, 'usr_alice_01', '#3b82f6', TRUE),
    ('fld_photos_02', 'Photos & Media', NULL, 'usr_alice_01', '#ec4899', FALSE),
    ('fld_proj_03', 'Projects & Work', NULL, 'usr_alice_01', '#8b5cf6', TRUE),
    ('fld_sub_archive_04', 'Archive 2025', 'fld_docs_01', 'usr_alice_01', '#64748b', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.shares (id, resource_type, resource_id, owner_id, shared_with_user_id, shared_with_email, role)
VALUES
    ('shr_01', 'folder', 'fld_proj_03', 'usr_alice_01', 'usr_bob_02', 'bob@example.com', 'editor')
ON CONFLICT (id) DO NOTHING;
