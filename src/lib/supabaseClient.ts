/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { 
  Course, Lesson, LessonSection, SentenceResource, 
  CCICategory, CCIStandardCard, CVRUnit, Learner, 
  PracticeRoom, RoomMembership, RoomRound, LearnerResponse, 
  LearnerProgress, AudioGenerationJob, CCIPerformanceParameter 
} from '../types';

// Default Supabase Credentials from prompt (or process.env if available)
const DEFAULT_SUPABASE_URL = "https://ftfxekdxeoxizoyxuqoz.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_pKa5KloVIScusPjLVxiQDg_wStVgXPf";

export const getEnvCredentials = () => {
  const meta = import.meta as any;
  const url = (meta.env && meta.env.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = (meta.env && meta.env.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
};

// Create the live client
const { url: finalUrl, key: finalKey } = getEnvCredentials();
export const supabase = createClient(finalUrl, finalKey);

// --- SEED DATA FOR LOCAL SANDBOX DATABASE ---
const SEED_COURSES: Course[] = [
  { id: "c1", title: "Beginner conversational English", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "c2", title: "Business Pitching & Negotiation", status: "draft", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_LESSONS: Lesson[] = [
  { id: "l1", course_id: "c1", title: "Socializing & Introductions", order_index: 1, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "l2", course_id: "c1", title: "Ordering Food & Cafe English", order_index: 2, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_SECTIONS: LessonSection[] = [
  { id: "s1", lesson_id: "l1", title: "Greeting new coworkers", order_index: 1, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "s2", lesson_id: "l1", title: "Talking about hobbies", order_index: 2, status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_RESOURCES: SentenceResource[] = [
  {
    id: "r1",
    course_id: "c1",
    lesson_id: "l1",
    section_id: "s1",
    sentence_code: "A-001",
    text_prompt: "Introduce yourself to your supervisor with your name and role",
    text_en: "Hello, my name is John and I am the new software engineer.",
    text_vi: "Xin chào, tôi tên là John và tôi là kỹ sư phần mềm mới.",
    audio_url: null,
    audio_en_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    audio_vi_url: null,
    audio_variants: {},
    default_cvr_unit_id: "u1",
    default_cvr_value: 1.5,
    cvr_value: 1.5,
    order_index: 1,
    approval_status: "approved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "r2",
    course_id: "c1",
    lesson_id: "l1",
    section_id: "s1",
    sentence_code: "A-002",
    text_prompt: "Politely ask how they are doing today",
    text_en: "Hi there, how are you doing today?",
    text_vi: "Chào bạn, hôm nay bạn thế nào?",
    audio_url: null,
    audio_en_url: null,
    audio_vi_url: null,
    audio_variants: {},
    default_cvr_unit_id: "u1",
    default_cvr_value: 1.0,
    cvr_value: 1.0,
    order_index: 2,
    approval_status: "approved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "r3",
    course_id: "c1",
    lesson_id: "l1",
    section_id: "s2",
    sentence_code: "B-001",
    text_prompt: "Explain that you love playing tennis on the weekend",
    text_en: "I really enjoy playing tennis with my friends on Saturdays.",
    text_vi: "Tôi rất thích chơi tennis với bạn bè vào các ngày thứ Bảy.",
    audio_url: null,
    audio_en_url: null,
    audio_vi_url: null,
    audio_variants: {},
    default_cvr_unit_id: "u2",
    default_cvr_value: 2.0,
    cvr_value: 2.0,
    order_index: 1,
    approval_status: "approved",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "r4",
    course_id: "c1",
    lesson_id: "l1",
    section_id: "s2",
    sentence_code: "B-002",
    text_prompt: "Express that reading books is your favorite pastime (Draft)",
    text_en: "Reading mystery novels is my favorite way to unwind.",
    text_vi: "Đọc tiểu thuyết bí ẩn là cách tôi thích nhất để thư giãn.",
    audio_url: null,
    audio_en_url: null,
    audio_vi_url: null,
    audio_variants: {},
    default_cvr_unit_id: "u1",
    default_cvr_value: 1.0,
    cvr_value: 1.0,
    order_index: 2,
    approval_status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SEED_CCI_CATEGORIES: CCICategory[] = [
  { id: "pronunciation", label: "Pronunciation Accuracy", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "fluency", label: "Oral Fluency & Pause", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "grammar", label: "Grammar & Structure", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_CCI_CARDS: CCIStandardCard[] = [
  { id: "card1", category_id: "pronunciation", label: "Standard Phoneme Match X=10", standard_value: 10, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "card2", category_id: "fluency", label: "Natural Pauses Level X=15", standard_value: 15, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "card3", category_id: "grammar", label: "Advanced Vocabulary Standard X=25", standard_value: 25, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_CVR_UNITS: CVRUnit[] = [
  { id: "u1", label: "Standard Multiplier", unit_symbol: "Ω", value: 1.0, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "u2", label: "Double Multiplier", unit_symbol: "Δ", value: 2.0, active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const SEED_CCI_PERFORMANCE_PARAMETERS: CCIPerformanceParameter[] = [
  { id: "p1", label: "Red", color_code: "red", color_hex: "#EF4444", performance_y: 0, description: "Incorrect", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p2", label: "Yellow", color_code: "yellow", color_hex: "#EAB308", performance_y: 1, description: "Fair", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p3", label: "Green", color_code: "green", color_hex: "#22C55E", performance_y: 2, description: "Good", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "p4", label: "Purple", color_code: "purple", color_hex: "#9333EA", performance_y: 3, description: "Excellent", active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const SEED_LEARNERS: Learner[] = [
  { id: "l_alex", auth_user_id: null, display_name: "Alex", source: "anonymous", last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "l_bella", auth_user_id: null, display_name: "Bella", source: "anonymous", last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "l_chris", auth_user_id: null, display_name: "Chris", source: "anonymous", last_seen_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// LocalSandbox Database Engine Class to mimic tables in Section 8.2 of PRD
class SandboxDatabase {
  private getStorageKey(key: string) {
    return `chunks_sandbox_${key}`;
  }

  private getItem<T>(key: string, seed: T[]): T[] {
    const data = localStorage.getItem(this.getStorageKey(key));
    if (!data) {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  }

  private setItem<T>(key: string, data: T[]): void {
    localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
    // Trigger window event for reactivity
    window.dispatchEvent(new Event('chunks_sandbox_db_change'));
  }

  // Raw Readers
  get courses(): Course[] { return this.getItem<Course>('courses', SEED_COURSES); }
  get lessons(): Lesson[] { return this.getItem<Lesson>('lessons', SEED_LESSONS); }
  get sections(): LessonSection[] { return this.getItem<LessonSection>('sections', SEED_SECTIONS); }
  get sentenceResources(): SentenceResource[] { return this.getItem<SentenceResource>('resources', SEED_RESOURCES); }
  get cciCategories(): CCICategory[] { return this.getItem<CCICategory>('cci_categories', SEED_CCI_CATEGORIES); }
  get cciStandardCards(): CCIStandardCard[] { return this.getItem<CCIStandardCard>('cci_standard_cards', SEED_CCI_CARDS); }
  get cvrUnits(): CVRUnit[] { return this.getItem<CVRUnit>('cvr_units', SEED_CVR_UNITS); }
  get cciPerformanceParameters(): CCIPerformanceParameter[] { return this.getItem<CCIPerformanceParameter>('cci_performance_parameters', SEED_CCI_PERFORMANCE_PARAMETERS); }
  get learners(): Learner[] { return this.getItem<Learner>('learners', SEED_LEARNERS); }
  get rooms(): PracticeRoom[] { return this.getItem<PracticeRoom>('rooms', []); }
  get memberships(): RoomMembership[] { return this.getItem<RoomMembership>('memberships', []); }
  get rounds(): RoomRound[] { return this.getItem<RoomRound>('rounds', []); }
  get responses(): LearnerResponse[] { return this.getItem<LearnerResponse>('responses', []); }
  get progress(): LearnerProgress[] { return this.getItem<LearnerProgress>('progress', []); }
  get audioJobs(): AudioGenerationJob[] { return this.getItem<AudioGenerationJob>('audio_jobs', []); }

  // Setters
  set courses(data: Course[]) { this.setItem('courses', data); }
  set lessons(data: Lesson[]) { this.setItem('lessons', data); }
  set sections(data: LessonSection[]) { this.setItem('sections', data); }
  set sentenceResources(data: SentenceResource[]) { this.setItem('resources', data); }
  set cciCategories(data: CCICategory[]) { this.setItem('cci_categories', data); }
  set cciStandardCards(data: CCIStandardCard[]) { this.setItem('cci_standard_cards', data); }
  set cvrUnits(data: CVRUnit[]) { this.setItem('cvr_units', data); }
  set cciPerformanceParameters(data: CCIPerformanceParameter[]) { this.setItem('cci_performance_parameters', data); }
  set learners(data: Learner[]) { this.setItem('learners', data); }
  set rooms(data: PracticeRoom[]) { this.setItem('rooms', data); }
  set memberships(data: RoomMembership[]) { this.setItem('memberships', data); }
  set rounds(data: RoomRound[]) { this.setItem('rounds', data); }
  set responses(data: LearnerResponse[]) { this.setItem('responses', data); }
  set progress(data: LearnerProgress[]) { this.setItem('progress', data); }
  set audioJobs(data: AudioGenerationJob[]) { this.setItem('audio_jobs', data); }

  // Reset helper
  resetAll() {
    localStorage.removeItem(this.getStorageKey('courses'));
    localStorage.removeItem(this.getStorageKey('lessons'));
    localStorage.removeItem(this.getStorageKey('sections'));
    localStorage.removeItem(this.getStorageKey('resources'));
    localStorage.removeItem(this.getStorageKey('cci_categories'));
    localStorage.removeItem(this.getStorageKey('cci_standard_cards'));
    localStorage.removeItem(this.getStorageKey('cvr_units'));
    localStorage.removeItem(this.getStorageKey('cci_performance_parameters'));
    localStorage.removeItem(this.getStorageKey('learners'));
    localStorage.removeItem(this.getStorageKey('rooms'));
    localStorage.removeItem(this.getStorageKey('memberships'));
    localStorage.removeItem(this.getStorageKey('rounds'));
    localStorage.removeItem(this.getStorageKey('responses'));
    localStorage.removeItem(this.getStorageKey('progress'));
    localStorage.removeItem(this.getStorageKey('audio_jobs'));
    window.dispatchEvent(new Event('chunks_sandbox_db_change'));
  }

  // --- BUSINESS LOGIC MUTATIONS (Fulfill Part 9 & 11) ---

  // 1. Create Room (Part 11.1)
  createRoom(input: {
    title: string;
    hostName: string;
    courseId: string;
    lessonId: string;
    sectionIds: string[];
    cciStandardCardId: string;
    captureMode: 'assigned' | 'first_responder' | 'auto_rotate';
    scoringMode: 'simple' | 'timed';
  }): PracticeRoom {
    const lessonSections = this.sections.filter(s => s.lesson_id === input.lessonId);
    const isAllSectionsSelected = input.sectionIds.length === 0 || lessonSections.every(s => input.sectionIds.includes(s.id));

    const approvedResources = this.sentenceResources.filter(
      r => r.course_id === input.courseId &&
           r.lesson_id === input.lessonId &&
           r.approval_status === 'approved' &&
           (isAllSectionsSelected || (r.section_id && input.sectionIds.includes(r.section_id)))
    );

    if (approvedResources.length === 0) {
      throw new Error("No approved sentence resources found in the selected scope.");
    }

    const card = this.cciStandardCards.find(c => c.id === input.cciStandardCardId);
    if (!card) {
      throw new Error("Invalid or inactive CCI Card selected.");
    }

    // Generate room code: e.g., CH-1234
    const code = "CH-" + Math.floor(1000 + Math.random() * 9000);

    const newRoom: PracticeRoom = {
      id: crypto.randomUUID(),
      room_code: code,
      title: input.title,
      status: 'lobby',
      current_round_id: null,
      course_id: input.courseId,
      lesson_id: input.lessonId,
      host_name: input.hostName,
      resource_scope_filter: { sectionIds: input.sectionIds },
      snapshot_sentence_resource_ids: approvedResources.map(r => r.id),
      scope_refreshed_at: new Date().toISOString(),
      scoring_mode: input.scoringMode,
      default_response_capture_mode: input.captureMode,
      teacher_pin_hash: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const currentRooms = this.rooms;
    currentRooms.push(newRoom);
    this.rooms = currentRooms;

    return newRoom;
  }

  // 2. Join Room (Part 11.2)
  joinRoom(input: { roomCode: string; displayName: string }): { room: PracticeRoom; learner: Learner; membership: RoomMembership } {
    const cleanCode = input.roomCode.trim().toUpperCase();
    const room = this.rooms.find(r => r.room_code.toUpperCase() === cleanCode);
    if (!room) {
      throw new Error(`Room code ${cleanCode} does not exist.`);
    }
    if (room.status === 'finished') {
      throw new Error("This room has already finished.");
    }
    if (!input.displayName.trim()) {
      throw new Error("Display name is required.");
    }

    // Create or reuse learner anonymously
    let learner = this.learners.find(l => l.display_name.toLowerCase() === input.displayName.trim().toLowerCase());
    if (!learner) {
      learner = {
        id: "l_" + crypto.randomUUID().substring(0, 8),
        auth_user_id: null,
        display_name: input.displayName.trim(),
        source: 'anonymous',
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const learnersList = this.learners;
      learnersList.push(learner);
      this.learners = learnersList;
    } else {
      learner.last_seen_at = new Date().toISOString();
      this.learners = this.learners.map(l => l.id === learner!.id ? learner! : l);
    }

    // Check membership
    let membership = this.memberships.find(m => m.room_id === room.id && m.learner_id === learner!.id);
    if (!membership) {
      membership = {
        id: crypto.randomUUID(),
        room_id: room.id,
        learner_id: learner.id,
        presence_status: 'online',
        can_answer: true,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const membershipsList = this.memberships;
      membershipsList.push(membership);
      this.memberships = membershipsList;
    } else {
      membership.presence_status = 'online';
      membership.updated_at = new Date().toISOString();
      this.memberships = this.memberships.map(m => m.id === membership!.id ? membership! : m);
    }

    return { room, learner, membership };
  }

  // 3. Open Round (Part 11.3)
  openRound(input: {
    roomId: string;
    sentenceResourceId: string;
    cciStandardCardId: string;
    assignedLearnerId?: string | null;
    captureMode: 'assigned' | 'first_responder' | 'auto_rotate';
    scoringMode: 'simple' | 'timed';
    openedBy: string;
  }): RoomRound {
    const room = this.rooms.find(r => r.id === input.roomId);
    if (!room) throw new Error("Room not found");
    if (room.status === 'finished') throw new Error("Room is finished");

    // Ensure no other round is currently open for this room
    const currentOpenRound = this.rounds.find(r => r.room_id === room.id && r.status === 'open');
    if (currentOpenRound) {
      throw new Error(`Cannot open a new round. Round #${currentOpenRound.round_index} is still open.`);
    }

    const card = this.cciStandardCards.find(c => c.id === input.cciStandardCardId);
    if (!card) throw new Error("CCI card not found");

    const resource = this.sentenceResources.find(r => r.id === input.sentenceResourceId);
    if (!resource) throw new Error("Sentence resource not found");

    // Create the round
    const nextIndex = this.rounds.filter(r => r.room_id === room.id).length + 1;
    const roundId = crypto.randomUUID();

    const newRound: RoomRound = {
      id: roundId,
      room_id: room.id,
      sentence_resource_id: resource.id,
      assigned_learner_id: input.assignedLearnerId || null,
      captured_learner_id: null,
      cci_standard_card_id: card.id,
      cci_standard_x: card.standard_value,
      cvr_value: resource.cvr_value || resource.default_cvr_value || 1.0,
      round_index: nextIndex,
      status: 'open',
      response_capture_mode_snapshot: input.captureMode,
      scoring_mode_snapshot: input.scoringMode,
      opened_by: input.openedBy,
      sequence_key: `SEQ-${nextIndex}`,
      opened_at: new Date().toISOString(),
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add round
    const roundsList = this.rounds;
    roundsList.push(newRound);
    this.rounds = roundsList;

    // Update room status
    room.status = 'round_open';
    room.current_round_id = roundId;
    this.rooms = this.rooms.map(r => r.id === room.id ? room : r);

    return newRound;
  }

  // 4. Submit Response (Part 11.4)
  submitResponse(input: {
    roundId: string;
    learnerId: string;
    responseColor: string;
    reflectionTimeMs: number;
  }): LearnerResponse {
    const round = this.rounds.find(r => r.id === input.roundId);
    if (!round) throw new Error("Round not found");
    if (round.status !== 'open') throw new Error("This round is not currently open for responses.");

    // Check membership
    const membership = this.memberships.find(m => m.room_id === round.room_id && m.learner_id === input.learnerId);
    if (!membership) {
      throw new Error("You are not registered in this live classroom session.");
    }

    // Capture mode eligibility checks
    const captureMode = round.response_capture_mode_snapshot;
    if (captureMode === 'assigned' || captureMode === 'auto_rotate') {
      if (round.assigned_learner_id && round.assigned_learner_id !== input.learnerId) {
        throw new Error("You are not the designated responder for this round.");
      }
    }

    // Check if another response already exists for this round (Part 11.4 - Enforce one response)
    const existingResponse = this.responses.find(res => res.round_id === round.id);
    if (existingResponse) {
      throw new Error("Another learner has already submitted a response for this round.");
    }

    // Score Calculations (Fulfill Part 9.1 rules with dynamic support)
    const param = this.cciPerformanceParameters.find(
      p => p.color_code.toLowerCase() === input.responseColor.toLowerCase() || 
           p.label.toLowerCase() === input.responseColor.toLowerCase()
    );
    const performanceY = param ? param.performance_y : 0;
    
    let reflectionSeconds = input.reflectionTimeMs / 1000.0;
    if (reflectionSeconds <= 0) {
      reflectionSeconds = 1.0; // avoid division by zero
    }

    let cciResult = 0;
    const cciStandardX = round.cci_standard_x;
    const cvrValue = round.cvr_value;

    if (round.scoring_mode_snapshot === 'timed') {
      cciResult = cciStandardX * (performanceY / reflectionSeconds);
    } else {
      cciResult = cciStandardX * performanceY;
    }

    const cpdResult = cciResult * cvrValue;

    const newResponse: LearnerResponse = {
      id: crypto.randomUUID(),
      round_id: round.id,
      learner_id: input.learnerId,
      response_color: input.responseColor,
      performance_y: performanceY,
      reflection_time_ms: input.reflectionTimeMs,
      reflection_seconds: reflectionSeconds,
      cci_standard_x: cciStandardX,
      cvr_value: cvrValue,
      cci_result: Math.round(cciResult * 100) / 100,
      cpd_result: Math.round(cpdResult * 100) / 100,
      finalized: false, // will be finalized upon round close
      scoring_mode_snapshot: round.scoring_mode_snapshot,
      response_capture_mode_snapshot: captureMode,
      formula_version_snapshot: 'simple-v1',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const currentResponses = this.responses;
    currentResponses.push(newResponse);
    this.responses = currentResponses;

    return newResponse;
  }

  // 5. Close Round (Part 11.5)
  closeRound(roundId: string): { round: RoomRound; response: LearnerResponse | null } {
    const round = this.rounds.find(r => r.id === roundId);
    if (!round) throw new Error("Round not found");

    round.status = 'closed';
    round.closed_at = new Date().toISOString();

    // Finalize response if any exists (Part 9.3)
    let response: LearnerResponse | null = null;
    const responseIndex = this.responses.findIndex(res => res.round_id === round.id);
    if (responseIndex !== -1) {
      const res = this.responses[responseIndex];
      res.finalized = true;
      res.updated_at = new Date().toISOString();
      this.responses = this.responses.map(item => item.id === res.id ? res : item);
      response = res;

      // Update round captured learner
      round.captured_learner_id = res.learner_id;

      // Update Learner Progress
      this.updateLearnerProgress(res.learner_id, round.room_id, res.cpd_result);
    }

    // Update round list
    this.rounds = this.rounds.map(r => r.id === round.id ? round : r);

    // Update room status to round_closed
    const room = this.rooms.find(rm => rm.id === round.room_id);
    if (room) {
      room.status = 'round_closed';
      this.rooms = this.rooms.map(r => r.id === room.id ? room : r);
    }

    return { round, response };
  }

  // Helper to update progress aggregate
  private updateLearnerProgress(learnerId: string, roomId: string, cpdDelta: number) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const courseId = room.course_id;
    const lessonId = room.lesson_id;

    const currentProgress = this.progress;
    let recordIndex = currentProgress.findIndex(
      p => p.learner_id === learnerId && p.course_id === courseId && p.lesson_id === lessonId
    );

    if (recordIndex === -1) {
      const newProgress: LearnerProgress = {
        id: crypto.randomUUID(),
        learner_id: learnerId,
        course_id: courseId,
        lesson_id: lessonId,
        total_cpd: Math.round(cpdDelta * 100) / 100,
        finalized_rounds: 1,
        updated_at: new Date().toISOString()
      };
      currentProgress.push(newProgress);
    } else {
      const record = currentProgress[recordIndex];
      record.total_cpd = Math.round((record.total_cpd + cpdDelta) * 100) / 100;
      record.finalized_rounds += 1;
      record.updated_at = new Date().toISOString();
      currentProgress[recordIndex] = record;
    }

    this.progress = currentProgress;
  }

  // 6. Finish Room (Part 11.6)
  finishRoom(roomId: string): PracticeRoom {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) throw new Error("Room not found");

    room.status = 'finished';
    room.updated_at = new Date().toISOString();
    this.rooms = this.rooms.map(r => r.id === room.id ? room : r);

    // Force close any remaining open rounds
    const openRounds = this.rounds.filter(rd => rd.room_id === roomId && rd.status === 'open');
    for (const ord of openRounds) {
      this.closeRound(ord.id);
    }

    return room;
  }

  // 7. Queue Audio Generation Job (Part 11.7)
  queueAudioJob(resourceId: string, language: 'en' | 'vi', requestedBy: string): AudioGenerationJob {
    const resource = this.sentenceResources.find(r => r.id === resourceId);
    if (!resource) throw new Error("Sentence resource not found");

    const storagePath = `sentence-audio/${resource.course_id}/${resource.lesson_id}/${resource.sentence_code}-${language}.mp3`;

    // Check for duplicate jobs (Part 11.7 constraint)
    const duplicate = this.audioJobs.find(
      j => j.resource_id === resourceId && j.language === language && j.storage_path === storagePath && j.status !== 'failed'
    );
    if (duplicate) {
      return duplicate;
    }

    const newJob: AudioGenerationJob = {
      id: crypto.randomUUID(),
      resource_id: resourceId,
      language: language,
      status: 'queued',
      provider: 'Gemini Text-To-Speech (Simulated)',
      model: 'gemini-2.5-flash',
      storage_path: storagePath,
      public_url: null,
      error_message: null,
      requested_by: requestedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: null
    };

    const currentJobs = this.audioJobs;
    currentJobs.push(newJob);
    this.audioJobs = currentJobs;

    return newJob;
  }

  // Process a job (Simulating Edge Function / Server Workflow)
  async executeAudioJob(jobId: string, customAudioDataUrl?: string): Promise<AudioGenerationJob> {
    const jobs = this.audioJobs;
    const jobIndex = jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) throw new Error("Job not found");

    const job = jobs[jobIndex];
    job.status = 'running';
    job.updated_at = new Date().toISOString();
    this.audioJobs = [...jobs];

    try {
      // Simulate network / provider delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const resource = this.sentenceResources.find(r => r.id === job.resource_id);
      if (!resource) throw new Error("Target resource deleted or missing.");

      // Set standard mock audio asset or custom Data URL from recording
      const assetUrl = customAudioDataUrl || `https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg`;

      job.status = 'succeeded';
      job.public_url = assetUrl;
      job.completed_at = new Date().toISOString();
      job.updated_at = new Date().toISOString();

      // Trigger automatic update of sentence resource audio url (Part 9.3)
      if (job.language === 'en') {
        resource.audio_en_url = assetUrl;
      } else {
        resource.audio_vi_url = assetUrl;
      }
      resource.updated_at = new Date().toISOString();

      this.sentenceResources = this.sentenceResources.map(r => r.id === resource.id ? resource : r);
      this.audioJobs = this.audioJobs.map(j => j.id === job.id ? job : j);

      return job;
    } catch (err: any) {
      job.status = 'failed';
      job.error_message = err.message || "Unknown error";
      job.completed_at = new Date().toISOString();
      job.updated_at = new Date().toISOString();
      this.audioJobs = this.audioJobs.map(j => j.id === job.id ? job : j);
      throw err;
    }
  }
}

export const sandboxDb = new SandboxDatabase();

export function toUUID(str: string | null | undefined): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;
  
  // Create deterministic hash from str
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = (hash1 * 31 + char) | 0;
    hash2 = (hash2 * 37 + char) | 0;
  }
  const part1 = Math.abs(hash1).toString(16).padStart(8, '0');
  const part2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const part3 = (Math.abs(hash1 ^ hash2)).toString(16).padStart(8, '0');
  const part4 = (Math.abs(hash1 + hash2)).toString(16).padStart(8, '0');
  
  return `${part1}-${part2.substring(0, 4)}-4${part2.substring(4, 7)}-a${part3.substring(0, 3)}-${part4.substring(0, 12).padStart(12, '0')}`;
}

export async function syncSandboxToSupabase(onProgress?: (msg: string) => void): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  const addLog = (msg: string) => {
    log.push(msg);
    if (onProgress) onProgress(msg);
  };

  try {
    addLog("Starting synchronization from Local Sandbox to Live Supabase...");

    // 1. Sync courses
    const rawCourses = sandboxDb.courses;
    if (rawCourses.length > 0) {
      addLog(`Preparing ${rawCourses.length} courses...`);
      const mappedCourses = rawCourses.map(c => ({
        ...c,
        id: toUUID(c.id) as string
      }));
      const { error } = await supabase.from('courses').upsert(mappedCourses);
      if (error) throw new Error(`Courses table sync failed: ${error.message} (Did you run Migration #001?)`);
      addLog("✓ Courses synced successfully.");
    }

    // 2. Sync lessons
    const rawLessons = sandboxDb.lessons;
    if (rawLessons.length > 0) {
      addLog(`Preparing ${rawLessons.length} lessons...`);
      const mappedLessons = rawLessons.map(l => ({
        ...l,
        id: toUUID(l.id) as string,
        course_id: toUUID(l.course_id) as string
      }));
      const { error } = await supabase.from('lessons').upsert(mappedLessons);
      if (error) throw new Error(`Lessons table sync failed: ${error.message}`);
      addLog("✓ Lessons synced successfully.");
    }

    // 3. Sync sections
    const rawSections = sandboxDb.sections;
    if (rawSections.length > 0) {
      addLog(`Preparing ${rawSections.length} sections...`);
      const mappedSections = rawSections.map(s => ({
        ...s,
        id: toUUID(s.id) as string,
        lesson_id: toUUID(s.lesson_id) as string
      }));
      const { error } = await supabase.from('lesson_sections').upsert(mappedSections);
      if (error) throw new Error(`Lesson sections table sync failed: ${error.message}`);
      addLog("✓ Lesson sections synced successfully.");
    }

    // 4. Sync cvr_units
    const rawCvrUnits = sandboxDb.cvrUnits;
    if (rawCvrUnits.length > 0) {
      addLog(`Preparing ${rawCvrUnits.length} CVR units...`);
      const mappedCvr = rawCvrUnits.map(u => ({
        ...u,
        id: toUUID(u.id) as string
      }));
      const { error } = await supabase.from('cvr_units').upsert(mappedCvr);
      if (error) throw new Error(`CVR units table sync failed: ${error.message}`);
      addLog("✓ CVR units synced successfully.");
    }

    // 5. Sync sentence_resources
    const rawResources = sandboxDb.sentenceResources;
    if (rawResources.length > 0) {
      addLog(`Preparing ${rawResources.length} sentence resources...`);
      const mappedRes = rawResources.map(r => ({
        ...r,
        id: toUUID(r.id) as string,
        course_id: toUUID(r.course_id) as string,
        lesson_id: toUUID(r.lesson_id) as string,
        section_id: toUUID(r.section_id),
        default_cvr_unit_id: toUUID(r.default_cvr_unit_id)
      }));
      const { error } = await supabase.from('sentence_resources').upsert(mappedRes);
      if (error) throw new Error(`Sentence resources table sync failed: ${error.message}`);
      addLog("✓ Sentence resources synced successfully.");
    }

    // 6. Sync cci_categories
    const rawCciCategories = sandboxDb.cciCategories;
    if (rawCciCategories.length > 0) {
      addLog(`Preparing ${rawCciCategories.length} CCI categories...`);
      const { error } = await supabase.from('cci_categories').upsert(rawCciCategories);
      if (error) throw new Error(`CCI categories table sync failed: ${error.message}`);
      addLog("✓ CCI categories synced successfully.");
    }

    // 7. Sync cci_standard_cards
    const rawCciCards = sandboxDb.cciStandardCards;
    if (rawCciCards.length > 0) {
      addLog(`Preparing ${rawCciCards.length} CCI standard cards...`);
      const mappedCci = rawCciCards.map(c => ({
        ...c,
        id: toUUID(c.id) as string
      }));
      const { error } = await supabase.from('cci_standard_cards').upsert(mappedCci);
      if (error) throw new Error(`CCI standard cards table sync failed: ${error.message}`);
      addLog("✓ CCI standard cards synced successfully.");
    }

    // 8. Sync learners
    const rawLearners = sandboxDb.learners;
    if (rawLearners.length > 0) {
      addLog(`Preparing ${rawLearners.length} learners...`);
      const mappedLearners = rawLearners.map(l => ({
        ...l,
        id: toUUID(l.id) as string
      }));
      const { error } = await supabase.from('learners').upsert(mappedLearners);
      if (error) throw new Error(`Learners table sync failed: ${error.message}`);
      addLog("✓ Learners synced successfully.");
    }

    addLog("🎉 Synchronization completed successfully! All core Library and metadata are fully mirrored.");
    return { success: true, log };
  } catch (err: any) {
    addLog(`❌ Error during sync: ${err.message}`);
    return { success: false, log };
  }
}

