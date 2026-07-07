/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, Lesson, LessonSection, SentenceResource, CCIStandardCard, CVRUnit, PracticeRoom, RoomRound, Learner, RoomMembership, LearnerResponse } from '../types';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { checkResourceAudioExists, resolveResourceAudioUrl } from '../lib/audioUrl';
import { generateResourceAudio } from '../lib/ttsService';
import { getShortSentenceCode } from '../lib/resourceCode';
import { 
  Plus, Play, Check, AlertTriangle, Users, BookOpen, Clock, Activity, 
  Award, RefreshCw, LogIn, UserCheck, Send, Volume2, Sparkles, AlertCircle, Trash2, Shield,
  Settings, Languages, ChevronDown, ChevronUp, Maximize2, Minimize2, Bell, Lock
} from 'lucide-react';

interface SimulatorTabProps {
  useSandbox: boolean;
  courses: Course[];
  lessons: Lesson[];
  sections: LessonSection[];
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
  cvrUnits: CVRUnit[];
  rooms: PracticeRoom[];
  learners: Learner[];
  onRefreshData: () => void;
}

export default function SimulatorTab({
  useSandbox,
  courses,
  lessons,
  sections,
  resources,
  cciCards,
  cvrUnits,
  rooms,
  learners,
  onRefreshData
}: SimulatorTabProps) {
  // Simulator Navigation: Room state (either setup or running)
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  
  // Create Room Form fields
  const [roomTitle, setRoomTitle] = useState('SESSION #1');
  const [hostName, setHostName] = useState('CHUNKER');
  const [hasUserEditedTitle, setHasUserEditedTitle] = useState(false);
  const [hasUserEditedHost, setHasUserEditedHost] = useState(false);

  const [setupCourseId, setSetupCourseId] = useState<string>('');
  const [setupLessonId, setSetupLessonId] = useState<string>('');
  const [setupLessonIds, setSetupLessonIds] = useState<string[]>([]);
  const [setupSectionIds, setSetupSectionIds] = useState<string[]>([]);
  const [setupCciCardId, setSetupCciCardId] = useState<string>('');
  const [setupCaptureMode, setSetupCaptureMode] = useState<'assigned' | 'first_responder' | 'auto_rotate'>('first_responder');
  const [setupScoringMode, setSetupScoringMode] = useState<'simple' | 'timed'>('simple');

  // Learner Session fields
  const [learnerDisplayName, setLearnerDisplayName] = useState('Emily');
  const [learnerRoomCode, setLearnerRoomCode] = useState('');
  const [currentLearnerId, setCurrentLearnerId] = useState<string>('');
  const [currentLearnerName, setCurrentLearnerName] = useState<string>('');
  const [audioPrepMode, setAudioPrepMode] = useState<'create' | 'start' | null>(null);
  const [audioPrepResources, setAudioPrepResources] = useState<SentenceResource[]>([]);
  const [audioPrepBusy, setAudioPrepBusy] = useState(false);
  const [audioPrepStatus, setAudioPrepStatus] = useState('');

  // Sync setup states when async props load
  useEffect(() => {
    if (courses.length > 0) {
      const courseExists = courses.some(c => c.id === setupCourseId);
      if (!courseExists || !setupCourseId) {
        setSetupCourseId(courses[0].id);
        setSetupLessonId('');
        setSetupLessonIds([]);
        setSetupSectionIds([]);
      }
    } else {
      setSetupCourseId('');
      setSetupLessonId('');
      setSetupLessonIds([]);
      setSetupSectionIds([]);
    }
  }, [courses, setupCourseId]);

  useEffect(() => {
    const validLessons = lessons.filter(l => l.course_id === setupCourseId);
    const validLessonIds = new Set(validLessons.map(l => l.id));
    if (validLessons.length > 0) {
      const lessonExists = validLessonIds.has(setupLessonId);
      if (!lessonExists) {
        setSetupLessonId(validLessons[0].id);
        setSetupSectionIds([]);
      }
      setSetupLessonIds(current => {
        const next = current.filter(id => validLessonIds.has(id));
        return next.length === current.length ? current : next;
      });
    } else {
      setSetupLessonId('');
      setSetupLessonIds([]);
      setSetupSectionIds([]);
    }
  }, [lessons, setupCourseId, setupLessonId]);

  useEffect(() => {
    if (cciCards.length > 0) {
      const cardExists = cciCards.some(c => c.id === setupCciCardId);
      if (!cardExists || !setupCciCardId) {
        setSetupCciCardId(cciCards[0].id);
      }
    } else {
      setSetupCciCardId('');
    }
  }, [cciCards, setupCciCardId]);

  // Handle dynamic room sequential STT title
  useEffect(() => {
    if (!hasUserEditedTitle) {
      const nextStt = rooms.length + 1;
      setRoomTitle(`SESSION #${nextStt}`);
    }
  }, [rooms.length, hasUserEditedTitle]);

  // Handle dynamic default host name
  useEffect(() => {
    if (!hasUserEditedHost) {
      setHostName('CHUNKER');
    }
  }, [hasUserEditedHost]);

  // Speech and Audio Customization States
  const [audioLang, setAudioLang] = useState<'en' | 'vi'>('en');
  const [audioRate, setAudioRate] = useState<number>(1.0);
  const [audioPitch, setAudioPitch] = useState<number>(1.0);
  const [audioVolume, setAudioVolume] = useState<number>(1.0);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(true);
  const [autoPreviewNextAudio, setAutoPreviewNextAudio] = useState<boolean>(true);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [teacherToast, setTeacherToast] = useState<string>('');

  // Auto-Advance States
  const [autoAdvance] = useState<boolean>(true);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [lastPlayedRoundId, setLastPlayedRoundId] = useState<string>('');
  const [lastPreviewedSentenceId, setLastPreviewedSentenceId] = useState<string>('');
  const [lastAutoAdvancedRoundId, setLastAutoAdvancedRoundId] = useState<string>('');
  const [lastNotifiedResponseId, setLastNotifiedResponseId] = useState<string>('');

  // Customizable Speech engine helper
  const speakText = (text: string, langCode: 'en' | 'vi') => {
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode === 'en' ? 'en-US' : 'vi-VN';
      utterance.rate = audioRate;
      utterance.pitch = audioPitch;
      utterance.volume = audioVolume;

      utterance.onstart = () => setIsAudioPlaying(true);
      utterance.onend = () => setIsAudioPlaying(false);
      utterance.onerror = () => setIsAudioPlaying(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
      setIsAudioPlaying(false);
    }
  };

  // Main playback engine with auto-fallback to speech synthesis
  const playSentenceAudio = async (res: SentenceResource) => {
    const textToPlay = audioLang === 'en' ? res.text_en : res.text_vi;
    const audioUrl = audioLang === 'en' ? res.audio_en_url : res.audio_vi_url;

    if (audioUrl) {
      const playableUrl = resolveResourceAudioUrl(audioUrl, res.updated_at);
      const exists = await checkResourceAudioExists(audioUrl);

      if (!playableUrl || playableUrl.startsWith('speech-synth:') || exists === false) {
        speakText(textToPlay || res.text_prompt, audioLang);
        return;
      }

      setIsAudioPlaying(true);
      const audio = new Audio(playableUrl);
      audio.volume = audioVolume;
      audio.playbackRate = audioRate;
      audio.play()
        .then(() => {
          audio.onended = () => setIsAudioPlaying(false);
          audio.onerror = () => {
            speakText(textToPlay || res.text_prompt, audioLang);
          };
        })
        .catch(() => {
          speakText(textToPlay || res.text_prompt, audioLang);
        });
    } else {
      speakText(textToPlay || res.text_prompt, audioLang);
    }
  };
  
  // Real-time tick to compute reflection times
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [simulatedReflectionMs, setSimulatedReflectionMs] = useState<number>(3500);

  // Active state objects loaded from Sandbox / storage
  const [activeRoom, setActiveRoom] = useState<PracticeRoom | null>(null);
  const [activeRoster, setActiveRoster] = useState<(RoomMembership & { learner: Learner })[]>([]);
  const [activeRound, setActiveRound] = useState<RoomRound | null>(null);
  const [roomRounds, setRoomRounds] = useState<RoomRound[]>([]);
  const [roundResponses, setRoundResponses] = useState<(LearnerResponse & { learner: Learner })[]>([]);
  const [roomResponseHistory, setRoomResponseHistory] = useState<(LearnerResponse & { learner: Learner })[]>([]);
  const [availableSentenceIds, setAvailableSentenceIds] = useState<string[]>([]);
  
  // Setup dependent selections
  const filteredLessons = lessons.filter(l => l.course_id === setupCourseId);
  const selectedCourse = courses.find(c => c.id === setupCourseId) || null;
  const isErelCourse = (selectedCourse?.title || '').trim().toUpperCase().startsWith('EREL');
  const selectedLessonId = setupLessonId || filteredLessons[0]?.id || '';
  const selectedLessonIds = isErelCourse
    ? (setupLessonIds.length > 0 ? setupLessonIds : (selectedLessonId ? [selectedLessonId] : []))
    : (selectedLessonId ? [selectedLessonId] : []);
  const filteredSections = sections.filter(s => selectedLessonIds.includes(s.lesson_id));
  const sectionFilterGroups = Array.from(
    filteredSections.reduce((groups, section) => {
      const key = section.title.trim().toLowerCase() || section.id;
      const existing = groups.get(key);
      if (existing) {
        existing.sectionIds.push(section.id);
        existing.lessonIds.push(section.lesson_id);
      } else {
        groups.set(key, {
          key,
          title: section.title.trim() || 'Untitled section',
          orderIndex: section.order_index,
          sectionIds: [section.id],
          lessonIds: [section.lesson_id],
        });
      }
      return groups;
    }, new Map<string, { key: string; title: string; orderIndex: number; sectionIds: string[]; lessonIds: string[] }>()).values()
  ).sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));

  const hasAnyAudio = (resource: SentenceResource) => Boolean(resource.audio_en_url || resource.audio_vi_url);

  const getResourcesWithoutAnyAudio = (items: SentenceResource[]) => {
    return items.filter(r => !hasAnyAudio(r));
  };

  const formatMissingRequiredAudioSummary = (items: SentenceResource[]) => {
    return items.slice(0, 8).map(r => `${getShortSentenceCode(r.sentence_code, r.order_index)}: no EN/VI audio`).join('\n');
  };

  const getApprovedResourcesInScope = () => {
    const isApproved = (r: SentenceResource) => (r.approval_status || '').toLowerCase() === 'approved';
    const isAllSectionsSelected = setupSectionIds.length === 0 || filteredSections.every(s => setupSectionIds.includes(s.id));
    const inSelectedSections = (r: SentenceResource) => isAllSectionsSelected || (r.section_id && setupSectionIds.includes(r.section_id));

    const exact = resources.filter(r =>
      r.course_id === setupCourseId &&
      selectedLessonIds.includes(r.lesson_id) &&
      isApproved(r) &&
      inSelectedSections(r)
    );
    if (exact.length > 0) return exact;

    // Fallback for imported rows where course_id drifted but lesson_id/section_id is correct.
    return resources.filter(r =>
      selectedLessonIds.includes(r.lesson_id) &&
      isApproved(r) &&
      inSelectedSections(r)
    );
  };

  const getPlayableResources = (items: SentenceResource[]) => items.filter(hasAnyAudio);

  const availablePlayableSentenceIds = availableSentenceIds.filter(id => {
    const resource = resources.find(r => r.id === id);
    return resource ? hasAnyAudio(resource) : false;
  });

  const getNextPlayableSentenceId = (usedIds: Set<string>, afterSentenceId?: string | null) => {
    const afterIndex = afterSentenceId ? availableSentenceIds.indexOf(afterSentenceId) : -1;
    return availablePlayableSentenceIds.find(id => !usedIds.has(id) && availableSentenceIds.indexOf(id) > afterIndex)
      || availablePlayableSentenceIds.find(id => !usedIds.has(id))
      || null;
  };

  // Load active room and subscribe to Supabase Realtime WebSocket changes.
  useEffect(() => {
    syncActiveRoomState();

    if (!activeRoomId) return;

    if (useSandbox) {
      const handleDbChange = () => syncActiveRoomState();
      window.addEventListener('chunks_sandbox_db_change', handleDbChange);
      return () => window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    }

    const channel = supabase
      .channel(`live-room-${activeRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_rooms', filter: `id=eq.${activeRoomId}` }, () => syncActiveRoomState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_memberships', filter: `room_id=eq.${activeRoomId}` }, () => syncActiveRoomState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_rounds', filter: `room_id=eq.${activeRoomId}` }, () => syncActiveRoomState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learner_responses' }, () => syncActiveRoomState())
      .subscribe();

    const fallbackPoll = window.setInterval(() => syncActiveRoomState(), 5000);

    return () => {
      window.clearInterval(fallbackPoll);
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, useSandbox, learners.length]);

  const syncActiveRoomState = async () => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setActiveRoster([]);
      setActiveRound(null);
      setRoomRounds([]);
      setRoundResponses([]);
      setRoomResponseHistory([]);
      return;
    }

    if (useSandbox) {
      const room = sandboxDb.rooms.find(r => r.id === activeRoomId) || null;
      setActiveRoom(room);

      if (room) {
        const memberships = sandboxDb.memberships.filter(m => m.room_id === room.id);
        const rosterList = memberships.map(m => {
          const learner = sandboxDb.learners.find(l => l.id === m.learner_id);
          return { ...m, learner: learner! };
        }).filter(item => item.learner !== undefined);
        setActiveRoster(rosterList);

        const rounds = sandboxDb.rounds.filter(rd => rd.room_id === room.id);
        setRoomRounds(rounds);
        const openRound = rounds.find(rd => rd.status === 'open') || rounds[rounds.length - 1] || null;
        setActiveRound(openRound);

        const roundIds = rounds.map(rd => rd.id);
        const history = sandboxDb.responses
          .filter(res => roundIds.includes(res.round_id))
          .map(r => ({ ...r, learner: sandboxDb.learners.find(l => l.id === r.learner_id)! }))
          .filter(item => item.learner);
        setRoomResponseHistory(history);

        if (openRound) {
          if (openRound.status === 'open' && roundStartTime === 0) setRoundStartTime(Date.now());
          setRoundResponses(history.filter(res => res.round_id === openRound.id));
        } else {
          setRoundStartTime(0);
          setRoundResponses([]);
        }

        setAvailableSentenceIds(room.snapshot_sentence_resource_ids);
      }
      return;
    }

    try {
      const { data: room, error: roomErr } = await supabase
        .from('practice_rooms')
        .select('*')
        .eq('id', activeRoomId)
        .maybeSingle();
      if (roomErr) throw roomErr;
      setActiveRoom((room || null) as PracticeRoom | null);

      if (!room) {
        setActiveRoster([]);
        setActiveRound(null);
        setRoomRounds([]);
        setRoundResponses([]);
        setRoomResponseHistory([]);
        setAvailableSentenceIds([]);
        return;
      }

      const [{ data: memberships, error: memErr }, { data: roomRounds, error: roundsErr }] = await Promise.all([
        supabase.from('room_memberships').select('*').eq('room_id', room.id),
        supabase.from('room_rounds').select('*').eq('room_id', room.id).order('round_index', { ascending: true })
      ]);
      if (memErr) throw memErr;
      if (roundsErr) throw roundsErr;

      const membershipRows = (memberships || []) as RoomMembership[];
      const learnerIds = [...new Set(membershipRows.map(m => m.learner_id).filter(Boolean))];
      let liveLearners: Learner[] = [];
      if (learnerIds.length > 0) {
        const { data: rosterLearners, error: rosterLearnerErr } = await supabase
          .from('learners')
          .select('*')
          .in('id', learnerIds);
        if (rosterLearnerErr) throw rosterLearnerErr;
        liveLearners = (rosterLearners || []) as Learner[];
      }

      const rosterList = membershipRows.map(m => {
        const learner = liveLearners.find(l => l.id === m.learner_id) || learners.find(l => l.id === m.learner_id) || {
          id: m.learner_id,
          display_name: `Learner ${m.learner_id.slice(0, 6)}`,
          auth_user_id: null,
          source: 'anonymous' as const,
          last_seen_at: null,
          created_at: m.joined_at,
          updated_at: m.updated_at
        };
        return { ...m, learner };
      });
      setActiveRoster(rosterList as (RoomMembership & { learner: Learner })[]);

      const rounds = (roomRounds || []) as RoomRound[];
      setRoomRounds(rounds);
      const openRound = rounds.find(rd => rd.status === 'open') || rounds[rounds.length - 1] || null;
      setActiveRound(openRound);

      const roundIds = rounds.map(r => r.id);
      let mappedHistory: (LearnerResponse & { learner: Learner })[] = [];
      if (roundIds.length > 0) {
        const { data: allResps, error: allResErr } = await supabase
          .from('learner_responses')
          .select('*')
          .in('round_id', roundIds);
        if (allResErr) throw allResErr;
        mappedHistory = ((allResps || []) as LearnerResponse[]).map(r => ({
          ...r,
          learner: liveLearners.find(l => l.id === r.learner_id) || learners.find(l => l.id === r.learner_id) || {
            id: r.learner_id,
            display_name: `Learner ${r.learner_id.slice(0, 6)}`,
            auth_user_id: null,
            source: 'anonymous' as const,
            last_seen_at: null,
            created_at: r.submitted_at,
            updated_at: r.updated_at
          }
        }));
      }
      setRoomResponseHistory(mappedHistory);

      if (openRound) {
        if (openRound.status === 'open' && roundStartTime === 0) setRoundStartTime(Date.now());
        setRoundResponses(mappedHistory.filter(r => r.round_id === openRound.id));
      } else {
        setRoundStartTime(0);
        setRoundResponses([]);
      }

      setAvailableSentenceIds((room.snapshot_sentence_resource_ids || []) as string[]);
    } catch (err: any) {
      console.error('Failed to sync live room state:', err);
    }
  };

  const usedSentenceIdsForPreview = new Set<string>(roomRounds.map(r => String(r.sentence_resource_id)));
  const nextPreviewSentenceId = activeRound?.status === 'open'
    ? null
    : getNextPlayableSentenceId(usedSentenceIdsForPreview);
  const nextPreviewResource = nextPreviewSentenceId ? resources.find(r => r.id === nextPreviewSentenceId) || null : null;

  // Auto-play audio when a new round is opened for learners.
  useEffect(() => {
    if (activeRound && activeRound.status === 'open' && activeRound.id !== lastPlayedRoundId) {
      if (autoPlayAudio) {
        const res = resources.find(r => r.id === activeRound.sentence_resource_id);
        if (res) {
          setLastPlayedRoundId(activeRound.id);
          const timer = setTimeout(() => {
            playSentenceAudio(res);
          }, 300);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [activeRound?.id, autoPlayAudio, resources, lastPlayedRoundId]);

  // Auto-preview audio when the next-sentence screen is visible between turns.
  // Teachers can turn this off and use the manual Play Prompt button instead.
  useEffect(() => {
    if (!autoPreviewNextAudio || !nextPreviewResource || nextPreviewResource.id === lastPreviewedSentenceId) return;
    setLastPreviewedSentenceId(nextPreviewResource.id);
    const timer = setTimeout(() => {
      playSentenceAudio(nextPreviewResource);
    }, 300);
    return () => clearTimeout(timer);
  }, [autoPreviewNextAudio, nextPreviewResource?.id, lastPreviewedSentenceId]);

  const currentRoundResponses = activeRound
    ? roundResponses.filter(response => response.round_id === activeRound.id)
    : [];
  const currentRoundResponseCount = currentRoundResponses.length;
  const firstCurrentRoundResponse = currentRoundResponses[0] || null;

  // Teacher quick notification when first response is captured and other learners lock out.
  useEffect(() => {
    if (!activeRound || !firstCurrentRoundResponse) return;
    if (firstCurrentRoundResponse.id === lastNotifiedResponseId) return;
    setLastNotifiedResponseId(firstCurrentRoundResponse.id);
    setTeacherToast(`Captured ${firstCurrentRoundResponse.learner.display_name}'s first response. Learner pads are locked for this round.`);
    const timer = window.setTimeout(() => setTeacherToast(''), 4500);
    return () => window.clearTimeout(timer);
  }, [activeRound?.id, firstCurrentRoundResponse?.id, lastNotifiedResponseId]);

  // Auto-Advance logic when a student response is submitted.
  // IMPORTANT: only count responses that belong to the currently-open round.
  // Realtime can briefly render the next open round while stale responses from the
  // previous round are still in state; using raw roundResponses.length caused the
  // app to auto-close turn 002 and jump 001 → 003 → 005.
  useEffect(() => {
    if (
      autoAdvance && 
      activeRound && 
      activeRound.status === 'open' && 
      currentRoundResponseCount > 0 && 
      activeRound.id !== lastAutoAdvancedRoundId
    ) {
      setAutoAdvanceCountdown(1); // short visible handoff, then auto-open the next turn
    }
  }, [autoAdvance, activeRound?.id, currentRoundResponseCount, lastAutoAdvancedRoundId]);

  // Handle countdown ticks for auto-advance
  useEffect(() => {
    if (autoAdvanceCountdown === null) return;

    if (autoAdvanceCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoAdvanceCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (activeRound) {
      const roundToClose = activeRound;
      setLastAutoAdvancedRoundId(roundToClose.id);
      
      const usedIds = new Set<string>(roomRounds.map(r => String(r.sentence_resource_id)));
      const nextSentenceId = getNextPlayableSentenceId(usedIds, roundToClose.sentence_resource_id);

      void (async () => {
        setAutoAdvanceCountdown(null);
        const closed = await handleCloseRound(roundToClose);
        if (closed && nextSentenceId) {
          await handleOpenRound(nextSentenceId);
        }
      })();
    }
  }, [autoAdvanceCountdown, activeRound, roomRounds]);

  const createLiveRoom = async (approvedResources: SentenceResource[], skippedNoAudioCount = 0) => {
    const card = cciCards.find(c => c.id === setupCciCardId);
    if (!card) {
      throw new Error("Invalid or inactive CCI Card selected.");
    }

    const code = "CH-" + Math.floor(1000 + Math.random() * 9000);
    const roomId = crypto.randomUUID();

    const newRoom = {
      id: roomId,
      room_code: code,
      title: roomTitle,
      status: 'lobby',
      current_round_id: null,
      course_id: setupCourseId,
      lesson_id: selectedLessonIds.length === 1 ? selectedLessonIds[0] : null,
      host_name: hostName,
      resource_scope_filter: { lessonIds: selectedLessonIds, sectionIds: setupSectionIds },
      snapshot_sentence_resource_ids: approvedResources.map(r => r.id),
      scope_refreshed_at: new Date().toISOString(),
      scoring_mode: setupScoringMode,
      default_response_capture_mode: setupCaptureMode,
      teacher_pin_hash: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('practice_rooms')
      .insert([newRoom]);

    if (error) throw error;
    setActiveRoomId(roomId);
    setLearnerRoomCode(code);
    onRefreshData();
    setTeacherToast(skippedNoAudioCount > 0
      ? `Live classroom launched with ${approvedResources.length} playable sentences. Skipped ${skippedNoAudioCount} no-audio sentence${skippedNoAudioCount === 1 ? '' : 's'}.`
      : 'Live classroom launched. Start Session is ready.'
    );
  };

  const prepareMissingAudioAndContinue = async () => {
    if (!audioPrepMode || audioPrepResources.length === 0) return;
    const resourcesWithoutAnyAudio = getResourcesWithoutAnyAudio(audioPrepResources);
    const targets: Array<{ resource: SentenceResource; lang: 'en' | 'vi' }> = resourcesWithoutAnyAudio.map(resource => ({
      resource,
      lang: audioLang
    }));

    if (targets.length === 0) {
      setAudioPrepStatus('Every resource has at least one audio track. Continuing...');
    }

    setAudioPrepBusy(true);
    let ok = 0;
    const failures: string[] = [];
    try {
      for (const target of targets) {
        setAudioPrepStatus(`Generating ${target.lang.toUpperCase()} audio ${ok + failures.length + 1}/${targets.length}: ${getShortSentenceCode(target.resource.sentence_code, target.resource.order_index)}`);
        try {
          await generateResourceAudio(target.resource, target.lang);
          ok += 1;
        } catch (err: any) {
          failures.push(`${getShortSentenceCode(target.resource.sentence_code, target.resource.order_index)} ${target.lang.toUpperCase()}: ${err.message || String(err)}`);
        }
      }

      if (failures.length > 0) {
        setAudioPrepStatus(`Prepared ${ok}/${targets.length}. ${failures.length} failed. Fix failed tracks before starting.`);
        alert('Some audio tracks failed:\n' + failures.slice(0, 8).join('\n'));
        return;
      }

      setAudioPrepStatus('Audio prepared. Continuing live classroom...');
      const mode = audioPrepMode;
      const resourcesToUse = audioPrepResources;
      setAudioPrepMode(null);
      setAudioPrepResources([]);
      setAudioPrepStatus('');
      await onRefreshData();

      if (mode === 'create') {
        await createLiveRoom(resourcesToUse);
      } else if (mode === 'start') {
        const usedIds = new Set<string>(roomRounds.map(r => String(r.sentence_resource_id)));
        const nextSentenceId = getNextPlayableSentenceId(usedIds);
        if (nextSentenceId) handleOpenRound(nextSentenceId);
      }
    } finally {
      setAudioPrepBusy(false);
    }
  };

  // 1. Create Room Trigger
  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useSandbox) {
      try {
        const room = sandboxDb.createRoom({
          title: roomTitle,
          hostName: hostName,
          courseId: setupCourseId,
          lessonId: selectedLessonId,
          sectionIds: setupSectionIds,
          cciStandardCardId: setupCciCardId,
          captureMode: setupCaptureMode,
          scoringMode: setupScoringMode
        });
        setActiveRoomId(room.id);
        setLearnerRoomCode(room.room_code); // pre-populate learner code
        onRefreshData();
      } catch (err: any) {
        alert(`Room creation failed: ${err.message}`);
      }
    } else {
      const executeCreate = async () => {
        try {
          const approvedResources = getApprovedResourcesInScope();

          if (approvedResources.length === 0) {
            throw new Error("No approved sentence resources found in the selected scope. Please approve sentences in the Library first.");
          }

          const resourcesWithoutAnyAudio = getResourcesWithoutAnyAudio(approvedResources);
          const playableResources = getPlayableResources(approvedResources);
          if (playableResources.length === 0) {
            throw new Error(`No playable sentence resources found. Every approved sentence in this scope has no EN/VI audio.\n${formatMissingRequiredAudioSummary(resourcesWithoutAnyAudio)}`);
          }

          await createLiveRoom(playableResources, resourcesWithoutAnyAudio.length);
        } catch (err: any) {
          alert(`Room creation failed on Supabase: ${err.message}`);
        }
      };
      executeCreate();
    }
  };

  // 2. Open Round Trigger
  const handleOpenRound = async (sentenceId: string): Promise<boolean> => {
    if (!activeRoom) return false;

    // Clear previous-turn responses immediately so the new open round never
    // inherits stale response state while Supabase realtime catches up.
    setRoundResponses([]);
    setAutoAdvanceCountdown(null);
    
    try {
        // Determine assigned learner if capture mode is assigned
        let assignedLearnerId: string | null = null;
        if (activeRoom.default_response_capture_mode === 'assigned' && activeRoster.length > 0) {
          assignedLearnerId = activeRoster[0].learner_id;
        } else if (activeRoom.default_response_capture_mode === 'auto_rotate' && activeRoster.length > 0) {
          const playedCount = useSandbox
            ? sandboxDb.rounds.filter(rd => rd.room_id === activeRoom.id).length
            : (activeRound?.round_index || 0);
          const nextIdx = playedCount % activeRoster.length;
          assignedLearnerId = activeRoster[nextIdx].learner_id;
        }

        if (useSandbox) {
          const opened = sandboxDb.openRound({
            roomId: activeRoom.id,
            sentenceResourceId: sentenceId,
            cciStandardCardId: setupCciCardId,
            assignedLearnerId: assignedLearnerId,
            captureMode: activeRoom.default_response_capture_mode,
            scoringMode: activeRoom.scoring_mode,
            openedBy: hostName
          });
          setRoundStartTime(Date.now());
          onRefreshData();

          const resource = resources.find(r => r.id === sentenceId);
          if (resource && autoPlayAudio) {
            playSentenceAudio(resource);
            setLastPlayedRoundId(opened.id);
          }
        } else {
          // Live Supabase implementation
          const card = cciCards.find(c => c.id === setupCciCardId);
          if (!card) throw new Error("CCI card not found");

          const resource = resources.find(r => r.id === sentenceId);
          if (!resource) throw new Error("Sentence resource not found");

          const { count: existingRoundCount, error: countErr } = await supabase
            .from('room_rounds')
            .select('id', { count: 'exact', head: true })
            .eq('room_id', activeRoom.id);
          if (countErr) throw countErr;

          const nextIndex = (existingRoundCount || 0) + 1;
          const roundId = crypto.randomUUID();

          const newRound = {
            id: roundId,
            room_id: activeRoom.id,
            sentence_resource_id: resource.id,
            assigned_learner_id: assignedLearnerId,
            captured_learner_id: null,
            cci_standard_card_id: card.id,
            cci_standard_x: card.standard_value,
            cvr_value: resource.cvr_value || resource.default_cvr_value || 1.0,
            round_index: nextIndex,
            status: 'open',
            response_capture_mode_snapshot: activeRoom.default_response_capture_mode,
            scoring_mode_snapshot: activeRoom.scoring_mode,
            opened_by: hostName,
            sequence_key: `SEQ-${nextIndex}`,
            opened_at: new Date().toISOString(),
            closed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insErr } = await supabase
            .from('room_rounds')
            .insert([newRound]);
          if (insErr) throw insErr;

          // Update room status
          const { error: updErr } = await supabase
            .from('practice_rooms')
            .update({
              status: 'round_open',
              current_round_id: roundId,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom.id);
          if (updErr) throw updErr;

          await supabase
            .from('room_memberships')
            .update({ can_answer: true, presence_status: 'online', updated_at: new Date().toISOString() })
            .eq('room_id', activeRoom.id);

          setRoundStartTime(Date.now());
          onRefreshData();

          if (autoPlayAudio) {
            playSentenceAudio(resource);
            setLastPlayedRoundId(roundId);
          }
        }
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  const handleStartOrNextRound = async () => {
    if (!activeRoom || activeRound?.status === 'open') return;
    const usedIds = new Set<string>(roomRounds.map(r => String(r.sentence_resource_id)));

    if (roomRounds.length === 0) {
      const snapshotResources = availableSentenceIds.map(id => resources.find(r => r.id === id)).filter(Boolean) as SentenceResource[];
      const resourcesWithoutAnyAudio = getResourcesWithoutAnyAudio(snapshotResources);
      const playableSnapshotResources = getPlayableResources(snapshotResources);
      if (resourcesWithoutAnyAudio.length > 0) {
        const playableIds = playableSnapshotResources.map(r => r.id);
        setAvailableSentenceIds(playableIds);
        setTeacherToast(`Skipped ${resourcesWithoutAnyAudio.length} no-audio sentence${resourcesWithoutAnyAudio.length === 1 ? '' : 's'} for this live session.`);

        if (!useSandbox) {
          supabase
            .from('practice_rooms')
            .update({
              snapshot_sentence_resource_ids: playableIds,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom.id)
            .then(({ error }) => {
              if (error) console.warn('Could not persist playable sentence snapshot:', error.message);
            });
        }
      }
    }

    const nextSentenceId = getNextPlayableSentenceId(usedIds);
    if (!nextSentenceId) {
      alert('No playable unplayed sentence resources remain in this classroom session. Add EN or VI audio to continue.');
      return;
    }
    await handleOpenRound(nextSentenceId);
  };

  const completedRounds = roomRounds.filter(r => r.status === 'closed').length;
  const currentRoundNumber = activeRound?.status === 'open' ? activeRound.round_index : completedRounds;
  const totalRounds = availablePlayableSentenceIds.length;
  const sessionComplete = totalRounds > 0 && roomRounds.length >= totalRounds;
  const turnLabel = activeRound ? String(activeRound.round_index).padStart(3, '0') : String(Math.min(roomRounds.length + 1, Math.max(totalRounds, 1))).padStart(3, '0');
  const capturedTurnCount = roomResponseHistory.length;
  const activeLearnerCount = activeRoster.filter(m => m.presence_status === 'online').length;
  const uniqueRespondingLearnerCount = new Set(roomResponseHistory.map(resp => resp.learner_id)).size;
  const responseCountByLearnerId = roomResponseHistory.reduce<Record<string, number>>((acc, resp) => {
    acc[resp.learner_id] = (acc[resp.learner_id] || 0) + 1;
    return acc;
  }, {});
  const latestCapturedResponse = [...roomResponseHistory]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] || null;
  const hasCapturedResponseInSession = capturedTurnCount > 0;
  const isBetweenTurnsAfterCapture = hasCapturedResponseInSession && activeRound?.status !== 'open' && !sessionComplete;
  const performanceSummary = sandboxDb.cciPerformanceParameters
    .map(param => ({
      ...param,
      count: roomResponseHistory.filter(resp =>
        resp.response_color.toLowerCase() === param.color_code.toLowerCase() ||
        resp.response_color.toLowerCase() === param.label.toLowerCase()
      ).length
    }))
    .filter(param => param.count > 0);
  const sortedRoomsForManager = [...rooms]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  const activeRoomsForManager = sortedRoomsForManager.filter(room => room.status !== 'finished');
  const recentFinishedRoomsForManager = sortedRoomsForManager.filter(room => room.status === 'finished').slice(0, 5);

  const lockRosterAfterFirstResponse = async (round: RoomRound, capturedLearnerId: string) => {
    if (useSandbox || !activeRoom) return;
    await supabase
      .from('room_rounds')
      .update({ captured_learner_id: capturedLearnerId, updated_at: new Date().toISOString() })
      .eq('id', round.id);

    await supabase
      .from('room_memberships')
      .update({ can_answer: false, updated_at: new Date().toISOString() })
      .eq('room_id', activeRoom.id);
  };

  // 3. Close Round Trigger
  const handleCloseRound = async (roundToClose: RoomRound | null = activeRound): Promise<boolean> => {
    if (!roundToClose) return false;
    if (useSandbox) {
      try {
        sandboxDb.closeRound(roundToClose.id);
        setRoundStartTime(0);
        onRefreshData();
        return true;
      } catch (err: any) {
        alert(err.message);
        return false;
      }
    } else {
      try {
          // 1. Set round to closed
          const { error: updRoundErr } = await supabase
            .from('room_rounds')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', roundToClose.id);
          if (updRoundErr) throw updRoundErr;

          // 2. Find and finalize response if any exists
          const { data: respList } = await supabase
            .from('learner_responses')
            .select('*')
            .eq('round_id', roundToClose.id)
            .limit(1);

          if (respList && respList.length > 0) {
            const resp = respList[0];
            // Finalize response
            const { error: updRespErr } = await supabase
              .from('learner_responses')
              .update({
                finalized: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', resp.id);
            if (updRespErr) throw updRespErr;

            // Update round captured learner
            await supabase
              .from('room_rounds')
              .update({ captured_learner_id: resp.learner_id })
              .eq('id', roundToClose.id);

            // Update Learner Progress
            const { data: progList } = await supabase
              .from('learner_progress')
              .select('*')
              .eq('learner_id', resp.learner_id)
              .eq('course_id', activeRoom?.course_id)
              .eq('lesson_id', activeRoom?.lesson_id)
              .limit(1);

            if (progList && progList.length > 0) {
              const prog = progList[0];
              await supabase
                .from('learner_progress')
                .update({
                  total_cpd: Math.round((Number(prog.total_cpd) + Number(resp.cpd_result)) * 100) / 100,
                  finalized_rounds: prog.finalized_rounds + 1,
                  updated_at: new Date().toISOString()
                })
                .eq('id', prog.id);
            } else {
              await supabase
                .from('learner_progress')
                .insert([{
                  id: crypto.randomUUID(),
                  learner_id: resp.learner_id,
                  course_id: activeRoom?.course_id,
                  lesson_id: activeRoom?.lesson_id,
                  total_cpd: Math.round(Number(resp.cpd_result) * 100) / 100,
                  finalized_rounds: 1,
                  updated_at: new Date().toISOString()
                }]);
            }
          }

          // 3. Update room status to round_closed and clear current pointer so learner pads wait for next turn.
          await supabase
            .from('practice_rooms')
            .update({
              status: 'round_closed',
              current_round_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom?.id);

          setRoundStartTime(0);
          onRefreshData();
          return true;
      } catch (err: any) {
        alert("Failed to close round on Supabase: " + err.message);
        return false;
      }
    }
  };

  // Keyboard shortcuts for smoother teacher flow:
  // Space = play the current/next speaker prompt, ArrowRight = open next turn when between turns.
  useEffect(() => {
    if (!activeRoom) return;

    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if (event.code === 'Space') {
        const promptResource = activeRound?.status === 'open'
          ? resources.find(r => r.id === activeRound.sentence_resource_id)
          : (() => {
              const usedIds = new Set<string>(roomRounds.map(r => String(r.sentence_resource_id)));
              const nextSentenceId = getNextPlayableSentenceId(usedIds);
              return nextSentenceId ? resources.find(r => r.id === nextSentenceId) : null;
            })();

        if (promptResource) {
          event.preventDefault();
          playSentenceAudio(promptResource);
        }
      }

      if (event.code === 'ArrowRight' && activeRound?.status !== 'open' && !sessionComplete) {
        event.preventDefault();
        void handleStartOrNextRound();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRoom, activeRound, resources, roomRounds, sessionComplete]);

  // 4. Finish Room Trigger
  const handleFinishRoom = () => {
    if (!activeRoom) return;
    if (!window.confirm("Finish this room? All stats will be saved and joins will be blocked.")) return;
    
    if (useSandbox) {
      try {
        sandboxDb.finishRoom(activeRoom.id);
        onRefreshData();
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      const executeFinishRoom = async () => {
        try {
          // 1. Finish the room and clear the active round pointer so learners see the ended state.
          const { error: updRoomErr } = await supabase
            .from('practice_rooms')
            .update({
              status: 'finished',
              current_round_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom.id);
          if (updRoomErr) throw updRoomErr;

          // 2. Force close any remaining open rounds for this room
          await supabase
            .from('room_rounds')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('room_id', activeRoom.id)
            .eq('status', 'open');

          // 3. Turn learner pads off for the finished session.
          await supabase
            .from('room_memberships')
            .update({ can_answer: false, presence_status: 'offline', updated_at: new Date().toISOString() })
            .eq('room_id', activeRoom.id);

          onRefreshData();
        } catch (err: any) {
          alert("Failed to finish room on Supabase: " + err.message);
        }
      };
      executeFinishRoom();
    }
  };

  // 5. Learner Join Trigger
  const handleLearnerJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (useSandbox) {
      try {
        const { room, learner } = sandboxDb.joinRoom({
          roomCode: learnerRoomCode,
          displayName: learnerDisplayName
        });
        setCurrentLearnerId(learner.id);
        setCurrentLearnerName(learner.display_name);
        setActiveRoomId(room.id); // Synchronize active live view
        onRefreshData();
      } catch (err: any) {
        alert(`Join failed: ${err.message}`);
      }
    } else {
      const executeJoin = async () => {
        try {
          // 1. Get room
          const { data: rooms, error: roomErr } = await supabase
            .from('practice_rooms')
            .select('*')
            .eq('room_code', learnerRoomCode.trim().toUpperCase())
            .neq('status', 'finished');

          if (roomErr) throw roomErr;
          if (!rooms || rooms.length === 0) {
            throw new Error("Active classroom room not found for the entered code.");
          }
          const targetRoom = rooms[0];

          // 2. Insert or find learner
          const { data: existingLearners } = await supabase
            .from('learners')
            .select('*')
            .eq('display_name', learnerDisplayName.trim());

          let learnerId = '';
          let finalDisplayName = learnerDisplayName.trim();

          if (existingLearners && existingLearners.length > 0) {
            learnerId = existingLearners[0].id;
            finalDisplayName = existingLearners[0].display_name;
            await supabase
              .from('learners')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', learnerId);
          } else {
            learnerId = crypto.randomUUID();
            const { error: insLearnerErr } = await supabase
              .from('learners')
              .insert([{
                id: learnerId,
                display_name: finalDisplayName,
                source: 'anonymous',
                last_seen_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            if (insLearnerErr) throw insLearnerErr;
          }

          // 3. Upsert Membership
          const { error: memErr } = await supabase
            .from('room_memberships')
            .upsert([{
              id: crypto.randomUUID(),
              room_id: targetRoom.id,
              learner_id: learnerId,
              presence_status: 'online',
              can_answer: true,
              joined_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }], { onConflict: 'room_id,learner_id' });

          if (memErr) throw memErr;

          setCurrentLearnerId(learnerId);
          setCurrentLearnerName(finalDisplayName);
          setActiveRoomId(targetRoom.id);
          onRefreshData();
        } catch (err: any) {
          alert(`Join failed on Supabase: ${err.message}`);
        }
      };
      executeJoin();
    }
  };

  // 6. Submit Response Trigger
  const handleSubmitResponse = (color: string) => {
    if (!activeRound || !currentLearnerId) return;

    // Compute elapsed reflection time in milliseconds
    let elapsed = simulatedReflectionMs;
    if (activeRoom?.scoring_mode === 'timed') {
      elapsed = Date.now() - roundStartTime;
      if (elapsed <= 0) elapsed = 1000;
    }

    if (useSandbox) {
      try {
        sandboxDb.submitResponse({
          roundId: activeRound.id,
          learnerId: currentLearnerId,
          responseColor: color,
          reflectionTimeMs: elapsed
        });
        onRefreshData();
      } catch (err: any) {
        alert(`Submission rejected: ${err.message}`);
      }
    } else {
      const executeSubmit = async () => {
        try {
          // Check if response already exists
          const { data: existing } = await supabase
            .from('learner_responses')
            .select('id')
            .eq('round_id', activeRound.id)
            .limit(1);

          if (existing && existing.length > 0) {
            throw new Error("This round's response has already been submitted by a responder.");
          }

          // Calculate formula values
          const activeParams = sandboxDb.cciPerformanceParameters;
          const param = activeParams.find(p => p.color_code.toLowerCase() === color.toLowerCase() || p.label.toLowerCase() === color.toLowerCase());
          const performanceY = param ? param.performance_y : 2;
          const reflectionSeconds = Math.round((elapsed / 1000.0) * 100) / 100;
          
          // Basic formulas
          const cciStandardX = activeRound.cci_standard_x || 1.0;
          const cvrValue = activeRound.cvr_value || 1.0;
          const cciResult = Math.round((performanceY * cciStandardX) * 100) / 100;
          
          let cpdResult = 0;
          if (activeRound.scoring_mode_snapshot === 'timed') {
            const timeBonus = Math.max(0, 10 - reflectionSeconds);
            cpdResult = Math.round((cciResult * cvrValue * (1 + timeBonus / 10)) * 100) / 100;
          } else {
            cpdResult = Math.round((cciResult * cvrValue) * 100) / 100;
          }

          const { error: insErr } = await supabase
            .from('learner_responses')
            .insert([{
              id: crypto.randomUUID(),
              round_id: activeRound.id,
              learner_id: currentLearnerId,
              response_color: color,
              performance_y: performanceY,
              reflection_time_ms: elapsed,
              reflection_seconds: reflectionSeconds,
              cci_standard_x: cciStandardX,
              cvr_value: cvrValue,
              cci_result: cciResult,
              cpd_result: cpdResult,
              finalized: false,
              scoring_mode_snapshot: activeRound.scoring_mode_snapshot,
              response_capture_mode_snapshot: activeRound.response_capture_mode_snapshot,
              formula_version_snapshot: 'simple-v1',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (insErr) throw insErr;
          await lockRosterAfterFirstResponse(activeRound, currentLearnerId);
          onRefreshData();
        } catch (err: any) {
          alert(`Submission rejected on Supabase: ${err.message}`);
        }
      };
      executeSubmit();
    }
  };

  // --- MOCK SIMULATOR HELPERS ---
  const handleSpawnMockStudents = () => {
    if (!activeRoom) return;
    const mockNames = ["Alex", "Bella", "Chris"];

    if (useSandbox) {
      mockNames.forEach(name => {
        try {
          sandboxDb.joinRoom({
            roomCode: activeRoom.room_code,
            displayName: name
          });
        } catch (e) {}
      });
      onRefreshData();
    } else {
      const executeSpawn = async () => {
        try {
          for (const name of mockNames) {
            // Check if learner exists
            const { data: exist } = await supabase
              .from('learners')
              .select('*')
              .eq('display_name', name);

            let lId = '';
            if (exist && exist.length > 0) {
              lId = exist[0].id;
            } else {
              lId = crypto.randomUUID();
              await supabase
                .from('learners')
                .insert([{
                  id: lId,
                  display_name: name,
                  source: 'anonymous',
                  last_seen_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }]);
            }

            // Insert membership
            await supabase
              .from('room_memberships')
              .upsert([{
                id: crypto.randomUUID(),
                room_id: activeRoom.id,
                learner_id: lId,
                presence_status: 'online',
                can_answer: true,
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }], { onConflict: 'room_id,learner_id' });
          }
          onRefreshData();
        } catch (err: any) {
          alert("Failed to spawn mock students: " + err.message);
        }
      };
      executeSpawn();
    }
  };

  const handleSimulateDummyResponse = () => {
    if (!activeRound) return;
    // Find a student who hasn't answered yet
    const answeredLearnerIds = roundResponses.map(r => r.learner_id);
    const eligibleRoster = activeRoster.filter(r => !answeredLearnerIds.includes(r.learner_id));
    
    if (eligibleRoster.length === 0) {
      alert("No available students left who haven't responded!");
      return;
    }

    // Pick first eligible student
    const student = eligibleRoster[0];
    const activeParams = sandboxDb.cciPerformanceParameters;
    const randomParam = activeParams[Math.floor(Math.random() * activeParams.length)] || { color_code: 'green', performance_y: 2 };
    const randomColor = randomParam.color_code;
    const simTimeMs = Math.floor(2000 + Math.random() * 5000);

    if (useSandbox) {
      try {
        sandboxDb.submitResponse({
          roundId: activeRound.id,
          learnerId: student.learner_id,
          responseColor: randomColor,
          reflectionTimeMs: simTimeMs
        });
        onRefreshData();
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      const executeDummyResponse = async () => {
        try {
          const performanceY = randomParam.performance_y;
          const reflectionSeconds = Math.round((simTimeMs / 1000.0) * 100) / 100;
          
          const cciStandardX = activeRound.cci_standard_x || 1.0;
          const cvrValue = activeRound.cvr_value || 1.0;
          const cciResult = Math.round((performanceY * cciStandardX) * 100) / 100;
          
          let cpdResult = 0;
          if (activeRound.scoring_mode_snapshot === 'timed') {
            const timeBonus = Math.max(0, 10 - reflectionSeconds);
            cpdResult = Math.round((cciResult * cvrValue * (1 + timeBonus / 10)) * 100) / 100;
          } else {
            cpdResult = Math.round((cciResult * cvrValue) * 100) / 100;
          }

          const { error } = await supabase
            .from('learner_responses')
            .insert([{
              id: crypto.randomUUID(),
              round_id: activeRound.id,
              learner_id: student.learner_id,
              response_color: randomColor,
              performance_y: performanceY,
              reflection_time_ms: simTimeMs,
              reflection_seconds: reflectionSeconds,
              cci_standard_x: cciStandardX,
              cvr_value: cvrValue,
              cci_result: cciResult,
              cpd_result: cpdResult,
              finalized: false,
              scoring_mode_snapshot: activeRound.scoring_mode_snapshot,
              response_capture_mode_snapshot: activeRound.response_capture_mode_snapshot,
              formula_version_snapshot: 'simple-v1',
              submitted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          if (error) throw error;
          await lockRosterAfterFirstResponse(activeRound, student.learner_id);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to submit simulated response: " + err.message);
        }
      };
      executeDummyResponse();
    }
  };

  const handleCloseActiveSession = () => {
    if (!activeRoom) {
      setActiveRoomId('');
      return;
    }

    const closeConsole = async () => {
      try {
        window.speechSynthesis?.cancel();
        if (!useSandbox && activeRoom.status !== 'finished') {
          if (activeRound?.status === 'open') {
            const closed = await handleCloseRound(activeRound);
            if (!closed) return;
          } else {
            await supabase
              .from('room_rounds')
              .update({
                status: 'closed',
                closed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('room_id', activeRoom.id)
              .eq('status', 'open');
          }

          await supabase
            .from('room_memberships')
            .update({ can_answer: false, presence_status: 'offline', updated_at: new Date().toISOString() })
            .eq('room_id', activeRoom.id);

          await supabase
            .from('practice_rooms')
            .update({
              status: activeRoom.status === 'round_open' ? 'round_closed' : activeRoom.status,
              current_round_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom.id);
        }
      } catch (err: any) {
        alert(`Could not turn off learner pads before exiting: ${err.message || String(err)}`);
        return;
      }

      setActiveRoomId('');
      setActiveRoom(null);
      setActiveRound(null);
      setRoundResponses([]);
      setTeacherToast('');
      onRefreshData();
    };

    void closeConsole();
  };

  return (
    <div className="space-y-6" id="simulator-grid">
      
      {/* TEACHER / HOST CONTROL PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col min-h-[600px]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-sans font-semibold text-xs tracking-wider uppercase">ROLE: TEACHER HOST</span>
          </div>
          {activeRoom && (
            <button
              onClick={handleCloseActiveSession}
              className="text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded"
            >
              Exit Console
            </button>
          )}
        </div>

        {audioPrepMode && (
          <div className="m-5 mb-0 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <h3 className="text-sm font-bold text-amber-900">Audio preparation required before class can start</h3>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {audioPrepStatus || `Some resources in this live classroom have no audio at all. Prepare one ${audioLang.toUpperCase()} track per resource, then the classroom flow will continue automatically.`}
                </p>
                <div className="text-[11px] text-amber-800 bg-white/70 border border-amber-100 rounded-lg p-2 max-h-32 overflow-auto font-mono whitespace-pre-line">
                  {formatMissingRequiredAudioSummary(getResourcesWithoutAnyAudio(audioPrepResources)) || 'Every resource has at least one audio track.'}
                  {getResourcesWithoutAnyAudio(audioPrepResources).length > 8 ? `\n...and ${getResourcesWithoutAnyAudio(audioPrepResources).length - 8} more resources` : ''}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[210px]">
                <button
                  type="button"
                  onClick={prepareMissingAudioAndContinue}
                  disabled={audioPrepBusy}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-200 disabled:text-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${audioPrepBusy ? 'animate-spin' : ''}`} />
                  {audioPrepBusy ? 'Preparing TTS...' : audioPrepMode === 'create' ? 'Prepare TTS & Launch' : 'Prepare TTS & Start'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioPrepMode(null);
                    setAudioPrepResources([]);
                    setAudioPrepStatus('');
                  }}
                  disabled={audioPrepBusy}
                  className="px-4 py-2 bg-white hover:bg-amber-100 disabled:opacity-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. ROOM CREATION / SETUP SCREEN */}
        {!activeRoom ? (
          <div className="p-6 flex-1 flex flex-col justify-between gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Live Session Manager</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Rejoin active teacher consoles, review recent history, or keep learner pads turned off when no teacher is controlling the room.
                  </p>
                </div>
                <a href="/live-session" className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider">
                  /live-session
                </a>
              </div>

              {activeRoomsForManager.length === 0 && recentFinishedRoomsForManager.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                  No live classroom sessions yet. Launch a room below to begin.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active / resumable</div>
                    {activeRoomsForManager.length === 0 ? (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-400">No resumable sessions.</div>
                    ) : activeRoomsForManager.slice(0, 6).map(room => (
                      <div key={room.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{room.room_code}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${room.status === 'round_open' ? 'bg-red-50 text-red-700' : room.status === 'round_closed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{room.status}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate mt-1">{room.title}</div>
                          <div className="text-[10px] text-slate-400">Updated {new Date(room.updated_at || room.created_at).toLocaleString()}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveRoomId(room.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black transition-colors"
                        >
                          Rejoin
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Recent finished history</div>
                    {recentFinishedRoomsForManager.length === 0 ? (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-400">Finished sessions will appear here.</div>
                    ) : recentFinishedRoomsForManager.map(room => (
                      <div key={room.id} className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{room.room_code}</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">finished</span>
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate mt-1">{room.title}</div>
                          <div className="text-[10px] text-slate-400">Updated {new Date(room.updated_at || room.created_at).toLocaleString()}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveRoomId(room.id)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-semibold text-slate-800">Launch Live Classroom Room</h2>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Configure live response capture logic and grading mechanisms to start a real-time sentence drill.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ROOM TITLE</label>
                  <input 
                    type="text"
                    value={roomTitle}
                    onChange={(e) => {
                      setRoomTitle(e.target.value);
                      setHasUserEditedTitle(true);
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">HOST NAME</label>
                  <input 
                    type="text"
                    value={hostName}
                    onChange={(e) => {
                      setHostName(e.target.value);
                      setHasUserEditedHost(true);
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CHOOSE COURSE</label>
                  <select
                    value={setupCourseId}
                    onChange={(e) => {
                      setSetupCourseId(e.target.value);
                      setSetupLessonId('');
                      setSetupLessonIds([]);
                      setSetupSectionIds([]);
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-[10px] font-bold text-slate-500 block">CHOOSE LESSON{isErelCourse ? ' / TOPICS' : ''}</label>
                    {isErelCourse && filteredLessons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allLessonIds = filteredLessons.map(l => l.id);
                          const allSelected = allLessonIds.every(id => selectedLessonIds.includes(id));
                          setSetupLessonIds(allSelected ? [] : allLessonIds);
                          setSetupSectionIds([]);
                        }}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700"
                      >
                        {filteredLessons.every(l => selectedLessonIds.includes(l.id)) ? 'Clear Topics' : 'All Topics'}
                      </button>
                    )}
                  </div>
                  {isErelCourse ? (
                    <div className="max-h-36 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 flex flex-wrap gap-1.5">
                      {filteredLessons.map(l => {
                        const checked = selectedLessonIds.includes(l.id);
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              const next = checked
                                ? selectedLessonIds.filter(id => id !== l.id)
                                : [...selectedLessonIds, l.id];
                              setSetupLessonIds(next);
                              setSetupLessonId(next[0] || l.id);
                              setSetupSectionIds([]);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] border font-bold transition-colors ${checked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}
                          >
                            {l.title}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <select
                      value={selectedLessonId}
                      onChange={(e) => {
                        setSetupLessonId(e.target.value);
                        setSetupLessonIds([]);
                        setSetupSectionIds([]);
                      }}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                    >
                      {filteredLessons.map(l => (
                        <option key={l.id} value={l.id}>{l.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Scope filter checklist */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Limit to lesson sections (chunks)</label>
                  </div>
                  {filteredSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = filteredSections.map(s => s.id);
                        const isAllSelected = allIds.every(id => setupSectionIds.includes(id));
                        if (isAllSelected) {
                          setSetupSectionIds([]);
                        } else {
                          setSetupSectionIds(allIds);
                        }
                      }}
                      className="shrink-0 text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer select-none"
                    >
                      {filteredSections.every(s => setupSectionIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {filteredSections.length === 0 ? (
                  <span className="text-[11px] text-slate-400">No sections found. The room will use all lesson materials.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5" id="chunks-section-badges-container">
                    {sectionFilterGroups.map(group => {
                      const isChecked = group.sectionIds.every(id => setupSectionIds.includes(id));
                      const isPartiallyChecked = !isChecked && group.sectionIds.some(id => setupSectionIds.includes(id));
                      return (
                        <button
                          key={group.key}
                          type="button"
                          title={group.sectionIds.length > 1 ? `${group.sectionIds.length} matching sections selected together` : group.title}
                          onClick={() => {
                            if (isChecked || isPartiallyChecked) {
                              setSetupSectionIds(setupSectionIds.filter(id => !group.sectionIds.includes(id)));
                            } else {
                              setSetupSectionIds(Array.from(new Set([...setupSectionIds, ...group.sectionIds])));
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-red-50 border-red-200 text-red-700 shadow-2xs font-semibold'
                              : isPartiallyChecked
                                ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full transition-all ${isChecked ? 'bg-red-500 scale-110' : isPartiallyChecked ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          <span>{group.title}</span>
                          {group.sectionIds.length > 1 && (
                            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">×{group.sectionIds.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modes Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">SCORING MODE</label>
                  <select
                    value={setupScoringMode}
                    onChange={(e: any) => setSetupScoringMode(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="simple">Simple Mode (X * Y)</option>
                    <option value="timed">Timed Mode (Reflection dependent)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CAPTURE MODE</label>
                  <select
                    value={setupCaptureMode}
                    onChange={(e: any) => setSetupCaptureMode(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                  >
                    <option value="first_responder">First Responder (Fastest)</option>
                    <option value="assigned">Designated Responder</option>
                    <option value="auto_rotate">Auto Rotate Student</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CCI CARD REFERENCE</label>
                  <select
                    value={setupCciCardId}
                    onChange={(e) => setSetupCciCardId(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                  >
                    {cciCards.map(c => (
                      <option key={c.id} value={c.id}>{c.label} (X={c.standard_value})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 flex items-center gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  <strong>Approved resources in scope: </strong>
                  {
                    (() => {
                      return getApprovedResourcesInScope().length;
                    })()
                  } sentence prompts.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                Launch Live Classroom Room
              </button>
            </form>
          </div>
        ) : (
          
          /* 2. LIVE CLASSROOM RUNNING CONSOLE */
          <div className={`${isFocusMode ? 'fixed inset-3 lg:inset-4 z-50 bg-white rounded-2xl shadow-2xl overflow-auto border border-slate-200' : ''} p-4 lg:p-5 flex-1 flex flex-col justify-between space-y-4 lg:space-y-5 min-h-0`}>
            
            {/* Header Status */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    ROOM CODE: {activeRoom.room_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const joinUrl = `${window.location.origin}/learner?room_code=${activeRoom.room_code}`;
                      navigator.clipboard.writeText(joinUrl);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer select-none border ${
                      isCopied 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100'
                    }`}
                  >
                    {isCopied ? 'Copied Link!' : 'Share Join Link'}
                  </button>
                </div>
                <h2 className="text-sm font-semibold text-slate-800 mt-1">{activeRoom.title}</h2>
                <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span>Host: <strong className="text-slate-600">{activeRoom.host_name}</strong></span>
                  <span>•</span>
                  <span>Capture: <strong className="text-slate-600 uppercase">{activeRoom.default_response_capture_mode}</strong></span>
                  <span>•</span>
                  <span>Scoring: <strong className="text-slate-600 uppercase">{activeRoom.scoring_mode}</strong></span>
                  <span>•</span>
                  <span>Progress: <strong className="text-red-600">{currentRoundNumber}/{totalRounds}</strong></span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded border border-slate-200 transition-colors"
                  title={isFocusMode ? 'Exit expanded teacher console' : 'Expand teacher console'}
                >
                  {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  {isFocusMode ? 'Exit Focus' : 'Expand'}
                </button>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  activeRoom.status === 'lobby' ? 'bg-amber-100 text-amber-800' :
                  activeRoom.status === 'round_open' ? 'bg-red-100 text-red-800 animate-pulse' :
                  activeRoom.status === 'round_closed' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {activeRoom.status}
                </span>
                {roomRounds.length === 0 ? (
                  <button
                    onClick={handleStartOrNextRound}
                    disabled={activeRound?.status === 'open' || totalRounds === 0 || sessionComplete}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-[10px] font-bold rounded transition-colors"
                  >
                    Start Session
                  </button>
                ) : (
                  <span className="px-2 py-1 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-bold">
                    Auto next-turn ON
                  </span>
                )}
                <button
                  onClick={handleFinishRoom}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded transition-colors"
                >
                  End Classroom Session
                </button>
              </div>
            </div>

            {teacherToast && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{teacherToast}</span>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Session Turns</span>
                <p className="text-lg font-black text-slate-900 mt-1">{capturedTurnCount}/{totalRounds}</p>
                <p className="text-[10px] text-slate-400">captured / total</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Online Learners</span>
                <p className="text-lg font-black text-slate-900 mt-1">{activeLearnerCount}</p>
                <p className="text-[10px] text-slate-400">joined in this classroom</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Turn</span>
                <p className="text-lg font-black text-red-700 mt-1">{turnLabel}</p>
                <p className="text-[10px] text-slate-400">of {String(totalRounds || 0).padStart(3, '0')}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">CCI Performance</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {performanceSummary.length === 0 ? (
                    <span className="text-[10px] text-slate-400">No captures yet</span>
                  ) : performanceSummary.map(param => (
                    <span
                      key={param.id}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: param.color_hex }}
                    >
                      {param.label}: {param.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Workspace Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0">
              
              {/* Roster & Students */}
              <div className={`${isFocusMode ? 'md:col-span-3' : 'md:col-span-4'} bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Roster ({activeRoster.length})
                    </span>

                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">User Responses</span>
                      <p className="text-lg font-black text-slate-900 leading-tight">{capturedTurnCount}</p>
                      <span className="text-[9px] text-slate-400">total received</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Responders</span>
                      <p className="text-lg font-black text-slate-900 leading-tight">{uniqueRespondingLearnerCount}</p>
                      <span className="text-[9px] text-slate-400">unique learners</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-auto">
                    {activeRoster.length === 0 ? (
                      <span className="text-[11px] text-slate-400 block text-center py-4">Waiting for students to join...</span>
                    ) : (
                      activeRoster.map(m => {
                        const learnerResponseCount = responseCountByLearnerId[m.learner_id] || 0;
                        return (
                          <div key={m.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 p-1.5 bg-white border border-slate-100 rounded text-xs">
                            <span className="font-semibold text-slate-700 truncate">{m.learner.display_name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 whitespace-nowrap" title="Total responses captured from this roster learner">
                              {learnerResponseCount} resp
                            </span>
                            <span className={`text-[9px] px-1 rounded font-bold whitespace-nowrap ${m.can_answer ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                              {m.can_answer ? 'Online' : 'Locked'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {activeRoom.status === 'round_open' && activeRoster.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Simulator Commands:</span>
                    <button
                      onClick={handleSimulateDummyResponse}
                      className="w-full text-center py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded transition-colors"
                    >
                      Trigger Dummy Response
                    </button>
                  </div>
                )}
              </div>

              {/* Round Actions & Selected Prompt */}
              <div className={`${isFocusMode ? 'md:col-span-9' : 'md:col-span-8'} flex flex-col justify-between space-y-4 min-h-0`}>
                
                {activeRound && activeRound.status === 'open' ? (
                  /* ACTIVE OPEN ROUND VIEW */
                  <div className={`${isFocusMode ? 'p-5 md:p-6' : 'p-4'} bg-red-50/50 border border-red-200 rounded-xl space-y-4 flex-1 flex flex-col justify-between min-h-[520px]`}>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-red-700 uppercase bg-red-100 px-2 py-0.5 rounded">
                          Turn {String(activeRound.round_index).padStart(3, '0')} • OPEN
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Timed: {activeRound.scoring_mode_snapshot}</span>
                        </div>
                      </div>

                      {/* Teacher-only active turn audio card */}
                      <div className="mt-4">
                        {(() => {
                          const res = resources.find(r => r.id === activeRound.sentence_resource_id);
                          if (!res) return null;
                          return (
                            <div className="bg-white border border-red-100 rounded-2xl p-6 md:p-8 text-center space-y-5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-black text-red-700 uppercase bg-red-100 px-3 py-1 rounded-full tracking-[0.2em]">
                                  TURN {String(activeRound.round_index).padStart(3, '0')} / {String(totalRounds || 0).padStart(3, '0')}
                                </span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Teacher prompt only • Learners see metadata, not answer text
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => playSentenceAudio(res)}
                                className={`mx-auto w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center transition-all shadow-lg border ${
                                  isAudioPlaying
                                    ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-red-200'
                                    : 'bg-slate-950 hover:bg-slate-800 text-white border-slate-900 hover:scale-105'
                                }`}
                                title="Play current turn audio"
                              >
                                <Volume2 className={`w-16 h-16 md:w-20 md:h-20 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
                              </button>

                              <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vietnamese</span>
                                  <p className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">{res.text_vi || '—'}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">English</span>
                                  <p className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">{res.text_en || res.text_prompt || '—'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Next Turn Preview Card */}
                      <div className="mt-4">
                        {(() => {
                          const usedIds = new Set<string>(roomRounds.map(rd => String(rd.sentence_resource_id)));
                          const nextId = getNextPlayableSentenceId(usedIds);
                          const nextRes = nextId ? resources.find(r => r.id === nextId) : null;
                          if (!nextRes) {
                            return (
                              <div className="bg-white border border-red-100 rounded-2xl p-6 md:p-8 text-center space-y-3">
                                <span className="text-[10px] font-mono font-black text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full tracking-[0.2em]">
                                  NO MORE SENTENCES IN QUEUE
                                </span>
                                <p className="text-xs text-slate-400 italic">This is the final sentence of the selected lesson/scope.</p>
                              </div>
                            );
                          }
                          return (
                            <div className="bg-white border border-red-100 rounded-2xl p-6 md:p-8 text-center space-y-5">
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono font-black text-red-700 uppercase bg-red-100 px-3 py-1 rounded-full tracking-[0.2em]">
                                  NEXT TURN PREVIEW • {nextRes.sentence_code}
                                </span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Preview of the next sentence in queue
                                </p>
                              </div>
                              <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vietnamese</span>
                                  <p className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">{nextRes.text_vi || '—'}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">English</span>
                                  <p className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">{nextRes.text_en || nextRes.text_prompt || '—'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-red-100 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Languages className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-bold text-slate-700">Audio:</span>
                            </div>
                            <div className="inline-flex rounded-lg p-0.5 bg-red-100">
                              <button
                                type="button"
                                onClick={() => setAudioLang('en')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audioLang === 'en' ? 'bg-white text-red-700 shadow-2xs' : 'text-red-600 hover:text-red-900'}`}
                              >
                                EN
                              </button>
                              <button
                                type="button"
                                onClick={() => setAudioLang('vi')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audioLang === 'vi' ? 'bg-white text-red-700 shadow-2xs' : 'text-red-600 hover:text-red-900'}`}
                              >
                                VI
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">Next CCI:</span>
                            <select
                              value={setupCciCardId}
                              onChange={(e) => setSetupCciCardId(e.target.value)}
                              className="text-xs p-1.5 bg-white border border-red-100 rounded-lg focus:ring-1 focus:ring-red-500 max-w-[220px]"
                              title="Applies to the next opened turn"
                            >
                              {cciCards.map(c => (
                                <option key={c.id} value={c.id}>{c.label} (X={c.standard_value})</option>
                              ))}
                            </select>
                          </div>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg" title="Automatically play audio when a turn opens for learners.">
                            <input type="checkbox" checked={autoPlayAudio} onChange={(e) => setAutoPlayAudio(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 border-red-200 w-4 h-4" />
                            <span>Auto-play open turn</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg" title="Automatically preview audio when the next-sentence screen is visible.">
                            <input type="checkbox" checked={autoPreviewNextAudio} onChange={(e) => setAutoPreviewNextAudio(e.target.checked)} className="rounded text-red-600 focus:ring-red-500 border-red-200 w-4 h-4" />
                            <span>Auto-preview next</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const res = resources.find(r => r.id === activeRound.sentence_resource_id);
                              if (res) playSentenceAudio(res);
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-all flex items-center gap-1.5"
                            title="Replay the current speaker prompt. Keyboard: Space."
                          >
                            <Volume2 className="w-4 h-4" />
                            Replay Prompt
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowAudioSettings(!showAudioSettings)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${showAudioSettings ? 'bg-red-700 text-white border-red-700 shadow-2xs' : 'bg-white text-slate-700 border-red-100 hover:bg-red-50'}`}
                          >
                            <Settings className="w-4 h-4" />
                            Speech Settings
                            {showAudioSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {showAudioSettings && (
                          <div className="bg-white p-4 rounded-lg border border-red-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Volume ({Math.round(audioVolume * 100)}%)</label>
                              <input type="range" min="0" max="1" step="0.1" value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Speed Rate ({audioRate}x)</label>
                              <input type="range" min="0.5" max="2" step="0.1" value={audioRate} onChange={(e) => setAudioRate(parseFloat(e.target.value))} className="w-full h-1.5 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Pitch ({audioPitch}x)</label>
                              <input type="range" min="0.5" max="2" step="0.1" value={audioPitch} onChange={(e) => setAudioPitch(parseFloat(e.target.value))} className="w-full h-1.5 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live responses gathered */}
                    <div className="border-t border-red-100 pt-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Captured Turn Response:</span>
                      {currentRoundResponseCount === 0 ? (
                        <div className="text-center py-4 text-[11px] text-slate-400 italic">
                          Waiting for the first learner response...
                        </div>
                      ) : (
                        currentRoundResponses.map(resp => (
                          <div key={resp.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs animate-fadeIn">
                            <div>
                              <span className="font-semibold text-slate-800">{resp.learner.display_name}</span>
                              <div className="flex gap-2 text-[10px] text-slate-400 mt-1">
                                <span>Reflect: {resp.reflection_seconds}s</span>
                                <span>•</span>
                                <span>CCI: <strong className="text-indigo-600">{resp.cci_result} A</strong></span>
                                <span>•</span>
                                <span>CPD: <strong className="text-red-700">{resp.cpd_result}</strong></span>
                              </div>
                            </div>

                            {(() => {
                              const param = sandboxDb.cciPerformanceParameters.find(
                                p => p.color_code.toLowerCase() === resp.response_color.toLowerCase() || 
                                     p.label.toLowerCase() === resp.response_color.toLowerCase()
                              );
                              const bgHex = param ? param.color_hex : '#94a3b8';
                              return (
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] font-extrabold text-white uppercase border border-black/5"
                                  style={{ backgroundColor: bgHex, textShadow: '0 0.5px 1px rgba(0,0,0,0.1)' }}
                                >
                                  {param ? param.label : resp.response_color}
                                </span>
                              );
                            })()}
                          </div>
                        ))
                      )}

                      {/* Display countdown for auto-advance */}
                      {autoAdvanceCountdown !== null && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-bold flex items-center justify-between animate-pulse">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-600 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                            <span>Auto-opening next turn...</span>
                          </span>
                          <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded font-mono">
                            {autoAdvanceCountdown}s
                          </span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg p-2 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>First response locks this turn. The next turn opens automatically from the session sentence list.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SESSION CONTROL / NEXT ROUND PREVIEW */
                  <div className={`${isFocusMode ? 'p-5 md:p-6 min-h-[620px]' : 'p-4'} border border-slate-200 rounded-xl space-y-4 flex-1 flex flex-col justify-between bg-slate-50/50`}>
                    {(() => {
                      const nextSentenceId = nextPreviewSentenceId;
                      const nextRes = nextPreviewResource;
                      const nextCard = cciCards.find(c => c.id === setupCciCardId);
                      const isComplete = sessionComplete;
                      return (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                              <div>
                                <h3 className="font-sans font-semibold text-slate-800 text-xs">
                                  Live Session Controls
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  One live classroom contains the full approved sentence snapshot. After the first response, the system auto-opens the next turn.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded">
                                  {currentRoundNumber}/{totalRounds || 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsFocusMode(!isFocusMode)}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                                  title={isFocusMode ? 'Exit expanded live controls' : 'Expand live controls'}
                                >
                                  {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {nextRes ? (
                              <div className={`bg-white border border-slate-200 rounded-xl ${isFocusMode ? 'p-5 md:p-6' : 'p-4'} space-y-4`}>
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {isBetweenTurnsAfterCapture ? 'Next turn ready after capture' : 'Next sentence preview'}
                                      </span>
                                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded" title={nextRes.sentence_code}>
                                        {getShortSentenceCode(nextRes.sentence_code, nextRes.order_index)}
                                      </span>
                                      <span className="text-[10px] text-indigo-700 font-bold">{nextCard?.label || 'Selected CCI'} • X={nextCard?.standard_value || 1}</span>
                                      <span className="text-[10px] text-red-700 font-bold">Ω={nextRes.cvr_value || nextRes.default_cvr_value || 1}</span>
                                    </div>
                                    {latestCapturedResponse && isBetweenTurnsAfterCapture && (
                                      <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 inline-flex">
                                        Captured {latestCapturedResponse.learner.display_name}; moving to turn {String(roomRounds.length + 1).padStart(3, '0')}.
                                      </p>
                                    )}
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      Next teacher prompt is ready below. Learner terminals receive metadata and response buttons only.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => playSentenceAudio(nextRes)}
                                    className={`shrink-0 mx-auto lg:mx-0 ${isFocusMode ? 'w-24 h-24 md:w-28 md:h-28' : 'w-20 h-20'} rounded-full flex items-center justify-center transition-all shadow-lg border ${
                                      isAudioPlaying
                                        ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-red-200'
                                        : 'bg-slate-950 hover:bg-slate-800 text-white border-slate-900 hover:scale-105'
                                    }`}
                                    title="Preview next turn audio"
                                  >
                                    <Volume2 className={`${isFocusMode ? 'w-12 h-12 md:w-14 md:h-14' : 'w-10 h-10'} ${isAudioPlaying ? 'animate-bounce' : ''}`} />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Vietnamese</span>
                                    <p className="text-xs text-slate-700 leading-relaxed mt-1">{nextRes.text_vi || '—'}</p>
                                  </div>
                                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">English</span>
                                    <p className="text-xs text-slate-700 leading-relaxed mt-1">{nextRes.text_en || nextRes.text_prompt || '—'}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
                                No approved sentence remains in this session snapshot.
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <Languages className="w-4 h-4 text-indigo-600" />
                                  <span className="text-xs font-bold text-slate-700">Audio:</span>
                                </div>
                                <div className="inline-flex rounded-lg p-0.5 bg-slate-200">
                                  <button
                                    type="button"
                                    onClick={() => setAudioLang('en')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audioLang === 'en' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                  >
                                    EN
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAudioLang('vi')}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${audioLang === 'vi' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                                  >
                                    VI
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">Next CCI:</span>
                                <select
                                  value={setupCciCardId}
                                  onChange={(e) => setSetupCciCardId(e.target.value)}
                                  className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 max-w-[220px]"
                                >
                                  {cciCards.map(c => (
                                    <option key={c.id} value={c.id}>{c.label} (X={c.standard_value})</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg">
                                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                <span className="text-xs font-bold">Auto next-turn ON</span>
                              </div>

                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white border border-slate-200 px-3 py-1.5 rounded-lg" title="Automatically play audio when a turn opens for learners.">
                                <input type="checkbox" checked={autoPlayAudio} onChange={(e) => setAutoPlayAudio(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4" />
                                <span>Auto-play open turn</span>
                              </label>

                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-white border border-slate-200 px-3 py-1.5 rounded-lg" title="Automatically preview audio on this next-sentence screen. Turn off for manual Play Prompt only.">
                                <input type="checkbox" checked={autoPreviewNextAudio} onChange={(e) => setAutoPreviewNextAudio(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4" />
                                <span>Auto-preview next</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => nextRes && playSentenceAudio(nextRes)}
                                disabled={!nextRes}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 text-indigo-700 transition-all flex items-center gap-1.5"
                                title="Play the next speaker prompt. Keyboard: Space."
                              >
                                <Volume2 className="w-4 h-4" />
                                Play Prompt
                                <span className="text-[9px] text-indigo-500">Space</span>
                              </button>

                              <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg">
                                → opens next turn
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowAudioSettings(!showAudioSettings)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${showAudioSettings ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                              >
                                <Settings className="w-4 h-4" />
                                Speech Settings
                                {showAudioSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>

                            {showAudioSettings && (
                              <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Volume ({Math.round(audioVolume * 100)}%)</label>
                                  <input type="range" min="0" max="1" step="0.1" value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Speed Rate ({audioRate}x)</label>
                                  <input type="range" min="0.5" max="2" step="0.1" value={audioRate} onChange={(e) => setAudioRate(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Pitch ({audioPitch}x)</label>
                                  <input type="range" min="0.5" max="2" step="0.1" value={audioPitch} onChange={(e) => setAudioPitch(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                                <div className="flex items-center justify-start md:justify-center">
                                  <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                      <input type="checkbox" checked={autoPlayAudio} onChange={(e) => setAutoPlayAudio(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4" />
                                      <span>Auto-play open turn</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                      <input type="checkbox" checked={autoPreviewNextAudio} onChange={(e) => setAutoPreviewNextAudio(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4" />
                                      <span>Auto-preview next</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            {roomRounds.length === 0 ? (
                              <button
                                onClick={handleStartOrNextRound}
                                disabled={!nextRes || activeRound?.status === 'open' || isComplete}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5" />
                                Start Session
                              </button>
                            ) : isComplete ? (
                              <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold text-center">
                                Session Complete
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={handleStartOrNextRound}
                                disabled={!nextRes || activeRound?.status === 'open'}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                              >
                                {isBetweenTurnsAfterCapture ? <Volume2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                {isBetweenTurnsAfterCapture ? 'Open Next Turn Speaker Prompt' : 'Open Next Turn'}
                              </button>
                            )}
                            <div className="text-[11px] text-slate-400 bg-slate-100 p-2 rounded flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>First-response mode records one winner only; after capture, all learner pads lock until the next round opens.</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
