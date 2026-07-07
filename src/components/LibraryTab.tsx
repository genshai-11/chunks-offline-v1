/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Course, Lesson, LessonSection, SentenceResource, CCIStandardCard, CVRUnit } from '../types';
import { sandboxDb, supabase } from '../lib/supabaseClient';
import { checkResourceAudioExists, resolveResourceAudioUrl } from '../lib/audioUrl';
import { generateResourceAudio } from '../lib/ttsService';
import { getShortSentenceCode } from '../lib/resourceCode';
import { 
  Plus, Check, Play, Edit2, Trash2, Globe, FileText, 
  Volume2, Sliders, Hash, Shield, RefreshCw, AlertCircle,
  BookOpen, GraduationCap, Layers, Mic, BarChart3, LayoutGrid, List as ListIcon,
  ChevronDown, ChevronUp
} from 'lucide-react';

interface LibraryTabProps {
  useSandbox: boolean;
  courses: Course[];
  lessons: Lesson[];
  sections: LessonSection[];
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
  cvrUnits: CVRUnit[];
  onRefreshData: () => void;
}

export default function LibraryTab({
  useSandbox,
  courses,
  lessons,
  sections,
  resources,
  cciCards,
  cvrUnits,
  onRefreshData
}: LibraryTabProps) {
  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<'resources' | 'standards'>('resources');
  
  // Selection filters for resources
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [audioFilter, setAudioFilter] = useState<'all' | 'missing_en' | 'missing_vi' | 'missing_any' | 'has_both'>('all');

  // Bulk resource actions
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [bulkCvrValue, setBulkCvrValue] = useState<number>(1);
  const [bulkCvrBusy, setBulkCvrBusy] = useState(false);
  const [bulkTtsBusy, setBulkTtsBusy] = useState(false);
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');

  // View style & Audio states
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  // Guide expand/collapse state (default to hide)
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  // Reset pagination on filter or view mode change or itemsPerPage change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedResourceIds([]);
    setBulkActionStatus('');
  }, [selectedCourseId, selectedLessonId, selectedSectionId, audioFilter, viewMode, itemsPerPage]);

  // Automatically sync/validate selections when data lists update (e.g., useSandbox / database source changes)
  useEffect(() => {
    if (courses.length > 0) {
      const courseExists = courses.some(c => c.id === selectedCourseId);
      if (!courseExists || !selectedCourseId) {
        setSelectedCourseId(courses[0].id);
        setSelectedLessonId('');
        setSelectedSectionId('');
      }
    } else {
      setSelectedCourseId('');
      setSelectedLessonId('');
      setSelectedSectionId('');
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    const validLessons = lessons.filter(l => l.course_id === selectedCourseId);
    if (validLessons.length > 0) {
      const lessonExists = validLessons.some(l => l.id === selectedLessonId);
      if (!lessonExists && selectedLessonId) {
        setSelectedLessonId('');
        setSelectedSectionId('');
      }
    } else {
      setSelectedLessonId('');
      setSelectedSectionId('');
    }
  }, [lessons, selectedCourseId, selectedLessonId]);

  useEffect(() => {
    const activeLesson = selectedLessonId || (lessons.filter(l => l.course_id === selectedCourseId)[0]?.id || '');
    const validSections = sections.filter(s => s.lesson_id === activeLesson);
    if (validSections.length > 0) {
      const sectionExists = validSections.some(s => s.id === selectedSectionId);
      if (!sectionExists && selectedSectionId) {
        setSelectedSectionId('');
      }
    } else {
      setSelectedSectionId('');
    }
  }, [sections, selectedLessonId, selectedCourseId, lessons, selectedSectionId]);

  const clearBrokenAudioReference = async (url: string, key: string) => {
    if (useSandbox) return;

    const [resourceId, lang] = key.split('_');
    const audioField = lang === 'vi' ? 'audio_vi_url' : lang === 'en' ? 'audio_en_url' : null;
    if (!resourceId || !audioField) return;

    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    const currentValue = audioField === 'audio_vi_url' ? resource.audio_vi_url : resource.audio_en_url;
    if (currentValue !== url) return;

    await supabase
      .from('sentence_resources')
      .update({
        [audioField]: null,
        audio_url: resource.audio_url === url ? null : resource.audio_url,
        audio_variants: resource.audio_variants || {},
        updated_at: new Date().toISOString()
      })
      .eq('id', resourceId);

    onRefreshData();
  };

  const playAudio = async (url: string, key: string) => {
    if (activeAudio) {
      activeAudio.pause();
      if (currentlyPlaying === key) {
        setCurrentlyPlaying(null);
        setActiveAudio(null);
        return;
      }
    }

    const playableUrl = resolveResourceAudioUrl(url);
    if (!playableUrl) return;

    const exists = await checkResourceAudioExists(url);
    if (exists === false) {
      await clearBrokenAudioReference(url, key);
      alert('Audio file is missing in Supabase Storage. Please generate this audio again.');
      setCurrentlyPlaying(null);
      setActiveAudio(null);
      return;
    }

    const audio = new Audio(playableUrl);
    audio.preload = 'auto';
    audio.onended = () => {
      setCurrentlyPlaying(null);
      setActiveAudio(null);
    };
    audio.onerror = async () => {
      console.error('Audio source failed to load:', { originalUrl: url, playableUrl });
      await clearBrokenAudioReference(url, key);
      setCurrentlyPlaying(null);
      setActiveAudio(null);
    };
    audio.play().catch(async err => {
      console.error('Audio playback error:', err, { originalUrl: url, playableUrl });
      await clearBrokenAudioReference(url, key);
      setCurrentlyPlaying(null);
      setActiveAudio(null);
    });
    setActiveAudio(audio);
    setCurrentlyPlaying(key);
  };

  // Editing state for Sentence Resource
  const [showAddResource, setShowAddResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  
  // Resource Form Fields
  const [resCode, setResCode] = useState('');
  const [resPrompt, setResPrompt] = useState('');
  const [resEn, setResEn] = useState('');
  const [resVi, setResVi] = useState('');
  const [resCvr, setResCvr] = useState(1.0);
  const [resStatus, setResStatus] = useState<'draft' | 'approved' | 'archived'>('draft');
  const [resSectionId, setResSectionId] = useState('');

  // Editing states for CCI / CVR
  const [newCciLabel, setNewCciLabel] = useState('');
  const [newCciValue, setNewCciValue] = useState(10);
  const [newCciCategory, setNewCciCategory] = useState('pronunciation');

  const [editingCciId, setEditingCciId] = useState<string | null>(null);
  const [editCciLabel, setEditCciLabel] = useState('');
  const [editCciValue, setEditCciValue] = useState(10);
  const [editCciCategory, setEditCciCategory] = useState('pronunciation');

  const [newCvrLabel, setNewCvrLabel] = useState('');
  const [newCvrSymbol, setNewCvrSymbol] = useState('Ω');
  const [newCvrValue, setNewCvrValue] = useState(1.0);

  const [editingCvrId, setEditingCvrId] = useState<string | null>(null);
  const [editCvrLabel, setEditCvrLabel] = useState('');
  const [editCvrSymbol, setEditCvrSymbol] = useState('Ω');
  const [editCvrValue, setEditCvrValue] = useState(1.0);

  // Active filter helper
  const filteredLessons = lessons.filter(l => l.course_id === selectedCourseId);
  const activeLessonId = selectedLessonId || filteredLessons[0]?.id || '';
  const filteredSections = sections.filter(s => s.lesson_id === activeLessonId);
  
  const filteredResources = resources.filter(r => {
    const matchCourse = r.course_id === selectedCourseId;
    const matchLesson = r.lesson_id === activeLessonId;
    const matchSection = selectedSectionId ? r.section_id === selectedSectionId : true;
    
    let matchAudio = true;
    if (audioFilter === 'missing_en') {
      matchAudio = !r.audio_en_url;
    } else if (audioFilter === 'missing_vi') {
      matchAudio = !r.audio_vi_url;
    } else if (audioFilter === 'missing_any') {
      matchAudio = !r.audio_en_url || !r.audio_vi_url;
    } else if (audioFilter === 'has_both') {
      matchAudio = !!r.audio_en_url && !!r.audio_vi_url;
    }
    
    return matchCourse && matchLesson && matchSection && matchAudio;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResources = filteredResources.slice(startIndex, startIndex + itemsPerPage);
  const selectedResources = resources.filter(r => selectedResourceIds.includes(r.id));
  const pageResourceIds = paginatedResources.map(r => r.id);
  const allPageSelected = pageResourceIds.length > 0 && pageResourceIds.every(id => selectedResourceIds.includes(id));

  const toggleResourceSelection = (resourceId: string) => {
    setSelectedResourceIds(prev => prev.includes(resourceId) ? prev.filter(id => id !== resourceId) : [...prev, resourceId]);
  };

  const toggleCurrentPageSelection = () => {
    setSelectedResourceIds(prev => {
      if (allPageSelected) return prev.filter(id => !pageResourceIds.includes(id));
      return [...new Set([...prev, ...pageResourceIds])];
    });
  };

  const selectAllFilteredResources = () => {
    setSelectedResourceIds(filteredResources.map(r => r.id));
  };

  const handleBulkUpdateCvr = async () => {
    if (selectedResourceIds.length === 0) return alert('Select at least one resource first.');
    const nextCvr = Number(bulkCvrValue);
    if (!Number.isFinite(nextCvr) || nextCvr <= 0) return alert('CVR must be a positive number.');
    if (!window.confirm(`Update CVR Ω to ${nextCvr} for ${selectedResourceIds.length} selected resources?`)) return;

    setBulkCvrBusy(true);
    setBulkActionStatus('Updating CVR values...');
    try {
      if (useSandbox) {
        sandboxDb.sentenceResources = sandboxDb.sentenceResources.map(r =>
          selectedResourceIds.includes(r.id)
            ? { ...r, cvr_value: nextCvr, default_cvr_value: nextCvr, updated_at: new Date().toISOString() }
            : r
        );
      } else {
        const { error } = await supabase
          .from('sentence_resources')
          .update({ cvr_value: nextCvr, default_cvr_value: nextCvr, updated_at: new Date().toISOString() })
          .in('id', selectedResourceIds);
        if (error) throw error;
      }
      setBulkActionStatus(`Updated CVR Ω=${nextCvr} for ${selectedResourceIds.length} resources.`);
      onRefreshData();
    } catch (err: any) {
      setBulkActionStatus('CVR update failed: ' + (err.message || String(err)));
      alert('Failed to update CVR: ' + (err.message || String(err)));
    } finally {
      setBulkCvrBusy(false);
    }
  };

  const handleBulkGenerateMissingAudio = async (mode: 'en' | 'vi' | 'both') => {
    if (selectedResourceIds.length === 0) return alert('Select at least one resource first.');
    const targets: Array<{ resource: SentenceResource; lang: 'en' | 'vi' }> = [];
    selectedResources.forEach(resource => {
      if ((mode === 'en' || mode === 'both') && !resource.audio_en_url) targets.push({ resource, lang: 'en' });
      if ((mode === 'vi' || mode === 'both') && !resource.audio_vi_url) targets.push({ resource, lang: 'vi' });
    });

    if (targets.length === 0) {
      setBulkActionStatus('Selected resources already have the requested audio tracks.');
      return;
    }
    if (!window.confirm(`Generate ${targets.length} missing TTS tracks via Supabase Edge Function generate-resource-audio?`)) return;

    setBulkTtsBusy(true);
    let ok = 0;
    const failures: string[] = [];
    try {
      for (const target of targets) {
        setBulkActionStatus(`Generating ${target.lang.toUpperCase()} audio ${ok + failures.length + 1}/${targets.length}: ${getShortSentenceCode(target.resource.sentence_code, target.resource.order_index)}`);
        try {
          if (useSandbox) {
            sandboxDb.queueAudioJob(target.resource.id, target.lang, 'Admin Operator');
          } else {
            await generateResourceAudio(target.resource, target.lang);
          }
          ok += 1;
        } catch (err: any) {
          failures.push(`${getShortSentenceCode(target.resource.sentence_code, target.resource.order_index)} ${target.lang.toUpperCase()}: ${err.message || String(err)}`);
        }
      }
      setBulkActionStatus(`TTS complete: ${ok}/${targets.length} generated${failures.length ? `, ${failures.length} failed` : ''}.`);
      if (failures.length) console.warn('Bulk TTS failures:', failures);
      onRefreshData();
      if (failures.length) alert('Some TTS generations failed:\n' + failures.slice(0, 6).join('\n'));
    } finally {
      setBulkTtsBusy(false);
    }
  };

  // Handle resource submission
  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resCode.trim()) return alert("Sentence code is required");

    if (useSandbox) {
      const items = sandboxDb.sentenceResources;
      if (editingResourceId) {
        // Edit existing
        const idx = items.findIndex(r => r.id === editingResourceId);
        if (idx !== -1) {
          items[idx] = {
            ...items[idx],
            sentence_code: resCode.trim(),
            text_prompt: resPrompt.trim(),
            text_en: resEn.trim(),
            text_vi: resVi.trim(),
            cvr_value: Number(resCvr),
            approval_status: resStatus,
            section_id: resSectionId || null,
            updated_at: new Date().toISOString()
          };
        }
      } else {
        // Add new
        const newRes: SentenceResource = {
          id: "r_" + crypto.randomUUID().substring(0, 8),
          course_id: selectedCourseId,
          lesson_id: activeLessonId,
          section_id: resSectionId || null,
          sentence_code: resCode.trim().toUpperCase(),
          text_prompt: resPrompt.trim(),
          text_en: resEn.trim(),
          text_vi: resVi.trim(),
          audio_url: null,
          audio_en_url: null,
          audio_vi_url: null,
          audio_variants: {},
          default_cvr_unit_id: null,
          default_cvr_value: Number(resCvr),
          cvr_value: Number(resCvr),
          order_index: items.length + 1,
          approval_status: resStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        items.push(newRes);
      }
      sandboxDb.sentenceResources = items;
      onRefreshData();
      resetResourceForm();
    } else {
      // Direct Supabase Implementation
      const resourceData = {
        course_id: selectedCourseId,
        lesson_id: activeLessonId,
        section_id: resSectionId || null,
        sentence_code: resCode.trim().toUpperCase(),
        text_prompt: resPrompt.trim(),
        text_en: resEn.trim(),
        text_vi: resVi.trim(),
        cvr_value: Number(resCvr),
        approval_status: resStatus,
        updated_at: new Date().toISOString()
      };

      const executeSave = async () => {
        try {
          if (editingResourceId) {
            const { error } = await supabase
              .from('sentence_resources')
              .update(resourceData)
              .eq('id', editingResourceId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('sentence_resources')
              .insert([{
                ...resourceData,
                id: crypto.randomUUID(),
                audio_variants: {},
                default_cvr_value: Number(resCvr),
                order_index: resources.length + 1,
                created_at: new Date().toISOString()
              }]);
            if (error) throw error;
          }
          onRefreshData();
          resetResourceForm();
        } catch (err: any) {
          alert("Failed to save to Supabase: " + err.message);
        }
      };
      executeSave();
    }
  };

  const resetResourceForm = () => {
    setShowAddResource(false);
    setEditingResourceId(null);
    setResCode('');
    setResPrompt('');
    setResEn('');
    setResVi('');
    setResCvr(1.0);
    setResStatus('draft');
    setResSectionId('');
  };

  const handleEditResourceClick = (r: SentenceResource) => {
    setEditingResourceId(r.id);
    setResCode(r.sentence_code);
    setResPrompt(r.text_prompt || '');
    setResEn(r.text_en || '');
    setResVi(r.text_vi || '');
    setResCvr(r.cvr_value);
    setResStatus(r.approval_status);
    setResSectionId(r.section_id || '');
    setShowAddResource(true);
  };

  const handleDeleteResource = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this sentence resource?")) return;
    if (useSandbox) {
      sandboxDb.sentenceResources = sandboxDb.sentenceResources.filter(r => r.id !== id);
      onRefreshData();
    } else {
      const executeDelete = async () => {
        try {
          const { error } = await supabase
            .from('sentence_resources')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefreshData();
        } catch (err: any) {
          alert("Failed to delete from Supabase: " + err.message);
        }
      };
      executeDelete();
    }
  };

  // Save standard card (create or edit)
  const handleSaveCci = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingCciId;
    const labelToSave = isEdit ? editCciLabel : newCciLabel;
    const valueToSave = isEdit ? editCciValue : newCciValue;
    const categoryToSave = isEdit ? editCciCategory : newCciCategory;

    if (!labelToSave.trim()) return;

    if (useSandbox) {
      let cards = [...sandboxDb.cciStandardCards];
      if (isEdit) {
        cards = cards.map(c => c.id === editingCciId ? {
          ...c,
          label: labelToSave.trim(),
          standard_value: Number(valueToSave),
          category_id: categoryToSave,
          updated_at: new Date().toISOString()
        } : c);
      } else {
        cards.push({
          id: "card_" + crypto.randomUUID().substring(0, 8),
          category_id: categoryToSave,
          label: labelToSave.trim(),
          standard_value: Number(valueToSave),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      sandboxDb.cciStandardCards = cards;
      setNewCciLabel('');
      setNewCciValue(10);
      setEditingCciId(null);
      onRefreshData();
    } else {
      const executeSaveCci = async () => {
        try {
          if (isEdit) {
            const { error } = await supabase
              .from('cci_standard_cards')
              .update({
                label: labelToSave.trim(),
                standard_value: Number(valueToSave),
                category_id: categoryToSave,
                updated_at: new Date().toISOString()
              })
              .eq('id', editingCciId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('cci_standard_cards')
              .insert([{
                id: crypto.randomUUID(),
                category_id: categoryToSave,
                label: labelToSave.trim(),
                standard_value: Number(valueToSave),
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            if (error) throw error;
          }
          setNewCciLabel('');
          setNewCciValue(10);
          setEditingCciId(null);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to save standard to Supabase: " + err.message);
        }
      };
      executeSaveCci();
    }
  };

  const handleDeleteCci = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this CCI standard card?")) return;
    if (useSandbox) {
      sandboxDb.cciStandardCards = sandboxDb.cciStandardCards.filter(c => c.id !== id);
      onRefreshData();
    } else {
      const executeDelete = async () => {
        try {
          const { error } = await supabase
            .from('cci_standard_cards')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefreshData();
        } catch (err: any) {
          alert("Failed to delete CCI standard: " + err.message);
        }
      };
      executeDelete();
    }
  };

  // Save CVR unit multiplier (create or edit)
  const handleSaveCvr = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingCvrId;
    const labelToSave = isEdit ? editCvrLabel : newCvrLabel;
    const symbolToSave = isEdit ? editCvrSymbol : newCvrSymbol;
    const valueToSave = isEdit ? editCvrValue : newCvrValue;

    if (!labelToSave.trim()) return;

    if (useSandbox) {
      let units = [...sandboxDb.cvrUnits];
      if (isEdit) {
        units = units.map(u => u.id === editingCvrId ? {
          ...u,
          label: labelToSave.trim(),
          unit_symbol: symbolToSave.trim(),
          value: Number(valueToSave),
          updated_at: new Date().toISOString()
        } : u);
      } else {
        units.push({
          id: "unit_" + crypto.randomUUID().substring(0, 8),
          label: labelToSave.trim(),
          unit_symbol: symbolToSave.trim(),
          value: Number(valueToSave),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      sandboxDb.cvrUnits = units;
      setNewCvrLabel('');
      setNewCvrSymbol('Ω');
      setNewCvrValue(1.0);
      setEditingCvrId(null);
      onRefreshData();
    } else {
      const executeSaveCvr = async () => {
        try {
          if (isEdit) {
            const { error } = await supabase
              .from('cvr_units')
              .update({
                label: labelToSave.trim(),
                unit_symbol: symbolToSave.trim(),
                value: Number(valueToSave),
                updated_at: new Date().toISOString()
              })
              .eq('id', editingCvrId);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('cvr_units')
              .insert([{
                id: crypto.randomUUID(),
                label: labelToSave.trim(),
                unit_symbol: symbolToSave.trim(),
                value: Number(valueToSave),
                active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
            if (error) throw error;
          }
          setNewCvrLabel('');
          setNewCvrSymbol('Ω');
          setNewCvrValue(1.0);
          setEditingCvrId(null);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to save CVR unit to Supabase: " + err.message);
        }
      };
      executeSaveCvr();
    }
  };

  const handleDeleteCvr = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this CVR multiplier unit?")) return;
    if (useSandbox) {
      sandboxDb.cvrUnits = sandboxDb.cvrUnits.filter(u => u.id !== id);
      onRefreshData();
    } else {
      const executeDelete = async () => {
        try {
          const { error } = await supabase
            .from('cvr_units')
            .delete()
            .eq('id', id);
          if (error) throw error;
          onRefreshData();
        } catch (err: any) {
          alert("Failed to delete CVR unit: " + err.message);
        }
      };
      executeDelete();
    }
  };

  // Queue missing audio job
  const handleQueueAudio = (resourceId: string, lang: 'en' | 'vi') => {
    if (useSandbox) {
      try {
        sandboxDb.queueAudioJob(resourceId, lang, "Admin Operator");
        alert(`Queued Text-To-Speech audio job for language [${lang.toUpperCase()}]! Navigate to the 'Audio Generator' tab to run or process the job queue.`);
        onRefreshData();
      } catch (err: any) {
        alert(err.message);
      }
    } else {
      const executeGenerateAudio = async () => {
        try {
          const resource = resources.find(r => r.id === resourceId);
          if (!resource) throw new Error("Sentence resource not found");
          const result = await generateResourceAudio(resource, lang);
          alert(`Generated ${lang.toUpperCase()} audio via Supabase Edge Function generate-resource-audio.\n${result.publicUrl || result.storagePath}`);
          onRefreshData();
        } catch (err: any) {
          alert("Failed to generate live audio: " + (err.message || String(err)));
        }
      };
      executeGenerateAudio();
    }
  };

  return (
    <div className="space-y-6" id="library-tab">
      
      {/* Sub tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('resources')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === 'resources' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sentence Library & Prompts
        </button>
        <button
          onClick={() => setActiveSubTab('standards')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSubTab === 'standards' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Scoring Standards (CCI & CVR Ω)
        </button>
      </div>



      {activeSubTab === 'resources' ? (
        <div className="space-y-6">
          
          {/* Horizontal Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs animate-in fade-in duration-200" id="library-filters-container">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Course Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-red-500" />
                  Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => {
                    setSelectedCourseId(e.target.value);
                    setSelectedLessonId('');
                    setSelectedSectionId('');
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* Lesson Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-red-500" />
                  Lesson
                </label>
                <select
                  value={activeLessonId}
                  onChange={(e) => {
                    setSelectedLessonId(e.target.value);
                    setSelectedSectionId('');
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
                >
                  {filteredLessons.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>

              {/* Section Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-500" />
                  Section Topic
                </label>
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
                >
                  <option value="">All Sections</option>
                  {filteredSections.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {/* Audio Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-red-500" />
                  Audio Recordings
                </label>
                <select
                  value={audioFilter}
                  onChange={(e: any) => setAudioFilter(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-500 font-medium text-slate-700"
                >
                  <option value="all">All Audio States</option>
                  <option value="missing_any">⚠️ Missing Any Audio (EN/VI)</option>
                  <option value="missing_en">🇬🇧 Missing English Audio</option>
                  <option value="missing_vi">🇻🇳 Missing Vietnamese Audio</option>
                  <option value="has_both">✅ Has Both Audio Tracks</option>
                </select>
              </div>

            </div>

            {/* Quick Stats Integrated cleanly */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-3.5 border-t border-slate-100 text-[11px] text-slate-500">
              <span className="font-semibold flex items-center gap-1.5 text-slate-400 uppercase tracking-wider text-[9px]">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" /> Stats:
              </span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">
                Total: <strong className="font-semibold text-slate-800">{resources.length}</strong>
              </span>
              <span className="bg-red-50 px-2.5 py-1 rounded-full text-red-700">
                Filtered: <strong className="font-semibold">{filteredResources.length}</strong>
              </span>
              <span className="bg-blue-50 px-2.5 py-1 rounded-full text-blue-700">
                Approved: <strong className="font-semibold">{filteredResources.filter(r => r.approval_status === 'approved').length}</strong>
              </span>
            </div>

          </div>

          {/* Full-Width Sentences List & Editor */}
          <div className="space-y-6">
            
            {/* Header controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-bold text-slate-800">
                  List Resources ({filteredResources.length})
                </h2>
                {/* Toggle List / Card View */}
                <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/50">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      viewMode === 'card'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/20'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/20'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                    List
                  </button>
                </div>
              </div>
              
              {/* Pagination Controls inside the header controls line */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:justify-end ml-auto md:ml-0">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-xs">
                  <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">Rows:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="text-[10px] sm:text-[11px] font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1"
                  >
                    <option value={8}>8</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {filteredResources.length > itemsPerPage && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredResources.length)} of {filteredResources.length}
                    </span>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs bg-white" aria-label="Pagination">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md p-1.5 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      {(() => {
                        const maxButtons = 5;
                        let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                        let end = Math.min(totalPages, start + maxButtons - 1);
                        if (end - start + 1 < maxButtons) {
                          start = Math.max(1, end - maxButtons + 1);
                        }
                        const buttons = [];
                        for (let i = start; i <= end; i++) {
                          if (i >= 1 && i <= totalPages) {
                            buttons.push(i);
                          }
                        }
                        return buttons.map(page => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            aria-current={currentPage === page ? "page" : undefined}
                            className={`relative inline-flex items-center px-2 py-1 text-[11px] font-bold focus:z-20 ${
                              currentPage === page
                                ? 'z-10 bg-red-600 text-white focus-visible:outline focus-visible:outline-2'
                                : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        ));
                      })()}

                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md p-1.5 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}

                {useSandbox && !showAddResource && (
                  <button
                    onClick={() => setShowAddResource(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded text-xs font-semibold transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Sentence
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Resource Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Selected resources: {selectedResourceIds.length}</span>
                    <button
                      type="button"
                      onClick={toggleCurrentPageSelection}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors"
                    >
                      {allPageSelected ? 'Unselect Page' : 'Select Page'}
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFilteredResources}
                      disabled={filteredResources.length === 0}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded text-[10px] font-bold transition-colors"
                    >
                      Select All Filtered ({filteredResources.length})
                    </button>
                    {selectedResourceIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedResourceIds([])}
                        className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Bulk tools update live Supabase rows only after confirmation. TTS uses Edge Function <strong>generate-resource-audio</strong> and will ask for the TTS admin PIN if not cached.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Set CVR Ω</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={bulkCvrValue}
                      onChange={(e) => setBulkCvrValue(Number(e.target.value))}
                      className="w-20 text-xs p-1 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleBulkUpdateCvr}
                      disabled={bulkCvrBusy || selectedResourceIds.length === 0}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded text-[10px] font-bold transition-colors"
                    >
                      {bulkCvrBusy ? 'Saving...' : 'Apply'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBulkGenerateMissingAudio('en')}
                    disabled={bulkTtsBusy || selectedResourceIds.length === 0}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold transition-colors"
                  >
                    Generate Missing EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkGenerateMissingAudio('vi')}
                    disabled={bulkTtsBusy || selectedResourceIds.length === 0}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold transition-colors"
                  >
                    Generate Missing VI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkGenerateMissingAudio('both')}
                    disabled={bulkTtsBusy || selectedResourceIds.length === 0}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white rounded text-[10px] font-bold transition-colors"
                  >
                    {bulkTtsBusy ? 'Generating...' : 'Generate Missing Both'}
                  </button>
                </div>
              </div>
              {bulkActionStatus && (
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 font-medium">
                  {bulkActionStatus}
                </div>
              )}
            </div>

            {/* Add / Edit Form */}
            {showAddResource && (
              <form onSubmit={handleSaveResource} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-sans font-semibold text-xs text-slate-800">
                    {editingResourceId ? `Edit Sentence resource: ${resCode}` : "Create New Sentence Prompt"}
                  </h3>
                  <button 
                    type="button" 
                    onClick={resetResourceForm}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">SENTENCE CODE</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A-004"
                      value={resCode}
                      onChange={(e) => setResCode(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">CVR Ω MULTIPLIER</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={resCvr}
                      onChange={(e) => setResCvr(Number(e.target.value))}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">APPROVAL STATUS</label>
                    <select
                      value={resStatus}
                      onChange={(e: any) => setResStatus(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="draft">Draft (Invisible to Teacher Setup)</option>
                      <option value="approved">Approved (Launch-Ready)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">ASSIGN TO SECTION</label>
                  <select
                    value={resSectionId}
                    onChange={(e) => setResSectionId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="">No Section (General Lesson Prompt)</option>
                    {filteredSections.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">TEXT PROMPT (TEACHER CHALLENGE)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tell the receptionist you want to check in"
                    value={resPrompt}
                    onChange={(e) => setResPrompt(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">ENGLISH SOURCE (EN_TEXT)</label>
                    <textarea 
                      placeholder="English target output..."
                      value={resEn}
                      onChange={(e) => setResEn(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">VIETNAMESE TRANS (VI_TEXT)</label>
                    <textarea 
                      placeholder="Vietnamese explanation..."
                      value={resVi}
                      onChange={(e) => setResVi(e.target.value)}
                      rows={2}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={resetResourceForm}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded text-xs font-semibold"
                  >
                    Save Sentence
                  </button>
                </div>
              </form>
            )}

            {/* List or Card Resource Display */}
            {viewMode === 'list' ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-in fade-in duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={toggleCurrentPageSelection}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            aria-label="Select all resources on current page"
                          />
                        </th>
                        <th className="py-3 px-4 w-12 text-center">STT</th>
                        <th className="py-3 px-4 w-44">COURSE / LESSON</th>
                        <th className="py-3 px-4">CONTENT / TRANSLATION</th>
                        <th className="py-3 px-4 w-28 text-center">METRICS</th>
                        <th className="py-3 px-4 w-52">AUDIO PLAYBACK</th>
                        {useSandbox && <th className="py-3 px-4 w-20 text-right">ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredResources.length === 0 ? (
                        <tr>
                          <td colSpan={useSandbox ? 7 : 6} className="text-center py-12 text-slate-400 italic">
                            No resources found.
                          </td>
                        </tr>
                      ) : (
                        paginatedResources.map((r, idx) => (
                          <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${selectedResourceIds.includes(r.id) ? 'bg-red-50/30' : ''}`}>
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={selectedResourceIds.includes(r.id)}
                                onChange={() => toggleResourceSelection(r.id)}
                                className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                                aria-label={`Select resource ${r.sentence_code}`}
                              />
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                              #{startIndex + idx + 1}
                            </td>
                            <td className="py-3.5 px-4 space-y-0.5">
                              {(() => {
                                const course = courses.find(c => c.id === r.course_id);
                                const lesson = lessons.find(l => l.id === r.lesson_id);
                                return (
                                  <>
                                    <div className="text-[11px] font-bold text-slate-800 truncate max-w-[170px]" title={course?.title || 'Unknown Course'}>
                                      📚 {course?.title || 'Unknown Course'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[170px]" title={lesson?.title || 'Unknown Lesson'}>
                                      📖 {lesson?.title || 'Unknown Lesson'}
                                    </div>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="py-3.5 px-4 space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="px-1 bg-blue-50 text-blue-600 rounded text-[9px] font-bold mt-0.5 shrink-0">EN</span>
                                <span className="text-slate-800 font-medium leading-normal">{r.text_en || <span className="text-slate-400 italic">None</span>}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="px-1 bg-red-50 text-red-600 rounded text-[9px] font-bold mt-0.5 shrink-0">VI</span>
                                <span className="text-slate-500 leading-normal">{r.text_vi || <span className="text-slate-400 italic">None</span>}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold font-mono border border-indigo-100">
                                  Ω {r.cvr_value}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 space-y-1.5">
                              {/* EN Audio Button */}
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium text-[10px] tracking-wider uppercase font-mono mr-1">EN:</span>
                                {r.audio_en_url ? (
                                  <button 
                                    type="button"
                                    onClick={() => playAudio(r.audio_en_url!, r.id + '_en')}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all w-32 justify-center ${
                                      currentlyPlaying === r.id + '_en' 
                                        ? 'bg-red-500 text-white animate-pulse' 
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                                    }`}
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    {currentlyPlaying === r.id + '_en' ? 'Playing' : 'Ready (Play)'}
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => handleQueueAudio(r.id, 'en')}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold transition-colors w-32 text-center"
                                  >
                                    + Generate
                                  </button>
                                )}
                              </div>

                              {/* VI Audio Button */}
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium text-[10px] tracking-wider uppercase font-mono mr-1">VI:</span>
                                {r.audio_vi_url ? (
                                  <button 
                                    type="button"
                                    onClick={() => playAudio(r.audio_vi_url!, r.id + '_vi')}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all w-32 justify-center ${
                                      currentlyPlaying === r.id + '_vi' 
                                        ? 'bg-red-500 text-white animate-pulse' 
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
                                    }`}
                                  >
                                    <Volume2 className="w-3 h-3" />
                                    {currentlyPlaying === r.id + '_vi' ? 'Playing' : 'Ready (Play)'}
                                  </button>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => handleQueueAudio(r.id, 'vi')}
                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold transition-colors w-32 text-center"
                                  >
                                    + Generate
                                  </button>
                                )}
                              </div>
                            </td>
                            {useSandbox && (
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditResourceClick(r)}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                    title="Edit Sentence"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResource(r.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Sentence"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                {filteredResources.length === 0 ? (
                  <div className="col-span-2 text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 text-xs">
                    No sentence resources found in this lesson / section. Create some to start.
                  </div>
                ) : (
                  paginatedResources.map((r, idx) => (
                    <div key={r.id} className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[180px] ${selectedResourceIds.includes(r.id) ? 'border-red-300 ring-1 ring-red-100 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div>
                        {/* Top: English and Vietnamese text block with STT index */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedResourceIds.includes(r.id)}
                              onChange={() => toggleResourceSelection(r.id)}
                              className="mt-1 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0"
                              aria-label={`Select resource ${r.sentence_code}`}
                            />
                            <div className="space-y-2 flex-1">
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-extrabold mt-0.5 shrink-0">EN</span>
                              <span className="text-slate-800 font-bold leading-relaxed text-[13px]">{r.text_en || 'None'}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-extrabold mt-0.5 shrink-0">VI</span>
                              <span className="text-slate-500 font-semibold leading-relaxed text-[12px]">{r.text_vi || 'None'}</span>
                            </div>
                            </div>
                          </div>
                          
                          <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            #{startIndex + idx + 1}
                          </span>
                        </div>

                        {/* Middle: Course & Lesson info ("chuyển span xuống") */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          {(() => {
                            const course = courses.find(c => c.id === r.course_id);
                            const lesson = lessons.find(l => l.id === r.lesson_id);
                            return (
                              <span className="text-[11px] text-slate-500 font-bold truncate max-w-[90%]" title={`${course?.title || 'Unknown Course'} / ${lesson?.title || 'Unknown Lesson'}`}>
                                📚 {course?.title || 'Unknown'} / 📖 {lesson?.title || 'Unknown'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Bottom action bar: Audio playback + CVR + Actions aligned horizontally! */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Audio Status Links & Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            {r.audio_en_url ? (
                              <button 
                                type="button"
                                onClick={() => playAudio(r.audio_en_url!, r.id + '_en')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  currentlyPlaying === r.id + '_en' 
                                    ? 'bg-red-500 text-white animate-pulse' 
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-100'
                                }`}
                              >
                                <Volume2 className="w-3 h-3" /> EN Play
                              </button>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleQueueAudio(r.id, 'en')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
                              >
                                + EN Audio
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {r.audio_vi_url ? (
                              <button 
                                type="button"
                                onClick={() => playAudio(r.audio_vi_url!, r.id + '_vi')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                  currentlyPlaying === r.id + '_vi' 
                                    ? 'bg-red-500 text-white animate-pulse' 
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-100'
                                }`}
                              >
                                <Volume2 className="w-3 h-3" /> VI Play
                              </button>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleQueueAudio(r.id, 'vi')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-colors"
                              >
                                + VI Audio
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Right: Difficulty CVR value & Edit/Delete actions in one nice aligned row! */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-bold font-mono border border-indigo-100/50" title="CVR Difficulty Multiplier">
                            Ω {r.cvr_value}
                          </span>

                          {useSandbox && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                              <button
                                type="button"
                                onClick={() => handleEditResourceClick(r)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                title="Edit Sentence"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteResource(r.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Sentence"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      ) : (
        /* STANDARDS SUB-TAB */
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* CPD SCORING FORMULA GUIDE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md text-slate-100 relative overflow-hidden" id="cpd-formula-guide">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none select-none">
              <BarChart3 className="w-64 h-64 text-white" />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-red-500/10 rounded-lg shrink-0">
                  <BarChart3 className="w-5 h-5 text-red-500" />
                </span>
                <div>
                  <h3 className="font-sans font-bold text-sm text-white">Cumulative Performance Drilling (CPD) Scoring Formula</h3>
                  <p className="text-[11px] text-slate-400">Oral assessment standard & live grading equations</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaGuide(!showFormulaGuide)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-all border border-slate-700/50"
              >
                {showFormulaGuide ? (
                  <>
                    Hide Formula <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Expand Formula <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {showFormulaGuide && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 pt-4 border-t border-slate-800/80">
                  {/* Formula 1: Simple Mode */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Simple Scoring Mode</span>
                      <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-medium font-mono">Standard</span>
                    </div>
                    <div className="py-2 text-center bg-slate-900/60 rounded-lg my-1.5">
                      <code className="text-sm font-bold text-red-400 font-mono">
                        CPD = CCI * CVR
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Calculated by multiplying the resolved standard card value (<span className="text-slate-300 font-semibold">CCI = Performance % * Card X</span>) directly by the sentence difficulty coefficient (<span className="text-slate-300 font-semibold font-mono">CVR Ω</span>).
                    </p>
                  </div>

                  {/* Formula 2: Timed Mode */}
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Timed Scoring Mode</span>
                      <span className="px-1.5 py-0.5 bg-red-950 text-red-400 rounded text-[9px] font-medium font-mono">Speed Bonus</span>
                    </div>
                    <div className="py-2 text-center bg-slate-900/60 rounded-lg my-1.5">
                      <code className="text-sm font-bold text-emerald-400 font-mono">
                        CPD = CCI * CVR * (1 + TimeBonus / 10)
                      </code>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Rewards rapid spoken responses. <span className="text-slate-300 font-semibold font-mono">TimeBonus = max(0, 10 - Reflection Seconds)</span>, granting up to <span className="text-emerald-400 font-bold">+100% extra score</span> for immediate responses (under 1 second).
                    </p>
                  </div>
                </div>

                {/* Parameter Glossary */}
                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Variables & Components</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-200 font-bold">CCI Standard X:</span>
                      <p className="text-slate-400 leading-normal">Scoring card reference value (e.g. Pronunciation Standard = 10, Fluency = 15)</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-200 font-bold">Performance %:</span>
                      <p className="text-slate-400 leading-normal">Host-graded speech accuracy ratio (0.00 to 1.00 based on standard metrics)</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-200 font-bold">Difficulty Ω (CVR):</span>
                      <p className="text-slate-400 leading-normal">Unique sentence prompt difficulty coefficient (typically 0.5x, 1.0x, or 1.5x)</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-200 font-bold">Reflection Sec:</span>
                      <p className="text-slate-400 leading-normal">Time elapsed between system challenge trigger and learner answer transmission</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* CCI Standard Cards */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-sans font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-600" />
                  CCI Standard Cards
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {cciCards.length} Cards
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                These are admin-defined scoring reference card values. A host chooses one when running a room. Spoken evaluations multiply by this reference value.
              </p>

              {/* Dynamic CCI Form (Create or Edit) */}
              <form onSubmit={handleSaveCci} className={`p-3.5 rounded-lg border transition-colors grid grid-cols-1 sm:grid-cols-12 gap-3 ${
                editingCciId ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                {editingCciId && (
                  <div className="sm:col-span-12 flex justify-between items-center text-[10px] text-amber-800 font-bold uppercase pb-1 border-b border-amber-200/50">
                    <span>Editing CCI Card Standard</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingCciId(null);
                        setEditCciLabel('');
                        setEditCciValue(10);
                        setEditCciCategory('pronunciation');
                      }}
                      className="text-slate-500 hover:text-slate-800 normal-case font-bold"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                
                <div className="sm:col-span-4">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">LABEL</label>
                  <input 
                    type="text"
                    placeholder="Standard Label"
                    value={editingCciId ? editCciLabel : newCciLabel}
                    onChange={(e) => editingCciId ? setEditCciLabel(e.target.value) : setNewCciLabel(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">CATEGORY</label>
                  <select
                    value={editingCciId ? editCciCategory : newCciCategory}
                    onChange={(e) => editingCciId ? setEditCciCategory(e.target.value) : setNewCciCategory(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none text-slate-700"
                  >
                    <option value="pronunciation">Pronunciation</option>
                    <option value="fluency">Fluency</option>
                    <option value="vocabulary">Vocabulary</option>
                    <option value="grammar">Grammar</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">X VALUE</label>
                  <input 
                    type="number"
                    value={editingCciId ? editCciValue : newCciValue}
                    onChange={(e) => editingCciId ? setEditCciValue(Number(e.target.value)) : setNewCciValue(Number(e.target.value))}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-red-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button 
                    type="submit"
                    className={`w-full py-1.5 text-white rounded text-xs font-semibold transition-colors ${
                      editingCciId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {editingCciId ? 'Save' : 'Add Card'}
                  </button>
                </div>
              </form>

              <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                {cciCards.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">No CCI standard cards defined.</div>
                ) : (
                  cciCards.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/40 rounded-xl hover:border-slate-200 hover:bg-slate-50/80 transition-all group">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 block">{c.label}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">{c.category_id}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono font-bold text-xs rounded-lg border border-emerald-200/50">
                          X = {c.standard_value}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCciId(c.id);
                              setEditCciLabel(c.label);
                              setEditCciValue(c.standard_value);
                              setEditCciCategory(c.category_id);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-all"
                            title="Edit CCI Standard"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCci(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete CCI Standard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CVR Multiplier Units */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-sans font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  CVR Multipliers (Ω)
                </h3>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {cvrUnits.length} Multipliers
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-normal">
                Sentence difficulty difficulty metrics (CVR Ω) are assigned per-prompt and directly amplify standard card performance scores to produce final CPD tallies.
              </p>

              {/* Dynamic CVR Form (Create or Edit) */}
              <form onSubmit={handleSaveCvr} className={`p-3.5 rounded-lg border transition-colors grid grid-cols-1 sm:grid-cols-12 gap-3 ${
                editingCvrId ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                {editingCvrId && (
                  <div className="sm:col-span-12 flex justify-between items-center text-[10px] text-amber-800 font-bold uppercase pb-1 border-b border-amber-200/50">
                    <span>Editing CVR Multiplier</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingCvrId(null);
                        setEditCvrLabel('');
                        setEditCvrSymbol('Ω');
                        setEditCvrValue(1.0);
                      }}
                      className="text-slate-500 hover:text-slate-800 normal-case font-bold"
                    >
                      Cancel Edit
                    </button>
                  </div>
                )}
                
                <div className="sm:col-span-5">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">LABEL</label>
                  <input 
                    type="text"
                    placeholder="e.g. Intermediate Difficulty"
                    value={editingCvrId ? editCvrLabel : newCvrLabel}
                    onChange={(e) => editingCvrId ? setEditCvrLabel(e.target.value) : setNewCvrLabel(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">SYMBOL</label>
                  <input 
                    type="text"
                    value={editingCvrId ? editCvrSymbol : newCvrSymbol}
                    onChange={(e) => editingCvrId ? setEditCvrSymbol(e.target.value) : setNewCvrSymbol(e.target.value)}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-indigo-700 text-center"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 block mb-0.5">VALUE</label>
                  <input 
                    type="number"
                    step="0.05"
                    value={editingCvrId ? editCvrValue : newCvrValue}
                    onChange={(e) => editingCvrId ? setEditCvrValue(Number(e.target.value)) : setNewCvrValue(Number(e.target.value))}
                    className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                    required
                  />
                </div>
                <div className="sm:col-span-3 flex items-end">
                  <button 
                    type="submit"
                    className={`w-full py-1.5 text-white rounded text-xs font-semibold transition-colors ${
                      editingCvrId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {editingCvrId ? 'Save' : 'Add CVR'}
                  </button>
                </div>
              </form>

              <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                {cvrUnits.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs italic">No CVR multipliers defined.</div>
                ) : (
                  cvrUnits.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/40 rounded-xl hover:border-slate-200 hover:bg-slate-50/80 transition-all group">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-800 block">{u.label}</span>
                        <span className="text-[10px] text-slate-400">Symbol: <span className="font-bold text-indigo-600 font-mono">{u.unit_symbol}</span></span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono font-bold text-xs rounded-lg border border-indigo-200/50">
                          Ω = {u.value}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingCvrId(u.id);
                              setEditCvrLabel(u.label);
                              setEditCvrSymbol(u.unit_symbol);
                              setEditCvrValue(u.value);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-all"
                            title="Edit CVR Multiplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCvr(u.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete CVR Multiplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
