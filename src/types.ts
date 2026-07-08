/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Course: Top-level learning collection.
export interface Course {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// Lesson: A learning unit inside a course.
export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

// Section: Topic/group inside a lesson.
export interface LessonSection {
  id: string;
  lesson_id: string;
  title: string;
  order_index: number;
  status: 'draft' | 'active' | 'archived';
  default_cci_standard_card_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Sentence Resource: A sentence prompt used in live room rounds.
export interface TopicPrepSectionSummary {
  sectionId: string;
  sectionTitle: string;
  lessonId: string;
  orderIndex: number;
  resourceCount: number;
  approvedResourceCount: number;
  draftResourceCount: number;
  archivedResourceCount: number;
  missingEnAudioCount: number;
  missingViAudioCount: number;
  minCvr: number | null;
  maxCvr: number | null;
  defaultCciCardId: string | null;
  defaultCciLabel: string | null;
  defaultCciStandardValue: number | null;
  ready: boolean;
  blockingReasons: string[];
  warningReasons: string[];
}

export interface TopicPrepSummary {
  lessonId: string;
  lessonTitle: string;
  sectionCount: number;
  resourceCount: number;
  approvedResourceCount: number;
  draftResourceCount: number;
  archivedResourceCount: number;
  missingEnAudioCount: number;
  missingViAudioCount: number;
  ready: boolean;
  blockingReasons: string[];
  warningReasons: string[];
  sections: TopicPrepSectionSummary[];
}

export interface GeneratedSentenceCandidate {
  candidateId: string;
  courseId: string;
  lessonId: string;
  sectionId: string | null;
  engSentence: string;
  vieSentence: string;
  resourcesUsed: Array<Record<string, any>>;
  rTotal: number | null;
  iValue: number | null;
  uTotal: number | null;
  totalOhm: number | null;
  difficultyLabel: string | null;
  generatedAt: string | null;
}

export interface ResolvedCciAssignment {
  card: CCIStandardCard | null;
  source: 'manual' | 'section_default' | 'room_default' | 'fallback' | 'missing';
  warning: string | null;
}

// Sentence Resource: A sentence prompt used in live room rounds.
export interface SentenceResource {
  id: string;
  course_id: string;
  lesson_id: string;
  section_id: string | null;
  sentence_code: string;
  text_prompt: string;
  text_en: string;
  text_vi: string;
  audio_url: string | null;
  audio_en_url: string | null;
  audio_vi_url: string | null;
  audio_variants: Record<string, any>;
  default_cvr_unit_id: string | null;
  default_cvr_value: number;
  cvr_value: number;
  order_index: number;
  approval_status: 'draft' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
}

// CCI Category: Core scoring category
export interface CCICategory {
  id: string; // e.g., 'pronunciation', 'fluency'
  label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// CCI Standard Card: Admin-managed scoring standard.
export interface CCIStandardCard {
  id: string;
  category_id: string;
  label: string;
  standard_value: number; // CCI Standard X
  active: boolean;
  created_at: string;
  updated_at: string;
}

// CVR Unit: Resource-level multiplier default/reference values.
export interface CVRUnit {
  id: string;
  label: string;
  unit_symbol: string; // default "Ω"
  value: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// CCI Performance Parameter: Dynamic response option / grade state.
export interface CCIPerformanceParameter {
  id: string;
  label: string;      // e.g. "Red", "Yellow", "Orange"
  color_code: string; // Tailwind color name (e.g. "red", "yellow", "amber", "green", "purple")
  color_hex: string;  // e.g. "#EF4444"
  performance_y: number; // e.g. 0, 1, 2, 3, 4
  description: string; // e.g. "Incorrect", "Fair", "Excellent"
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Learner: Roster / student representation.
export interface Learner {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  source: 'manual' | 'imported' | 'anonymous';
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

// Practice Room: A live classroom session created by Teacher.
export interface PracticeRoom {
  id: string;
  room_code: string; // unique short join code
  title: string;
  status: 'lobby' | 'round_open' | 'round_closed' | 'finished';
  current_round_id: string | null;
  course_id: string | null;
  lesson_id: string | null;
  host_name: string | null;
  resource_scope_filter: {
    sectionIds?: string[];
  };
  snapshot_sentence_resource_ids: string[]; // ordered room resource snapshot
  scope_refreshed_at: string | null;
  scoring_mode: 'simple' | 'timed';
  default_response_capture_mode: 'assigned' | 'first_responder' | 'auto_rotate';
  teacher_pin_hash: string | null;
  created_at: string;
  updated_at: string;
}

// Room Membership: Learner's membership in a room.
export interface RoomMembership {
  id: string;
  room_id: string;
  learner_id: string;
  presence_status: 'online' | 'offline' | 'left';
  can_answer: boolean;
  joined_at: string;
  updated_at: string;
}

// Room Round: A teacher-opened response window for one sentence resource.
export interface RoomRound {
  id: string;
  room_id: string;
  sentence_resource_id: string;
  assigned_learner_id: string | null;
  captured_learner_id: string | null;
  cci_standard_card_id: string | null;
  cci_standard_x: number;
  cvr_value: number;
  round_index: number;
  status: 'draft' | 'open' | 'closed';
  response_capture_mode_snapshot: 'assigned' | 'first_responder' | 'auto_rotate';
  scoring_mode_snapshot: 'simple' | 'timed';
  opened_by: string | null;
  sequence_key: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Learner Response: One tracked answer for a round.
export interface LearnerResponse {
  id: string;
  round_id: string;
  learner_id: string;
  response_color: string;
  performance_y: number; // e.g., red=0, yellow=1, green=2, purple=3 or dynamic values
  reflection_time_ms: number;
  reflection_seconds: number;
  cci_standard_x: number;
  cvr_value: number;
  cci_result: number;
  cpd_result: number;
  finalized: boolean;
  scoring_mode_snapshot: 'simple' | 'timed';
  response_capture_mode_snapshot: 'assigned' | 'first_responder' | 'auto_rotate';
  formula_version_snapshot: string; // e.g., 'simple-v1'
  submitted_at: string;
  updated_at: string;
}

// Learner Progress: Derived summary for learner performance.
export interface LearnerProgress {
  id: string;
  learner_id: string;
  course_id: string | null;
  lesson_id: string | null;
  total_cpd: number;
  finalized_rounds: number;
  updated_at: string;
}

// Audio Generation Job: Server-side work item to generate missing sentence audio.
export interface AudioGenerationJob {
  id: string;
  resource_id: string;
  language: 'en' | 'vi';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  provider: string | null;
  model: string | null;
  storage_path: string;
  public_url: string | null;
  error_message: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}
