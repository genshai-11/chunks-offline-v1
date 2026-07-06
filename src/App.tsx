/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sandboxDb, supabase } from './lib/supabaseClient';
import { 
  Course, Lesson, LessonSection, SentenceResource, 
  CCIStandardCard, CVRUnit, PracticeRoom, RoomRound, 
  LearnerResponse, LearnerProgress, AudioGenerationJob 
} from './types';

// Tab Components
import MigrationsTab from './components/MigrationsTab';
import LibraryTab from './components/LibraryTab';
import SimulatorTab from './components/SimulatorTab';
import LearnerTerminalTab from './components/LearnerTerminalTab';
import HistoryTab from './components/HistoryTab';
import AudioGeneratorTab from './components/AudioGeneratorTab';
import SettingsTab from './components/SettingsTab';
import ChunksLogo from './components/ChunksLogo';

// Icons
import { 
  FolderOpen, Zap, BarChart2, Volume2, Settings2, Database, HelpCircle, RefreshCw, Users,
  ChevronLeft, ChevronRight, Menu, SlidersHorizontal
} from 'lucide-react';

const navItems = [
  {
    id: 'simulator' as const,
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
    id: 'learner' as const,
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
    id: 'library' as const,
    label: 'Library & Standards',
    shortLabel: 'Library',
    icon: FolderOpen,
    description: 'Manage items & standard curriculum',
    options: [
      { label: 'Curriculum View', desc: 'Browse courses & lessons' },
      { label: 'CCI Standard Cards', desc: 'Manage benchmark rubrics' },
      { label: 'CVR Word Units', desc: 'Define lexical evaluation chunks' }
    ]
  },
  {
    id: 'history' as const,
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
    id: 'audio' as const,
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
    id: 'settings' as const,
    label: 'Config Settings',
    shortLabel: 'Settings',
    icon: SlidersHorizontal,
    description: 'Manage performance settings, CCI & CVR parameters',
    options: [
      { label: 'Scoring Rules', desc: 'Configure CCI & CVR mappings' },
      { label: 'Learner Buttons', desc: 'Custom grade & color thresholds' },
      { label: 'Preview Mockup', desc: 'See changes in learner view' }
    ]
  },
  {
    id: 'migrations' as const,
    label: 'SQL Migrations',
    shortLabel: 'Database',
    icon: Settings2,
    description: 'Schema & Sandbox configuration',
    options: [
      { label: 'Database Schema', desc: 'Inspect Postgres tables' },
      { label: 'Sandbox Control', desc: 'Toggle mock database bypass' },
      { label: 'Seed Playground', desc: 'Populate sample test suites' }
    ]
  }
];

export default function App() {
  // UseSandbox controls whether queries fallback to our robust mock DB
  const [useSandbox, setUseSandbox] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'library' | 'simulator' | 'learner' | 'history' | 'audio' | 'migrations' | 'settings'>('simulator');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);

  // React states representing the database collections
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [resources, setResources] = useState<SentenceResource[]>([]);
  const [cciCards, setCciCards] = useState<CCIStandardCard[]>([]);
  const [cvrUnits, setCvrUnits] = useState<CVRUnit[]>([]);
  const [rooms, setRooms] = useState<PracticeRoom[]>([]);
  const [rounds, setRounds] = useState<RoomRound[]>([]);
  const [responses, setResponses] = useState<LearnerResponse[]>([]);
  const [progress, setProgress] = useState<LearnerProgress[]>([]);
  const [audioJobs, setAudioJobs] = useState<AudioGenerationJob[]>([]);

  // Reload lists on change
  useEffect(() => {
    reloadDatabaseState();

    // Check query params to auto-navigate to learner tab if room_code is present
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room_code') || params.get('join');
    if (roomCode) {
      setActiveTab('learner');
    }

    // Listen to local sandbox changes
    const handleDbChange = () => {
      reloadDatabaseState();
    };
    window.addEventListener('chunks_sandbox_db_change', handleDbChange);
    return () => {
      window.removeEventListener('chunks_sandbox_db_change', handleDbChange);
    };
  }, [useSandbox]);

  const reloadDatabaseState = async () => {
    if (useSandbox) {
      setCourses([...sandboxDb.courses]);
      setLessons([...sandboxDb.lessons]);
      setSections([...sandboxDb.sections]);
      setResources([...sandboxDb.sentenceResources]);
      setCciCards([...sandboxDb.cciStandardCards]);
      setCvrUnits([...sandboxDb.cvrUnits]);
      setRooms([...sandboxDb.rooms]);
      setRounds([...sandboxDb.rounds]);
      setResponses([...sandboxDb.responses]);
      setProgress([...sandboxDb.progress]);
      setAudioJobs([...sandboxDb.audioJobs]);
    } else {
      try {
        const [
          { data: dbCourses },
          { data: dbLessons },
          { data: dbSections },
          { data: dbResources },
          { data: dbCciCards },
          { data: dbCvrUnits },
          { data: dbRooms },
          { data: dbRounds },
          { data: dbResponses },
          { data: dbProgress },
          { data: dbAudioJobs }
        ] = await Promise.all([
          supabase.from('courses').select('*'),
          supabase.from('lessons').select('*').order('order_index', { ascending: true }),
          supabase.from('lesson_sections').select('*').order('order_index', { ascending: true }),
          supabase.from('sentence_resources').select('*').order('order_index', { ascending: true }),
          supabase.from('cci_standard_cards').select('*'),
          supabase.from('cvr_units').select('*'),
          supabase.from('practice_rooms').select('*'),
          supabase.from('room_rounds').select('*').order('round_index', { ascending: true }),
          supabase.from('learner_responses').select('*'),
          supabase.from('learner_progress').select('*'),
          supabase.from('audio_generation_jobs').select('*')
        ]);

        if (dbCourses) setCourses(dbCourses);
        if (dbLessons) setLessons(dbLessons);
        if (dbSections) setSections(dbSections);
        if (dbResources) setResources(dbResources);
        if (dbCciCards) setCciCards(dbCciCards);
        if (dbCvrUnits) setCvrUnits(dbCvrUnits);
        if (dbRooms) setRooms(dbRooms);
        if (dbRounds) setRounds(dbRounds);
        if (dbResponses) setResponses(dbResponses);
        if (dbProgress) setProgress(dbProgress);
        if (dbAudioJobs) setAudioJobs(dbAudioJobs);
      } catch (err) {
        console.error("Failed to load live database state:", err);
      }
    }
  };

  const handleResetSandbox = () => {
    if (window.confirm("This will clear all active live room sessions, student rosters, responses, and reset Library data back to default sample content. Proceed?")) {
      sandboxDb.resetAll();
      reloadDatabaseState();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans" id="chunks-applet-root">
      
      {/* Header Banner */}
      <header className="bg-[#171717] border-b border-neutral-800 sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      </header>

      {/* Main Container with Left Sidebar Redesign */}
      <main className="max-w-7xl mx-auto px-6 py-8" id="chunks-main-layout">
        
        {/* Top Quick Telemetry Summary Banner */}
        {(() => {
          const totalAnswered = responses.length;
          const highestCpd = responses.length > 0 ? Math.max(...responses.map(r => r.cpd_result || 0)) : 0;
          const redResponses = responses.filter(r => r.response_color?.toLowerCase() === 'red').length;
          const incompletePercentage = totalAnswered > 0 ? Math.round((redResponses / totalAnswered) * 100) : 0;

          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="chunks-top-telemetry-banner">
              
              {/* Total Answered */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Responses Answered</span>
                  <span className="text-2xl font-black text-slate-950 mt-1 block">{totalAnswered}</span>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Highest CPD */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Highest CPD Score</span>
                  <span className="text-2xl font-black text-red-600 mt-1 block">{highestCpd}</span>
                </div>
                <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
              </div>

              {/* % Incomplete */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Incomplete Rate</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-orange-600">{incompletePercentage}%</span>
                    <span className="text-[10px] font-bold text-slate-400">({redResponses} / {totalAnswered} RED)</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                  <BarChart2 className="w-5 h-5" />
                </div>
              </div>

            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Multi-Column Sticky Navigation Panel (Matching Reference Image) */}
          <aside className={`${isSidebarExpanded ? 'lg:col-span-3 xl:col-span-3' : 'lg:col-span-1 xl:col-span-1'} shrink-0 transition-all duration-300 w-full`} id="chunks-sidebar-container">
            <div className="flex flex-col sm:flex-row gap-3 lg:sticky lg:top-24 items-start w-full" id="chunks-sidebar-flex-row">
              
              {/* COLUMN 1: Narrow vertical Icon-only Rail (Visible ONLY when collapsed) */}
              {!isSidebarExpanded && (
                <div className="flex flex-row sm:flex-col items-center bg-white border border-neutral-200 rounded-2xl shadow-sm py-3 px-2.5 w-full sm:w-16 shrink-0 gap-4 justify-between sm:justify-start animate-in fade-in duration-200" id="column-1-icon-rail">
                  {/* Hamburger Toggle Button */}
                  <button
                    onClick={() => setIsSidebarExpanded(true)}
                    className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-all cursor-pointer shadow-xs"
                    title="Expand Sidebar"
                  >
                    <Menu className="w-4 h-4" />
                  </button>

                  <div className="hidden sm:block w-full border-t border-neutral-100" />

                  {/* Vertical Icons List */}
                  <nav className="flex flex-row sm:flex-col gap-2 w-auto sm:w-full items-center">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
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
                          
                          {/* Tooltip for collapsed mode */}
                          <div className="hidden sm:block absolute left-16 bg-neutral-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                             {item.label}
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                  
                  <div className="hidden sm:block w-full border-t border-neutral-100 pt-3 text-center">
                    <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-wider cursor-help" title="Live Supabase Active">
                      LIVE
                    </span>
                  </div>
                </div>
              )}

              {/* COLUMN 2: Expanded text labels with ChevronRight (displayed if expanded) */}
              {isSidebarExpanded && (
                <div className="flex-1 w-full bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm space-y-4 animate-in fade-in slide-in-from-left duration-200" id="column-2-text-details">
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
                          onClick={() => setActiveTab(item.id)}
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
          </aside>

          {/* Right Main Content Panel */}
          <div className={`${isSidebarExpanded ? 'lg:col-span-9 xl:col-span-9' : 'lg:col-span-11 xl:col-span-11'} transition-all duration-300 w-full`} id="chunks-tab-content">
            {activeTab === 'library' && (
              <LibraryTab
                useSandbox={useSandbox}
                courses={courses}
                lessons={lessons}
                sections={sections}
                resources={resources}
                cciCards={cciCards}
                cvrUnits={cvrUnits}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'simulator' && (
              <SimulatorTab
                useSandbox={useSandbox}
                courses={courses}
                lessons={lessons}
                sections={sections}
                resources={resources}
                cciCards={cciCards}
                cvrUnits={cvrUnits}
                rooms={rooms}
                onRefreshData={reloadDatabaseState}
              />
            )}

            {activeTab === 'learner' && (
              <LearnerTerminalTab
                useSandbox={useSandbox}
                resources={resources}
                cciCards={cciCards}
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
              />
            )}

            {activeTab === 'audio' && (
              <AudioGeneratorTab
                useSandbox={useSandbox}
                resources={resources}
                jobs={audioJobs}
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
                cciCards={cciCards}
                cvrUnits={cvrUnits}
                onRefreshData={reloadDatabaseState}
              />
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20 px-6 py-4 text-center text-xs text-slate-400">
        <span>&copy; {new Date().getFullYear()} CHUNKS Classroom Live response Engine. Persisted under formula: simple-v1.</span>
      </footer>

    </div>
  );
}
