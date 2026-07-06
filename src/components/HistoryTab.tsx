/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Course, Lesson, LessonSection, SentenceResource, PracticeRoom, RoomRound, Learner, LearnerResponse, LearnerProgress } from '../types';
import { sandboxDb } from '../lib/supabaseClient';
import { 
  History, Calendar, Award, Star, BarChart2, PieChart, Users, CheckCircle, 
  HelpCircle, ChevronDown, ChevronUp, Plus, Trash2, Sliders, Filter,
  Activity, Sparkles, BookOpen, Clock, Settings, ToggleLeft, RefreshCw, BarChart3, ListCollapse
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ScatterChart, Scatter
} from 'recharts';

interface HistoryTabProps {
  courses: Course[];
  lessons: Lesson[];
  resources: SentenceResource[];
  rooms: PracticeRoom[];
  rounds: RoomRound[];
  responses: LearnerResponse[];
  progress: LearnerProgress[];
}

interface CustomField {
  id: string;
  label: string;
  varA: string;
  operator: '+' | '-' | '*' | '/';
  varB: string | number; // property name or numerical constant
  format: 'number' | 'percent';
}

export default function HistoryTab({
  courses,
  lessons,
  resources,
  rooms,
  rounds,
  responses,
  progress
}: HistoryTabProps) {

  // --- FILTERS STATE ---
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string>('all');

  // --- CUSTOM FIELDS STATE ("Tự tạo fields") ---
  const [customFields, setCustomFields] = useState<CustomField[]>([
    {
      id: 'accuracy_rate',
      label: 'Accuracy Rate %',
      varA: 'performance_y',
      operator: '/',
      varB: 3,
      format: 'percent'
    },
    {
      id: 'efficiency_index',
      label: 'CPD per Second',
      varA: 'cpd_result',
      operator: '/',
      varB: 'reflection_seconds',
      format: 'number'
    }
  ]);

  // Form state for creating a new custom field
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldVarA, setNewFieldVarA] = useState('cpd_result');
  const [newFieldOperator, setNewFieldOperator] = useState<'+' | '-' | '*' | '/'>('/');
  const [newFieldVarBType, setNewFieldVarBType] = useState<'property' | 'constant'>('property');
  const [newFieldVarBProp, setNewFieldVarBProp] = useState('reflection_seconds');
  const [newFieldVarBConst, setNewFieldVarBConst] = useState('1');
  const [newFieldFormat, setNewFieldFormat] = useState<'number' | 'percent'>('number');
  const [showFieldCreator, setShowFieldCreator] = useState(false);

  // --- DYNAMIC CHART BUILDER STATE ---
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'scatter'>('bar');
  const [xAxisField, setXAxisField] = useState<'learner_name' | 'room_title' | 'response_color' | 'sentence_code'>('learner_name');
  const [yAxisMetric, setYAxisMetric] = useState<'cpd_result' | 'cci_result' | 'reflection_seconds' | 'response_count'>('cpd_result');

  // --- TABLE COLUMN TOGGLES ---
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    timestamp: true,
    student: true,
    room: true,
    drillCode: true,
    grade: true,
    cciX: true,
    cvr: true,
    reflectSec: true,
    cciResult: true,
    cpdResult: true
  });

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showTableColToggle, setShowTableColToggle] = useState(false);

  // Sub-tabs state for reports
  const [subTab, setSubTab] = useState<'cumulative' | 'room-overview' | 'leaderboard'>('room-overview');

  // Date Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'last30'>('all');

  // Leaderboard Sorting & Configuration States
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'cpd' | 'redCardRatio' | 'completionRate' | 'totalCount'>('cpd');
  const [leaderboardSortOrder, setLeaderboardSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showLeaderboardColToggle, setShowLeaderboardColToggle] = useState(false);
  const [visibleLeaderboardColumns, setVisibleLeaderboardColumns] = useState<Record<string, boolean>>({
    rank: true,
    learner: true,
    totalResponses: true,
    totalCpd: true,
    redRatio: true,
    completionRate: true,
    gradesDistribution: true,
  });
  
  // Custom Dynamic Room Overview Chart Builder States
  const [roomChartMetric, setRoomChartMetric] = useState<'cpd' | 'redRatio' | 'completion' | 'submissions'>('cpd');
  const [roomChartType, setRoomChartType] = useState<'bar' | 'line' | 'area'>('bar');

  const applyDatePreset = (preset: 'all' | 'today' | 'last7' | 'last30') => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'last7') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'last30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Extract all learners either from DB or dynamically from responses to ensure thoroughness
  const allLearners = useMemo(() => {
    const dbLearners = sandboxDb.learners || [];
    const responseLearnersMap = new Map<string, string>();
    
    // Add known learners from responses
    responses.forEach(r => {
      const dbL = dbLearners.find(l => l.id === r.learner_id);
      if (dbL) {
        responseLearnersMap.set(dbL.id, dbL.display_name);
      } else {
        responseLearnersMap.set(r.learner_id, `Student (${r.learner_id.substring(0, 5)})`);
      }
    });

    // Merge everything
    const list: { id: string; display_name: string; source: string; last_seen_at: string | null }[] = [];
    
    dbLearners.forEach(l => {
      list.push({
        id: l.id,
        display_name: l.display_name,
        source: l.source,
        last_seen_at: l.last_seen_at
      });
    });

    responseLearnersMap.forEach((name, id) => {
      if (!list.some(item => item.id === id)) {
        list.push({
          id,
          display_name: name,
          source: 'anonymous',
          last_seen_at: null
        });
      }
    });

    return list;
  }, [responses]);

  // Get active room statistics & information
  const selectedRoomDetails = useMemo(() => {
    if (selectedRoomId === 'all') return null;
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) return null;

    // Find unique learners who submitted inside this room
    const roomRounds = rounds.filter(rd => rd.room_id === room.id);
    const roomRoundIds = roomRounds.map(rd => rd.id);
    const roomResponses = responses.filter(res => roomRoundIds.includes(res.round_id));
    const respondingLearnerIds = Array.from(new Set(roomResponses.map(res => res.learner_id)));
    
    // List of actually participating learners
    const participatingLearners = allLearners.filter(l => respondingLearnerIds.includes(l.id));

    return {
      ...room,
      totalRoundsCount: roomRounds.length,
      closedRoundsCount: roomRounds.filter(rd => rd.status === 'closed').length,
      totalResponsesCount: roomResponses.length,
      participatingLearners
    };
  }, [selectedRoomId, rooms, rounds, responses, allLearners]);

  // Map and filter full responses list
  const filteredHistory = useMemo(() => {
    return responses.map(res => {
      const round = rounds.find(rd => rd.id === res.round_id);
      const learner = allLearners.find(l => l.id === res.learner_id);
      const sentence = round ? resources.find(s => s.id === round.sentence_resource_id) : null;
      const room = round ? rooms.find(rm => rm.id === round.room_id) : null;
      return {
        ...res,
        round,
        learner,
        sentence,
        room
      };
    })
    .filter(item => {
      // Room filter
      if (selectedRoomId !== 'all') {
        if (!item.round || item.round.room_id !== selectedRoomId) {
          return false;
        }
      }
      // Learner filter
      if (selectedLearnerId !== 'all') {
        if (item.learner_id !== selectedLearnerId) {
          return false;
        }
      }
      // Date filters
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const itemDate = new Date(item.submitted_at);
        if (itemDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const itemDate = new Date(item.submitted_at);
        if (itemDate > end) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [responses, rounds, allLearners, resources, rooms, selectedRoomId, selectedLearnerId, startDate, endDate]);

  // Calculate dynamic custom fields values for a given response
  const evalCustomField = (res: LearnerResponse, field: CustomField) => {
    const getVal = (prop: string): number => {
      switch (prop) {
        case 'performance_y': return res.performance_y;
        case 'cpd_result': return res.cpd_result;
        case 'cci_result': return res.cci_result;
        case 'reflection_seconds': return res.reflection_seconds || 1.0;
        case 'cci_standard_x': return res.cci_standard_x;
        case 'cvr_value': return res.cvr_value;
        default: return 0;
      }
    };

    const valA = getVal(field.varA);
    const valB = typeof field.varB === 'number' ? field.varB : getVal(field.varB as string);

    let finalVal = 0;
    switch (field.operator) {
      case '+': finalVal = valA + valB; break;
      case '-': finalVal = valA - valB; break;
      case '*': finalVal = valA * valB; break;
      case '/': 
        finalVal = valB !== 0 ? valA / valB : 0; 
        break;
      default: finalVal = 0;
    }

    if (field.format === 'percent') {
      return `${Math.round(finalVal * 100 * 10) / 10}%`;
    }
    return Math.round(finalVal * 100) / 100;
  };

  // Aggregated Score Metrics based on active filters
  const aggregates = useMemo(() => {
    const count = filteredHistory.length;
    const totalCpd = filteredHistory.reduce((acc, curr) => acc + curr.cpd_result, 0);
    const avgCpd = count > 0 ? (totalCpd / count) : 0;
    const avgReflection = count > 0 ? (filteredHistory.reduce((acc, curr) => acc + curr.reflection_seconds, 0) / count) : 0;

    const purples = filteredHistory.filter(r => r.response_color === 'purple').length;
    const greens = filteredHistory.filter(r => r.response_color === 'green').length;
    const yellows = filteredHistory.filter(r => r.response_color === 'yellow').length;
    const reds = filteredHistory.filter(r => r.response_color === 'red').length;

    return {
      count,
      totalCpd: Math.round(totalCpd * 100) / 100,
      avgCpd: Math.round(avgCpd * 100) / 100,
      avgReflection: Math.round(avgReflection * 100) / 100,
      purples,
      greens,
      yellows,
      reds
    };
  }, [filteredHistory]);

  // Handle adding custom calculated field
  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;

    const fieldId = 'cf_' + Date.now();
    const varBValue = newFieldVarBType === 'constant' ? parseFloat(newFieldVarBConst) || 1 : newFieldVarBProp;

    const newField: CustomField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      varA: newFieldVarA,
      operator: newFieldOperator,
      varB: varBValue,
      format: newFieldFormat
    };

    setCustomFields([...customFields, newField]);
    setNewFieldLabel('');
    setShowFieldCreator(false);
  };

  // Remove custom field
  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  // --- DYNAMIC DATA AGGREGATION FOR RECHARTS ---
  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return [];

    const groupings: Record<string, { sumY: number; count: number; name: string }> = {};

    filteredHistory.forEach(item => {
      let key = 'Other';
      
      if (xAxisField === 'learner_name') {
        key = item.learner?.display_name || 'Anonymous';
      } else if (xAxisField === 'room_title') {
        key = item.room?.title || 'Simulated Practice';
      } else if (xAxisField === 'response_color') {
        key = item.response_color.toUpperCase();
      } else if (xAxisField === 'sentence_code') {
        key = item.sentence?.sentence_code || 'N/A';
      }

      // Resolve Y metric value
      let yVal = 0;
      if (yAxisMetric === 'cpd_result') {
        yVal = item.cpd_result;
      } else if (yAxisMetric === 'cci_result') {
        yVal = item.cci_result;
      } else if (yAxisMetric === 'reflection_seconds') {
        yVal = item.reflection_seconds || 0;
      } else if (yAxisMetric === 'response_count') {
        yVal = 1;
      }

      if (!groupings[key]) {
        groupings[key] = { sumY: 0, count: 0, name: key };
      }
      groupings[key].sumY += yVal;
      groupings[key].count += 1;
    });

    return Object.values(groupings).map(g => {
      let finalVal = 0;
      if (yAxisMetric === 'response_count') {
        finalVal = g.count;
      } else {
        finalVal = g.sumY / g.count; // Average
      }

      return {
        name: g.name,
        value: Math.round(finalVal * 100) / 100,
        count: g.count
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredHistory, xAxisField, yAxisMetric]);

  // Color mapping based on performance grade for cells
  const getGradeColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'purple': return '#9333ea';
      case 'green': return '#22c55e';
      case 'yellow': return '#eab308';
      case 'red': return '#ef4444';
      default: return '#dc2626';
    }
  };

  // --- LEADERBOARD & ROOM ANALYTICS DATA AGGREGATION ---
  const leaderboardData = useMemo(() => {
    const studentStats: Record<string, {
      id: string;
      display_name: string;
      totalCount: number;
      totalCpd: number;
      redCount: number;
      purpleCount: number;
      greenCount: number;
      yellowCount: number;
    }> = {};

    filteredHistory.forEach(item => {
      const lid = item.learner_id;
      if (!lid) return;
      const name = item.learner?.display_name || `Học viên (${lid.substring(0, 5)})`;
      
      if (!studentStats[lid]) {
        studentStats[lid] = {
          id: lid,
          display_name: name,
          totalCount: 0,
          totalCpd: 0,
          redCount: 0,
          purpleCount: 0,
          greenCount: 0,
          yellowCount: 0
        };
      }

      studentStats[lid].totalCount += 1;
      studentStats[lid].totalCpd += item.cpd_result;
      if (item.response_color === 'red') {
        studentStats[lid].redCount += 1;
      } else if (item.response_color === 'purple') {
        studentStats[lid].purpleCount += 1;
      } else if (item.response_color === 'green') {
        studentStats[lid].greenCount += 1;
      } else if (item.response_color === 'yellow') {
        studentStats[lid].yellowCount += 1;
      }
    });

    const list = Object.values(studentStats).map(s => {
      const redCardRatio = s.totalCount > 0 ? (s.redCount / s.totalCount) : 0;
      const completionRate = s.totalCount > 0 ? ((s.totalCount - s.redCount) / s.totalCount) : 0;
      
      return {
        ...s,
        redCardRatio,
        completionRate,
        avgCpd: s.totalCount > 0 ? s.totalCpd / s.totalCount : 0
      };
    });

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (leaderboardSortBy === 'cpd') {
        valA = a.totalCpd;
        valB = b.totalCpd;
      } else if (leaderboardSortBy === 'redCardRatio') {
        valA = a.redCardRatio;
        valB = b.redCardRatio;
      } else if (leaderboardSortBy === 'completionRate') {
        valA = a.completionRate;
        valB = b.completionRate;
      } else if (leaderboardSortBy === 'totalCount') {
        valA = a.totalCount;
        valB = b.totalCount;
      }

      return leaderboardSortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [filteredHistory, leaderboardSortBy, leaderboardSortOrder]);

  const roomOverviewChartData = useMemo(() => {
    return leaderboardData.map(l => {
      let metricValue = 0;
      if (roomChartMetric === 'cpd') {
        metricValue = l.totalCpd;
      } else if (roomChartMetric === 'redRatio') {
        metricValue = Math.round(l.redCardRatio * 100);
      } else if (roomChartMetric === 'completion') {
        metricValue = Math.round(l.completionRate * 100);
      } else if (roomChartMetric === 'submissions') {
        metricValue = l.totalCount;
      }

      return {
        name: l.display_name,
        value: Math.round(metricValue * 10) / 10,
        submissions: l.totalCount,
        redCount: l.redCount
      };
    });
  }, [leaderboardData, roomChartMetric]);

  return (
    <div className="space-y-6" id="history-tab">
      
      {/* HEADER BAR AND GLOBAL FILTER CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-lg text-slate-800">Dynamic Class Reports & Live Analytics</h2>
              <p className="text-xs text-slate-500">Analyze learner response metrics, create calculated fields, and generate dynamic custom reports</p>
            </div>
          </div>

          {/* Quick Stats Summary indicator */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-medium text-slate-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
            Telemetry scope: {filteredHistory.length} responses loaded
          </div>
        </div>

        {/* CONTROLLERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          
          {/* Room Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3 text-red-600" /> Filter by Practice Room
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setSelectedLearnerId('all'); // Reset learner when room changes to avoid invalid intersection
              }}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="all">All Live Rooms (Cross-session cumulative)</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.room_code}) — {r.status === 'finished' ? 'Finished' : 'Live Session'}
                </option>
              ))}
            </select>
          </div>

          {/* Student Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-red-600" /> Filter by Learner Profile
            </label>
            <select
              value={selectedLearnerId}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer"
            >
              <option value="all">All Students (Class Overview)</option>
              {allLearners.map(l => (
                <option key={l.id} value={l.id}>
                  {l.display_name} ({l.source === 'manual' ? 'Roster' : 'Join Session'})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Shortcut */}
          <div className="flex items-end gap-3 pb-0.5">
            <button
              onClick={() => {
                setSelectedRoomId('all');
                setSelectedLearnerId('all');
              }}
              disabled={selectedRoomId === 'all' && selectedLearnerId === 'all'}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-300 text-slate-600 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Clear active filters
            </button>
          </div>

        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px mb-6">
        <button
          type="button"
          onClick={() => setSubTab('room-overview')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'room-overview'
              ? 'border-red-500 text-red-600 font-extrabold bg-red-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4 text-red-500" />
          <span>Tổng Quan Live Room (Lọc Ngày)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('leaderboard')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'leaderboard'
              ? 'border-red-500 text-red-600 font-extrabold bg-red-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Award className="w-4 h-4 text-red-500" />
          <span>Bảng Xếp Hạng & Thống Kê Room</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('cumulative')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'cumulative'
              ? 'border-red-500 text-red-600 font-extrabold bg-red-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4 text-red-500" />
          <span>Nhật Ký & Công Thức Tùy Biến</span>
        </button>
      </div>

      {subTab === 'room-overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* DATE FILTER BLOCK */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800">Bộ Lọc Ngày & Preset Thời Gian</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Lọc tất cả dữ liệu tổng quan, thống kê & bảng xếp hạng theo khung thời gian thực tế</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Date Pickers */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Từ ngày:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('all');
                    }}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer shadow-3xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Đến ngày:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('all');
                    }}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer shadow-3xs"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phím tắt nhanh:</span>
                {(['all', 'today', 'last7', 'last30'] as const).map(preset => {
                  const label = preset === 'all' ? 'Tất cả' :
                                preset === 'today' ? 'Hôm nay' :
                                preset === 'last7' ? '7 ngày qua' : '30 ngày qua';
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyDatePreset(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        datePreset === preset
                          ? 'bg-red-500 text-white shadow-3xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setDatePreset('all');
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ACTIVE ROOM DETAILS */}
          {selectedRoomDetails ? (
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-md text-[10px] font-bold font-mono uppercase tracking-widest border border-red-500/20">
                      PHÒNG HIỆN TẠI: {selectedRoomDetails.room_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                      selectedRoomDetails.status === 'finished' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {selectedRoomDetails.status}
                    </span>
                  </div>
                  <h3 className="font-sans font-bold text-base text-white mt-1">{selectedRoomDetails.title}</h3>
                  <p className="text-[11px] text-slate-400">Giảng viên: <span className="text-slate-200 font-semibold">{selectedRoomDetails.host_name || 'Instructor'}</span> • Khởi tạo: {new Date(selectedRoomDetails.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-4 font-mono">
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Thành viên tham gia</span>
                    <span className="text-lg font-bold text-red-400">{selectedRoomDetails.participatingLearners.length}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Số lượt mở (Rounds)</span>
                    <span className="text-lg font-bold text-white">{selectedRoomDetails.closedRoundsCount}/{selectedRoomDetails.totalRoundsCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Tổng câu phản hồi</span>
                    <span className="text-lg font-bold text-indigo-400">{filteredHistory.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-950 text-indigo-100 border border-indigo-900 rounded-2xl p-5 shadow-sm">
              <h3 className="font-sans font-bold text-base text-white">Chế độ: Nhật ký toàn lớp (Cross-session Cumulative)</h3>
              <p className="text-xs text-indigo-300 mt-1">Đang hiển thị thống kê tích lũy của tất cả các Live Room cộng dồn.</p>
            </div>
          )}

          {/* DYNAMIC SCALED FILTER METRICS FOR TIME PERIOD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng Điểm CPD Đạt Được</span>
                <span className="text-xl font-bold text-slate-800 font-mono">
                  {aggregates.totalCpd} <span className="text-xs text-slate-400 font-normal">Ω</span>
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng Câu Trả Lời (Responses)</span>
                <span className="text-xl font-bold text-slate-800 font-mono">
                  {aggregates.count} <span className="text-xs text-slate-400 font-normal">lượt</span>
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tốc Độ Phản Hồi Trung Bình</span>
                <span className="text-xl font-bold text-slate-800 font-mono">
                  {aggregates.avgReflection} <span className="text-xs text-slate-400 font-normal">giây</span>
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Điểm CPD Trung Bình / Câu</span>
                <span className="text-xl font-bold text-slate-800 font-mono">
                  {aggregates.avgCpd} <span className="text-xs text-slate-400 font-normal">Ω</span>
                </span>
              </div>
            </div>
          </div>

          {/* DYNAMIC METRIC CHART FOR SELECTED ROOM AND PERIOD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/80">
                  <Sliders className="w-4 h-4 text-red-600" />
                  <h3 className="font-sans font-bold text-xs text-slate-500 uppercase tracking-wider">Tùy Chọn Đồ Thị Thống Kê</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">1. Loại Biểu Đồ (Type)</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['bar', 'line', 'area'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRoomChartType(type)}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          roomChartType === type
                            ? 'bg-red-500 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">2. Chỉ Số (Y-Metric)</label>
                  <select
                    value={roomChartMetric}
                    onChange={(e) => setRoomChartMetric(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="cpd">Cộng Dồn Điểm CPD (Ω)</option>
                    <option value="redRatio">Tỷ Lệ Không Đọc Được (Card Đỏ %)</option>
                    <option value="completion">Tỷ Lệ Hoàn Thành Bài (Non-Red %)</option>
                    <option value="submissions">Tổng Số Lượt Trả Lời (Câu)</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white border border-slate-200/50 p-2.5 rounded-lg leading-relaxed">
                <span className="font-bold text-slate-700 block mb-0.5">Biểu đồ trực quan hóa động</span>
                Cho phép giáo viên nhanh chóng theo dõi các lỗ hổng kiến thức hoặc sự vượt trội của học viên trong khoảng thời gian đã lọc.
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col justify-between" style={{ minHeight: '320px' }}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-red-600" />
                  Đồ Thị Động Thống Kê Theo Học Viên
                </h4>
                <span className="text-[9px] bg-red-50 text-red-600 font-mono font-bold px-2 py-0.5 rounded uppercase">
                  Metric: {roomChartMetric.toUpperCase()}
                </span>
              </div>

              <div className="flex-1 w-full flex items-center justify-center pt-4">
                {roomOverviewChartData.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 italic py-16">
                    Không có bản ghi điểm số nào khớp với bộ lọc ngày để dựng đồ thị.
                  </div>
                ) : (
                  <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      {roomChartType === 'bar' ? (
                        <BarChart data={roomOverviewChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                          <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]}>
                            {roomOverviewChartData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={roomChartMetric === 'redRatio' ? '#ef4444' : roomChartMetric === 'completion' ? '#22c55e' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      ) : roomChartType === 'line' ? (
                        <LineChart data={roomOverviewChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                          <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        </LineChart>
                      ) : (
                        <AreaChart data={roomOverviewChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <defs>
                            <linearGradient id="colorAreaRoom" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorAreaRoom)" strokeWidth={2} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RESPONSE GRADE RATIOS IN ROOM */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Phân Bổ Xếp Loại Theo Khung Thời Gian</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-purple-600 block mb-1">🟣 PURPLE (Xuất Sắc Y=3)</span>
                <span className="text-xl font-bold font-mono text-purple-700">{aggregates.purples}</span>
              </div>
              <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-green-600 block mb-1">🟢 GREEN (Lưu Loát Y=2)</span>
                <span className="text-xl font-bold font-mono text-green-700">{aggregates.greens}</span>
              </div>
              <div className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-yellow-600 block mb-1">🟡 YELLOW (Nhập Ngừng Y=1)</span>
                <span className="text-xl font-bold font-mono text-yellow-700">{aggregates.yellows}</span>
              </div>
              <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl text-center">
                <span className="text-[10px] font-bold text-red-600 block mb-1">🔴 RED (Không Trả Lời Y=0)</span>
                <span className="text-xl font-bold font-mono text-red-700">{aggregates.reds}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {subTab === 'leaderboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* LEADERBOARD TABLE WITH INTEGRATED INLINE CONTROLS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-red-500" />
                  Danh Sách Xếp Hạng Học Viên Trong Room ({leaderboardData.length} active)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Phạm vi: Có phát sinh phản hồi</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaderboardColToggle(!showLeaderboardColToggle)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-3xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-red-500" />
                  <span>Ẩn/Hiện Cột</span>
                  {showLeaderboardColToggle ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* Inline filters and sorting controls inside the block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Sắp xếp theo:</span>
                  <select
                    value={leaderboardSortBy}
                    onChange={(e) => setLeaderboardSortBy(e.target.value as any)}
                    className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-red-500 cursor-pointer shadow-3xs"
                  >
                    <option value="cpd">Điểm CPD Cao Nhất</option>
                    <option value="redCardRatio">Tỷ Lệ Không Trả Lời Cao Nhất (Card Đỏ / Tổng Số Câu)</option>
                    <option value="completionRate">Tỷ Lệ Hoàn Thành Cao Nhất (Non-Red / Tổng Số Câu)</option>
                    <option value="totalCount">Tích Cực Nhất (Tổng Số Lượt Trả Lời)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-3xs">
                  <button
                    type="button"
                    onClick={() => setLeaderboardSortOrder('desc')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      leaderboardSortOrder === 'desc' ? 'bg-red-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Giảm dần (Cao → Thấp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaderboardSortOrder('asc')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      leaderboardSortOrder === 'asc' ? 'bg-red-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Tăng dần (Thấp → Cao)
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Columns Toggle Panel */}
            {showLeaderboardColToggle && (
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3.5 animate-in slide-in-from-top-1 duration-150">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.rank}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, rank: !visibleLeaderboardColumns.rank })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Hạng</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.learner}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, learner: !visibleLeaderboardColumns.learner })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Học viên</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.totalResponses}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, totalResponses: !visibleLeaderboardColumns.totalResponses })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Tổng phản hồi</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.totalCpd}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, totalCpd: !visibleLeaderboardColumns.totalCpd })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Tích lũy CPD</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.redRatio}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, redRatio: !visibleLeaderboardColumns.redRatio })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Tỷ lệ đỏ</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.completionRate}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, completionRate: !visibleLeaderboardColumns.completionRate })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Tỷ lệ hoàn thành</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visibleLeaderboardColumns.gradesDistribution}
                    onChange={() => setVisibleLeaderboardColumns({ ...visibleLeaderboardColumns, gradesDistribution: !visibleLeaderboardColumns.gradesDistribution })}
                    className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Phân bổ grades</span>
                </label>
              </div>
            )}

            {leaderboardData.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic">
                Chưa có dữ liệu phản hồi nào từ học viên trong bộ lọc hiện tại.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      {visibleLeaderboardColumns.rank && <th className="py-2.5 text-center w-12">HẠNG</th>}
                      {visibleLeaderboardColumns.learner && <th className="py-2.5">HỌC VIÊN</th>}
                      {visibleLeaderboardColumns.totalResponses && <th className="py-2.5 text-center">TỔNG PHẢN HỒI</th>}
                      {visibleLeaderboardColumns.totalCpd && <th className="py-2.5 text-right">TÍCH LŨY CPD</th>}
                      {visibleLeaderboardColumns.redRatio && <th className="py-2.5 text-center text-red-500">TỶ LỆ KHÔNG ĐỌC ĐƯỢC (CARD ĐỎ / TỔNG)</th>}
                      {visibleLeaderboardColumns.completionRate && <th className="py-2.5 text-center text-green-600">TỶ LỆ HOÀN THÀNH (NON-RED / TỔNG)</th>}
                      {visibleLeaderboardColumns.gradesDistribution && <th className="py-2.5 text-center">CHI TIẾT PHÂN BỔ GRADES</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {leaderboardData.map((student, idx) => {
                      const rank = idx + 1;
                      const isTop3 = rank <= 3;
                      const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                      const formattedRedRatio = Math.round(student.redCardRatio * 100);
                      const formattedCompRatio = Math.round(student.completionRate * 100);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50">
                          {visibleLeaderboardColumns.rank && (
                            <td className="py-3 text-center">
                              <span className={`inline-block font-bold text-xs ${
                                rank === 1 ? 'text-amber-500 text-sm' :
                                rank === 2 ? 'text-slate-400 text-sm' :
                                rank === 3 ? 'text-amber-700 text-sm' : 'text-slate-500'
                              }`}>
                                {rankBadge}
                              </span>
                            </td>
                          )}
                          {visibleLeaderboardColumns.learner && (
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{student.display_name}</span>
                                {rank === 1 && <span className="text-[10px] bg-amber-500/10 text-amber-600 font-extrabold px-1.5 py-0.5 rounded">Thủ khoa</span>}
                              </div>
                            </td>
                          )}
                          {visibleLeaderboardColumns.totalResponses && (
                            <td className="py-3 text-center font-mono text-slate-600">{student.totalCount} câu</td>
                          )}
                          {visibleLeaderboardColumns.totalCpd && (
                            <td className="py-3 text-right font-mono font-bold text-slate-900">{Math.round(student.totalCpd * 10) / 10} Ω</td>
                          )}
                          {visibleLeaderboardColumns.redRatio && (
                            <td className="py-3 text-center font-mono">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                formattedRedRatio > 50 ? 'bg-red-100 text-red-700' :
                                formattedRedRatio > 25 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {formattedRedRatio}% ({student.redCount}/{student.totalCount})
                              </span>
                            </td>
                          )}
                          {visibleLeaderboardColumns.completionRate && (
                            <td className="py-3 text-center font-mono">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold text-green-600">{formattedCompRatio}%</span>
                                <div className="w-20 bg-slate-100 h-1 rounded-full overflow-hidden">
                                  <div className="bg-green-500 h-full" style={{ width: `${formattedCompRatio}%` }} />
                                </div>
                              </div>
                            </td>
                          )}
                          {visibleLeaderboardColumns.gradesDistribution && (
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center gap-1 text-[9px] font-mono">
                                <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded" title="Purple">{student.purpleCount}🟪</span>
                                <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded" title="Green">{student.greenCount}🟩</span>
                                <span className="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded" title="Yellow">{student.yellowCount}🟨</span>
                                <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded" title="Red">{student.redCount}🟥</span>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DYNAMIC LEADERBOARD CHART */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-red-600" />
                Đồ Thị Trực Quan Bảng Xếp Hạng Học Viên (Tùy Chỉnh Tiêu Chí Sắp Xếp)
              </h4>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Dynamic Ordering Enabled</span>
            </div>

            {leaderboardData.length > 0 && (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaderboardData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="display_name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                    <Bar dataKey={leaderboardSortBy === 'cpd' ? 'totalCpd' : leaderboardSortBy === 'redCardRatio' ? 'redCount' : leaderboardSortBy === 'completionRate' ? 'completionRate' : 'totalCount'} fill="#ef4444" radius={[4, 4, 0, 0]}>
                      {leaderboardData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

        </div>
      )}

      {subTab === 'cumulative' && (
        <>
          {/* ROOM OVERVIEW & ENROLLED LEARNER DRILLDOWN (Visible only when room is selected) */}
          {selectedRoomDetails && (
            <div className="bg-slate-900 text-slate-100 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded-md text-[10px] font-bold font-mono uppercase tracking-widest border border-red-500/20">
                      Room: {selectedRoomDetails.room_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                      selectedRoomDetails.status === 'finished' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {selectedRoomDetails.status}
                    </span>
                  </div>
                  <h3 className="font-sans font-bold text-base text-white mt-1">{selectedRoomDetails.title}</h3>
                  <p className="text-[11px] text-slate-400">Hosted by: <span className="text-slate-200 font-semibold">{selectedRoomDetails.host_name || 'Instructor'}</span> • Created: {new Date(selectedRoomDetails.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex gap-4 font-mono">
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Leareners Enrolled</span>
                    <span className="text-lg font-bold text-red-400">{selectedRoomDetails.participatingLearners.length}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Rounds Opened</span>
                    <span className="text-lg font-bold text-white">{selectedRoomDetails.closedRoundsCount}/{selectedRoomDetails.totalRoundsCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2 rounded-xl text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Responses Transmitted</span>
                    <span className="text-lg font-bold text-indigo-400">{selectedRoomDetails.totalResponsesCount}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Learners Active in this Live Session (Click to view details)</h4>
                {selectedRoomDetails.participatingLearners.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No student responses submitted in this room session yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {selectedRoomDetails.participatingLearners.map(l => {
                      const isActive = selectedLearnerId === l.id;
                      const personalRoomResponses = filteredHistory.filter(item => item.learner_id === l.id);
                      const studentRoomCpd = personalRoomResponses.reduce((acc, curr) => acc + curr.cpd_result, 0);

                      return (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLearnerId(isActive ? 'all' : l.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-red-500 border-red-400 text-white shadow-xs'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/80 text-slate-300'
                          }`}
                        >
                          <span className="text-xs font-bold block truncate">{l.display_name}</span>
                          <div className="flex justify-between items-center mt-1 text-[10px] font-mono opacity-85">
                            <span>{personalRoomResponses.length} rounds</span>
                            <span className="font-bold">{Math.round(studentRoomCpd * 10) / 10} Ω</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

      {/* DYNAMIC SCALED FILTER METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Filtered Cumulative CPD</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {aggregates.totalCpd} <span className="text-xs text-slate-400 font-normal">Ω</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Filtered Response Count</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {aggregates.count} <span className="text-xs text-slate-400 font-normal">submissions</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Reflection Speed</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {aggregates.avgReflection} <span className="text-xs text-slate-400 font-normal">sec</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Filtered Avg CPD Score</span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {aggregates.avgCpd} <span className="text-xs text-slate-400 font-normal">Ω / rnd</span>
            </span>
          </div>
        </div>

      </div>

      {/* DYNAMIC CHART BUILDER WIDGET */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart Configuration Knobs (Left Panel) */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/80">
              <Sliders className="w-4 h-4 text-red-600" />
              <h3 className="font-sans font-bold text-xs text-slate-500 uppercase tracking-wider">Dynamic Chart Builder</h3>
            </div>

            {/* Select Chart Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">1. Visual Layout Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['bar', 'line', 'area', 'scatter'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChartType(type)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      chartType === type
                        ? 'bg-red-500 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Select X-Axis */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">2. HORIZONTAL AXIS (X-Axis Variable)</label>
              <select
                value={xAxisField}
                onChange={(e) => setXAxisField(e.target.value as any)}
                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 outline-hidden focus:border-red-500 cursor-pointer"
              >
                <option value="learner_name">Learner Display Name (Roster Group)</option>
                <option value="room_title">Practice Room Session (Classrooms)</option>
                <option value="response_color">Performance Grade (Red/Yellow/Green/Purple)</option>
                <option value="sentence_code">Drill Sentence Code (Prompts)</option>
              </select>
            </div>

            {/* Select Y-Axis */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400">3. VERTICAL METRIC (Y-Axis Value)</label>
              <select
                value={yAxisMetric}
                onChange={(e) => setYAxisMetric(e.target.value as any)}
                className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700 outline-hidden focus:border-red-500 cursor-pointer"
              >
                <option value="cpd_result">Average CPD Score (Ω Units)</option>
                <option value="cci_result">Average CCI Benchmark Score (Accuracy)</option>
                <option value="reflection_seconds">Average Spoken Reflection Delay (Seconds)</option>
                <option value="response_count">Total responses count (Volume)</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-white border border-slate-200/50 p-2.5 rounded-lg leading-relaxed">
            <span className="font-semibold text-slate-700 block mb-0.5">Auto-Aggregation Active</span>
            Calculates the average or sum metrics dynamically according to the filter parameters.
          </div>
        </div>

        {/* Live Interactive Graph Rendering (Right Panel) */}
        <div className="lg:col-span-8 flex flex-col justify-between" style={{ minHeight: '300px' }}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-red-600" />
              Dynamic Report Visualization
            </h4>
            <span className="text-[9px] bg-slate-100 text-slate-600 font-mono font-bold px-2 py-0.5 rounded uppercase">
              X: {xAxisField} • Y: {yAxisMetric}
            </span>
          </div>

          <div className="flex-1 w-full flex items-center justify-center pt-4">
            {chartData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 italic py-16">
                Not enough scoring records match the active criteria to plot charts. Complete drills to register logs.
              </div>
            ) : (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ fontSize: 11, borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]}>
                        {xAxisField === 'response_color' && chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getGradeColor(entry.name)} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="value" stroke="#ef4444" fillOpacity={1} fill="url(#colorArea)" strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis dataKey="value" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ fontSize: 11, borderRadius: '8px' }} />
                      <Scatter name="Telemetry Points" data={chartData} fill="#ef4444" />
                    </ScatterChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUSTOM FIELDS ("Tự tạo fields") & CONFIGURATION MANAGER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800">Dynamic Fields & Column Configurator</h3>
              <p className="text-[11px] text-slate-400">Add custom calculations and show/hide audit log table layers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFieldCreator(!showFieldCreator)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Define Custom Field
            </button>
            <button
              type="button"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" /> Toggle Columns {showConfigPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* CUSTOM FIELDS DESIGN MODAL-INLINE */}
        {showFieldCreator && (
          <form onSubmit={handleAddCustomField} className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 space-y-3 animate-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase">New Calculated Field Equation Builder</span>
              <button type="button" onClick={() => setShowFieldCreator(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">Cancel</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 text-xs items-end">
              
              {/* Field Name */}
              <div className="space-y-1 lg:col-span-2">
                <label className="text-[9px] font-bold text-slate-400 block uppercase">Field Label Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Speed Efficiency index"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                />
              </div>

              {/* Operand A */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase">First Variable (A)</label>
                <select
                  value={newFieldVarA}
                  onChange={(e) => setNewFieldVarA(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer"
                >
                  <option value="cpd_result">CPD Score</option>
                  <option value="cci_result">CCI Standard Result</option>
                  <option value="performance_y">Performance Level (0-3)</option>
                  <option value="reflection_seconds">Reflection Delay</option>
                  <option value="cci_standard_x">CCI Standard X Value</option>
                  <option value="cvr_value">CVR Multiplier</option>
                </select>
              </div>

              {/* Operator */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase">Operator</label>
                <select
                  value={newFieldOperator}
                  onChange={(e) => setNewFieldOperator(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer"
                >
                  <option value="/">Divided by ( / )</option>
                  <option value="*">Multiplied by ( * )</option>
                  <option value="+">Plus ( + )</option>
                  <option value="-">Minus ( - )</option>
                </select>
              </div>

              {/* Operand B Selection Mode */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 block uppercase">Second Variable (B)</label>
                <select
                  value={newFieldVarBType}
                  onChange={(e) => setNewFieldVarBType(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer"
                >
                  <option value="property">Database Field</option>
                  <option value="constant">Numeric Constant</option>
                </select>
              </div>

              {/* Operand B Value Selector */}
              <div className="space-y-1">
                {newFieldVarBType === 'property' ? (
                  <>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase">Choose Database Field</label>
                    <select
                      value={newFieldVarBProp}
                      onChange={(e) => setNewFieldVarBProp(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 cursor-pointer"
                    >
                      <option value="reflection_seconds">Reflection Delay (sec)</option>
                      <option value="cpd_result">CPD Score</option>
                      <option value="cci_result">CCI Result</option>
                      <option value="performance_y">Performance Level (0-3)</option>
                      <option value="cci_standard_x">CCI Standard X</option>
                      <option value="cvr_value">CVR Multiplier</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="text-[9px] font-bold text-slate-400 block uppercase">Enter Constant Number</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newFieldVarBConst}
                      onChange={(e) => setNewFieldVarBConst(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
                    />
                  </>
                )}
              </div>

            </div>

            <div className="flex justify-between items-center pt-2">
              {/* Output format */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Display format:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="newFieldFormat"
                    checked={newFieldFormat === 'number'}
                    onChange={() => setNewFieldFormat('number')}
                    className="accent-red-500"
                  />
                  Decimal number
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="newFieldFormat"
                    checked={newFieldFormat === 'percent'}
                    onChange={() => setNewFieldFormat('percent')}
                    className="accent-red-500"
                  />
                  Percentage (%)
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg cursor-pointer"
              >
                Create Field Column
              </button>
            </div>
          </form>
        )}

        {/* ACTIVE CUSTOM FIELDS LIST */}
        {customFields.length > 0 && (
          <div className="mt-3.5 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Defined Custom Columns:</span>
            <div className="flex flex-wrap gap-2">
              {customFields.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 font-mono">
                  <span className="font-bold text-slate-700">{f.label}</span>
                  <span className="text-[10px] text-slate-400">
                    ({f.varA} {f.operator} {typeof f.varB === 'number' ? f.varB : f.varB})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomField(f.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-slate-200/60 p-0.5 rounded cursor-pointer transition-colors"
                    title="Remove custom field"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLUMN TOGGLES PANEL */}
        {showConfigPanel && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 animate-in slide-in-from-top-1 duration-150">
            {Object.keys(visibleColumns).map(col => (
              <label key={col} className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibleColumns[col]}
                  onChange={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })}
                  className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5"
                />
                <span className="capitalize">{col.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
        )}

      </div>

      {/* INDIVIDUAL LEARNER REPORT DETAILS (Visible only when student filter is active) */}
      {selectedLearnerId !== 'all' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 animate-in fade-in duration-200">
          {(() => {
            const student = allLearners.find(l => l.id === selectedLearnerId);
            if (!student) return null;

            const totalStudentResponses = filteredHistory.length;
            const studentCpdRecord = progress.find(p => p.learner_id === student.id);
            const overallCumulativeCpd = studentCpdRecord ? studentCpdRecord.total_cpd : aggregates.totalCpd;

            // Accurate breakdown of grades specifically for this filtered view
            const percentPurple = totalStudentResponses > 0 ? Math.round((aggregates.purples / totalStudentResponses) * 100) : 0;
            const percentGreen = totalStudentResponses > 0 ? Math.round((aggregates.greens / totalStudentResponses) * 100) : 0;
            const percentYellow = totalStudentResponses > 0 ? Math.round((aggregates.yellows / totalStudentResponses) * 100) : 0;
            const percentRed = totalStudentResponses > 0 ? Math.round((aggregates.reds / totalStudentResponses) * 100) : 0;

            return (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-red-100 text-red-600 rounded-xl">
                      <Sparkles className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-sans font-bold text-sm text-slate-500 uppercase tracking-wider leading-none">Individual Student Mastery Report</h3>
                      <h4 className="font-sans font-black text-lg text-slate-800 mt-1">{student.display_name}</h4>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ROLE SOURCE: <span className="text-slate-600 font-bold capitalize">{student.source}</span> • LAST ACTIVE: {student.last_seen_at ? new Date(student.last_seen_at).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  
                  {/* Left stats: overview */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Mastery Score Card</span>
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Cumulative CPD Earned:</span>
                        <span className="text-sm font-bold text-red-600 font-mono">{overallCumulativeCpd} Ω</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Spoken Evaluation Rounds:</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">{totalStudentResponses}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Average Reflection Speed:</span>
                        <span className="text-sm font-bold text-indigo-600 font-mono">{aggregates.avgReflection}s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Average Score / Round:</span>
                        <span className="text-sm font-bold text-emerald-600 font-mono">{aggregates.avgCpd} Ω</span>
                      </div>
                    </div>

                    <div className="text-[11px] bg-red-50/40 text-red-700/80 p-3 rounded-lg border border-red-50/60 leading-relaxed">
                      <span className="font-bold block mb-0.5">Teacher Pedagogical Insight:</span>
                      {aggregates.avgReflection <= 1.5 ? (
                        <span>Student demonstrates highly fluent, immediate reflex capacity under 1.5 seconds. Pronunciation and muscle-memory benchmarks optimal.</span>
                      ) : aggregates.avgReflection <= 3.5 ? (
                        <span>Student demonstrates standard pausing. Minor lexical formulation delays present; encourage more rapid-drilling practice.</span>
                      ) : (
                        <span>Significant speech-reflection latency (exceeds 3.5s). Targeted focus on phonetic recognition and sub-vocalization loops recommended.</span>
                      )}
                    </div>
                  </div>

                  {/* Right stats: Grade distribution and visual bars */}
                  <div className="md:col-span-2 space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accuracy & Tone Grade Distribution</span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      
                      {/* Purple */}
                      <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-purple-600 block mb-1">🟣 PURPLE (Y=3)</span>
                        <span className="text-xl font-bold font-mono text-purple-700">{aggregates.purples}</span>
                        <span className="text-[10px] block text-purple-400 mt-0.5 font-bold font-mono">{percentPurple}%</span>
                      </div>

                      {/* Green */}
                      <div className="bg-green-50/50 border border-green-100 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-green-600 block mb-1">🟢 GREEN (Y=2)</span>
                        <span className="text-xl font-bold font-mono text-green-700">{aggregates.greens}</span>
                        <span className="text-[10px] block text-green-400 mt-0.5 font-bold font-mono">{percentGreen}%</span>
                      </div>

                      {/* Yellow */}
                      <div className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-yellow-600 block mb-1">🟡 YELLOW (Y=1)</span>
                        <span className="text-xl font-bold font-mono text-yellow-700">{aggregates.yellows}</span>
                        <span className="text-[10px] block text-yellow-400 mt-0.5 font-bold font-mono">{percentYellow}%</span>
                      </div>

                      {/* Red */}
                      <div className="bg-red-50/50 border border-red-100 p-3 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-red-600 block mb-1">🔴 RED (Y=0)</span>
                        <span className="text-xl font-bold font-mono text-red-700">{aggregates.reds}</span>
                        <span className="text-[10px] block text-red-400 mt-0.5 font-bold font-mono">{percentRed}%</span>
                      </div>

                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">Comprehensive Performance Grade Ratio</span>
                      <div className="w-full bg-slate-100 h-5 rounded-lg flex overflow-hidden">
                        {aggregates.purples > 0 && <div className="bg-purple-600 h-full text-[9px] text-white font-bold font-mono flex items-center justify-center" style={{ width: `${percentPurple}%` }} title="Purple">{percentPurple}%</div>}
                        {aggregates.greens > 0 && <div className="bg-green-500 h-full text-[9px] text-white font-bold font-mono flex items-center justify-center" style={{ width: `${percentGreen}%` }} title="Green">{percentGreen}%</div>}
                        {aggregates.yellows > 0 && <div className="bg-yellow-500 h-full text-[9px] text-slate-900 font-bold font-mono flex items-center justify-center" style={{ width: `${percentYellow}%` }} title="Yellow">{percentYellow}%</div>}
                        {aggregates.reds > 0 && <div className="bg-red-500 h-full text-[9px] text-white font-bold font-mono flex items-center justify-center" style={{ width: `${percentRed}%` }} title="Red">{percentRed}%</div>}
                        {totalStudentResponses === 0 && <div className="w-full text-slate-400 text-xs italic flex items-center justify-center">No grades logged.</div>}
                      </div>
                    </div>

                  </div>

                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* DETAILED IMMUTABLE AUDIT TRAIL LOGS WITH DYNAMIC CUSTOM COLUMNS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-1.5">
            <History className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800">Scoring Audit Trail Log</h3>
              <p className="text-[11px] text-slate-400">Locked parameter telemetry of learner oral responses</p>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded font-bold font-mono self-start sm:self-auto uppercase">
            FORMULA SNAPSHOT: SIMPLE-V1
          </span>
        </div>

        {/* Dynamic Controls: Learner Filter and Columns Toggle */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Inline Learner Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Users className="w-4 h-4 text-red-500" /> Learner Profile:
              </span>
              <select
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 cursor-pointer shadow-3xs min-w-[160px]"
              >
                <option value="all">All Learners (Roster)</option>
                {allLearners.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Column Visibility Toggler */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTableColToggle(!showTableColToggle)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all cursor-pointer shadow-3xs"
              >
                <Sliders className="w-3.5 h-3.5 text-red-500" />
                <span>Show/Hide Table Columns</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showTableColToggle && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTableColToggle(false)} />
                  <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white border border-slate-200 shadow-md p-3 z-20 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                      Toggle Columns
                    </div>
                    <div className="max-h-64 overflow-y-auto grid grid-cols-1 gap-1.5">
                      {Object.keys(visibleColumns).map(col => (
                        <label key={col} className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col]}
                            onChange={() => setVisibleColumns({ ...visibleColumns, [col]: !visibleColumns[col] })}
                            className="rounded text-red-500 focus:ring-red-500 accent-red-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="capitalize">{col.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </label>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowTableColToggle(false)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* Quick Visibility Presets */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
            <button
              type="button"
              onClick={() => setVisibleColumns({
                timestamp: true,
                student: true,
                room: true,
                drillCode: true,
                grade: true,
                cciX: false,
                cvr: false,
                reflectSec: true,
                cciResult: false,
                cpdResult: true
              })}
              className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-md text-[10px] font-bold text-slate-600 transition-colors shadow-3xs cursor-pointer"
            >
              Compact View
            </button>
            <button
              type="button"
              onClick={() => setVisibleColumns({
                timestamp: true,
                student: true,
                room: true,
                drillCode: true,
                grade: true,
                cciX: true,
                cvr: true,
                reflectSec: true,
                cciResult: true,
                cpdResult: true
              })}
              className="px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-md text-[10px] font-bold text-slate-600 transition-colors shadow-3xs cursor-pointer"
            >
              Full Telemetry
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic">
              No historical response records saved matching the active criteria. Start evaluations in the 'Teacher Console' to view logs.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  {visibleColumns.timestamp && <th className="py-2.5">TIMESTAMP</th>}
                  {visibleColumns.student && <th className="py-2.5">STUDENT</th>}
                  {visibleColumns.room && <th className="py-2.5">ROOM / SESSION</th>}
                  {visibleColumns.drillCode && <th className="py-2.5">DRILL</th>}
                  {visibleColumns.grade && <th className="py-2.5">GRADE COLOR</th>}
                  {visibleColumns.cciX && <th className="py-2.5">CCI STD X</th>}
                  {visibleColumns.cvr && <th className="py-2.5">CVR Ω</th>}
                  {visibleColumns.reflectSec && <th className="py-2.5">REFLECT SEC</th>}
                  {visibleColumns.cciResult && <th className="py-2.5">CCI RESULT</th>}
                  
                  {/* DYNAMIC CUSTOM FIELDS COLUMNS */}
                  {customFields.map(field => (
                    <th key={field.id} className="py-2.5 text-indigo-600 font-bold font-mono">
                      {field.label.toUpperCase()}
                    </th>
                  ))}

                  {visibleColumns.cpdResult && <th className="py-2.5 text-right text-red-600 font-bold">CPD RESULT</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {filteredHistory.map(audit => (
                  <tr key={audit.id} className="hover:bg-slate-50/50">
                    
                    {visibleColumns.timestamp && (
                      <td className="py-3 text-[10px] text-slate-400 font-mono">
                        {new Date(audit.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    )}

                    {visibleColumns.student && (
                      <td className="py-3 text-slate-700 font-semibold">{audit.learner?.display_name || 'Anonymous'}</td>
                    )}

                    {visibleColumns.room && (
                      <td className="py-3 text-slate-500 max-w-[150px] truncate">
                        {audit.room?.title || "Simulated"}
                      </td>
                    )}

                    {visibleColumns.drillCode && (
                      <td className="py-3 font-mono text-[10px]">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50">
                          {audit.sentence?.sentence_code || 'N/A'}
                        </span>
                      </td>
                    )}

                    {visibleColumns.grade && (
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-[3px] text-[9px] font-bold text-white uppercase ${
                          audit.response_color === 'red' ? 'bg-red-500' :
                          audit.response_color === 'yellow' ? 'bg-yellow-500 text-slate-900' :
                          audit.response_color === 'green' ? 'bg-green-500' : 'bg-purple-600'
                        }`}>
                          {audit.response_color}
                        </span>
                      </td>
                    )}

                    {visibleColumns.cciX && (
                      <td className="py-3 font-mono text-slate-600">{audit.cci_standard_x}</td>
                    )}

                    {visibleColumns.cvr && (
                      <td className="py-3 font-mono text-slate-600">Ω {audit.cvr_value}</td>
                    )}

                    {visibleColumns.reflectSec && (
                      <td className="py-3 font-mono text-slate-600">{audit.reflection_seconds}s</td>
                    )}

                    {visibleColumns.cciResult && (
                      <td className="py-3 font-mono text-indigo-700 font-bold">{audit.cci_result} A</td>
                    )}

                    {/* DYNAMIC CALCULATED CUSTOM FIELDS DATA RENDERING */}
                    {customFields.map(field => (
                      <td key={field.id} className="py-3 font-mono text-indigo-600 font-bold">
                        {evalCustomField(audit, field)}
                      </td>
                    ))}

                    {visibleColumns.cpdResult && (
                      <td className="py-3 text-right font-mono font-bold text-red-600">
                        {audit.cpd_result}
                      </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
        </>
      )}

    </div>
  );
}
