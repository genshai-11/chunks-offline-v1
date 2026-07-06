/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, Lesson, LessonSection, SentenceResource, CCIStandardCard, CVRUnit, PracticeRoom, RoomRound, Learner, RoomMembership, LearnerResponse } from '../types';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { 
  Plus, Play, Check, AlertTriangle, Users, BookOpen, Clock, Activity, 
  Award, RefreshCw, LogIn, UserCheck, Send, Volume2, Sparkles, AlertCircle, Trash2, Shield,
  Settings, Languages, VolumeX, ChevronDown, ChevronUp
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
  const [setupSectionIds, setSetupSectionIds] = useState<string[]>([]);
  const [setupCciCardId, setSetupCciCardId] = useState<string>('');
  const [setupCaptureMode, setSetupCaptureMode] = useState<'assigned' | 'first_responder' | 'auto_rotate'>('first_responder');
  const [setupScoringMode, setSetupScoringMode] = useState<'simple' | 'timed'>('simple');

  // Learner Session fields
  const [learnerDisplayName, setLearnerDisplayName] = useState('Emily');
  const [learnerRoomCode, setLearnerRoomCode] = useState('');
  const [currentLearnerId, setCurrentLearnerId] = useState<string>('');
  const [currentLearnerName, setCurrentLearnerName] = useState<string>('');

  // Sync setup states when async props load
  useEffect(() => {
    if (courses.length > 0) {
      const courseExists = courses.some(c => c.id === setupCourseId);
      if (!courseExists || !setupCourseId) {
        setSetupCourseId(courses[0].id);
        setSetupLessonId('');
        setSetupSectionIds([]);
      }
    } else {
      setSetupCourseId('');
      setSetupLessonId('');
      setSetupSectionIds([]);
    }
  }, [courses, setupCourseId]);

  useEffect(() => {
    const validLessons = lessons.filter(l => l.course_id === setupCourseId);
    if (validLessons.length > 0) {
      const lessonExists = validLessons.some(l => l.id === setupLessonId);
      if (!lessonExists) {
        setSetupLessonId(validLessons[0].id);
        setSetupSectionIds([]);
      }
    } else {
      setSetupLessonId('');
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
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Auto-Advance States
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [lastPlayedRoundId, setLastPlayedRoundId] = useState<string>('');
  const [lastAutoAdvancedRoundId, setLastAutoAdvancedRoundId] = useState<string>('');

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
  const playSentenceAudio = (res: SentenceResource) => {
    const textToPlay = audioLang === 'en' ? res.text_en : res.text_vi;
    const audioUrl = audioLang === 'en' ? res.audio_en_url : res.audio_vi_url;

    if (audioUrl) {
      setIsAudioPlaying(true);
      const audio = new Audio(audioUrl);
      audio.volume = audioVolume;
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
  const [roundResponses, setRoundResponses] = useState<(LearnerResponse & { learner: Learner })[]>([]);
  const [availableSentenceIds, setAvailableSentenceIds] = useState<string[]>([]);
  
  // Setup dependent selections
  const filteredLessons = lessons.filter(l => l.course_id === setupCourseId);
  const selectedLessonId = setupLessonId || filteredLessons[0]?.id || '';
  const filteredSections = sections.filter(s => s.lesson_id === selectedLessonId);

  // Load active room and sync state periodically or on change
  useEffect(() => {
    syncActiveRoomState();
    
    // Subscribe to sandbox change events for real-time reactivity
    const handleDbChange = () => {
      syncActiveRoomState();
    };
    window.addEventListener('chunks_sandbox_db_change', handleDbChange);
    return () => {
      window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    };
  }, [activeRoomId]);

  const syncActiveRoomState = () => {
    if (!activeRoomId) {
      setActiveRoom(null);
      setActiveRoster([]);
      setActiveRound(null);
      setRoundResponses([]);
      return;
    }

    const room = sandboxDb.rooms.find(r => r.id === activeRoomId) || null;
    setActiveRoom(room);

    if (room) {
      // Load memberships
      const memberships = sandboxDb.memberships.filter(m => m.room_id === room.id);
      const rosterList = memberships.map(m => {
        const learner = sandboxDb.learners.find(l => l.id === m.learner_id);
        return { ...m, learner: learner! };
      }).filter(item => item.learner !== undefined);
      setActiveRoster(rosterList);

      // Load active round
      const rounds = sandboxDb.rounds.filter(rd => rd.room_id === room.id);
      const openRound = rounds.find(rd => rd.status === 'open') || rounds[rounds.length - 1] || null;
      setActiveRound(openRound);

      if (openRound) {
        if (openRound.status === 'open' && roundStartTime === 0) {
          setRoundStartTime(Date.now());
        }
        // Load responses
        const resps = sandboxDb.responses.filter(res => res.round_id === openRound.id);
        const mappedResps = resps.map(r => {
          const learner = sandboxDb.learners.find(l => l.id === r.learner_id);
          return { ...r, learner: learner! };
        }).filter(item => item.learner !== undefined);
        setRoundResponses(mappedResps);
      } else {
        setRoundStartTime(0);
        setRoundResponses([]);
      }

      setAvailableSentenceIds(room.snapshot_sentence_resource_ids);
    }
  };

  // Auto-play audio when a new round is opened
  useEffect(() => {
    if (activeRound && activeRound.status === 'open' && activeRound.id !== lastPlayedRoundId) {
      setLastPlayedRoundId(activeRound.id);
      if (autoPlayAudio) {
        const res = resources.find(r => r.id === activeRound.sentence_resource_id);
        if (res) {
          const timer = setTimeout(() => {
            playSentenceAudio(res);
          }, 300);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [activeRound?.id, autoPlayAudio, resources, lastPlayedRoundId]);

  // Auto-Advance logic when a student response is submitted
  useEffect(() => {
    if (
      autoAdvance && 
      activeRound && 
      activeRound.status === 'open' && 
      roundResponses.length > 0 && 
      activeRound.id !== lastAutoAdvancedRoundId
    ) {
      setAutoAdvanceCountdown(3); // start 3s countdown
    } else {
      setAutoAdvanceCountdown(null);
    }
  }, [autoAdvance, activeRound?.id, roundResponses.length, lastAutoAdvancedRoundId]);

  // Handle countdown ticks for auto-advance
  useEffect(() => {
    if (autoAdvanceCountdown === null) return;

    if (autoAdvanceCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoAdvanceCountdown(prev => prev !== null ? prev - 1 : null);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setAutoAdvanceCountdown(null);
      if (activeRound) {
        setLastAutoAdvancedRoundId(activeRound.id);
        
        const currentIdx = availableSentenceIds.indexOf(activeRound.sentence_resource_id);
        const nextSentenceId = currentIdx !== -1 && currentIdx + 1 < availableSentenceIds.length 
          ? availableSentenceIds[currentIdx + 1] 
          : null;

        // Close the current round
        handleCloseRound();

        // Launch the next round after a small delay
        if (nextSentenceId) {
          const launchTimer = setTimeout(() => {
            handleOpenRound(nextSentenceId);
          }, 1200);
          return () => clearTimeout(launchTimer);
        }
      }
    }
  }, [autoAdvanceCountdown]);

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
          const isAllSectionsSelected = setupSectionIds.length === 0 || filteredSections.every(s => setupSectionIds.includes(s.id));
          const approvedResources = resources.filter(
            r => r.course_id === setupCourseId &&
                 r.lesson_id === selectedLessonId &&
                 r.approval_status === 'approved' &&
                 (isAllSectionsSelected || (r.section_id && setupSectionIds.includes(r.section_id)))
          );

          if (approvedResources.length === 0) {
            throw new Error("No approved sentence resources found in the selected scope. Please approve sentences in the Library first.");
          }

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
            lesson_id: selectedLessonId,
            host_name: hostName,
            resource_scope_filter: { sectionIds: setupSectionIds },
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
        } catch (err: any) {
          alert(`Room creation failed on Supabase: ${err.message}`);
        }
      };
      executeCreate();
    }
  };

  // 2. Open Round Trigger
  const handleOpenRound = (sentenceId: string) => {
    if (!activeRoom) return;
    
    const executeOpenRound = async () => {
      try {
        // Determine assigned learner if capture mode is assigned
        let assignedLearnerId: string | null = null;
        if (activeRoom.default_response_capture_mode === 'assigned' && activeRoster.length > 0) {
          assignedLearnerId = activeRoster[0].learner_id;
        } else if (activeRoom.default_response_capture_mode === 'auto_rotate' && activeRoster.length > 0) {
          const playedRounds = useSandbox 
            ? sandboxDb.rounds.filter(rd => rd.room_id === activeRoom.id)
            : (sandboxDb.rounds || []).filter(rd => rd.room_id === activeRoom.id); // fallback
          const playedCount = useSandbox ? playedRounds.length : (sandboxDb.rounds || []).length;
          const nextIdx = playedCount % activeRoster.length;
          assignedLearnerId = activeRoster[nextIdx].learner_id;
        }

        if (useSandbox) {
          sandboxDb.openRound({
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
        } else {
          // Live Supabase implementation
          const card = cciCards.find(c => c.id === setupCciCardId);
          if (!card) throw new Error("CCI card not found");

          const resource = resources.find(r => r.id === sentenceId);
          if (!resource) throw new Error("Sentence resource not found");

          const nextIndex = (sandboxDb.rounds || []).filter(r => r.room_id === activeRoom.id).length + 1;
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

          setRoundStartTime(Date.now());
          onRefreshData();
        }
      } catch (err: any) {
        alert(err.message);
      }
    };
    executeOpenRound();
  };

  // 3. Close Round Trigger
  const handleCloseRound = () => {
    if (!activeRound) return;
    if (useSandbox) {
      try {
        sandboxDb.closeRound(activeRound.id);
        setRoundStartTime(0);
        onRefreshData();
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      const executeClose = async () => {
        try {
          // 1. Set round to closed
          const { error: updRoundErr } = await supabase
            .from('room_rounds')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRound.id);
          if (updRoundErr) throw updRoundErr;

          // 2. Find and finalize response if any exists
          const { data: respList } = await supabase
            .from('learner_responses')
            .select('*')
            .eq('round_id', activeRound.id)
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
              .eq('id', activeRound.id);

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

          // 3. Update room status to round_closed
          await supabase
            .from('practice_rooms')
            .update({
              status: 'round_closed',
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom?.id);

          setRoundStartTime(0);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to close round on Supabase: " + err.message);
        }
      };
      executeClose();
    }
  };

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
          // 1. Finish the room
          const { error: updRoomErr } = await supabase
            .from('practice_rooms')
            .update({
              status: 'finished',
              updated_at: new Date().toISOString()
            })
            .eq('id', activeRoom.id);
          if (updRoomErr) throw updRoomErr;

          // 2. Force close any remaining open rounds for this room
          const openRounds = (sandboxDb.rounds || []).filter(rd => rd.room_id === activeRoom.id && rd.status === 'open');
          for (const ord of openRounds) {
            await supabase
              .from('room_rounds')
              .update({
                status: 'closed',
                closed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', ord.id);
          }

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
          onRefreshData();
        } catch (err: any) {
          alert("Failed to submit simulated response: " + err.message);
        }
      };
      executeDummyResponse();
    }
  };

  const handleCloseActiveSession = () => {
    setActiveRoomId('');
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

        {/* 1. ROOM CREATION / SETUP SCREEN */}
        {!activeRoom ? (
          <div className="p-6 flex-1 flex flex-col justify-between">
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
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">CHOOSE LESSON</label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => {
                      setSetupLessonId(e.target.value);
                      setSetupSectionIds([]);
                    }}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-red-500"
                  >
                    {filteredLessons.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scope filter checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LIMIT TO LESSON SECTIONS (CHUNKS)</label>
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
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer select-none"
                    >
                      {filteredSections.every(s => setupSectionIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {filteredSections.length === 0 ? (
                  <span className="text-[11px] text-slate-400">No specific sections found. Loads all lesson materials.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5" id="chunks-section-badges-container">
                    {filteredSections.map(s => {
                      const isChecked = setupSectionIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSetupSectionIds(setupSectionIds.filter(id => id !== s.id));
                            } else {
                              setSetupSectionIds([...setupSectionIds, s.id]);
                            }
                          }}
                          className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-red-50 border-red-200 text-red-700 shadow-2xs font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full transition-all ${isChecked ? 'bg-red-500 scale-110' : 'bg-slate-300'}`} />
                          <span>{s.title}</span>
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
                      const isAllSectionsSelected = setupSectionIds.length === 0 || filteredSections.every(s => setupSectionIds.includes(s.id));
                      return resources.filter(
                        r => r.course_id === setupCourseId &&
                             r.lesson_id === selectedLessonId &&
                             r.approval_status === 'approved' &&
                             (isAllSectionsSelected || (r.section_id && setupSectionIds.includes(r.section_id)))
                      ).length;
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
          <div className="p-5 flex-1 flex flex-col justify-between space-y-6">
            
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
                      const joinUrl = `${window.location.origin}${window.location.pathname}?room_code=${activeRoom.room_code}`;
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
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                  activeRoom.status === 'lobby' ? 'bg-amber-100 text-amber-800' :
                  activeRoom.status === 'round_open' ? 'bg-red-100 text-red-800 animate-pulse' :
                  activeRoom.status === 'round_closed' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {activeRoom.status}
                </span>
                <button
                  onClick={handleFinishRoom}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded transition-colors"
                >
                  End Classroom Session
                </button>
              </div>
            </div>

            {/* Live Customizable Speech & Progression Controls */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700">Live Audio Language:</span>
                  </div>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200">
                    <button
                      type="button"
                      onClick={() => setAudioLang('en')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        audioLang === 'en'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioLang('vi')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        audioLang === 'vi'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      VI
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Round Advancement:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200">
                    <button
                      type="button"
                      onClick={() => setAutoAdvance(false)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        !autoAdvance
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoAdvance(true)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                        autoAdvance
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Auto-Advance
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAudioSettings(!showAudioSettings)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                    showAudioSettings
                      ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Speech Settings
                  {showAudioSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible settings panel */}
              {showAudioSettings && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Volume ({Math.round(audioVolume * 100)}%)</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Speed Rate ({audioRate}x)</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={audioRate}
                      onChange={(e) => setAudioRate(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Pitch ({audioPitch}x)</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={audioPitch}
                      onChange={(e) => setAudioPitch(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-start md:justify-center">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoPlayAudio}
                        onChange={(e) => setAutoPlayAudio(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4"
                      />
                      <span>Auto-play on launch</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Main Workspace Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1">
              
              {/* Roster & Students */}
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Roster ({activeRoster.length})
                    </span>
                    {activeRoster.length === 0 && (
                      <button
                        onClick={handleSpawnMockStudents}
                        className="text-[9px] text-indigo-600 hover:underline font-bold"
                      >
                        + Demo Users
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-auto">
                    {activeRoster.length === 0 ? (
                      <span className="text-[11px] text-slate-400 block text-center py-4">Waiting for students to join...</span>
                    ) : (
                      activeRoster.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-1.5 bg-white border border-slate-100 rounded text-xs">
                          <span className="font-semibold text-slate-700">{m.learner.display_name}</span>
                          <span className="text-[9px] bg-red-50 text-red-600 px-1 rounded font-bold">Online</span>
                        </div>
                      ))
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
              <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                
                {activeRound && activeRound.status === 'open' ? (
                  /* ACTIVE OPEN ROUND VIEW */
                  <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-red-700 uppercase bg-red-100 px-2 py-0.5 rounded">
                          Round #{activeRound.round_index} • OPEN
                        </span>
                        
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Timed: {activeRound.scoring_mode_snapshot}</span>
                        </div>
                      </div>

                      {/* Display prompt details */}
                      <div className="mt-3.5 space-y-2.5">
                        {(() => {
                          const res = resources.find(r => r.id === activeRound.sentence_resource_id);
                          if (!res) return null;
                          return (
                            <>
                              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-lg p-3">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Sentence Code: {res.sentence_code}</span>
                                  <h4 className="text-xs font-semibold text-slate-800 leading-normal mt-0.5">
                                    Challenge: <strong className="text-indigo-700">“{res.text_prompt}”</strong>
                                  </h4>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => playSentenceAudio(res)}
                                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    isAudioPlaying
                                      ? 'bg-red-600 text-white animate-pulse'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-3xs'
                                  }`}
                                  title="Play speech audio"
                                >
                                  <Volume2 className={`w-4 h-4 ${isAudioPlaying ? 'animate-bounce' : ''}`} />
                                  <span>{isAudioPlaying ? 'Playing...' : `Speak (${audioLang.toUpperCase()})`}</span>
                                </button>
                              </div>

                              <div className="p-3 bg-white border border-slate-100 rounded-lg space-y-2 text-xs">
                                <p className="text-slate-700 flex items-start gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 w-20 uppercase shrink-0">English:</span>
                                  <strong className="flex-1 text-slate-800">{res.text_en}</strong>
                                </p>
                                <p className="text-slate-700 flex items-start gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 w-20 uppercase shrink-0">Vietnamese:</span>
                                  <strong className="flex-1 text-slate-800">{res.text_vi}</strong>
                                </p>
                                {(res.audio_en_url || res.audio_vi_url) && (
                                  <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 border-t border-slate-100 mt-1">
                                    <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                                    <span>Pre-recorded voice stream is available.</span>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Live responses gathered */}
                    <div className="border-t border-red-100 pt-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Captured Response:</span>
                      {roundResponses.length === 0 ? (
                        <div className="text-center py-4 text-[11px] text-slate-400 italic">
                          Waiting for students to transmit response colors...
                        </div>
                      ) : (
                        roundResponses.map(resp => (
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
                            <span>Auto-advancing to next sentence prompt...</span>
                          </span>
                          <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded font-mono">
                            {autoAdvanceCountdown}s
                          </span>
                        </div>
                      )}

                      <button
                        onClick={handleCloseRound}
                        className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-xs transition-colors text-center block"
                      >
                        Close & Finalize Round Responses
                      </button>
                    </div>
                  </div>
                ) : (
                  /* SELECT AND OPEN NEXT ROUND */
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4 flex-1 flex flex-col justify-between bg-slate-50/50">
                    <div>
                      <h3 className="font-sans font-semibold text-slate-800 text-xs pb-1 border-b border-slate-200">
                        Launch Next Practice Sentence
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Select an approved sentence from your scope snapshot to open the next grading round.
                      </p>

                      <div className="space-y-2 mt-4 max-h-[220px] overflow-auto">
                        {availableSentenceIds.map((sid, idx) => {
                          const res = resources.find(r => r.id === sid);
                          if (!res) return null;
                          return (
                            <div key={res.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded mr-1.5">
                                  {res.sentence_code}
                                </span>
                                <span className="font-medium text-slate-700 truncate max-w-[200px] inline-block align-middle">
                                  {res.text_prompt}
                                </span>
                              </div>

                              <button
                                onClick={() => handleOpenRound(res.id)}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded text-[10px] transition-colors"
                              >
                                Launch Round
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-100 p-2 rounded">
                      Scoring snapshot standard will lock to: <strong className="text-slate-600">X={
                        cciCards.find(c => c.id === setupCciCardId)?.standard_value || 10
                      }</strong>.
                    </div>
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
