/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { CCIStandardCard, Course, GeneratedSentenceCandidate, Lesson, LessonSection, SentenceResource } from '../types';
import { supabase } from '../lib/supabaseClient';
import { checkResourceAudioExists, resolveResourceAudioUrl } from '../lib/audioUrl';
import { generateResourceAudio } from '../lib/ttsService';
import { generateLessonCandidate, LessonGeneratorResourceInput } from '../lib/lessonGeneratorClient';
import { getShortSentenceCode } from '../lib/resourceCode';
import {
  buildSentenceCode,
  buildTopicPrepSummary,
  getCourseDependencyCounts,
  getLessonDependencyCounts,
  getSectionDependencyCounts,
  nextOrderIndex,
  statusBadgeTone
} from '../lib/liveData';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  Edit2,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  List as ListIcon,
  Mic,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Volume2,
  Wand2
} from 'lucide-react';

interface LibraryTabProps {
  useSandbox: boolean;
  courses: Course[];
  lessons: Lesson[];
  sections: LessonSection[];
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
  onRefreshData: () => void;
}

type Status = 'draft' | 'active' | 'archived';
type ResourceStatus = 'draft' | 'approved' | 'archived';

type GeneratorFormState = {
  theme: string;
  topicLevel: number;
  sentenceLength: 'Very Short' | 'Short' | 'Medium' | 'Long';
  resourceText: string;
  iValue: number;
};

const emptyGeneratorForm: GeneratorFormState = {
  theme: '',
  topicLevel: 1.2,
  sentenceLength: 'Short',
  resourceText: '',
  iValue: 1
};

const parseGeneratorResources = (value: string): LessonGeneratorResourceInput[] => {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', color = 'Blue', ohm = '5', enHint] = line.split('|').map(part => part.trim());
      return {
        name,
        color: color || 'Blue',
        ohm: Number(ohm) || 5,
        ...(enHint ? { enHint } : {})
      };
    })
    .filter(item => item.name && item.ohm > 0);
};

export default function LibraryTab({
  useSandbox,
  courses,
  lessons,
  sections,
  resources,
  cciCards,
  onRefreshData
}: LibraryTabProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const activeCourse = courses.find(course => course.id === selectedCourseId) || courses[0] || null;
  const safeSelectedCourseId = activeCourse?.id || '';

  const filteredLessons = useMemo(
    () => lessons.filter(lesson => lesson.course_id === safeSelectedCourseId).sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title)),
    [lessons, safeSelectedCourseId]
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const activeLesson = filteredLessons.find(lesson => lesson.id === selectedLessonId) || filteredLessons[0] || null;
  const safeSelectedLessonId = activeLesson?.id || '';

  const filteredSections = useMemo(
    () => sections.filter(section => section.lesson_id === safeSelectedLessonId).sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title)),
    [sections, safeSelectedLessonId]
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const activeSection = filteredSections.find(section => section.id === selectedSectionId) || null;

  const [audioFilter, setAudioFilter] = useState<'all' | 'missing_en' | 'missing_vi' | 'missing_any' | 'has_both'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseStatus, setCourseStatus] = useState<Status>('draft');

  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonOrder, setLessonOrder] = useState(1);
  const [lessonStatus, setLessonStatus] = useState<Status>('draft');

  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionOrder, setSectionOrder] = useState(1);
  const [sectionStatus, setSectionStatus] = useState<Status>('draft');
  const [sectionCciCardId, setSectionCciCardId] = useState('');

  const [resourceFormOpen, setResourceFormOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [resCode, setResCode] = useState('');
  const [resPrompt, setResPrompt] = useState('');
  const [resEn, setResEn] = useState('');
  const [resVi, setResVi] = useState('');
  const [resCvr, setResCvr] = useState(1);
  const [resStatus, setResStatus] = useState<ResourceStatus>('draft');
  const [resSectionId, setResSectionId] = useState('');

  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorForm, setGeneratorForm] = useState<GeneratorFormState>(emptyGeneratorForm);
  const [generatorBusy, setGeneratorBusy] = useState(false);
  const [candidate, setCandidate] = useState<GeneratedSentenceCandidate | null>(null);

  const lessonResources = resources.filter(resource => resource.lesson_id === safeSelectedLessonId);
  const filteredResources = resources.filter(resource => {
    const matchCourse = !safeSelectedCourseId || resource.course_id === safeSelectedCourseId;
    const matchLesson = !safeSelectedLessonId || resource.lesson_id === safeSelectedLessonId;
    const matchSection = selectedSectionId ? resource.section_id === selectedSectionId : true;
    let matchAudio = true;
    if (audioFilter === 'missing_en') matchAudio = !resource.audio_en_url;
    if (audioFilter === 'missing_vi') matchAudio = !resource.audio_vi_url;
    if (audioFilter === 'missing_any') matchAudio = !resource.audio_en_url || !resource.audio_vi_url;
    if (audioFilter === 'has_both') matchAudio = Boolean(resource.audio_en_url && resource.audio_vi_url);
    return matchCourse && matchLesson && matchSection && matchAudio;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResources.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedResources = filteredResources.slice(startIndex, startIndex + itemsPerPage);
  const topicPrep = buildTopicPrepSummary({ lesson: activeLesson, sections, resources, cciCards });
  const activeCciCards = cciCards.filter(card => card.active !== false);

  const runMutation = async (label: string, operation: () => Promise<void>) => {
    setBusy(true);
    setStatusMessage(`${label}...`);
    try {
      await operation();
      setStatusMessage(`${label} complete.`);
      await Promise.resolve(onRefreshData());
    } catch (err: any) {
      const message = err.message || String(err);
      setStatusMessage(`${label} failed: ${message}`);
      alert(`${label} failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const resetCourseForm = () => {
    setCourseFormOpen(false);
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseStatus('draft');
  };

  const resetLessonForm = () => {
    setLessonFormOpen(false);
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonOrder(nextOrderIndex(filteredLessons));
    setLessonStatus('draft');
  };

  const resetSectionForm = () => {
    setSectionFormOpen(false);
    setEditingSectionId(null);
    setSectionTitle('');
    setSectionOrder(nextOrderIndex(filteredSections));
    setSectionStatus('draft');
    setSectionCciCardId('');
  };

  const resetResourceForm = () => {
    setResourceFormOpen(false);
    setEditingResourceId(null);
    setResCode('');
    setResPrompt('');
    setResEn('');
    setResVi('');
    setResCvr(1);
    setResStatus('draft');
    setResSectionId(selectedSectionId || '');
  };

  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseStatus(course.status);
    setCourseFormOpen(true);
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonOrder(lesson.order_index);
    setLessonStatus(lesson.status);
    setLessonFormOpen(true);
  };

  const startEditSection = (section: LessonSection) => {
    setEditingSectionId(section.id);
    setSectionTitle(section.title);
    setSectionOrder(section.order_index);
    setSectionStatus(section.status);
    setSectionCciCardId(section.default_cci_standard_card_id || '');
    setSectionFormOpen(true);
  };

  const startCreateResource = () => {
    setEditingResourceId(null);
    setResCode(buildSentenceCode(activeCourse, activeLesson, lessonResources));
    setResPrompt('');
    setResEn('');
    setResVi('');
    setResCvr(1);
    setResStatus('draft');
    setResSectionId(selectedSectionId || '');
    setResourceFormOpen(true);
  };

  const startEditResource = (resource: SentenceResource) => {
    setEditingResourceId(resource.id);
    setResCode(resource.sentence_code);
    setResPrompt(resource.text_prompt || '');
    setResEn(resource.text_en || '');
    setResVi(resource.text_vi || '');
    setResCvr(Number(resource.cvr_value || resource.default_cvr_value || 1));
    setResStatus(resource.approval_status);
    setResSectionId(resource.section_id || '');
    setResourceFormOpen(true);
  };

  const saveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const title = courseTitle.trim();
    if (!title) return alert('Course title is required.');
    void runMutation(editingCourseId ? 'Updating course' : 'Creating course', async () => {
      if (editingCourseId) {
        const { error } = await supabase.from('courses').update({ title, status: courseStatus, updated_at: new Date().toISOString() }).eq('id', editingCourseId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert([{ id: crypto.randomUUID(), title, status: courseStatus, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      resetCourseForm();
    });
  };

  const archiveCourse = (course: Course) => {
    void runMutation(`Archiving course ${course.title}`, async () => {
      const { error } = await supabase.from('courses').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', course.id);
      if (error) throw error;
    });
  };

  const deleteCourse = (course: Course) => {
    const counts = getCourseDependencyCounts(course.id, lessons, resources);
    if (counts.lessons > 0 || counts.resources > 0) {
      alert(`Course has ${counts.lessons} lesson(s) and ${counts.resources} resource(s). Archive it instead of hard deleting.`);
      return;
    }
    if (!window.confirm(`Hard delete empty course "${course.title}"? This cannot be undone.`)) return;
    void runMutation(`Deleting course ${course.title}`, async () => {
      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      if (error) throw error;
    });
  };

  const saveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeSelectedCourseId) return alert('Select a course first.');
    const title = lessonTitle.trim();
    if (!title) return alert('Lesson/topic title is required.');
    void runMutation(editingLessonId ? 'Updating lesson/topic' : 'Creating lesson/topic', async () => {
      const payload = { course_id: safeSelectedCourseId, title, order_index: Number(lessonOrder) || 0, status: lessonStatus, updated_at: new Date().toISOString() };
      if (editingLessonId) {
        const { error } = await supabase.from('lessons').update(payload).eq('id', editingLessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lessons').insert([{ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      resetLessonForm();
    });
  };

  const archiveLesson = (lesson: Lesson) => {
    void runMutation(`Archiving lesson ${lesson.title}`, async () => {
      const { error } = await supabase.from('lessons').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', lesson.id);
      if (error) throw error;
    });
  };

  const deleteLesson = (lesson: Lesson) => {
    const counts = getLessonDependencyCounts(lesson.id, sections, resources);
    if (counts.sections > 0 || counts.resources > 0) {
      alert(`Lesson has ${counts.sections} section(s) and ${counts.resources} resource(s). Archive it instead of hard deleting.`);
      return;
    }
    if (!window.confirm(`Hard delete empty lesson "${lesson.title}"?`)) return;
    void runMutation(`Deleting lesson ${lesson.title}`, async () => {
      const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
      if (error) throw error;
    });
  };

  const saveSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeSelectedLessonId) return alert('Select a lesson/topic first.');
    const title = sectionTitle.trim();
    if (!title) return alert('Section/part title is required.');
    void runMutation(editingSectionId ? 'Updating section/part' : 'Creating section/part', async () => {
      const payload = {
        lesson_id: safeSelectedLessonId,
        title,
        order_index: Number(sectionOrder) || 0,
        status: sectionStatus,
        default_cci_standard_card_id: sectionCciCardId || null,
        updated_at: new Date().toISOString()
      };
      if (editingSectionId) {
        const { error } = await supabase.from('lesson_sections').update(payload).eq('id', editingSectionId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lesson_sections').insert([{ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }
      resetSectionForm();
    });
  };

  const archiveSection = (section: LessonSection) => {
    void runMutation(`Archiving section ${section.title}`, async () => {
      const { error } = await supabase.from('lesson_sections').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', section.id);
      if (error) throw error;
    });
  };

  const deleteSection = (section: LessonSection) => {
    const counts = getSectionDependencyCounts(section.id, resources);
    if (counts.resources > 0) {
      alert(`Section has ${counts.resources} resource(s). Archive it instead of hard deleting.`);
      return;
    }
    if (!window.confirm(`Hard delete empty section "${section.title}"?`)) return;
    void runMutation(`Deleting section ${section.title}`, async () => {
      const { error } = await supabase.from('lesson_sections').delete().eq('id', section.id);
      if (error) throw error;
    });
  };

  const saveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeSelectedCourseId || !safeSelectedLessonId) return alert('Select a course and lesson first.');
    if (!resCode.trim()) return alert('Sentence code is required.');
    void runMutation(editingResourceId ? 'Updating sentence resource' : 'Creating sentence resource', async () => {
      const payload = {
        course_id: safeSelectedCourseId,
        lesson_id: safeSelectedLessonId,
        section_id: resSectionId || null,
        sentence_code: resCode.trim().toUpperCase(),
        text_prompt: resPrompt.trim(),
        text_en: resEn.trim(),
        text_vi: resVi.trim(),
        cvr_value: Number(resCvr) || 1,
        default_cvr_value: Number(resCvr) || 1,
        approval_status: resStatus,
        updated_at: new Date().toISOString()
      };
      if (editingResourceId) {
        const { error } = await supabase.from('sentence_resources').update(payload).eq('id', editingResourceId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sentence_resources').insert([{
          id: crypto.randomUUID(),
          ...payload,
          audio_variants: {},
          order_index: nextOrderIndex(lessonResources),
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
      resetResourceForm();
    });
  };

  const archiveResource = (resource: SentenceResource) => {
    void runMutation(`Archiving resource ${resource.sentence_code}`, async () => {
      const { error } = await supabase.from('sentence_resources').update({ approval_status: 'archived', updated_at: new Date().toISOString() }).eq('id', resource.id);
      if (error) throw error;
    });
  };

  const generateAudio = (resource: SentenceResource, lang: 'en' | 'vi') => {
    void runMutation(`Generating ${lang.toUpperCase()} audio`, async () => {
      await generateResourceAudio(resource, lang);
    });
  };

  const playAudio = async (resource: SentenceResource, lang: 'en' | 'vi') => {
    const url = lang === 'en' ? resource.audio_en_url : resource.audio_vi_url;
    if (!url) return;
    const exists = await checkResourceAudioExists(url);
    if (exists === false) return alert('Audio file is missing in storage. Please regenerate it.');
    const playable = resolveResourceAudioUrl(url, resource.updated_at);
    if (playable) new Audio(playable).play().catch(err => alert(err.message));
  };

  const requestCandidate = () => {
    if (!safeSelectedCourseId || !safeSelectedLessonId) return alert('Select course and lesson first.');
    const generationResources = parseGeneratorResources(generatorForm.resourceText);
    if (generationResources.length === 0) return alert('Add at least one generation resource line: name | color | ohm | optional hint');
    setGeneratorBusy(true);
    setCandidate(null);
    generateLessonCandidate({
      target: { courseId: safeSelectedCourseId, lessonId: safeSelectedLessonId, sectionId: selectedSectionId || null },
      generation: {
        theme: generatorForm.theme || activeLesson?.title || activeCourse?.title || undefined,
        topicLevel: generatorForm.topicLevel,
        sentenceLength: generatorForm.sentenceLength,
        resources: generationResources,
        iValue: generatorForm.iValue
      }
    }).then(result => {
      if (result.status === 'success') {
        setCandidate(result.candidate);
        setStatusMessage('Generated candidate ready for review.');
      } else if (result.status === 'processing') {
        setStatusMessage(result.message);
      } else {
        setStatusMessage(result.errorMessage);
        alert(result.errorMessage);
      }
    }).finally(() => setGeneratorBusy(false));
  };

  const saveCandidate = (status: ResourceStatus) => {
    if (!candidate) return;
    setResCode(buildSentenceCode(activeCourse, activeLesson, lessonResources));
    setResPrompt(candidate.resourcesUsed?.map(r => r.name || r.text).filter(Boolean).join(' + ') || generatorForm.theme || activeLesson?.title || 'Generated lesson sentence');
    setResEn(candidate.engSentence);
    setResVi(candidate.vieSentence);
    setResCvr(candidate.totalOhm || candidate.uTotal || 1);
    setResStatus(status);
    setResSectionId(candidate.sectionId || selectedSectionId || '');
    setEditingResourceId(null);
    setResourceFormOpen(true);
    setStatusMessage('Candidate copied into the sentence editor. Review and click Save Sentence.');
  };

  const sourceBadge = (status: string) => `inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${statusBadgeTone(status)}`;

  const renderHierarchyManager = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-red-600" /> Courses</h3>
          <button type="button" onClick={() => { resetCourseForm(); setCourseFormOpen(true); }} className="text-[10px] font-bold text-red-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {courseFormOpen && (
          <form onSubmit={saveCourse} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <input value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="Course title" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <select value={courseStatus} onChange={e => setCourseStatus(e.target.value as Status)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg">
              <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
            </select>
            <div className="flex gap-2"><button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">Save</button><button type="button" onClick={resetCourseForm} className="px-3 py-1.5 bg-white border rounded-lg text-xs font-bold">Cancel</button></div>
          </form>
        )}
        <div className="space-y-2 max-h-72 overflow-auto">
          {courses.map(course => (
            <div key={course.id} className={`p-3 rounded-xl border ${course.id === safeSelectedCourseId ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
              <button type="button" onClick={() => { setSelectedCourseId(course.id); setSelectedLessonId(''); setSelectedSectionId(''); }} className="text-left w-full">
                <div className="font-bold text-xs text-slate-800">{course.title}</div>
                <span className={sourceBadge(course.status)}>{course.status}</span>
              </button>
              <div className="flex gap-1 mt-2">
                <button type="button" onClick={() => startEditCourse(course)} className="p-1 text-slate-500 hover:text-slate-900"><Edit2 className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => archiveCourse(course)} className="p-1 text-amber-600 hover:text-amber-800"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => deleteCourse(course)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-red-600" /> Lessons / Topics</h3>
          <button type="button" disabled={!safeSelectedCourseId} onClick={() => { resetLessonForm(); setLessonFormOpen(true); }} className="text-[10px] font-bold text-red-600 flex items-center gap-1 disabled:opacity-40"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {lessonFormOpen && (
          <form onSubmit={saveLesson} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Lesson/topic title" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <input type="number" value={lessonOrder} onChange={e => setLessonOrder(Number(e.target.value))} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <select value={lessonStatus} onChange={e => setLessonStatus(e.target.value as Status)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
            <div className="flex gap-2"><button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">Save</button><button type="button" onClick={resetLessonForm} className="px-3 py-1.5 bg-white border rounded-lg text-xs font-bold">Cancel</button></div>
          </form>
        )}
        <div className="space-y-2 max-h-72 overflow-auto">
          {filteredLessons.length === 0 ? <p className="text-xs text-slate-400 italic">No lessons/topics yet.</p> : filteredLessons.map(lesson => (
            <div key={lesson.id} className={`p-3 rounded-xl border ${lesson.id === safeSelectedLessonId ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
              <button type="button" onClick={() => { setSelectedLessonId(lesson.id); setSelectedSectionId(''); }} className="text-left w-full">
                <div className="font-bold text-xs text-slate-800">{lesson.order_index}. {lesson.title}</div>
                <span className={sourceBadge(lesson.status)}>{lesson.status}</span>
              </button>
              <div className="flex gap-1 mt-2"><button type="button" onClick={() => startEditLesson(lesson)} className="p-1 text-slate-500"><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => archiveLesson(lesson)} className="p-1 text-amber-600"><RefreshCw className="w-3.5 h-3.5" /></button><button type="button" onClick={() => deleteLesson(lesson)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Layers className="w-4 h-4 text-red-600" /> Sections / Parts</h3>
          <button type="button" disabled={!safeSelectedLessonId} onClick={() => { resetSectionForm(); setSectionFormOpen(true); }} className="text-[10px] font-bold text-red-600 flex items-center gap-1 disabled:opacity-40"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {sectionFormOpen && (
          <form onSubmit={saveSection} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <input value={sectionTitle} onChange={e => setSectionTitle(e.target.value)} placeholder="Section/part title" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <input type="number" value={sectionOrder} onChange={e => setSectionOrder(Number(e.target.value))} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <select value={sectionStatus} onChange={e => setSectionStatus(e.target.value as Status)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
            <select value={sectionCciCardId} onChange={e => setSectionCciCardId(e.target.value)} className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg">
              <option value="">No default CCI — use room default</option>
              {activeCciCards.map(card => <option key={card.id} value={card.id}>{card.label} · X={card.standard_value}</option>)}
            </select>
            <div className="flex gap-2"><button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold">Save</button><button type="button" onClick={resetSectionForm} className="px-3 py-1.5 bg-white border rounded-lg text-xs font-bold">Cancel</button></div>
          </form>
        )}
        <div className="space-y-2 max-h-72 overflow-auto">
          {filteredSections.length === 0 ? <p className="text-xs text-slate-400 italic">No parts yet.</p> : filteredSections.map(section => {
            const cci = activeCciCards.find(card => card.id === section.default_cci_standard_card_id);
            return (
              <div key={section.id} className={`p-3 rounded-xl border ${section.id === selectedSectionId ? 'border-red-200 bg-red-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
                <button type="button" onClick={() => setSelectedSectionId(section.id)} className="text-left w-full">
                  <div className="font-bold text-xs text-slate-800">{section.order_index}. {section.title}</div>
                  <div className="flex flex-wrap gap-1 mt-1"><span className={sourceBadge(section.status)}>{section.status}</span><span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 font-bold">{cci ? `CCI: ${cci.label}` : 'CCI: room default'}</span></div>
                </button>
                <div className="flex gap-1 mt-2"><button type="button" onClick={() => startEditSection(section)} className="p-1 text-slate-500"><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => archiveSection(section)} className="p-1 text-amber-600"><RefreshCw className="w-3.5 h-3.5" /></button><button type="button" onClick={() => deleteSection(section)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTopicPrep = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-red-600" /> Full Topic Prep</h3>
          <p className="text-xs text-slate-500 mt-1">Shows how many parts a topic has, sentence readiness, audio gaps, CVR range, and default CCI by section topic.</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${topicPrep?.ready ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{topicPrep?.ready ? 'READY' : 'NEEDS PREP'}</span>
      </div>
      {!topicPrep ? <p className="text-xs text-slate-400 italic">Select a lesson/topic to inspect readiness.</p> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              ['Parts', topicPrep.sectionCount], ['Resources', topicPrep.resourceCount], ['Approved', topicPrep.approvedResourceCount], ['Draft', topicPrep.draftResourceCount], ['Archived', topicPrep.archivedResourceCount], ['Missing EN', topicPrep.missingEnAudioCount], ['Missing VI', topicPrep.missingViAudioCount]
            ].map(([label, value]) => <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3"><div className="text-[9px] font-black text-slate-400 uppercase">{label}</div><div className="text-lg font-black text-slate-800">{value}</div></div>)}
          </div>
          {(topicPrep.blockingReasons.length > 0 || topicPrep.warningReasons.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {[...topicPrep.blockingReasons, ...topicPrep.warningReasons].join(' • ')}
            </div>
          )}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black"><tr><th className="p-3">Part</th><th className="p-3">Resources</th><th className="p-3">Audio gaps</th><th className="p-3">CVR</th><th className="p-3">Default CCI</th><th className="p-3">State</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {topicPrep.sections.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-slate-400 italic">No sections/parts configured.</td></tr> : topicPrep.sections.map(section => (
                  <tr key={section.sectionId}>
                    <td className="p-3"><button type="button" onClick={() => setSelectedSectionId(section.sectionId)} className="font-bold text-slate-800 hover:text-red-600">{section.orderIndex}. {section.sectionTitle}</button><div className="font-mono text-[9px] text-slate-400">{section.sectionId.slice(0, 8)}</div></td>
                    <td className="p-3">{section.approvedResourceCount}/{section.resourceCount} approved<br/><span className="text-slate-400">{section.draftResourceCount} draft · {section.archivedResourceCount} archived</span></td>
                    <td className="p-3">EN {section.missingEnAudioCount} · VI {section.missingViAudioCount}</td>
                    <td className="p-3">{section.minCvr == null ? '—' : `${section.minCvr}–${section.maxCvr}`}</td>
                    <td className="p-3">{section.defaultCciLabel ? `${section.defaultCciLabel} · X=${section.defaultCciStandardValue}` : <span className="text-amber-700 font-bold">Missing</span>}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] font-black border ${section.ready ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{section.ready ? 'Ready' : 'Needs prep'}</span>{section.blockingReasons.length > 0 && <div className="text-[10px] text-amber-700 mt-1">{section.blockingReasons.join(' • ')}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );

  const renderGenerator = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><Wand2 className="w-4 h-4 text-red-600" /> Lesson Generator Candidate</h3>
          <p className="text-xs text-slate-500 mt-1">Calls only the trusted Supabase Edge Function proxy. Generated content must be reviewed before saving.</p>
        </div>
        <button type="button" onClick={() => setGeneratorOpen(open => !open)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold">{generatorOpen ? 'Hide' : 'Generate'}</button>
      </div>
      {generatorOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
            <input value={generatorForm.theme} onChange={e => setGeneratorForm(prev => ({ ...prev, theme: e.target.value }))} placeholder="Theme (defaults to selected lesson)" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <div className="grid grid-cols-3 gap-2"><input type="number" step="0.1" min="1" max="2" value={generatorForm.topicLevel} onChange={e => setGeneratorForm(prev => ({ ...prev, topicLevel: Number(e.target.value) }))} className="text-xs p-2 bg-white border border-slate-200 rounded-lg" /><select value={generatorForm.sentenceLength} onChange={e => setGeneratorForm(prev => ({ ...prev, sentenceLength: e.target.value as any }))} className="text-xs p-2 bg-white border border-slate-200 rounded-lg"><option>Very Short</option><option>Short</option><option>Medium</option><option>Long</option></select><input type="number" step="0.1" value={generatorForm.iValue} onChange={e => setGeneratorForm(prev => ({ ...prev, iValue: Number(e.target.value) }))} className="text-xs p-2 bg-white border border-slate-200 rounded-lg" /></div>
            <textarea value={generatorForm.resourceText} onChange={e => setGeneratorForm(prev => ({ ...prev, resourceText: e.target.value }))} rows={5} placeholder="One resource per line: say goodbye politely | Blue | 5 | optional hint" className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg" />
            <button type="button" onClick={requestCandidate} disabled={generatorBusy} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50">{generatorBusy ? 'Generating...' : 'Request Candidate'}</button>
          </div>
          <div className="bg-slate-950 text-slate-100 rounded-xl p-4 min-h-[220px]">
            {!candidate ? <p className="text-xs text-slate-400 italic">No candidate yet. Response will appear here for review before save.</p> : (
              <div className="space-y-3">
                <div><div className="text-[10px] text-slate-500 font-black uppercase">English</div><p className="text-sm font-semibold">{candidate.engSentence}</p></div>
                <div><div className="text-[10px] text-slate-500 font-black uppercase">Vietnamese</div><p className="text-sm font-semibold">{candidate.vieSentence}</p></div>
                <div className="text-xs text-slate-300">Ohm: <strong>{candidate.totalOhm ?? candidate.uTotal ?? '—'}</strong> · Difficulty: {candidate.difficultyLabel || '—'}</div>
                <div className="flex gap-2"><button type="button" onClick={() => saveCandidate('draft')} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold">Review as Draft</button><button type="button" onClick={() => saveCandidate('approved')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Review as Approved</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderResourceEditor = () => resourceFormOpen && (
    <form onSubmit={saveResource} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3"><h3 className="text-xs font-black text-slate-800">{editingResourceId ? `Edit ${resCode}` : 'Create Sentence Resource'}</h3><button type="button" onClick={resetResourceForm} className="text-xs text-slate-500">Cancel</button></div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3"><input value={resCode} onChange={e => setResCode(e.target.value)} placeholder="Sentence code" className="md:col-span-3 text-xs p-2 bg-white border rounded-lg" /><input type="number" step="0.1" value={resCvr} onChange={e => setResCvr(Number(e.target.value))} className="md:col-span-2 text-xs p-2 bg-white border rounded-lg" /><select value={resStatus} onChange={e => setResStatus(e.target.value as ResourceStatus)} className="md:col-span-3 text-xs p-2 bg-white border rounded-lg"><option value="draft">Draft</option><option value="approved">Approved</option><option value="archived">Archived</option></select><select value={resSectionId} onChange={e => setResSectionId(e.target.value)} className="md:col-span-4 text-xs p-2 bg-white border rounded-lg"><option value="">No Section</option>{filteredSections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></div>
      <input value={resPrompt} onChange={e => setResPrompt(e.target.value)} placeholder="Teacher challenge prompt" className="w-full text-xs p-2 bg-white border rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><textarea value={resEn} onChange={e => setResEn(e.target.value)} rows={3} placeholder="English answer/source" className="text-xs p-2 bg-white border rounded-lg" /><textarea value={resVi} onChange={e => setResVi(e.target.value)} rows={3} placeholder="Vietnamese translation" className="text-xs p-2 bg-white border rounded-lg" /></div>
      <div className="flex justify-end gap-2"><button type="button" onClick={resetResourceForm} className="px-3 py-1.5 bg-white border rounded-lg text-xs font-bold">Cancel</button><button className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold">Save Sentence</button></div>
    </form>
  );

  const renderResources = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div><h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-red-600" /> Sentence Resources ({filteredResources.length})</h3><p className="text-xs text-slate-500">Add lesson content into the selected lesson/section.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold flex items-center gap-1">{viewMode === 'list' ? <LayoutGrid className="w-3 h-3" /> : <ListIcon className="w-3 h-3" />} {viewMode === 'list' ? 'Cards' : 'List'}</button><button type="button" onClick={startCreateResource} disabled={!safeSelectedLessonId} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"><Plus className="w-3 h-3" /> Create Sentence</button></div>
      </div>
      {renderResourceEditor()}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3"><select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} className="text-xs p-2 bg-white border rounded-lg"><option value="">All Sections</option>{filteredSections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select><select value={audioFilter} onChange={e => setAudioFilter(e.target.value as any)} className="text-xs p-2 bg-white border rounded-lg"><option value="all">All Audio</option><option value="missing_any">Missing Any</option><option value="missing_en">Missing EN</option><option value="missing_vi">Missing VI</option><option value="has_both">Has Both</option></select><select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className="text-xs p-2 bg-white border rounded-lg"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></div>
      {filteredResources.length === 0 ? <div className="p-10 text-center text-slate-400 italic border border-dashed rounded-xl">No resources match this scope.</div> : viewMode === 'list' ? (
        <div className="overflow-x-auto border border-slate-100 rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black"><tr><th className="p-3">Code</th><th className="p-3">Content</th><th className="p-3">Section</th><th className="p-3">Metrics</th><th className="p-3">Audio</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedResources.map(resource => {
          const section = sections.find(s => s.id === resource.section_id);
          return <tr key={resource.id}><td className="p-3 font-mono font-bold">{getShortSentenceCode(resource.sentence_code, resource.order_index)}<br/><span className={sourceBadge(resource.approval_status)}>{resource.approval_status}</span></td><td className="p-3"><div className="font-semibold text-slate-800">{resource.text_prompt || resource.text_en || 'No prompt'}</div><div className="text-slate-400 line-clamp-1">{resource.text_vi}</div></td><td className="p-3">{section?.title || 'General'}</td><td className="p-3">CVR Ω {resource.cvr_value || resource.default_cvr_value || 1}</td><td className="p-3"><div className="flex gap-1">{resource.audio_en_url ? <button type="button" onClick={() => playAudio(resource, 'en')} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">EN</button> : <button type="button" onClick={() => generateAudio(resource, 'en')} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">+EN</button>}{resource.audio_vi_url ? <button type="button" onClick={() => playAudio(resource, 'vi')} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">VI</button> : <button type="button" onClick={() => generateAudio(resource, 'vi')} className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">+VI</button>}</div></td><td className="p-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => startEditResource(resource)} className="p-1 text-slate-500"><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => archiveResource(resource)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>;
        })}</tbody></table></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{paginatedResources.map(resource => <div key={resource.id} className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 space-y-2"><div className="flex justify-between gap-2"><span className="font-mono text-xs font-black text-red-700">{getShortSentenceCode(resource.sentence_code, resource.order_index)}</span><span className={sourceBadge(resource.approval_status)}>{resource.approval_status}</span></div><div className="font-semibold text-sm text-slate-800">{resource.text_prompt || resource.text_en}</div><p className="text-xs text-slate-500 line-clamp-2">{resource.text_vi}</p><div className="text-[10px] text-slate-400">CVR Ω {resource.cvr_value || resource.default_cvr_value || 1}</div><div className="flex gap-2"><button type="button" onClick={() => startEditResource(resource)} className="text-xs text-slate-600 font-bold">Edit</button><button type="button" onClick={() => archiveResource(resource)} className="text-xs text-red-600 font-bold">Archive</button></div></div>)}</div>
      )}
      {filteredResources.length > itemsPerPage && <div className="flex items-center justify-end gap-2"><button type="button" disabled={page === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-3 py-1 bg-slate-100 rounded text-xs font-bold disabled:opacity-50">Prev</button><span className="text-xs text-slate-500">Page {page}/{totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="px-3 py-1 bg-slate-100 rounded text-xs font-bold disabled:opacity-50">Next</button></div>}
    </div>
  );

  return (
    <div className="space-y-6" id="library-tab">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-red-600" /> Library — Curriculum & Topic Prep</h2>
          <p className="text-xs text-slate-500 mt-1">Manage courses, lessons/topics, parts, sentence resources, full-topic readiness, and section-topic CCI defaults.</p>
        </div>
        <a href="/settings" className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider">CCI/CVR standards in Settings</a>
      </div>

      {useSandbox && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Sandbox mode is deprecated for product Library flows. This page writes live Supabase data only.</div>
      )}
      {statusMessage && <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 font-semibold">{busy && <RefreshCw className="inline w-3 h-3 mr-1 animate-spin" />}{statusMessage}</div>}

      {renderHierarchyManager()}
      {renderTopicPrep()}
      {renderGenerator()}
      {renderResources()}
    </div>
  );
}
