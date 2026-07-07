export function getShortSentenceCode(code: string | null | undefined, fallbackIndex?: number | null): string {
  const raw = String(code || '').trim();

  if (raw) {
    const parts = raw.split('__').filter(Boolean);
    const tail = parts[parts.length - 1] || '';
    const group = parts[parts.length - 2] || '';
    const trailingNumber = tail.match(/(\d+)$/)?.[1] || raw.match(/(\d+)$/)?.[1] || '';

    if (trailingNumber) {
      const shortNumber = trailingNumber.slice(-3).padStart(Math.min(3, Math.max(1, trailingNumber.length)), '0');
      const prefix = (group.match(/[A-Za-z0-9]/)?.[0] || 'S').toUpperCase();
      const candidate = `${prefix}${shortNumber}`;
      if (candidate.length < 5) return candidate;
      return shortNumber.slice(-4);
    }

    const compact = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (compact) return compact.slice(0, 4);
  }

  if (typeof fallbackIndex === 'number' && Number.isFinite(fallbackIndex)) {
    return `S${String(fallbackIndex).slice(-3).padStart(3, '0')}`;
  }

  return 'S000';
}
