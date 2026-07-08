import {
  CCIStandardCard,
  Course,
  Learner,
  Lesson,
  LessonSection,
  ResolvedCciAssignment,
  SentenceResource,
  TopicPrepSectionSummary,
  TopicPrepSummary
} from '../types';

export const REQUESTED_LEARNER_NAMES = [
  'Lucy',
  'Mason',
  'Annie',
  'Vox',
  'Tailor',
  'Wynnye',
  'Cherry',
  'Jay',
  'Pen'
];

export function normalizeLearnerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function displayLearnerOption(learner: Learner): string {
  const suffix = learner.last_seen_at
    ? ` • last seen ${new Date(learner.last_seen_at).toLocaleDateString()}`
    : ` • ${learner.id.slice(0, 8)}`;
  return `${learner.display_name}${suffix}`;
}

export function findDuplicateLearnerNames(learners: Learner[]): Set<string> {
  const counts = new Map<string, number>();
  for (const learner of learners) {
    const key = normalizeLearnerName(learner.display_name);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
}

export function getMissingRequestedLearners(learners: Learner[]): string[] {
  const existing = new Set(learners.map(l => normalizeLearnerName(l.display_name)));
  return REQUESTED_LEARNER_NAMES.filter(name => !existing.has(normalizeLearnerName(name)));
}

export function getCourseDependencyCounts(courseId: string, lessons: Lesson[], resources: SentenceResource[]) {
  return {
    lessons: lessons.filter(lesson => lesson.course_id === courseId).length,
    resources: resources.filter(resource => resource.course_id === courseId).length
  };
}

export function getLessonDependencyCounts(lessonId: string, sections: LessonSection[], resources: SentenceResource[]) {
  return {
    sections: sections.filter(section => section.lesson_id === lessonId).length,
    resources: resources.filter(resource => resource.lesson_id === lessonId).length
  };
}

export function getSectionDependencyCounts(sectionId: string, resources: SentenceResource[]) {
  return {
    resources: resources.filter(resource => resource.section_id === sectionId).length
  };
}

export function statusBadgeTone(status: string) {
  if (status === 'active' || status === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'archived') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

export function resolveCciAssignment(options: {
  manualCardId?: string | null;
  sectionDefaultCardId?: string | null;
  roomDefaultCardId?: string | null;
  cciCards: CCIStandardCard[];
}): ResolvedCciAssignment {
  const activeCards = options.cciCards.filter(card => card.active !== false);
  const findCard = (id?: string | null) => id ? activeCards.find(card => card.id === id) || null : null;

  const manual = findCard(options.manualCardId);
  if (manual) return { card: manual, source: 'manual', warning: null };
  if (options.manualCardId) {
    const fallback = findCard(options.roomDefaultCardId) || activeCards[0] || null;
    return { card: fallback, source: fallback ? 'room_default' : 'missing', warning: 'Manual CCI override is no longer active; using fallback.' };
  }

  const sectionDefault = findCard(options.sectionDefaultCardId);
  if (sectionDefault) return { card: sectionDefault, source: 'section_default', warning: null };
  if (options.sectionDefaultCardId) {
    const fallback = findCard(options.roomDefaultCardId) || activeCards[0] || null;
    return { card: fallback, source: fallback ? 'room_default' : 'missing', warning: 'Section default CCI is no longer active; using room default/fallback.' };
  }

  const roomDefault = findCard(options.roomDefaultCardId);
  if (roomDefault) return { card: roomDefault, source: 'room_default', warning: null };

  const fallback = activeCards[0] || null;
  return {
    card: fallback,
    source: fallback ? 'fallback' : 'missing',
    warning: fallback ? 'Using first active CCI card because no room or section default is set.' : 'No active CCI cards are available.'
  };
}

export function formatCciSource(source: ResolvedCciAssignment['source']) {
  switch (source) {
    case 'manual': return 'Manual override';
    case 'section_default': return 'Section default';
    case 'room_default': return 'Room default';
    case 'fallback': return 'Fallback';
    default: return 'Missing CCI';
  }
}

export function buildTopicPrepSummary(input: {
  lesson: Lesson | null;
  sections: LessonSection[];
  resources: SentenceResource[];
  cciCards: CCIStandardCard[];
}): TopicPrepSummary | null {
  const { lesson, sections, resources, cciCards } = input;
  if (!lesson) return null;

  const cciById = new Map(cciCards.map(card => [card.id, card]));
  const lessonSections = sections
    .filter(section => section.lesson_id === lesson.id)
    .sort((a, b) => a.order_index - b.order_index || a.title.localeCompare(b.title));
  const lessonResources = resources.filter(resource => resource.lesson_id === lesson.id);

  const sectionSummaries: TopicPrepSectionSummary[] = lessonSections.map(section => {
    const sectionResources = lessonResources.filter(resource => resource.section_id === section.id);
    const approved = sectionResources.filter(resource => resource.approval_status === 'approved');
    const draft = sectionResources.filter(resource => resource.approval_status === 'draft');
    const archived = sectionResources.filter(resource => resource.approval_status === 'archived');
    const cvrValues = sectionResources
      .map(resource => Number(resource.cvr_value || resource.default_cvr_value || 0))
      .filter(value => Number.isFinite(value) && value > 0);
    const cciCard = section.default_cci_standard_card_id ? cciById.get(section.default_cci_standard_card_id) || null : null;
    const blockingReasons: string[] = [];
    const warningReasons: string[] = [];
    if (approved.length === 0) blockingReasons.push('No approved sentence prompts');
    if (!section.default_cci_standard_card_id) blockingReasons.push('No default CCI Standard');
    if (section.default_cci_standard_card_id && (!cciCard || cciCard.active === false)) blockingReasons.push('Default CCI Standard is inactive or missing');
    const missingEnAudioCount = sectionResources.filter(resource => !resource.audio_en_url).length;
    const missingViAudioCount = sectionResources.filter(resource => !resource.audio_vi_url).length;
    if (missingEnAudioCount > 0) warningReasons.push(`${missingEnAudioCount} missing EN audio`);
    if (missingViAudioCount > 0) warningReasons.push(`${missingViAudioCount} missing VI audio`);

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      lessonId: section.lesson_id,
      orderIndex: section.order_index,
      resourceCount: sectionResources.length,
      approvedResourceCount: approved.length,
      draftResourceCount: draft.length,
      archivedResourceCount: archived.length,
      missingEnAudioCount,
      missingViAudioCount,
      minCvr: cvrValues.length ? Math.min(...cvrValues) : null,
      maxCvr: cvrValues.length ? Math.max(...cvrValues) : null,
      defaultCciCardId: cciCard?.id || section.default_cci_standard_card_id || null,
      defaultCciLabel: cciCard?.label || null,
      defaultCciStandardValue: cciCard?.standard_value ?? null,
      ready: blockingReasons.length === 0,
      blockingReasons,
      warningReasons
    };
  });

  const approved = lessonResources.filter(resource => resource.approval_status === 'approved');
  const draft = lessonResources.filter(resource => resource.approval_status === 'draft');
  const archived = lessonResources.filter(resource => resource.approval_status === 'archived');
  const blockingReasons: string[] = [];
  const warningReasons: string[] = [];
  if (lessonSections.length === 0) blockingReasons.push('No sections/parts configured');
  if (approved.length === 0) blockingReasons.push('No approved sentence prompts');
  const sectionsMissingCci = sectionSummaries.filter(section => !section.defaultCciLabel).length;
  if (sectionsMissingCci > 0) blockingReasons.push(`${sectionsMissingCci} section(s) missing default CCI`);
  const missingEnAudioCount = lessonResources.filter(resource => !resource.audio_en_url).length;
  const missingViAudioCount = lessonResources.filter(resource => !resource.audio_vi_url).length;
  if (missingEnAudioCount > 0) warningReasons.push(`${missingEnAudioCount} missing EN audio`);
  if (missingViAudioCount > 0) warningReasons.push(`${missingViAudioCount} missing VI audio`);

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    sectionCount: lessonSections.length,
    resourceCount: lessonResources.length,
    approvedResourceCount: approved.length,
    draftResourceCount: draft.length,
    archivedResourceCount: archived.length,
    missingEnAudioCount,
    missingViAudioCount,
    ready: blockingReasons.length === 0,
    blockingReasons,
    warningReasons,
    sections: sectionSummaries
  };
}

export function nextOrderIndex<T extends { order_index: number }>(items: T[]) {
  return items.length === 0 ? 1 : Math.max(...items.map(item => Number(item.order_index) || 0)) + 1;
}

export function buildSentenceCode(course: Course | null, lesson: Lesson | null, resources: SentenceResource[]) {
  const prefix = (course?.title || lesson?.title || 'RES')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 12)
    .toUpperCase() || 'RES';
  return `${prefix}-${String(resources.length + 1).padStart(3, '0')}`;
}
