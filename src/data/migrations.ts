/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Migration {
  filename: string;
  title: string;
  description: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    filename: "001_chunks_mirror_core.sql",
    title: "Core Chunks Schema Setup",
    description: "Creates core tables: courses, lessons, lesson_sections, sentence_resources, cci_categories, cci_standard_cards, cvr_units, learners, practice_rooms, room_memberships, room_rounds, and learner_responses.",
    sql: `-- 001_chunks_mirror_core.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Lesson Sections Table
CREATE TABLE IF NOT EXISTS lesson_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create CVR Units Table
CREATE TABLE IF NOT EXISTS cvr_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    unit_symbol TEXT NOT NULL DEFAULT 'Ω',
    value NUMERIC NOT NULL CHECK (value >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Sentence Resources Table
CREATE TABLE IF NOT EXISTS sentence_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    section_id UUID REFERENCES lesson_sections(id) ON DELETE SET NULL,
    sentence_code TEXT NOT NULL,
    text_prompt TEXT,
    text_en TEXT,
    text_vi TEXT,
    audio_url TEXT,
    audio_en_url TEXT,
    audio_vi_url TEXT,
    audio_variants JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_cvr_unit_id UUID REFERENCES cvr_units(id) ON DELETE SET NULL,
    default_cvr_value NUMERIC NOT NULL DEFAULT 1,
    cvr_value NUMERIC NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create CCI Categories Table
CREATE TABLE IF NOT EXISTS cci_categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create CCI Standard Cards Table
CREATE TABLE IF NOT EXISTS cci_standard_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id TEXT NOT NULL REFERENCES cci_categories(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    standard_value NUMERIC NOT NULL CHECK (standard_value >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Learners Table
CREATE TABLE IF NOT EXISTS learners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE,
    display_name TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'anonymous' CHECK (source IN ('manual', 'imported', 'anonymous')),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Practice Rooms Table
CREATE TABLE IF NOT EXISTS practice_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'round_open', 'round_closed', 'finished')),
    current_round_id UUID, -- Will point to room_rounds after tables created
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    host_name TEXT,
    resource_scope_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    snapshot_sentence_resource_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    scope_refreshed_at TIMESTAMPTZ,
    scoring_mode TEXT NOT NULL DEFAULT 'simple' CHECK (scoring_mode IN ('simple', 'timed')),
    default_response_capture_mode TEXT NOT NULL DEFAULT 'first_responder' CHECK (default_response_capture_mode IN ('assigned', 'first_responder', 'auto_rotate')),
    teacher_pin_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Room Memberships Table
CREATE TABLE IF NOT EXISTS room_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES practice_rooms(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    presence_status TEXT NOT NULL DEFAULT 'online' CHECK (presence_status IN ('online', 'offline', 'left')),
    can_answer BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_room_learner UNIQUE (room_id, learner_id)
);

-- Create Room Rounds Table
CREATE TABLE IF NOT EXISTS room_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES practice_rooms(id) ON DELETE CASCADE,
    sentence_resource_id UUID NOT NULL REFERENCES sentence_resources(id) ON DELETE CASCADE,
    assigned_learner_id UUID REFERENCES learners(id) ON DELETE SET NULL,
    captured_learner_id UUID REFERENCES learners(id) ON DELETE SET NULL,
    cci_standard_card_id UUID REFERENCES cci_standard_cards(id) ON DELETE SET NULL,
    cci_standard_x NUMERIC NOT NULL DEFAULT 1,
    cvr_value NUMERIC NOT NULL DEFAULT 1,
    round_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
    response_capture_mode_snapshot TEXT NOT NULL CHECK (response_capture_mode_snapshot IN ('assigned', 'first_responder', 'auto_rotate')),
    scoring_mode_snapshot TEXT NOT NULL CHECK (scoring_mode_snapshot IN ('simple', 'timed')),
    opened_by TEXT,
    sequence_key TEXT,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter practice_rooms to add foreign key to room_rounds safely
ALTER TABLE practice_rooms ADD CONSTRAINT fk_current_round FOREIGN KEY (current_round_id) REFERENCES room_rounds(id) ON DELETE SET NULL;

-- Create Learner Responses Table
CREATE TABLE IF NOT EXISTS learner_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES room_rounds(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    response_color TEXT NOT NULL CHECK (response_color IN ('red', 'yellow', 'green', 'purple')),
    performance_y INTEGER NOT NULL CHECK (performance_y IN (0, 1, 2, 3)),
    reflection_time_ms INTEGER NOT NULL DEFAULT 0,
    reflection_seconds NUMERIC NOT NULL DEFAULT 0,
    cci_standard_x NUMERIC NOT NULL,
    cvr_value NUMERIC NOT NULL,
    cci_result NUMERIC NOT NULL,
    cpd_result NUMERIC NOT NULL,
    finalized BOOLEAN NOT NULL DEFAULT false,
    scoring_mode_snapshot TEXT NOT NULL,
    response_capture_mode_snapshot TEXT NOT NULL,
    formula_version_snapshot TEXT NOT NULL DEFAULT 'simple-v1',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_round_response UNIQUE (round_id)
);

-- Create Learner Progress Summary Table
CREATE TABLE IF NOT EXISTS learner_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    total_cpd NUMERIC NOT NULL DEFAULT 0,
    finalized_rounds INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_learner_course_lesson UNIQUE (learner_id, course_id, lesson_id)
);

-- Add helpful indexing
CREATE INDEX IF NOT EXISTS idx_sentence_resources_scope ON sentence_resources (course_id, lesson_id, section_id);
CREATE INDEX IF NOT EXISTS idx_practice_rooms_code ON practice_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_room_memberships_room_learner ON room_memberships (room_id, learner_id);
CREATE INDEX IF NOT EXISTS idx_room_rounds_room ON room_rounds (room_id);
CREATE INDEX IF NOT EXISTS idx_learner_responses_round ON learner_responses (round_id);
`
  },
  {
    filename: "002_fix_response_finalization_trigger.sql",
    title: "Database Scoring Functions & Finalization Triggers",
    description: "Defines the core formula calculation function calculate_live_room_score, plus triggers to handle automatic score calculations, response eligibility validations, and round finalization rules.",
    sql: `-- 002_fix_response_finalization_trigger.sql

-- Score calculation helper function
CREATE OR REPLACE FUNCTION calculate_live_room_score(
    p_scoring_mode TEXT,
    p_cci_standard_x NUMERIC,
    p_performance_y INTEGER,
    p_cvr_value NUMERIC,
    p_reflection_time_ms INTEGER,
    OUT o_reflection_seconds NUMERIC,
    OUT o_cci_result NUMERIC,
    OUT o_cpd_result NUMERIC
) AS $$
DECLARE
    v_reflection_sec NUMERIC;
BEGIN
    -- Derive reflection seconds
    v_reflection_sec := COALESCE(p_reflection_time_ms, 0)::NUMERIC / 1000.0;
    IF v_reflection_sec <= 0 THEN
        v_reflection_sec := 1.0; -- Avoid division by zero
    END IF;
    
    o_reflection_seconds := v_reflection_sec;

    IF p_scoring_mode = 'timed' THEN
        -- timed CCI = CCI Standard X * (Performance Y / Reflection Seconds)
        o_cci_result := p_cci_standard_x * (p_performance_y::NUMERIC / v_reflection_sec);
    ELSE
        -- simple CCI = CCI Standard X * Performance Y
        o_cci_result := p_cci_standard_x * p_performance_y::NUMERIC;
    END IF;

    -- CPD = CCI * CVR Ω
    o_cpd_result := o_cci_result * p_cvr_value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to validate and calculate fields BEFORE inserting/updating learner_responses
CREATE OR REPLACE FUNCTION trigger_prepare_learner_response()
RETURNS TRIGGER AS $$
DECLARE
    v_round_status TEXT;
    v_assigned_learner_id UUID;
    v_capture_mode TEXT;
    v_scoring_mode TEXT;
    v_cci_standard_x NUMERIC;
    v_cvr_value NUMERIC;
    v_reflection_sec NUMERIC;
    v_cci_res NUMERIC;
    v_cpd_res NUMERIC;
BEGIN
    -- Fetch parent round data
    SELECT status, assigned_learner_id, response_capture_mode_snapshot, scoring_mode_snapshot, cci_standard_x, cvr_value
    INTO v_round_status, v_assigned_learner_id, v_capture_mode, v_scoring_mode, v_cci_standard_x, v_cvr_value
    FROM room_rounds
    WHERE id = NEW.round_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Associated round % not found', NEW.round_id;
    END IF;

    -- 1. Ensure the round is open (unless updating finalized state by system trigger)
    IF v_round_status <> 'open' AND (TG_OP = 'INSERT' OR (OLD.finalized = NEW.finalized)) THEN
        RAISE EXCEPTION 'Responses can only be submitted or modified while the round is open';
    END IF;

    -- 2. Reject changes to already finalized responses
    IF TG_OP = 'UPDATE' AND OLD.finalized = true THEN
        RAISE EXCEPTION 'Finalized response is immutable and cannot be modified';
    END IF;

    -- 3. Validate capture mode eligibility
    IF v_capture_mode = 'assigned' OR v_capture_mode = 'auto_rotate' THEN
        IF v_assigned_learner_id IS NOT NULL AND NEW.learner_id <> v_assigned_learner_id THEN
            RAISE EXCEPTION 'Learner % is not assigned to this round', NEW.learner_id;
        END IF;
    END IF;

    -- 4. Calculate score snapshots dynamically
    SELECT o_reflection_seconds, o_cci_result, o_cpd_result
    INTO v_reflection_sec, v_cci_res, v_cpd_res
    FROM calculate_live_room_score(
        v_scoring_mode,
        v_cci_standard_x,
        NEW.performance_y,
        v_cvr_value,
        NEW.reflection_time_ms
    );

    NEW.reflection_seconds := v_reflection_sec;
    NEW.cci_standard_x := v_cci_standard_x;
    NEW.cvr_value := v_cvr_value;
    NEW.cci_result := v_cci_res;
    NEW.cpd_result := v_cpd_res;
    NEW.scoring_mode_snapshot := v_scoring_mode;
    NEW.response_capture_mode_snapshot := v_capture_mode;
    NEW.formula_version_snapshot := 'simple-v1';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prepare_learner_response
BEFORE INSERT OR UPDATE ON learner_responses
FOR EACH ROW
EXECUTE FUNCTION trigger_prepare_learner_response();

-- Trigger to finalize responses when a round closes
CREATE OR REPLACE FUNCTION trigger_finalize_round_responses()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
        -- Finalize the accepted response for this round
        UPDATE learner_responses
        SET finalized = true,
            updated_at = NOW()
        WHERE round_id = NEW.id;
        
        -- Mark captured learner id on the round for easy reporting
        UPDATE room_rounds
        SET captured_learner_id = (SELECT learner_id FROM learner_responses WHERE round_id = NEW.id LIMIT 1)
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_finalize_round_responses
AFTER UPDATE ON room_rounds
FOR EACH ROW
EXECUTE FUNCTION trigger_finalize_round_responses();
`
  },
  {
    filename: "003_audio_generation_jobs.sql",
    title: "Audio Generation Jobs Table Setup",
    description: "Sets up the audio_generation_jobs table and triggers to support background text-to-speech job tracking and automatic update of sentence resource audio fields on completion.",
    sql: `-- 003_audio_generation_jobs.sql

CREATE TABLE IF NOT EXISTS audio_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES sentence_resources(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
    provider TEXT,
    model TEXT,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    error_message TEXT,
    requested_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT unique_resource_lang_path UNIQUE (resource_id, language, storage_path)
);

-- Trigger to automatically update sentence_resources when a job succeeds
CREATE OR REPLACE FUNCTION trigger_apply_completed_audio_url()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'succeeded' AND OLD.status <> 'succeeded' AND NEW.public_url IS NOT NULL THEN
        IF NEW.language = 'en' THEN
            UPDATE sentence_resources
            SET audio_en_url = NEW.public_url,
                updated_at = NOW()
            WHERE id = NEW.resource_id;
        ELSIF NEW.language = 'vi' THEN
            UPDATE sentence_resources
            SET audio_vi_url = NEW.public_url,
                updated_at = NOW()
            WHERE id = NEW.resource_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_apply_completed_audio_url
AFTER UPDATE ON audio_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_apply_completed_audio_url();
`
  },
  {
    filename: "004_allow_first_responder_learner_responses.sql",
    title: "Support First-Responder Concurrency",
    description: "Relaxes strict database constraints if needed or configures optimal locks. Emphasizes that in 'first_responder' mode, only the very first accepted response is recorded using the unique constraint (round_id) in the learner_responses table.",
    sql: `-- 004_allow_first_responder_learner_responses.sql

-- Verify that learner_responses has a unique constraint on round_id
-- This enforces that exactly ONE learner response can be saved per round.
-- When 10 learners submit simultaneously, Postgres' transaction isolation levels
-- will reject all duplicate rows for the same round_id, securing first-come first-served integrity.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_round_response'
    ) THEN
        ALTER TABLE learner_responses ADD CONSTRAINT unique_round_response UNIQUE (round_id);
    END IF;
END;
$$;
`
  },
  {
    filename: "005_enable_realtime_for_live_rooms.sql",
    title: "Enable Supabase Realtime Publications",
    description: "Configures Supabase's Realtime system to publish live changes on practice_rooms, room_memberships, room_rounds, and learner_responses to subscribed clients.",
    sql: `-- 005_enable_realtime_for_live_rooms.sql

-- Enable Realtime publication for specific live classroom tables
begin;
  -- remove any existing configuration
  drop publication if exists supabase_realtime;
  
  -- recreate publication
  create publication supabase_realtime;
commit;

-- Add tables to the realtime publication
alter publication supabase_realtime add table practice_rooms;
alter publication supabase_realtime add table room_memberships;
alter publication supabase_realtime add table room_rounds;
alter publication supabase_realtime add table learner_responses;
`
  },
  {
    filename: "006_persist_formula_version_snapshot.sql",
    title: "Formula Version Snapshot Persistence",
    description: "Verifies the presence of formula_version_snapshot on learner_responses to preserve visual and audit-trail integrity when updates are made to the scoring algorithm.",
    sql: `-- 006_persist_formula_version_snapshot.sql

-- Ensure formula_version_snapshot is present with default value
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='learner_responses' AND column_name='formula_version_snapshot'
    ) THEN
        ALTER TABLE learner_responses ADD COLUMN formula_version_snapshot TEXT NOT NULL DEFAULT 'simple-v1';
    END IF;
END;
$$;
`
  },
  {
    filename: "007_extend_response_scale_to_purple.sql",
    title: "Extend Response Scale with Purple Excellent Score",
    description: "Modifies CHECK constraints on response_color and performance_y to support the 'purple' score denoting outstanding learner performance (Y=3).",
    sql: `-- 007_extend_response_scale_to_purple.sql

-- Modify check constraints to ensure support for purple (Excellent) response performance
ALTER TABLE learner_responses DROP CONSTRAINT IF EXISTS learner_responses_response_color_check;
ALTER TABLE learner_responses ADD CONSTRAINT learner_responses_response_color_check 
    CHECK (response_color IN ('red', 'yellow', 'green', 'purple'));

ALTER TABLE learner_responses DROP CONSTRAINT IF EXISTS learner_responses_performance_y_check;
ALTER TABLE learner_responses ADD CONSTRAINT learner_responses_performance_y_check 
    CHECK (performance_y IN (0, 1, 2, 3));
`
  },
  {
    filename: "008_lesson_section_default_cci.sql",
    title: "Lesson Section Default CCI Assignment",
    description: "Adds an optional default CCI Standard Card reference to lesson_sections so live-room rounds can resolve CCI by section/topic part while preserving room_round snapshots.",
    sql: `-- 008_lesson_section_default_cci.sql

ALTER TABLE public.lesson_sections
  ADD COLUMN IF NOT EXISTS default_cci_standard_card_id UUID NULL REFERENCES public.cci_standard_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lesson_sections_default_cci_standard_card_id_idx
  ON public.lesson_sections(default_cci_standard_card_id);

COMMENT ON COLUMN public.lesson_sections.default_cci_standard_card_id IS
  'Optional default CCI standard card used by live-room round opening when a sentence resource belongs to this section.';
`
  }
];
