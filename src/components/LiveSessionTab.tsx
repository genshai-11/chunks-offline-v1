/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PracticeRoom, Learner, RoomRound, LearnerResponse } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip as ReTooltip } from 'recharts';
import {
  Activity, Trash2, LogIn, RefreshCw, Clock, Users, BookOpen,
  AlertTriangle, Search, ChevronDown, XCircle, BarChart2, ChevronUp
} from 'lucide-react';

interface LiveSessionTabProps {
  rooms: PracticeRoom[];
  rounds: RoomRound[];
  responses: LearnerResponse[];
  learners: Learner[];
  onRefreshData: () => void;
  onRejoinRoom: (roomId: string) => void;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  lobby:        { label: 'Lobby',        color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   dot: 'bg-amber-400'  },
  round_open:   { label: 'Round Open',   color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       dot: 'bg-red-500 animate-pulse'   },
  round_closed: { label: 'Round Closed', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500'   },
  finished:     { label: 'Finished',     color: 'text-slate-500',  bg: 'bg-slate-100 border-slate-200',  dot: 'bg-slate-400'  },
};

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' };
}

export default function LiveSessionTab({
  rooms,
  rounds,
  responses,
  learners,
  onRefreshData,
  onRejoinRoom,
}: LiveSessionTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteTypedCode, setDeleteTypedCode] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'code'>('updated');
  const [expandedChartRoomId, setExpandedChartRoomId] = useState<string | null>(null);

  const sortedRooms = useMemo(() => {
    let filtered = [...rooms];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.room_code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.host_name || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(r => r.status !== 'finished');
    } else if (statusFilter === 'finished') {
      filtered = filtered.filter(r => r.status === 'finished');
    }

    filtered.sort((a, b) => {
      if (sortBy === 'code') return a.room_code.localeCompare(b.room_code);
      if (sortBy === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });

    return filtered;
  }, [rooms, searchQuery, statusFilter, sortBy]);

  // Per-room stats derived from already-loaded props
  const roomStats = useMemo(() => {
    const map: Record<string, { roundCount: number; responseCount: number; learnerCount: number }> = {};
    rooms.forEach(room => {
      const roomRounds = rounds.filter(rd => rd.room_id === room.id);
      const roundIds = roomRounds.map(rd => rd.id);
      const roomResponses = responses.filter(res => roundIds.includes(res.round_id));
      const uniqueLearners = new Set(roomResponses.map(res => res.learner_id));
      map[room.id] = {
        roundCount: roomRounds.length,
        responseCount: roomResponses.length,
        learnerCount: uniqueLearners.size,
      };
    });
    return map;
  }, [rooms, rounds, responses]);

  // Quick chart data per room (grade distribution + CPD per learner)
  const roomChartData = useMemo(() => {
    const map: Record<string, {
      gradeBars: { name: string; value: number; color: string }[];
      learnerCpd: { name: string; cpd: number }[];
    }> = {};
    rooms.forEach(room => {
      const roomRounds = rounds.filter(rd => rd.room_id === room.id);
      const roundIds = roomRounds.map(rd => rd.id);
      const roomResponses = responses.filter(res => roundIds.includes(res.round_id));
      const total = roomResponses.length;
      const gradeCount = { purple: 0, green: 0, yellow: 0, red: 0 };
      roomResponses.forEach(res => {
        const g = (res.response_color || 'red').toLowerCase();
        if (g === 'purple') gradeCount.purple++;
        else if (g === 'green') gradeCount.green++;
        else if (g === 'yellow') gradeCount.yellow++;
        else gradeCount.red++;
      });
      const gradeBars = [
        { name: 'Purple', value: total > 0 ? Math.round((gradeCount.purple / total) * 100) : 0, color: '#a855f7' },
        { name: 'Green',  value: total > 0 ? Math.round((gradeCount.green  / total) * 100) : 0, color: '#22c55e' },
        { name: 'Yellow', value: total > 0 ? Math.round((gradeCount.yellow / total) * 100) : 0, color: '#eab308' },
        { name: 'Red',    value: total > 0 ? Math.round((gradeCount.red    / total) * 100) : 0, color: '#ef4444' },
      ].filter(g => g.value > 0);

      // CPD per learner (max cpd)
      const learnerCpdMap: Record<string, { name: string; cpd: number }> = {};
      roomResponses.forEach(res => {
        const learner = learners.find(l => l.id === res.learner_id);
        const name = learner?.display_name || `L-${res.learner_id.slice(0, 4)}`;
        const val = Number(res.cpd_result || 0);
        if (!learnerCpdMap[res.learner_id] || val > learnerCpdMap[res.learner_id].cpd) {
          learnerCpdMap[res.learner_id] = { name, cpd: Math.round(val * 10) / 10 };
        }
      });
      const learnerCpd = Object.values(learnerCpdMap).sort((a, b) => b.cpd - a.cpd).slice(0, 8);

      map[room.id] = { gradeBars, learnerCpd };
    });
    return map;
  }, [rooms, rounds, responses, learners]);

  const activeCount = rooms.filter(r => r.status !== 'finished').length;
  const finishedCount = rooms.filter(r => r.status === 'finished').length;

  const roomToDelete = rooms.find(r => r.id === deleteConfirmId);

  // Hard delete a room and all its child records
  const handleDeleteRoom = async () => {
    if (!deleteConfirmId || !roomToDelete) return;
    if (deleteTypedCode.trim().toUpperCase() !== roomToDelete.room_code.trim().toUpperCase()) {
      setDeleteError('Room code does not match. Please type it exactly to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      // 1. Collect round ids for this room
      const { data: roomRoundsData, error: rdErr } = await supabase
        .from('room_rounds')
        .select('id')
        .eq('room_id', deleteConfirmId);
      if (rdErr) throw rdErr;

      const roundIds = (roomRoundsData || []).map((r: { id: string }) => r.id);

      // 2. Delete learner_responses for those rounds
      if (roundIds.length > 0) {
        const { error: respErr } = await supabase
          .from('learner_responses')
          .delete()
          .in('round_id', roundIds);
        if (respErr) throw respErr;
      }

      // 3. Delete learner_progress rows tied to this room
      await supabase
        .from('learner_progress')
        .delete()
        .eq('room_id', deleteConfirmId);

      // 4. Delete room_memberships
      const { error: memErr } = await supabase
        .from('room_memberships')
        .delete()
        .eq('room_id', deleteConfirmId);
      if (memErr) throw memErr;

      // 5. Delete room_rounds
      const { error: rdDelErr } = await supabase
        .from('room_rounds')
        .delete()
        .eq('room_id', deleteConfirmId);
      if (rdDelErr) throw rdDelErr;

      // 6. Delete the room itself
      const { error: roomErr } = await supabase
        .from('practice_rooms')
        .delete()
        .eq('id', deleteConfirmId);
      if (roomErr) throw roomErr;

      setDeleteConfirmId(null);
      setDeleteTypedCode('');
      onRefreshData();
    } catch (err: any) {
      setDeleteError(`Delete failed: ${err.message || String(err)}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5" id="live-session-tab">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            Live Sessions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tất cả phòng học — rejoin vào Teacher Console, hoặc xóa phiên đã kết thúc.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefreshData}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-800">{rooms.length}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Total Rooms</div>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-red-600">{activeCount}</div>
          <div className="text-[10px] font-bold text-red-400 uppercase mt-0.5">Active</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-center">
          <div className="text-2xl font-black text-slate-500">{finishedCount}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Finished</div>
        </div>
      </div>

      {/* Filters & search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by code, title, host…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 transition"
          />
        </div>

        <div className="flex gap-1">
          {(['all', 'active', 'finished'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer capitalize ${
                statusFilter === f
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="appearance-none text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-7 text-slate-700 outline-none focus:border-red-400 cursor-pointer"
          >
            <option value="updated">Sort: Last updated</option>
            <option value="created">Sort: Created</option>
            <option value="code">Sort: Room code</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Room list */}
      {sortedRooms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 text-sm shadow-xs">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Không tìm thấy phòng học nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedRooms.map(room => {
            const meta = statusMeta(room.status);
            const stats = roomStats[room.id] ?? { roundCount: 0, responseCount: 0, learnerCount: 0 };
            const isFinished = room.status === 'finished';
            const updatedAt = new Date(room.updated_at || room.created_at);
            const createdAt = new Date(room.created_at);

            return (
              <div
                key={room.id}
                className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col gap-3 ${
                  isFinished ? 'border-slate-200 opacity-90' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Status dot + info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                        {room.room_code}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${meta.bg} ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800 truncate">{room.title}</div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stats.learnerCount} learners</span>
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{stats.roundCount} rounds</span>
                      <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" />{stats.responseCount} responses</span>
                      {room.host_name && <span className="text-slate-400">Host: {room.host_name}</span>}
                    </div>

                    <div className="flex gap-3 text-[9px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />Updated {updatedAt.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>Created {createdAt.toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {/* Quick chart toggle button */}
                    <button
                      type="button"
                      onClick={() => setExpandedChartRoomId(expandedChartRoomId === room.id ? null : room.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                        expandedChartRoomId === room.id
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                      }`}
                      title="Xem biểu đồ nhanh"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      Biểu đồ
                      {expandedChartRoomId === room.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Rejoin → Teacher Console */}
                    {!isFinished && (
                      <button
                        type="button"
                        onClick={() => onRejoinRoom(room.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black transition-colors cursor-pointer shadow-xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        Rejoin
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirmId(room.id);
                        setDeleteTypedCode('');
                        setDeleteError('');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-black transition-colors cursor-pointer"
                      title="Delete this session permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expandable Chart Section */}
                {expandedChartRoomId === room.id && (() => {
                  const chart = roomChartData[room.id];
                  const hasData = chart && (chart.gradeBars.length > 0 || chart.learnerCpd.length > 0);
                  
                  return (
                    <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                      {/* Grade Share Distribution */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Tỉ Lệ Điểm Số (Grade Share %)
                        </div>
                        {!hasData || chart.gradeBars.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-6 text-center">Phòng chưa có phản hồi nào.</div>
                        ) : (
                          <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chart.gradeBars} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="#94a3b8" />
                                <YAxis tick={{ fontSize: 8 }} stroke="#94a3b8" unit="%" />
                                <ReTooltip
                                  contentStyle={{ fontSize: 10, borderRadius: 8 }}
                                  formatter={(value: any) => [`${value}%`, 'Tỉ lệ']}
                                />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {chart.gradeBars.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* CPD Leaderboard */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Top Học Viên - Max CPD (V)
                        </div>
                        {!hasData || chart.learnerCpd.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-6 text-center">Phòng chưa có phản hồi nào.</div>
                        ) : (
                          <div className="h-28">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chart.learnerCpd} layout="vertical" margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
                                <XAxis type="number" tick={{ fontSize: 8 }} stroke="#94a3b8" />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} stroke="#94a3b8" width={60} />
                                <ReTooltip
                                  contentStyle={{ fontSize: 10, borderRadius: 8 }}
                                  formatter={(value: any) => [`${value}V`, 'Max CPD']}
                                />
                                <Bar dataKey="cpd" fill="#6366f1" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDeleteConfirmId(null); setDeleteTypedCode(''); setDeleteError(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-red-200 p-6 max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Xóa phiên học vĩnh viễn</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Hành động này sẽ xóa <strong>toàn bộ dữ liệu</strong> của phòng{' '}
                  <span className="font-mono font-black text-red-600">{roomToDelete.room_code}</span> —
                  bao gồm tất cả rounds, responses, memberships. <br />
                  <strong>Không thể khôi phục.</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs text-slate-600">
              <div><strong>Title:</strong> {roomToDelete.title}</div>
              <div><strong>Status:</strong> {roomToDelete.status}</div>
              <div><strong>Rounds:</strong> {roomStats[deleteConfirmId]?.roundCount ?? 0} &nbsp;|&nbsp; <strong>Responses:</strong> {roomStats[deleteConfirmId]?.responseCount ?? 0}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Nhập mã phòng <span className="font-mono text-red-600">{roomToDelete.room_code}</span> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteTypedCode}
                onChange={e => { setDeleteTypedCode(e.target.value); setDeleteError(''); }}
                placeholder={roomToDelete.room_code}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 uppercase"
                autoFocus
              />
              {deleteError && (
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3 shrink-0" />
                  {deleteError}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setDeleteConfirmId(null); setDeleteTypedCode(''); setDeleteError(''); }}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={deleteLoading || deleteTypedCode.trim().toUpperCase() !== roomToDelete.room_code.trim().toUpperCase()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xóa…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Xóa vĩnh viễn</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
