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
export function resolveResourceAudioUrl(rawUrl: string | null | undefined, updatedAt?: string): string {
  const source = String(rawUrl || '').trim();
  if (!source) return '';

  let url = '';
  if (ABSOLUTE_OR_EMBEDDED_URL_PATTERN.test(source)) {
    url = source;
  } else if (source.startsWith('speech-synth:')) {
    return source;
  } else {
    const storagePath = source
      .replace(/^\/+/, '')
      .replace(/^storage\/v1\/object\/public\/resource-audio\//, '')
      .replace(/^resource-audio\//, '');

    url = supabase.storage.from(RESOURCE_AUDIO_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }

  if (url && updatedAt) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}t=${new Date(updatedAt).getTime()}`;
  }

  return url;
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
