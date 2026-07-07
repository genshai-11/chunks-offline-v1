import { supabase } from './supabaseClient';
import { SentenceResource } from '../types';

export type TtsLanguage = 'en' | 'vi';

export type TtsLanguagePreference = {
  provider: string;
  model: string;
  voice: string;
};

export type TtsPreferences = {
  en: TtsLanguagePreference;
  vi: TtsLanguagePreference;
};

export const DEFAULT_TTS_PREFERENCES: TtsPreferences = {
  en: {
    provider: 'google-gemini',
    model: 'gemini-2.5-flash-preview-tts',
    voice: 'en-US-Studio-Q'
  },
  vi: {
    provider: 'google-gemini',
    model: 'gemini-2.5-flash-preview-tts',
    voice: 'vi-VN-Standard-A'
  }
};

export function readTtsPreferences(): TtsPreferences {
  try {
    const raw = localStorage.getItem('chunks_tts_preferences');
    if (!raw) return DEFAULT_TTS_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      en: { ...DEFAULT_TTS_PREFERENCES.en, ...(parsed.en || {}) },
      vi: { ...DEFAULT_TTS_PREFERENCES.vi, ...(parsed.vi || {}) }
    };
  } catch {
    return DEFAULT_TTS_PREFERENCES;
  }
}

export function writeTtsPreferences(preferences: TtsPreferences) {
  localStorage.setItem('chunks_tts_preferences', JSON.stringify(preferences));
  window.dispatchEvent(new Event('chunks_tts_preferences_change'));
}

function getTtsAdminPin(): string {
  const meta = import.meta as any;
  const envPin = meta.env?.VITE_TTS_ADMIN_PIN || '';
  const cached = sessionStorage.getItem('chunks_tts_admin_pin') || '';
  if (envPin) return envPin;
  if (cached) return cached;

  const pin = window.prompt('Enter TTS admin PIN for Supabase Edge Function generate-resource-audio:') || '';
  if (pin.trim()) sessionStorage.setItem('chunks_tts_admin_pin', pin.trim());
  return pin.trim();
}

function safePathPart(value: string | null | undefined): string {
  return String(value || 'item').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

export async function generateResourceAudio(resource: SentenceResource, language: TtsLanguage) {
  const adminPin = getTtsAdminPin();
  if (!adminPin) throw new Error('TTS admin PIN is required.');

  const text = language === 'vi' ? (resource.text_vi || resource.text_en || resource.text_prompt || '') : (resource.text_en || resource.text_prompt || '');
  if (!text.trim()) throw new Error(`No ${language.toUpperCase()} text available for this resource.`);

  const preferences = readTtsPreferences();
  const languagePreference = preferences[language];
  const storagePath = `audio/generated/${safePathPart(resource.sentence_code || resource.id)}.${language}.mp3`;
  const { data, error } = await supabase.functions.invoke('generate-resource-audio', {
    body: {
      resourceId: resource.id,
      language,
      text,
      storagePath,
      adminPin,
      provider: languagePreference.provider,
      model: languagePreference.model,
      voice: languagePreference.voice,
      ttsPreferences: languagePreference
    }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.message || data.error);

  const publicUrl = data?.publicUrl || null;
  const audioField = language === 'vi' ? 'audio_vi_url' : 'audio_en_url';
  const { error: updateError } = await supabase
    .from('sentence_resources')
    .update({
      [audioField]: publicUrl || storagePath,
      updated_at: new Date().toISOString()
    })
    .eq('id', resource.id);

  if (updateError) throw updateError;

  return {
    ...data,
    publicUrl,
    storagePath,
    provider: languagePreference.provider,
    model: languagePreference.model,
    voice: languagePreference.voice
  };
}
