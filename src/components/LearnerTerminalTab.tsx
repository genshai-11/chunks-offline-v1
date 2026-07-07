/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SentenceResource, CCIStandardCard, CCIPerformanceParameter, Learner } from '../types';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { getShortSentenceCode } from '../lib/resourceCode';
import { Users, Clock, LogIn, LogOut, Lock, CheckCircle2, BarChart3, Award } from 'lucide-react';

type LearnerUiSettings = {
  showSummaryCard: boolean;
  summaryTitle: string;
  showColorCounts: boolean;
  showHighestCpd: boolean;
  showRealtimeCalculationLogic: boolean;
};

const DEFAULT_LEARNER_UI_SETTINGS: LearnerUiSettings = {
  showSummaryCard: true,
  summaryTitle: 'My Session Summary',
  showColorCounts: true,
  showHighestCpd: true,
  showRealtimeCalculationLogic: true
};

function readLearnerUiSettings(): LearnerUiSettings {
  try {
    const raw = localStorage.getItem('chunks_learner_ui_settings');
    return raw ? { ...DEFAULT_LEARNER_UI_SETTINGS, ...JSON.parse(raw) } : DEFAULT_LEARNER_UI_SETTINGS;
  } catch {
    return DEFAULT_LEARNER_UI_SETTINGS;
  }
}

interface LearnerTerminalTabProps {
  useSandbox: boolean;
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
  learners: Learner[];
  onRefreshData: () => void;
}

export default function LearnerTerminalTab({
  useSandbox,
  resources,
  learners,
  onRefreshData
}: LearnerTerminalTabProps) {
  const [currentLearnerId, setCurrentLearnerId] = useState<string>(() => localStorage.getItem('chunks_learner_id') || '');
  const [currentLearnerName, setCurrentLearnerName] = useState<string>(() => localStorage.getItem('chunks_learner_name') || '');
  const [joinedRoomId, setJoinedRoomId] = useState<string>(() => localStorage.getItem('chunks_joined_room_id') || '');
  const [learnerRoomCode, setLearnerRoomCode] = useState<string>(() => localStorage.getItem('chunks_learner_room_code') || '');
  const [learnerDisplayName, setLearnerDisplayName] = useState<string>(() => localStorage.getItem('chunks_learner_display_name') || '');

  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [activeRound, setActiveRound] = useState<any>(null);
  const [roundResponses, setRoundResponses] = useState<any[]>([]);
  const [sessionResponses, setSessionResponses] = useState<any[]>([]);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [performanceParams, setPerformanceParams] = useState<CCIPerformanceParameter[]>(() => [...sandboxDb.cciPerformanceParameters]);
  const [submitNotice, setSubmitNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [submittingColor, setSubmittingColor] = useState<string | null>(null);
  const [learnerUiSettings, setLearnerUiSettings] = useState<LearnerUiSettings>(() => readLearnerUiSettings());

  useEffect(() => {
    const handleUiSettingsChange = () => setLearnerUiSettings(readLearnerUiSettings());
    window.addEventListener('chunks_learner_ui_settings_change', handleUiSettingsChange);
    window.addEventListener('storage', handleUiSettingsChange);
    return () => {
      window.removeEventListener('chunks_learner_ui_settings_change', handleUiSettingsChange);
      window.removeEventListener('storage', handleUiSettingsChange);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room_code') || params.get('join');
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      setLearnerRoomCode(cleanCode);
      localStorage.setItem('chunks_learner_room_code', cleanCode);
    }
  }, []);

  useEffect(() => {
    setSubmitNotice(null);
  }, [activeRound?.id]);

  useEffect(() => {
    syncLocalState();
    setPerformanceParams([...sandboxDb.cciPerformanceParameters]);

    if (useSandbox) {
      const handleDbChange = () => {
        syncLocalState();
        setPerformanceParams([...sandboxDb.cciPerformanceParameters]);
      };
      window.addEventListener('chunks_sandbox_db_change', handleDbChange);
      return () => window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    }

    if (!joinedRoomId) return;

    const channel = supabase
      .channel(`learner-room-${joinedRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_rooms', filter: `id=eq.${joinedRoomId}` }, () => syncLocalState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_memberships', filter: `room_id=eq.${joinedRoomId}` }, () => syncLocalState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_rounds', filter: `room_id=eq.${joinedRoomId}` }, () => syncLocalState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learner_responses' }, () => syncLocalState())
      .subscribe();

    const poll = window.setInterval(() => syncLocalState(), 5000);
    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [joinedRoomId, currentLearnerId, useSandbox, learners.length, resources.length]);

  const syncLocalState = async () => {
    if (!joinedRoomId) {
      setActiveRoom(null);
      setActiveRound(null);
      setRoundResponses([]);
      setSessionResponses([]);
      setMemberCount(0);
      return;
    }

    if (useSandbox) {
      const room = sandboxDb.rooms.find(r => r.id === joinedRoomId) || null;
      setActiveRoom(room);
      if (!room) {
        setActiveRound(null);
        setRoundResponses([]);
        setSessionResponses([]);
        setMemberCount(0);
        return;
      }

      const rounds = sandboxDb.rounds.filter(rd => rd.room_id === room.id);
      const roundIds = rounds.map(rd => rd.id);
      const openRound = rounds.find(rd => rd.status === 'open') || null;
      setActiveRound(openRound);
      setSessionResponses(sandboxDb.responses.filter(res => roundIds.includes(res.round_id) && res.learner_id === currentLearnerId));
      setRoundResponses(openRound ? sandboxDb.responses.filter(res => res.round_id === openRound.id) : []);
      setMemberCount(sandboxDb.memberships.filter(m => m.room_id === room.id).length);
      return;
    }

    try {
      const { data: room, error: roomErr } = await supabase
        .from('practice_rooms')
        .select('*')
        .eq('id', joinedRoomId)
        .maybeSingle();
      if (roomErr) throw roomErr;
      setActiveRoom(room || null);

      if (!room) {
        setActiveRound(null);
        setRoundResponses([]);
        setSessionResponses([]);
        setMemberCount(0);
        return;
      }

      const [{ data: roomRounds, error: roundsErr }, membershipResult] = await Promise.all([
        supabase
          .from('room_rounds')
          .select('*')
          .eq('room_id', room.id)
          .order('round_index', { ascending: true }),
        supabase
          .from('room_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', room.id)
      ]);
      if (roundsErr) throw roundsErr;
      if (membershipResult.error) throw membershipResult.error;
      setMemberCount(membershipResult.count || 0);

      const rounds = roomRounds || [];
      const roundIds = rounds.map(rd => rd.id);
      const openRound = rounds.find(rd => rd.status === 'open') || null;
      setActiveRound(openRound);

      if (roundIds.length > 0 && currentLearnerId) {
        const { data: myResponses, error: myResponsesErr } = await supabase
          .from('learner_responses')
          .select('*')
          .eq('learner_id', currentLearnerId)
          .in('round_id', roundIds);
        if (myResponsesErr) throw myResponsesErr;
        setSessionResponses(myResponses || []);
      } else {
        setSessionResponses([]);
      }

      if (openRound) {
        const { data: currentResponses, error: responseErr } = await supabase
          .from('learner_responses')
          .select('*')
          .eq('round_id', openRound.id);
        if (responseErr) throw responseErr;
        setRoundResponses(currentResponses || []);
      } else {
        setRoundResponses([]);
      }
    } catch (err: any) {
      console.error('Failed to sync learner state:', err);
    }
  };

  const handleLearnerJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoomCode = learnerRoomCode.trim().toUpperCase();
    const cleanName = learnerDisplayName.trim();
    if (!cleanRoomCode || !cleanName) return;

    setJoining(true);
    try {
      if (useSandbox) {
        const { room, learner } = sandboxDb.joinRoom({ roomCode: cleanRoomCode, displayName: cleanName });
        persistLearnerSession(learner.id, learner.display_name, room.id, cleanRoomCode);
      } else {
        const { data: rooms, error: roomErr } = await supabase
          .from('practice_rooms')
          .select('*')
          .eq('room_code', cleanRoomCode)
          .neq('status', 'finished');
        if (roomErr) throw roomErr;
        if (!rooms || rooms.length === 0) throw new Error('Active classroom room not found for this code.');
        const targetRoom = rooms[0];

        let learnerId = '';
        let finalDisplayName = cleanName;
        const { data: existingLearners, error: existingErr } = await supabase
          .from('learners')
          .select('*')
          .ilike('display_name', cleanName)
          .limit(1);
        if (existingErr) throw existingErr;

        if (existingLearners && existingLearners.length > 0) {
          learnerId = existingLearners[0].id;
          finalDisplayName = existingLearners[0].display_name;
          await supabase
            .from('learners')
            .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', learnerId);
        } else {
          learnerId = crypto.randomUUID();
          const { error: learnerErr } = await supabase
            .from('learners')
            .insert([{
              id: learnerId,
              display_name: finalDisplayName,
              source: 'anonymous',
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);
          if (learnerErr) throw learnerErr;
        }

        const { error: membershipErr } = await supabase
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
        if (membershipErr) throw membershipErr;

        persistLearnerSession(learnerId, finalDisplayName, targetRoom.id, cleanRoomCode);
      }

      onRefreshData();
    } catch (err: any) {
      alert(`Join failed: ${err.message || String(err)}`);
    } finally {
      setJoining(false);
    }
  };

  const persistLearnerSession = (learnerId: string, learnerName: string, roomId: string, roomCode: string) => {
    localStorage.setItem('chunks_learner_id', learnerId);
    localStorage.setItem('chunks_learner_name', learnerName);
    localStorage.setItem('chunks_joined_room_id', roomId);
    localStorage.setItem('chunks_learner_room_code', roomCode);
    localStorage.setItem('chunks_learner_display_name', learnerName);

    setCurrentLearnerId(learnerId);
    setCurrentLearnerName(learnerName);
    setJoinedRoomId(roomId);
    setLearnerRoomCode(roomCode);
    setLearnerDisplayName(learnerName);
  };

  const handleLogOut = () => {
    localStorage.removeItem('chunks_learner_id');
    localStorage.removeItem('chunks_learner_name');
    localStorage.removeItem('chunks_joined_room_id');
    setCurrentLearnerId('');
    setCurrentLearnerName('');
    setJoinedRoomId('');
    setActiveRoom(null);
    setActiveRound(null);
    setRoundResponses([]);
    setSessionResponses([]);
    setMemberCount(0);
    onRefreshData();
  };

  const getReflectionMs = () => {
    const openedAt = activeRound?.opened_at ? new Date(activeRound.opened_at).getTime() : Date.now() - 3500;
    return Math.max(500, Math.round(Date.now() - openedAt));
  };

  const handleSubmitResponse = async (color: string) => {
    if (!activeRound || !currentLearnerId || submittingColor) return;

    setSubmittingColor(color);
    try {
      if (useSandbox) {
        sandboxDb.submitResponse({
          roundId: activeRound.id,
          learnerId: currentLearnerId,
          responseColor: color,
          reflectionTimeMs: getReflectionMs()
        });
      } else {
        const { data: existing } = await supabase
          .from('learner_responses')
          .select('id')
          .eq('round_id', activeRound.id)
          .limit(1);
        if (existing && existing.length > 0) {
          throw new Error('This round already has a captured response. Wait for the next turn.');
        }

        const param = performanceParams.find(p => p.color_code.toLowerCase() === color.toLowerCase() || p.label.toLowerCase() === color.toLowerCase());
        const performanceY = param ? param.performance_y : 0;
        const reflectionTimeMs = getReflectionMs();
        const reflectionSeconds = Math.round((reflectionTimeMs / 1000) * 100) / 100;
        const cciStandardX = activeRound.cci_standard_x || 1;
        const cvrValue = activeRound.cvr_value || 1;
        const cciResult = Math.round((performanceY * cciStandardX) * 100) / 100;
        const cpdResult = Math.round((cciResult * cvrValue) * 100) / 100;

        const { error: insertErr } = await supabase
          .from('learner_responses')
          .insert([{
            id: crypto.randomUUID(),
            round_id: activeRound.id,
            learner_id: currentLearnerId,
            response_color: color,
            performance_y: performanceY,
            reflection_time_ms: reflectionTimeMs,
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
        if (insertErr) throw insertErr;

        await supabase
          .from('room_rounds')
          .update({ captured_learner_id: currentLearnerId, updated_at: new Date().toISOString() })
          .eq('id', activeRound.id);

        await supabase
          .from('room_memberships')
          .update({ can_answer: false, updated_at: new Date().toISOString() })
          .eq('room_id', joinedRoomId);
      }

      setSubmitNotice({ type: 'success', message: 'Result submitted. Please wait for the next round.' });
      await syncLocalState();
      onRefreshData();
    } catch (err: any) {
      setSubmitNotice({ type: 'error', message: err.message || 'Submission rejected.' });
    } finally {
      setSubmittingColor(null);
      window.setTimeout(() => setSubmitNotice(null), 4500);
    }
  };

  const activeResource = activeRound ? resources.find(r => r.id === activeRound.sentence_resource_id) : null;
  const hasAlreadyResponded = !!activeRound && roundResponses.some(r => r.learner_id === currentLearnerId);
  const isAnyResponseCaptured = roundResponses.length > 0;
  const captureMode = activeRound?.response_capture_mode_snapshot;
  const isAssigned = activeRound?.assigned_learner_id === currentLearnerId;
  const canSubmit = !!activeRound && activeRound.status === 'open' && !hasAlreadyResponded && !isAnyResponseCaptured && (
    captureMode === 'first_responder' || isAssigned || (captureMode !== 'assigned' && captureMode !== 'auto_rotate')
  );
  const responseCounts = performanceParams.map(param => ({
    ...param,
    count: sessionResponses.filter(resp =>
      String(resp.response_color || '').toLowerCase() === param.color_code.toLowerCase() ||
      String(resp.response_color || '').toLowerCase() === param.label.toLowerCase()
    ).length
  }));
  const highestCpd = sessionResponses.length > 0
    ? Math.max(...sessionResponses.map(resp => Number(resp.cpd_result || 0)))
    : 0;

  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center px-3 py-6" id="learner-terminal-root">
      {!currentLearnerId ? (
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Join Classroom</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your room code and display name. This screen is learner-only.
            </p>
          </div>

          <form onSubmit={handleLearnerJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Code</label>
              <input
                type="text"
                placeholder="CH-1234"
                value={learnerRoomCode}
                onChange={(e) => setLearnerRoomCode(e.target.value.toUpperCase())}
                className="w-full text-center font-mono font-black tracking-widest text-lg p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase focus:ring-1 focus:ring-red-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={learnerDisplayName}
                onChange={(e) => setLearnerDisplayName(e.target.value)}
                className="w-full text-center text-sm font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={joining}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {joining ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">Learner Connected</div>
              <div className="text-sm font-bold truncate">{currentLearnerName}</div>
            </div>
            <button
              onClick={handleLogOut}
              className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Leave
            </button>
          </div>

          <div className="p-5 md:p-7 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block">Room</span>
                <strong className="text-sm text-red-900 font-mono">{activeRoom?.room_code || learnerRoomCode}</strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">Joined</span>
                <strong className="text-sm text-emerald-900">{memberCount} learner{memberCount === 1 ? '' : 's'}</strong>
              </div>
            </div>

            {learnerUiSettings.showSummaryCard && (
              <div className="bg-slate-950 text-white rounded-2xl p-4 space-y-3 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-black truncate">{learnerUiSettings.summaryTitle}</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full">
                    {sessionResponses.length} answered
                  </span>
                </div>
                <div className={`grid gap-2 ${learnerUiSettings.showHighestCpd ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Answered</span>
                    <strong className="text-xl font-black text-white">{sessionResponses.length}</strong>
                  </div>
                  {learnerUiSettings.showHighestCpd && (
                    <div className="bg-white/10 rounded-xl p-3 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Highest CPD</span>
                      <strong className="text-xl font-black text-amber-300 flex items-center justify-center gap-1"><Award className="w-4 h-4" /> {highestCpd}</strong>
                    </div>
                  )}
                </div>
                {learnerUiSettings.showColorCounts && (
                  <div className="flex flex-wrap gap-1.5">
                    {responseCounts.map(param => (
                      <span
                        key={param.id}
                        className="px-2 py-0.5 rounded-full text-[10px] font-black text-white border border-white/10"
                        style={{ backgroundColor: param.color_hex }}
                      >
                        {param.label}: {param.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {submitNotice && (
              <div className={`rounded-xl border p-3 text-xs font-bold text-center ${
                submitNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {submitNotice.message}
              </div>
            )}

            {!activeRound || activeRound.status !== 'open' ? (
              <div className="text-center py-14 space-y-4">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300 animate-pulse">
                  <Clock className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800">Waiting for teacher</h4>
                  <p className="text-xs text-slate-400 mt-1">Stay on this screen. Your answer pad will open automatically.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-2">
                  <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">Active Round</span>
                  <h4 className="text-lg font-black text-slate-900">Round #{activeRound.round_index}</h4>
                  {activeResource && (
                    <div className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-[10px] font-mono font-bold text-slate-500" title={activeResource.sentence_code}>
                      {getShortSentenceCode(activeResource.sentence_code, activeResource.order_index)}
                    </div>
                  )}
                </div>

                {canSubmit ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-black text-white">
                        <CheckCircle2 className="w-4 h-4" />
                        Your turn — submit your result
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {performanceParams.map(param => (
                        <button
                          key={param.id}
                          onClick={() => handleSubmitResponse(param.color_code)}
                          disabled={!!submittingColor}
                          className="p-4 active:scale-95 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-xs flex flex-col items-center justify-center text-center border border-black/10"
                          style={{ backgroundColor: param.color_hex, textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
                        >
                          <span className="text-sm uppercase tracking-wide">{param.label}</span>
                          <span className="text-[9px] font-bold opacity-90 mt-1">Y={param.performance_y}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <Lock className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">
                      {hasAlreadyResponded
                        ? 'Your result was submitted. Wait for the next round.'
                        : isAnyResponseCaptured
                          ? 'A response was already captured. Wait for the next round.'
                          : 'Answer pad locked. Wait for your turn.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
