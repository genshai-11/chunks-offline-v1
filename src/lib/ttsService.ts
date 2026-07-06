import { supabase } from './supabaseClient';
import { SentenceResource } from '../types';

export type TtsLanguage = 'en' | 'vi';

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

  const storagePath = `audio/generated/${safePathPart(resource.sentence_code || resource.id)}.${language}.mp3`;
  const { data, error } = await supabase.functions.invoke('generate-resource-audio', {
    body: {
      resourceId: resource.id,
      language,
      text,
      storagePath,
      adminPin
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
    storagePath
  };
}
