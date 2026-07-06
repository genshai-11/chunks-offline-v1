import { supabase } from './supabaseClient';

const RESOURCE_AUDIO_BUCKET = 'resource-audio';
const ABSOLUTE_OR_EMBEDDED_URL_PATTERN = /^(https?:|blob:|data:)/i;
const RESOURCE_AUDIO_PUBLIC_PATH = `/storage/v1/object/public/${RESOURCE_AUDIO_BUCKET}/`;

/**
 * Resource audio fields in the database may contain either:
 * - a fully-qualified public URL, or
 * - a Supabase Storage bucket-relative path, e.g. `audio/D15.../049.mp3`.
 *
 * HTMLAudioElement cannot play bucket-relative paths from the Vite origin, so
 * normalize storage paths to public Supabase Storage URLs before playback.
 */
export function resolveResourceAudioUrl(rawUrl: string | null | undefined): string {
  const source = String(rawUrl || '').trim();
  if (!source) return '';

  if (ABSOLUTE_OR_EMBEDDED_URL_PATTERN.test(source)) {
    return source;
  }

  // Legacy sandbox pseudo-URL. This is not directly playable by <audio>, but
  // callers that support speech synthesis fallback can detect it separately.
  if (source.startsWith('speech-synth:')) {
    return source;
  }

  const storagePath = source
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/resource-audio\//, '')
    .replace(/^resource-audio\//, '');

  return supabase.storage.from(RESOURCE_AUDIO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export function isResourceStoragePublicUrl(url: string): boolean {
  return url.includes(RESOURCE_AUDIO_PUBLIC_PATH);
}

export function getResourceStoragePath(rawUrl: string | null | undefined): string {
  const source = String(rawUrl || '').trim();
  if (!source) return '';

  if (isResourceStoragePublicUrl(source)) {
    const [, path = ''] = source.split(RESOURCE_AUDIO_PUBLIC_PATH);
    return decodeURIComponent(path.split('?')[0] || '').replace(/^\/+/, '');
  }

  if (ABSOLUTE_OR_EMBEDDED_URL_PATTERN.test(source) || source.startsWith('speech-synth:')) {
    return '';
  }

  return source
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\/resource-audio\//, '')
    .replace(/^resource-audio\//, '');
}

export async function checkResourceAudioExists(_urlOrPath: string): Promise<boolean | null> {
  // Do not block playback with Supabase Storage list() checks here.
  // Public buckets can serve objects while folder listing returns an empty array
  // under anon/RLS policies, which caused freshly generated TTS files to be
  // misclassified as missing. Use DB cleanup + audio.onerror handling instead.
  return null;
}
