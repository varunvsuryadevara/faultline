const RECENT_KEY = 'faultline_recent_cases';
const MAX_RECENT = 10;

export function getRecentCases() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentCase(item) {
  if (!item?.id || typeof window === 'undefined') return [];
  const current = getRecentCases();
  const filtered = current.filter((x) => x.id !== item.id);
  const updated = [
    {
      id: item.id,
      title: item.title || item.id,
      country: item.country || 'UK',
      intent: item.intent || 'insufficient-evidence',
      risk: item.risk || 'medium',
      decision: item.decision || null,
      confidence: item.confidence || null,
      isCustom: Boolean(item.isCustom),
      timestamp: Date.now(),
    },
    ...filtered,
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export function clearRecentCases() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {}
}
