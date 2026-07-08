import { supabase } from './supabaseClient';
import { GeneratedSentenceCandidate } from '../types';

export type LessonGeneratorResourceInput = {
  name: string;
  color: string;
  ohm: number;
  enHint?: string;
};

export type GenerateLessonCandidateRequest = {
  requestId?: string;
  target: {
    courseId: string;
    lessonId: string;
    sectionId?: string | null;
  };
  generation: {
    theme?: string;
    topicLevel?: number;
    sentenceLength?: 'Very Short' | 'Short' | 'Medium' | 'Long';
    resources: LessonGeneratorResourceInput[];
    iValue?: number;
    uTotal?: number;
    settings?: Record<string, any>;
  };
};

export type GenerateLessonCandidateResponse =
  | { status: 'success'; candidate: GeneratedSentenceCandidate }
  | { status: 'processing'; candidateId: string; message: string }
  | { status: 'error'; errorMessage: string; code?: string; traceId?: string };

export function createLessonGeneratorRequestId(request: GenerateLessonCandidateRequest) {
  const payload = JSON.stringify({ target: request.target, generation: request.generation });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  }
  return `lesson-gen-${Date.now()}-${Math.abs(hash)}`;
}

export async function generateLessonCandidate(request: GenerateLessonCandidateRequest): Promise<GenerateLessonCandidateResponse> {
  if (!request.target.courseId || !request.target.lessonId) {
    return { status: 'error', errorMessage: 'Select a target course and lesson before generating.' };
  }
  if (!request.generation.resources.length) {
    return { status: 'error', errorMessage: 'Add at least one generation resource/chunk.' };
  }

  const requestWithId = {
    ...request,
    requestId: request.requestId || createLessonGeneratorRequestId(request)
  };

  const { data, error } = await supabase.functions.invoke<GenerateLessonCandidateResponse>('lesson-generator-proxy', {
    body: requestWithId
  });

  if (error) {
    return { status: 'error', errorMessage: error.message || 'Lesson generation proxy failed.' };
  }

  return data || { status: 'error', errorMessage: 'Lesson generation proxy returned an empty response.' };
}
