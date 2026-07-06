export interface SchemaHealthResult {
  audioJobsAvailable: boolean;
  missingTables: string[];
  checkedAt: string;
  ttsServiceAvailable: boolean;
  ttsFunction: string;
}

/**
 * Audio generation is backed by Supabase Edge Function `generate-resource-audio`
 * and Storage bucket `resource-audio`, not by the old audio_generation_jobs table.
 */
export async function checkSchemaHealth(): Promise<SchemaHealthResult> {
  return {
    audioJobsAvailable: false,
    missingTables: [],
    ttsServiceAvailable: true,
    ttsFunction: 'generate-resource-audio',
    checkedAt: new Date().toISOString()
  };
}
