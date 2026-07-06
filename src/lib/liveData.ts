import { Learner } from '../types';

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
