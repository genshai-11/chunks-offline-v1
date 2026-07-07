/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SentenceResource, AudioGenerationJob } from '../types';
import { SchemaHealthResult } from '../lib/schemaHealth';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { getShortSentenceCode } from '../lib/resourceCode';
import { 
  Volume2, RefreshCw, CheckCircle2, AlertCircle, Cpu, Play, Search, ShieldAlert, Sparkles, Plus, Check
} from 'lucide-react';

interface AudioGeneratorTabProps {
  useSandbox: boolean;
  resources: SentenceResource[];
  jobs: AudioGenerationJob[];
  schemaHealth: SchemaHealthResult | null;
  onRefreshData: () => void;
}

export default function AudioGeneratorTab({
  useSandbox,
  resources,
  jobs,
  schemaHealth,
  onRefreshData
}: AudioGeneratorTabProps) {
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  if (schemaHealth && !schemaHealth.ttsServiceAvailable) {
    return (
      <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-xs space-y-4" id="audio-schema-gap">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">TTS service is not available yet</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Audio generation expects Supabase Edge Function <code className="font-mono bg-amber-100 px-1 rounded">generate-resource-audio</code>
              and Storage bucket <code className="font-mono bg-amber-100 px-1 rounded">resource-audio</code>.
            </p>
            <p className="text-[10px] text-amber-700 mt-3 font-mono">Checked: {new Date(schemaHealth.checkedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredJobs = jobs.filter(j => {
    if (filterStatus === 'all') return true;
    return j.status === filterStatus;
  });

  const getResourcePrompt = (resId: string) => {
    const res = resources.find(r => r.id === resId);
    return res ? res.text_prompt : 'Unknown Sentence';
  };

  const getResourceCode = (resId: string) => {
    const res = resources.find(r => r.id === resId);
    return res ? getShortSentenceCode(res.sentence_code, res.order_index) : 'S000';
  };

  const getResourceText = (resId: string, lang: 'en' | 'vi') => {
    const res = resources.find(r => r.id === resId);
    if (!res) return '';
    return lang === 'en' ? res.text_en : res.text_vi;
  };

  // HTML5 Web Speech Synthesis Trigger as high-fidelity simulator for Edge Function TTS
  const speakSentence = (text: string, lang: 'en' | 'vi') => {
    if (!('speechSynthesis' in window)) {
      alert("Browser Speech Synthesis not supported in this environment.");
      return;
    }
    window.speechSynthesis.cancel(); // Cancel current playing voices
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'vi-VN';
    utterance.rate = 0.9; // clear pacing
    window.speechSynthesis.speak(utterance);
  };

  const handleProcessJob = async (job: AudioGenerationJob) => {
    setProcessingJobId(job.id);
    try {
      const sentenceText = getResourceText(job.resource_id, job.language);
      if (!sentenceText) {
        throw new Error("Target sentence text field is blank. Please enter target text in the Library.");
      }

      // Simulate API call and execute job
      // We encode speech parameters dynamically
      const utteranceBlobUrl = `speech-synth:${encodeURIComponent(sentenceText)}:${job.language}`;
      
      if (useSandbox) {
        await sandboxDb.executeAudioJob(job.id, utteranceBlobUrl);
        onRefreshData();
      } else {
        // Direct Supabase Implementation
        // 1. Update job to completed
        const { error: jobErr } = await supabase
          .from('audio_generation_jobs')
          .update({
            status: 'succeeded',
            public_url: utteranceBlobUrl,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
        if (jobErr) throw jobErr;

        // 2. Update sentence resource audio field
        const updateField = job.language === 'en' ? 'audio_en_url' : 'audio_vi_url';
        const { error: resErr } = await supabase
          .from('sentence_resources')
          .update({
            [updateField]: utteranceBlobUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.resource_id);
        if (resErr) throw resErr;

        onRefreshData();
      }
    } catch (err: any) {
      alert(`Job failed: ${err.message}`);
    } finally {
      setProcessingJobId(null);
    }
  };

  const handleRunAllQueued = async () => {
    const queuedJobs = jobs.filter(j => j.status === 'queued');
    if (queuedJobs.length === 0) {
      alert("No queued audio jobs found.");
      return;
    }

    for (const job of queuedJobs) {
      await handleProcessJob(job);
    }
  };

  return (
    <div className="space-y-6" id="audio-generator-tab">
      
      {/* 1. INTRO INFO */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div className="md:col-span-8 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-red-600" />
            Server-Side Audio Generation Workspace
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            In live production, sentence audio is generated through Supabase Edge Function <code className="font-mono bg-slate-100 text-slate-700 px-1 rounded">generate-resource-audio</code> and persisted to the <code className="font-mono bg-slate-100 text-slate-700 px-1 rounded">resource-audio</code> bucket. 
          </p>
          <div className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 inline-block">
            🔊 This console uses the HTML5 Web Speech Synthesis API to simulate correct multilingual pronunciation output!
          </div>
        </div>

        <div className="md:col-span-4 flex justify-end gap-2.5">
          <button
            onClick={handleRunAllQueued}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all"
          >
            Process All Queued ({jobs.filter(j => j.status === 'queued').length})
          </button>
        </div>
      </div>

      {/* 2. QUEUE MATRIX CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-sans font-semibold text-xs text-slate-400 uppercase tracking-wider">
            Job Execution Queue ({filteredJobs.length})
          </h3>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-1 border border-slate-200 bg-slate-50 rounded text-xs"
            >
              <option value="all">All Jobs</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Jobs List Grid */}
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic bg-slate-50/50">
              No audio generation jobs found in this queue. Navigate to the 'Library' tab to queue audio.
            </div>
          ) : (
            filteredJobs.map(job => {
              const resCode = getResourceCode(job.resource_id);
              const resPrompt = getResourcePrompt(job.resource_id);
              const targetText = getResourceText(job.resource_id, job.language);
              const isProcessing = processingJobId === job.id;

              return (
                <div key={job.id} className="p-4 border border-slate-200 bg-white hover:border-slate-300 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {resCode}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        job.language === 'en' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        Language: {job.language.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        job.status === 'succeeded' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'running' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        job.status === 'queued' ? 'bg-slate-100 text-slate-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-400">Challenge Prompt: <strong className="text-slate-600 font-medium">“{resPrompt}”</strong></p>
                      <p className="text-slate-700 font-semibold">Target output: <span className="font-mono bg-slate-50 px-1 rounded">{targetText || 'None Defined'}</span></p>
                      <p className="font-mono text-[9px] text-slate-400 break-all">Path: {job.storage_path}</p>
                    </div>

                    {job.error_message && (
                      <span className="text-[10px] text-red-600 block bg-red-50 p-1 rounded font-mono">Error: {job.error_message}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {job.status === 'succeeded' && job.public_url && (
                      <button
                        onClick={() => speakSentence(targetText, job.language)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                        title="Play Synthesized Voice"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}

                    {job.status === 'queued' && (
                      <button
                        onClick={() => handleProcessJob(job)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white font-bold rounded text-xs transition-all flex items-center gap-1.5"
                      >
                        {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Process Job
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
