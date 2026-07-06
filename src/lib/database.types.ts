// Generated from Supabase project ftfxekdxeoxizoyxuqoz on 2026-07-06.
// This compact checked-in type file captures the current live public schema used by the app.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cci_categories: { Row: { id: string; label: string; active: boolean; created_at: string; updated_at: string } };
      cci_standard_cards: { Row: { id: string; category_id: string; label: string; standard_value: number; active: boolean; created_at: string; updated_at: string } };
      courses: { Row: { id: string; title: string; status: string; created_at: string; updated_at: string } };
      cvr_units: { Row: { id: string; label: string; unit_symbol: string; value: number; active: boolean; created_at: string; updated_at: string } };
      learner_progress: { Row: { id: string; learner_id: string; course_id: string | null; lesson_id: string | null; total_cpd: number; finalized_rounds: number; updated_at: string } };
      learner_responses: { Row: { id: string; round_id: string; learner_id: string; response_color: string; performance_y: number; reflection_time_ms: number; reflection_seconds: number; cci_standard_x: number; cvr_value: number; cci_result: number; cpd_result: number; finalized: boolean; scoring_mode_snapshot: string; response_capture_mode_snapshot: string; formula_version_snapshot: string; submitted_at: string; updated_at: string } };
      learners: { Row: { id: string; auth_user_id: string | null; display_name: string; source: string; last_seen_at: string | null; created_at: string; updated_at: string } };
      lesson_sections: { Row: { id: string; lesson_id: string; title: string; order_index: number; status: string; created_at: string; updated_at: string } };
      lessons: { Row: { id: string; course_id: string; title: string; order_index: number; status: string; created_at: string; updated_at: string } };
      practice_rooms: { Row: { id: string; room_code: string; title: string; status: string; current_round_id: string | null; course_id: string | null; lesson_id: string | null; host_name: string | null; resource_scope_filter: Json; snapshot_sentence_resource_ids: string[]; scope_refreshed_at: string | null; scoring_mode: string; default_response_capture_mode: string; teacher_pin_hash: string | null; created_at: string; updated_at: string } };
      room_memberships: { Row: { id: string; room_id: string; learner_id: string; presence_status: string; can_answer: boolean; joined_at: string; updated_at: string } };
      room_rounds: { Row: { id: string; room_id: string; sentence_resource_id: string; assigned_learner_id: string | null; captured_learner_id: string | null; cci_standard_card_id: string | null; cci_standard_x: number; cvr_value: number; round_index: number; status: string; response_capture_mode_snapshot: string; scoring_mode_snapshot: string; opened_by: string | null; sequence_key: string | null; opened_at: string | null; closed_at: string | null; created_at: string; updated_at: string } };
      sentence_resources: { Row: { id: string; course_id: string; lesson_id: string; section_id: string | null; sentence_code: string; text_prompt: string | null; text_en: string | null; text_vi: string | null; audio_url: string | null; audio_en_url: string | null; audio_vi_url: string | null; audio_variants: Json; default_cvr_unit_id: string | null; default_cvr_value: number; cvr_value: number; order_index: number; approval_status: string; created_at: string; updated_at: string } };
    };
    Functions: {
      calculate_live_room_score: { Args: { p_scoring_mode: string; p_cci_standard_x: number; p_performance_y: number; p_cvr_value: number; p_reflection_time_ms: number } };
      open_room_round: { Args: { p_room_id: string; p_sentence_resource_id: string; p_assigned_learner_id?: string; p_capture_mode?: string; p_cci_standard_card_id?: string; p_round_index?: number } };
      submit_room_response: { Args: { p_round_id: string; p_learner_id: string; p_response_color: string; p_performance_y: number; p_reflection_time_ms: number } };
    };
  };
};
