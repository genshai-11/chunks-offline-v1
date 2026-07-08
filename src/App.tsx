/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import { checkSchemaHealth, SchemaHealthResult } from './lib/schemaHealth';
import { 
  Course, Lesson, LessonSection, SentenceResource, 
  CCICategory, CCIStandardCard, CVRUnit, PracticeRoom, RoomRound, 
  LearnerResponse, LearnerProgress, AudioGenerationJob, Learner 
} from './types';

// Tab Components
import MigrationsTab from './components/MigrationsTab';
import LibraryTab from './components/LibraryTab';
import SimulatorTab from './components/SimulatorTab';
import LiveSessionTab from './components/LiveSessionTab';
import LearnerTerminalTab from './components/LearnerTerminalTab';
import HistoryTab from './components/HistoryTab';
import AudioGeneratorTab from './components/AudioGeneratorTab';
import SettingsTab from './components/SettingsTab';
import ChunksLogo from './components/ChunksLogo';

// Icons
import { 
  FolderOpen, Zap, BarChart2, Volume2, Settings2, Database, HelpCircle, RefreshCw, Users,
  ChevronLeft, ChevronRight, Menu, SlidersHorizontal, Activity
} from 'lucide-react';

type AppTab = 'library' | 'simulator' | 'liveSession' | 'learner' | 'history' | 'audio' | 'migrations' | 'settings';

const tabRoutes: Record<AppTab, string> = {
  simulator: '/teacher',
  liveSession: '/live-session',
  learner: '/learner',
  library: '/library',
  history: '/reports',
  audio: '/tts',
  settings: '/settings',
  migrations: '/database'
};

const routeAliases: Record<string, AppTab> = {
  '/': 'simulator',
  '/teacher': 'simulator',
  '/simulator': 'simulator',
  '/classroom': 'simulator',
  '/live-session': 'liveSession',
  '/live-sessions': 'liveSession',
  '/learner': 'learner',
  '/join': 'learner',
  '/library': 'library',
  '/reports': 'history',
  '/history': 'history',
  '/tts': 'audio',
  '/audio': 'audio',
  '/settings': 'settings',
  '/database': 'migrations',
  '/migrations': 'migrations'
};

const resolveTabFromLocation = (): AppTab => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('room_code') || params.get('join')) return 'learner';
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return routeAliases[path] || 'simulator';
};

const buildTabUrl = (tab: AppTab) => {
  const url = new URL(window.location.href);
  const params = new URLSearchParams();
  if (tab === 'learner') {
    const roomCode = url.searchParams.get('room_code') || url.searchParams.get('join');
    if (roomCode) params.set('room_code', roomCode);
  }
  const search = params.toString();
  return `${tabRoutes[tab]}${search ? `?${search}` : ''}`;
};

const navItems = [
  {
    id: 'simulator' as AppTab,
    label: 'Teacher Console',
    shortLabel: 'Teacher',
    icon: Zap,
    description: 'Classroom simulation & control',
    options: [
      { label: 'Start Session', desc: 'Initialize standard lesson rooms' },
      { label: 'Room Manager', desc: 'Monitor active learner connections' },
      { label: 'Interactive Rounds', desc: 'Trigger oral response cycles' }
    ]
  },
  {
    id: 'liveSession' as AppTab,
    label: 'Live Sessions',
    shortLabel: 'Live',
    icon: Activity,
    description: 'Manage, review and delete all classroom sessions',
    options: [
      { label: 'All Rooms', desc: 'Browse every session by status' },
      { label: 'Rejoin Session', desc: 'Return to Teacher Console for an active room' },
      { label: 'Delete Session', desc: 'Permanently remove finished sessions and data' }
    ]
  },
  {
    id: 'learner' as AppTab,
    label: 'Learner Terminal',
    shortLabel: 'Learner',
    icon: Users,
    description: 'Interactive response console',
    options: [
      { label: 'Join Room', desc: 'Connect to teacher evaluation rounds' },
      { label: 'Self Practice', desc: 'Review vocabulary and sentences' },
      { label: 'Performance Hub', desc: 'View feedback and scores' }
    ]
  },
  {
    id: 'library' as AppTab,
    label: 'Library',
    shortLabel: 'Library',
    icon: FolderOpen,
    description: 'Browse curriculum resources and sentence prompts',
    options: [
      { label: 'Curriculum View', desc: 'Browse courses & lessons' },
      { label: 'Sentence Prompts', desc: 'Manage classroom sentence resources' },
      { label: 'Audio Coverage', desc: 'Check EN/VI prompt audio status' }
    ]
  },
  {
    id: 'history' as AppTab,
    label: 'Reports & History',
    shortLabel: 'Reports',
    icon: BarChart2,
    description: 'Oral evaluation telemetry',
    options: [
      { label: 'Class Analytics', desc: 'Average fluency & accuracy' },
      { label: 'Historical Rounds', desc: 'Detailed response logs' },
      { label: 'Individual Progress', desc: 'Student mastery metrics' }
    ]
  },
  {
    id: 'audio' as AppTab,
    label: 'Audio TTS Jobs',
    shortLabel: 'TTS Jobs',
    icon: Volume2,
    description: 'Voice synthesis jobs',
    options: [
      { label: 'Active Queue', desc: 'Monitor pending synthesis' },
      { label: 'English Generator', desc: 'Generate EN native speaker audio' },
      { label: 'Vietnamese Generator', desc: 'Generate VI instruction speech' }
    ]
  },
  {
    id: 'settings' as AppTab,
    label: 'Setting',
    shortLabel: 'Settings',
    icon: SlidersHorizontal,
    description: 'Manage performance settings, CCI & CVR parameters',
    options: [
      { label: 'Scoring Rules', desc: 'Configure CCI & CVR mappings' },
      { label: 'Learner Roster', desc: 'Add, edit, and deactivate learners' },
      { label: 'Scoring Rules', desc: 'Manage live standards and multipliers' }
    ]
  },
  {
    id: 'migrations' as AppTab,
    label: 'SQL Migrations',
    shortLabel: 'Database',
    icon: Settings2,
    description: 'Schema & Sandbox configuration',
    options: [
      { label: 'Database Schema', desc: 'Inspect Postgres tables' },
      { label: 'Schema Health', desc: 'Check live table availability' },
      { label: 'Release Controls', desc: 'Migration rollback guidance' }
    ]
  }
];

export default function App() {
  // Product mode is live Supabase only. Sandbox/mock data is no longer a product fallback.
  const useSandbox = false;
  const setUseSandbox = (_val: boolean) => undefined;
  const [activeTab, setActiveTab] = useState<AppTab>(() => resolveTabFromLocation());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  const isLearnerOnlyMode = activeTab === 'learner';

  // React states representing the database collections
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [resources, setResources] = useState<SentenceResource[]>([]);
  const [cciCategories, setCciCategories] = useState<CCICategory[]>([]);
  const [cciCards, setCciCards] = useState<CCIStandardCard[]>([]);
  const [cvrUnits, setCvrUnits] = useState<CVRUnit[]>([]);
  const [rooms, setRooms] = useState<PracticeRoom[]>([]);
  const [rounds, setRounds] = useState<RoomRound[]>([]);
  const [responses, setResponses] = useState<LearnerResponse[]>([]);
  const [progress, setProgress] = useState<LearnerProgress[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [audioJobs, setAudioJobs] = useState<AudioGenerationJob[]>([]);
  const [schemaHealth, setSchemaHealth] = useState<SchemaHealthResult | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const navigateToTab = (tab: AppTab) => {
    setActiveTab(tab);
    const nextUrl = buildTabUrl(tab);
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState({ tab }, '', nextUrl);
    }
  };

  // Reload lists on change
  useEffect(() => {
    reloadDatabaseState();

    const initialTab = resolveTabFromLocation();
    setActiveTab(initialTab);
    const normalizedUrl = buildTabUrl(initialTab);
    if (`${window.location.pathname}${window.location.search}` !== normalizedUrl) {
      window.history.replaceState({ tab: initialTab }, '', normalizedUrl);
    }

    const handlePopState = () => setActiveTab(resolveTabFromLocation());
    const handleDbChange = () => {
      reloadDatabaseState();
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('chunks_sandbox_db_change', handleDbChange);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    };
  }, []);

  const reloadDatabaseState = async () => {
    setDataLoading(true);
    const errors: string[] = [];

    const capture = <T,>(label: string, result: { data: T | null; error: any }) => {
      if (result.error) {
        errors.push(`${label}: ${result.error.message}`);
        return null;
      }
      return result.data;
    };

    const fetchAllSentenceResources = async () => {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from('sentence_resources')
          .select('*')
          .order('order_index', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) {
          errors.push(`sentence_resources: ${error.message}`);
          break;
        }
        all.push(...(data || []));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    };

    try {
      const health = await checkSchemaHealth();
      setSchemaHealth(health);

      const [
        dbCoursesResult,
        dbLessonsResult,
        dbSectionsResult,
        dbCciCategoriesResult,
        dbCciCardsResult,
        dbCvrUnitsResult,
        dbRoomsResult,
        dbRoundsResult,
        dbResponsesResult,
        dbProgressResult,
        dbLearnersResult
      ] = await Promise.all([
        supabase.from('courses').select('*'),
        supabase.from('lessons').select('*').order('order_index', { ascending: true }),
        supabase.from('lesson_sections').select('*').order('order_index', { ascending: true }),
        supabase.from('cci_categories').select('*').order('id', { ascending: true }),
        supabase.from('cci_standard_cards').select('*'),
        supabase.from('cvr_units').select('*'),
        supabase.from('practice_rooms').select('*'),
        supabase.from('room_rounds').select('*').order('round_index', { ascending: true }),
        supabase.from('learner_responses').select('*'),
        supabase.from('learner_progress').select('*'),
        supabase.from('learners').select('*').order('display_name', { ascending: true })
      ]);

      const dbCourses = capture('courses', dbCoursesResult);
      const dbLessons = capture('lessons', dbLessonsResult);
      const dbSections = capture('lesson_sections', dbSectionsResult);
      const dbResources = await fetchAllSentenceResources();
      const dbCciCategories = capture('cci_categories', dbCciCategoriesResult);
      const dbCciCards = capture('cci_standard_cards', dbCciCardsResult);
      const dbCvrUnits = capture('cvr_units', dbCvrUnitsResult);
      const dbRooms = capture('practice_rooms', dbRoomsResult);
      const dbRounds = capture('room_rounds', dbRoundsResult);
      const dbResponses = capture('learner_responses', dbResponsesResult);
      const dbProgress = capture('learner_progress', dbProgressResult);
      const dbLearners = capture('learners', dbLearnersResult);

      setCourses((dbCourses || []) as Course[]);
      setLessons((dbLessons || []) as Lesson[]);
      setSections((dbSections || []) as LessonSection[]);
      setResources((dbResources || []) as SentenceResource[]);
      setCciCategories((dbCciCategories || []) as CCICategory[]);
      setCciCards((dbCciCards || []) as CCIStandardCard[]);
      setCvrUnits((dbCvrUnits || []) as CVRUnit[]);
      setRooms((dbRooms || []) as PracticeRoom[]);
      setRounds((dbRounds || []) as RoomRound[]);
      setResponses((dbResponses || []) as LearnerResponse[]);
      setProgress((dbProgress || []) as LearnerProgress[]);
      setLearners((dbLearners || []) as Learner[]);

      // Audio generation is handled by Supabase Edge Function `generate-resource-audio`.
      // The legacy audio_generation_jobs table is not required for the live module.
      setAudioJobs([]);
    } catch (err: any) {
      errors.push(err.message || 'Failed to load live database state.');
    } finally {
      setLoadErrors(errors);
      setDataLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans" id="chunks-applet-root">
      
      {/* Header Banner */}
      {!isLearnerOnlyMode && <header className="bg-[#171717] border-b border-neutral-800 sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ChunksLogo className="h-11 hover:scale-105 transition-transform" />
          <div>
            <h1 className="font-display text-base font-bold text-white tracking-tight leading-none flex items-center gap-2" id="chunks-main-title">
              Chunks Offline
            </h1>
          </div>
        </div>
        
        {/* Right element (sleek status indicator) */}
        <div className="flex items-center gap-2 self-start md:self-auto" id="chunks-header-right">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
            Supabase Connected
          </span>
        </div>
      </header>}

      {/* Main Container with Left Sidebar Redesign */}
      <main className={`${isLearnerOnlyMode ? 'max-w-3xl px-3 py-4' : 'max-w-7xl px-6 py-8'} mx-auto`} id="chunks-main-layout">
        {dataLoading && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">
            Loading live Supabase data...
          </div>
        )}
        {loadErrors.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <strong className="block mb-1">Live data/schema notices</strong>
            <ul className="list-disc pl-4 space-y-0.5">
              {loadErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Desktop Sidebar (lg+ only) - sticky icon rail or expanded list */}
          {!isLearnerOnlyMode && <aside 
            className={`hidden lg:block ${isSidebarExpanded ? 'lg:col-span-3 xl:col-span-3' : 'lg:col-span-1 xl:col-span-1'} shrink-0 transition-all duration-300 w-full`} 
            id="chunks-sidebar-container"
          >
            <div className="lg:sticky lg:top-24 w-full" id="chunks-sidebar-flex-row">
              
              {/* COLUMN 1: Narrow vertical Icon-only Rail (Desktop collapsed) */}
              {!isSidebarExpanded && (
                <div className="flex flex-col items-center bg-white border border-neutral-200 rounded-2xl shadow-sm py-3 px-2.5 w-16 shrink-0 gap-4 justify-start animate-in fade-in duration-200" id="column-1-icon-rail">
                  {/* Hamburger Toggle Button */}
                  <button
                    onClick={() => setIsSidebarExpanded(true)}
                    className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-all cursor-pointer shadow-xs"
                    title="Expand Sidebar"
                  >
                    <Menu className="w-4 h-4" />
                  </button>

                  <div className="w-full border-t border-neutral-100" />

                  {/* Vertical Icons List */}
                  <nav className="flex flex-col gap-2 w-full items-center">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigateToTab(item.id);
                            setIsSidebarExpanded(true); // Automatically expand on click
                          }}
                          title={item.label}
                          className={`p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center relative group ${
                            isActive 
                              ? 'bg-red-50 text-red-600 border border-red-100 shadow-2xs font-bold scale-[1.05]' 
                              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 border border-transparent'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          
                          {/* Tooltip for collapsed mode (desktop) */}
                          <div className="absolute left-16 bg-neutral-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                             {item.label}
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                  
                  <div className="w-full border-t border-neutral-100 pt-3 text-center">
                    <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-wider cursor-help" title="Live Supabase Active">
                      LIVE
                    </span>
                  </div>
                </div>
              )}

              {/* COLUMN 2: Expanded text labels with ChevronRight (displayed if expanded) */}
              {isSidebarExpanded && (
                <div className="w-full bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-left duration-200" id="column-2-text-details">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-neutral-100">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      Workspace Modules
                    </span>
                    <button 
                      onClick={() => setIsSidebarExpanded(false)}
                      className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                      title="Collapse Sidebar"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <nav className="flex flex-col gap-1.5">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateToTab(item.id)}
                          className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                            isActive
                              ? 'bg-red-500 text-white shadow-sm font-bold scale-[1.01]'
                              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-600'}`} />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isActive ? 'text-white translate-x-0.5' : 'text-neutral-400 group-hover:translate-x-0.5'
                          }`} />
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}

            </div>
          </aside>}

          {/* Right Main Content Panel */}
          <div className={`${isLearnerOnlyMode ? 'lg:col-span-12' : isSidebarExpanded ? 'lg:col-span-9 xl:col-span-9' : 'lg:col-span-11 xl:col-span-11'} transition-all duration-300 w-full`} id="chunks-tab-content">
            
            {/* Mobile Navigation - horizontal scrollable tabs (phones & small screens) */}
            {!isLearnerOnlyMode && <div className="lg:hidden mb-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-1 shadow-sm overflow-x-auto">
                <div className="flex gap-1 min-w-max px-0.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigateToTab(item.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          isActive 
                            ? 'bg-red-600 text-white shadow-sm' 
                            : 'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>}

            {activeTab === 'library' && (
              <LibraryTab
                useSandbox={useSandbox}
                courses={courses}
                lessons={lessons}
                sections={sections}
                resources={resources}
                cciCards={cciCards}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {(activeTab === 'simulator') && (
              <SimulatorTab
                useSandbox={useSandbox}
                courses={courses}
                lessons={lessons}
                sections={sections}
                resources={resources}
                cciCards={cciCards}
                cvrUnits={cvrUnits}
                rooms={rooms}
                learners={learners}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'liveSession' && (
              <LiveSessionTab
                rooms={rooms}
                rounds={rounds}
                responses={responses}
                learners={learners}
                onRefreshData={reloadDatabaseState}
                onRejoinRoom={(roomId) => {
                  // Navigate to Teacher Console and fire an event so SimulatorTab can pick up the room
                  navigateToTab('simulator');
                  // Small delay so SimulatorTab mounts before receiving the event
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('chunks_rejoin_room', { detail: { roomId } }));
                  }, 80);
                }}
              />
            )}

            {activeTab === 'learner' && (
              <LearnerTerminalTab
                useSandbox={useSandbox}
                resources={resources}
                cciCards={cciCards}
                learners={learners}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'history' && (
              <HistoryTab
                courses={courses}
                lessons={lessons}
                resources={resources}
                rooms={rooms}
                rounds={rounds}
                responses={responses}
                progress={progress}
                learners={learners}
              />
            )}

            {activeTab === 'audio' && (
              <AudioGeneratorTab
                useSandbox={useSandbox}
                resources={resources}
                jobs={audioJobs}
                schemaHealth={schemaHealth}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'migrations' && (
              <MigrationsTab
                useSandbox={useSandbox}
                setUseSandbox={setUseSandbox}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                useSandbox={useSandbox}
                cciCategories={cciCategories}
                cciCards={cciCards}
                cvrUnits={cvrUnits}
                learners={learners}
                onRefreshData={reloadDatabaseState}
              />
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      {!isLearnerOnlyMode && <footer className="bg-white border-t border-slate-200 mt-20 px-6 py-4 text-center text-xs text-slate-400">
        <span>&copy; {new Date().getFullYear()} CHUNKS Classroom Live response Engine. Persisted under formula: simple-v1.</span>
      </footer>}

    </div>
  );
}
