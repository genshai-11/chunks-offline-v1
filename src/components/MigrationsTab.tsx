/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MIGRATIONS, Migration } from '../data/migrations';
import { getEnvCredentials, supabase, syncSandboxToSupabase } from '../lib/supabaseClient';
import { Copy, Check, Database, Server, Cpu, ShieldAlert, Sparkles, RefreshCw, UploadCloud } from 'lucide-react';

interface MigrationsTabProps {
  useSandbox: boolean;
  setUseSandbox: (val: boolean) => void;
  onRefreshData: () => void;
}

export default function MigrationsTab({ useSandbox, setUseSandbox, onRefreshData }: MigrationsTabProps) {
  const [selectedMigration, setSelectedMigration] = useState<Migration>(MIGRATIONS[0]);
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ url: '', key: '' });

  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    const creds = getEnvCredentials();
    setCredentials(creds);
    testSupabaseConnection();
  }, []);

  const handleSyncData = async () => {
    if (dbStatus !== 'connected') {
      alert("Please ensure your Supabase connection is healthy before syncing.");
      return;
    }
    if (!window.confirm("This will upload all core courses, lessons, sections, multipliers (CVR), and standard scoring cards (CCI) from your Local Sandbox to your live Supabase database. Any matching record IDs will be updated. Proceed?")) {
      return;
    }

    setSyncing(true);
    setSyncSuccess(null);
    setSyncLogs([]);

    const result = await syncSandboxToSupabase((msg) => {
      setSyncLogs(prev => [...prev, msg]);
    });

    setSyncing(false);
    setSyncSuccess(result.success);
    if (result.success) {
      onRefreshData();
    }
  };

  const testSupabaseConnection = async () => {
    setDbStatus('checking');
    try {
      // Just do a simple query to see if supabase is reachable and tables exist
      const { data, error } = await supabase.from('courses').select('id').limit(1);
      if (error) {
        // Table probably doesn't exist, but connection might be okay.
        // Let's check a generic query
        const { error: authError } = await supabase.auth.getSession();
        if (authError) {
          throw authError;
        }
        setDbStatus('connected');
        setDbError("Supabase connection is healthy! Note: 'courses' table not found. Please execute Migration #001 to create the tables.");
      } else {
        setDbStatus('connected');
        setDbError(null);
      }
    } catch (err: any) {
      setDbStatus('error');
      setDbError(err.message || "Failed to connect to Supabase. Check credentials.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedMigration.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="migrations-tab-container">
      {/* Sidebar - Migration list and Connection state */}
      <div className="lg:col-span-4 space-y-6">

        {/* Connection Monitor */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="connection-monitor">
          <h3 className="font-sans font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Supabase Connection Health
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Database Status:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                dbStatus === 'checking' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {dbStatus === 'connected' ? 'Connected' : dbStatus === 'checking' ? 'Checking...' : 'Configuration Error'}
              </span>
            </div>

            <div className="p-2 bg-slate-50 rounded border border-slate-100 font-mono text-[10px] break-all space-y-1">
              <div className="text-slate-400">URL: <span className="text-slate-600 font-medium">{credentials.url || 'Unconfigured'}</span></div>
              <div className="text-slate-400">Anon Key: <span className="text-slate-600 font-medium">{credentials.key ? `${credentials.key.substring(0, 16)}...` : 'Unconfigured'}</span></div>
            </div>

            {dbError && (
              <div className={`p-2.5 rounded text-[11px] leading-relaxed flex items-start gap-2 border ${
                dbStatus === 'connected' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{dbError}</span>
              </div>
            )}

            <button 
              onClick={testSupabaseConnection}
              className="w-full text-center py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 rounded font-medium text-slate-600 transition-colors"
            >
              Re-test Connection
            </button>
          </div>
        </div>

        {/* Sandbox-to-Supabase Data Syncer */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="data-syncer-card">
          <h3 className="font-sans font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            Sandbox to Supabase Data Sync
          </h3>

          <p className="text-xs text-slate-500 leading-normal mb-4">
            Push default sample courses, lessons, multiplier units (CVR), and oral evaluation standards (CCI) from your Local Sandbox into your live Supabase database.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleSyncData}
              disabled={syncing || dbStatus !== 'connected'}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-xs text-white transition-all ${
                dbStatus !== 'connected'
                  ? 'bg-slate-300 cursor-not-allowed'
                  : syncing
                  ? 'bg-emerald-700 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-sm hover:shadow-md'
              }`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Syncing Data...
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  Sync Sandbox Data to Supabase
                </>
              )}
            </button>

            {syncLogs.length > 0 && (
              <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 leading-relaxed max-h-[180px] overflow-y-auto space-y-1">
                {syncLogs.map((log, idx) => (
                  <div key={idx} className={
                    log.startsWith('✓') ? 'text-emerald-400 font-medium' :
                    log.startsWith('❌') ? 'text-red-400 font-bold' :
                    log.startsWith('🎉') ? 'text-cyan-400 font-bold border-t border-slate-800 pt-1 mt-1' :
                    'text-slate-400'
                  }>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Migrations Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs" id="migrations-timeline">
          <h3 className="font-sans font-semibold text-slate-800 text-sm mb-3">
            Schema Migrations Checklist
          </h3>
          <div className="space-y-1.5">
            {MIGRATIONS.map((m, idx) => (
              <button
                key={m.filename}
                onClick={() => setSelectedMigration(m)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  selectedMigration.filename === m.filename
                    ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-medium'
                    : 'hover:bg-slate-50 text-slate-600 border-l-4 border-transparent'
                }`}
              >
                <div className="truncate pr-2">
                  <span className="font-mono text-[10px] block text-slate-400">Step 00{idx + 1}</span>
                  <span className="truncate block font-medium">{m.title}</span>
                </div>
                <span className="font-mono text-[9px] text-slate-400 shrink-0">SQL</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor/Details */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex-1 flex flex-col shadow-xs min-h-[500px]" id="sql-preview-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono font-semibold uppercase tracking-wider">
                {selectedMigration.filename}
              </span>
              <h2 className="text-base font-sans font-semibold text-slate-800 mt-1">
                {selectedMigration.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-normal">
                {selectedMigration.description}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded text-xs font-semibold transition-colors self-start sm:self-center"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied SQL!" : "Copy SQL Script"}
            </button>
          </div>

          <div className="mt-4 flex-1 flex flex-col bg-slate-950 rounded-lg p-4 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-[10px] font-mono text-slate-400">
              <span>POSTGRESQL SCRIPT</span>
              <span>READ-ONLY PREVIEW</span>
            </div>
            
            <pre className="flex-1 overflow-auto text-slate-200 font-mono text-xs leading-relaxed max-h-[400px] whitespace-pre-wrap select-all">
              {selectedMigration.sql}
            </pre>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5" id="migrations-help">
          <h4 className="font-sans font-semibold text-emerald-900 text-xs flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            How to Deploy Schema on your Supabase Project
          </h4>
          <ol className="list-decimal list-inside text-xs text-emerald-800 space-y-1.5 leading-relaxed">
            <li>Open your **Supabase Dashboard** (e.g., at <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-[11px]">supabase.com</code>).</li>
            <li>Select your active project, navigate to the **SQL Editor** tab in the left sidebar, and click **New Query**.</li>
            <li>Copy the SQL scripts above sequentially (from **001** to **007**) and execute them by clicking **Run**.</li>
            <li>Navigate to **Storage**, create a new bucket named <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-[11px]">resource-audio</code>, and ensure it allows read permissions so clients can retrieve media resources.</li>
            <li>Switch this console to **Live Supabase Project** mode above to begin operations in production!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
