/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SentenceResource, CCIStandardCard, CCIPerformanceParameter } from '../types';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { 
  Users, UserCheck, Clock, Volume2, AlertCircle, LogIn, LogOut, CheckCircle2, ChevronRight, Play
} from 'lucide-react';

interface LearnerTerminalTabProps {
  useSandbox: boolean;
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
  onRefreshData: () => void;
}

export default function LearnerTerminalTab({
  useSandbox,
  resources,
  cciCards,
  onRefreshData
}: LearnerTerminalTabProps) {
  // Session states persisted in localStorage
  const [currentLearnerId, setCurrentLearnerId] = useState<string>(() => localStorage.getItem('chunks_learner_id') || '');
  const [currentLearnerName, setCurrentLearnerName] = useState<string>(() => localStorage.getItem('chunks_learner_name') || '');
  const [joinedRoomId, setJoinedRoomId] = useState<string>(() => localStorage.getItem('chunks_joined_room_id') || '');
  
  // Input fields
  const [learnerRoomCode, setLearnerRoomCode] = useState<string>(() => localStorage.getItem('chunks_learner_room_code') || '');
  const [learnerDisplayName, setLearnerDisplayName] = useState<string>(() => localStorage.getItem('chunks_learner_display_name') || 'Emily');
  
  // Simulated Reflection timer (Y scoring offset)
  const [simulatedReflectionMs, setSimulatedReflectionMs] = useState<number>(3500);

  // Synchronized active state loaded from Sandbox
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [roundResponses, setRoundResponses] = useState<any[]>([]);
  const [myPastResponses, setMyPastResponses] = useState<any[]>([]);
  const [performanceParams, setPerformanceParams] = useState<CCIPerformanceParameter[]>(() => [...sandboxDb.cciPerformanceParameters]);

  // Listen for room_code query parameter on mount to auto-prefill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room_code') || params.get('join');
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      setLearnerRoomCode(cleanCode);
      localStorage.setItem('chunks_learner_room_code', cleanCode);
    }
  }, []);

  // Listen for database changes to update real-time
  useEffect(() => {
    syncLocalState();
    setPerformanceParams([...sandboxDb.cciPerformanceParameters]);

    const handleDbChange = () => {
      syncLocalState();
      setPerformanceParams([...sandboxDb.cciPerformanceParameters]);
    };
    window.dispatchEvent(new Event('chunks_sandbox_db_change')); // Trigger once on mount
    window.addEventListener('chunks_sandbox_db_change', handleDbChange);
    return () => {
      window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    };
  }, [joinedRoomId, currentLearnerId]);

  const syncLocalState = () => {
    if (!joinedRoomId) {
      setActiveRoom(null);
      setActiveRound(null);
      setRoundResponses([]);
      setMyPastResponses([]);
      return;
    }

    const room = sandboxDb.rooms.find(r => r.id === joinedRoomId) || null;
    setActiveRoom(room);

    if (room) {
      // Load active round
      const rounds = sandboxDb.rounds.filter(rd => rd.room_id === room.id);
      const openRound = rounds.find(rd => rd.status === 'open') || rounds[rounds.length - 1] || null;
      setActiveRound(openRound);

      if (openRound) {
        // Load responses for current round
        const resps = sandboxDb.responses.filter(res => res.round_id === openRound.id);
        const mappedResps = resps.map(r => {
          const learner = sandboxDb.learners.find(l => l.id === r.learner_id);
          return { ...r, learner: learner! };
        }).filter(item => item.learner !== undefined);
        setRoundResponses(mappedResps);
      } else {
        setRoundResponses([]);
      }

      // Load my past responses in this room
      if (currentLearnerId) {
        const myResps = sandboxDb.responses.filter(r => r.learner_id === currentLearnerId);
        // Map sentence codes & details
        const mappedMyResps = myResps.map(r => {
          const round = sandboxDb.rounds.find(rd => rd.id === r.round_id);
          const sentence = round ? resources.find(s => s.id === round.sentence_resource_id) : null;
          return {
            ...r,
            sentence_code: sentence ? sentence.sentence_code : '??-???',
            sentence_text: sentence ? sentence.text_prompt : 'Unknown prompt',
            round_index: round ? round.round_index : 0
          };
        }).sort((a, b) => b.round_index - a.round_index);
        setMyPastResponses(mappedMyResps);
      }
    }
  };

  const handleLearnerJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (useSandbox) {
      try {
        const { room, learner } = sandboxDb.joinRoom({
          roomCode: learnerRoomCode,
          displayName: learnerDisplayName
        });

        // Persist in localStorage
        localStorage.setItem('chunks_learner_id', learner.id);
        localStorage.setItem('chunks_learner_name', learner.display_name);
        localStorage.setItem('chunks_joined_room_id', room.id);
        localStorage.setItem('chunks_learner_room_code', learnerRoomCode);
        localStorage.setItem('chunks_learner_display_name', learnerDisplayName);

        setCurrentLearnerId(learner.id);
        setCurrentLearnerName(learner.display_name);
        setJoinedRoomId(room.id);
        
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

          // Persist in localStorage
          localStorage.setItem('chunks_learner_id', learnerId);
          localStorage.setItem('chunks_learner_name', finalDisplayName);
          localStorage.setItem('chunks_joined_room_id', targetRoom.id);
          localStorage.setItem('chunks_learner_room_code', learnerRoomCode);
          localStorage.setItem('chunks_learner_display_name', learnerDisplayName);

          setCurrentLearnerId(learnerId);
          setCurrentLearnerName(finalDisplayName);
          setJoinedRoomId(targetRoom.id);
          onRefreshData();
        } catch (err: any) {
          alert(`Join failed on Supabase: ${err.message}`);
        }
      };
      executeJoin();
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem('chunks_learner_id');
    localStorage.removeItem('chunks_learner_name');
    localStorage.removeItem('chunks_joined_room_id');
    setCurrentLearnerId('');
    setCurrentLearnerName('');
    setJoinedRoomId('');
    onRefreshData();
  };

  const handleSubmitResponse = (color: string) => {
    if (!activeRound || !currentLearnerId) return;

    if (useSandbox) {
      try {
        sandboxDb.submitResponse({
          roundId: activeRound.id,
          learnerId: currentLearnerId,
          responseColor: color,
          reflectionTimeMs: simulatedReflectionMs
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
          const param = performanceParams.find(p => p.color_code.toLowerCase() === color.toLowerCase() || p.label.toLowerCase() === color.toLowerCase());
          const performanceY = param ? param.performance_y : 0;
          const reflectionSeconds = Math.round((simulatedReflectionMs / 1000.0) * 100) / 100;
          
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
              reflection_time_ms: simulatedReflectionMs,
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

  const speakSentenceText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Browser Speech Synthesis not supported.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6" id="learner-terminal-root">
      
      {/* 1. LOBBY OR NOT LOGGED IN STATE */}
      {!currentLearnerId ? (
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Student Live Terminal</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Connect directly to your active training session. Enter the room code and choice of display name.
            </p>
          </div>

          <form onSubmit={handleLearnerJoin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Code</label>
              <input 
                type="text"
                placeholder="e.g. CH-1234"
                value={learnerRoomCode}
                onChange={(e) => setLearnerRoomCode(e.target.value.toUpperCase())}
                className="w-full text-center font-mono font-bold tracking-widest text-base p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Screen Name</label>
              <input 
                type="text"
                placeholder="e.g. Emily"
                value={learnerDisplayName}
                onChange={(e) => setLearnerDisplayName(e.target.value)}
                className="w-full text-center text-xs font-semibold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none transition-all"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              Connect to Live Session
            </button>
          </form>
        </div>
      ) : (
        
        /* 2. LOGGED IN ACTIVE STUDENT EXPERIENCE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Workspace Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Active Round Prompt Frame */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              
              {/* Header Status Bar */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full animate-ping" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400">
                    Terminal Active • Connected
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-slate-400">
                    Student: <strong className="text-white font-semibold">{currentLearnerName}</strong>
                  </span>
                  <button
                    onClick={handleLogOut}
                    className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Active Drill Area */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between min-h-[320px] space-y-6">
                
                {!activeRound || activeRound.status !== 'open' ? (
                  /* IDLE / WAITING LOBBY STATE */
                  <div className="m-auto text-center space-y-4 max-w-sm py-8">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300 animate-pulse">
                      <Clock className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-700">Waiting for Teacher to reveal cards...</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Stay connected. As soon as the teacher launches a verbalization challenge, your voice-trigger simulator will activate here in real time.
                      </p>
                    </div>

                    {activeRoom && (
                      <div className="p-2.5 bg-red-50 rounded-lg text-[10px] text-red-800 border border-red-100">
                        Room Scope: <strong>{activeRoom.title}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ACTIVE LIVE DRILL SCREEN */
                  (() => {
                    const res = resources.find(r => r.id === activeRound.sentence_resource_id);
                    if (!res) return null;

                    // Compute alignment states
                    const captureMode = activeRound.response_capture_mode_snapshot;
                    const isAssigned = activeRound.assigned_learner_id === currentLearnerId;
                    const hasAlreadyResponded = roundResponses.some(r => r.learner_id === currentLearnerId);
                    const isAnyResponseCaptured = roundResponses.length > 0;

                    let eligibility: 'assigned' | 'observing' | 'already_responded' | 'blocked' = 'observing';
                    let statusLabel = "Observing Mode";
                    let statusColorClass = "bg-amber-100 text-amber-800 border border-amber-200";
                    let explanation = "Stand by. Another classmate has been nominated to answer this turn.";
                    let activeInteractive = false;

                    if (hasAlreadyResponded) {
                      eligibility = 'already_responded';
                      statusLabel = "Response Transmitted";
                      statusColorClass = "bg-red-100 text-red-800 border border-red-200";
                      explanation = "Your response has been finalized! Please wait for the teacher to reveal grades.";
                    } else if (isAnyResponseCaptured) {
                      eligibility = 'blocked';
                      statusLabel = "Round Captured";
                      statusColorClass = "bg-slate-100 text-slate-500 border border-slate-200";
                      explanation = "This card has already been successfully verbalized by a classmate.";
                    } else if (captureMode === 'assigned' || captureMode === 'auto_rotate') {
                      if (isAssigned) {
                        eligibility = 'assigned';
                        statusLabel = "First Responder Active!";
                        statusColorClass = "bg-indigo-600 text-white font-bold";
                        explanation = "Deliver your verbalization clearly. Submit your score indicator below.";
                        activeInteractive = true;
                      }
                    } else if (captureMode === 'first_responder') {
                      eligibility = 'assigned';
                      statusLabel = "First Responder Sprint!";
                      statusColorClass = "bg-indigo-600 text-white font-bold";
                      explanation = "Drill starts now! Submit your response as fast as possible to win the capture.";
                      activeInteractive = true;
                    }

                    return (
                      <div className="space-y-6 flex flex-col justify-between flex-1">
                        
                        {/* Prompt Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                              Active Challenge Card
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {res.sentence_code}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                Standard Card: X={activeRound.cci_standard_x}
                              </span>
                            </div>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColorClass} self-start sm:self-center shadow-2xs`}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Interactive Main Challenge */}
                        <div className="space-y-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 relative overflow-hidden">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                              Vietnamese Sentence Cue (Prompt):
                            </span>
                            <p className="text-base md:text-lg font-bold text-slate-800 leading-relaxed italic pr-12">
                              “{res.text_prompt}”
                            </p>

                            <button 
                              onClick={() => speakSentenceText(res.text_en)}
                              className="absolute top-4 right-4 p-2.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-red-600 rounded-full shadow-3xs transition-all cursor-pointer"
                              title="Listen to phonetic guide voice"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {activeInteractive && (
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1.5 animate-fadeIn">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                <Play className="w-3.5 h-3.5 text-indigo-600" />
                                Phonetic Reference Target (EN):
                              </div>
                              <p className="font-mono text-sm font-semibold text-slate-700 bg-white/60 p-2.5 rounded-lg border border-indigo-200/50">
                                {res.text_en}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Status Message */}
                        <div className="text-center py-2">
                          <span className={`text-xs font-medium ${
                            activeInteractive ? 'text-red-700 font-bold' : 'text-slate-400'
                          }`}>
                            {explanation}
                          </span>
                        </div>

                        {/* Interactive Button Pad */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          {activeInteractive ? (
                            <div className="space-y-4">
                              {/* Reflection Speed simulation slider */}
                              {activeRoom?.scoring_mode === 'timed' && (
                                <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-2 max-w-md mx-auto">
                                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <span>Simulate Reflection Speed:</span>
                                    <span className="font-mono text-indigo-700 font-bold text-xs">{simulatedReflectionMs / 1000} seconds</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min={500}
                                    max={10000}
                                    step={500}
                                    value={simulatedReflectionMs}
                                    onChange={(e) => setSimulatedReflectionMs(Number(e.target.value))}
                                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                                  />
                                </div>
                              )}

                              {/* Grade buttons representing learner results */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                                {performanceParams.map(param => (
                                  <button
                                    key={param.id}
                                    onClick={() => handleSubmitResponse(param.color_code)}
                                    className="p-4 active:scale-95 text-white font-extrabold rounded-2xl transition-all hover:-translate-y-0.5 shadow-2xs hover:shadow-xs flex flex-col items-center justify-center cursor-pointer text-center border border-black/10"
                                    style={{ backgroundColor: param.color_hex, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
                                  >
                                    <span className="text-sm font-black uppercase tracking-wide">{param.label}</span>
                                    <span className="text-[9px] font-bold opacity-90 mt-1">{param.description} (Y={param.performance_y})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs italic">
                              Submission pad locked. Waiting for your classmate's turn.
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()
                )}

              </div>
            </div>

            {/* Instruction Tip */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <strong className="font-semibold block mb-0.5">Offline Simulated Microphones</strong>
                <span>
                  This sandbox uses the simulated color grade selector (🔴, 🟡, 🟢, 🟣) to let you mimic a live student speaking into their headset. In live production, these responses are handled automatically via phonetic voice triggers and the speech scoring engine.
                </span>
              </div>
            </div>

          </div>

          {/* Student Statistics Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* My Performance Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                My Score Card
              </h4>

              {myPastResponses.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No responses recorded in this session yet.
                </div>
              ) : (
                (() => {
                  const totalRounds = myPastResponses.length;
                  const scoreTotal = myPastResponses.reduce((sum, r) => sum + (r.score_earned || 0), 0);
                  const averageReflection = myPastResponses.reduce((sum, r) => sum + (r.reflection_seconds || 0), 0) / totalRounds;

                  return (
                    <div className="grid grid-cols-3 gap-3.5 text-center">
                      <div className="bg-red-50 border border-red-100 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Total Score</span>
                        <strong className="text-base font-bold text-red-700">{scoreTotal}</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Drills</span>
                        <strong className="text-base font-bold text-slate-700">{totalRounds}</strong>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-2 rounded-xl">
                        <span className="text-[9px] text-slate-400 uppercase block font-semibold">Avg Time</span>
                        <strong className="text-base font-bold text-indigo-600">{averageReflection.toFixed(1)}s</strong>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Answer History Logs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  My Live Transmissions
                </h4>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-auto">
                {myPastResponses.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 italic">
                    Answers will appear here as you commit them.
                  </div>
                ) : (
                  myPastResponses.map(resp => (
                    <div key={resp.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-xl space-y-2 text-xs transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {resp.sentence_code}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white uppercase ${
                          resp.response_color === 'red' ? 'bg-red-500' :
                          resp.response_color === 'yellow' ? 'bg-yellow-500 text-slate-900' :
                          resp.response_color === 'green' ? 'bg-green-500' : 'bg-purple-600'
                        }`}>
                          {resp.response_color}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium italic">
                        “{resp.sentence_text}”
                      </p>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/50">
                        <span>Score: <strong className="text-slate-700 font-bold">+{resp.score_earned}</strong></span>
                        <span>Reflect: <strong className="text-indigo-600 font-mono">{resp.reflection_seconds}s</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
