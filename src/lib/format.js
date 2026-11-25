export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

export function formatClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "claude-sonnet-5-5" -> "Claude Sonnet 5.5"; anything else is shown as-is.
export function prettyModel(id = '') {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/i.exec(id);
  if (!m) return id;
  const family = m[1][0].toUpperCase() + m[1].slice(1);
  return `Claude ${family} ${m[2]}${m[3] ? `.${m[3]}` : ''}`;
}

export const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export const SEVERITY_LABEL = { critical: 'Critical', major: 'Major', minor: 'Minor' };

export const CATEGORY_LABEL = {
  time: 'Time',
  place: 'Place',
  sequence: 'Sequence',
  quantity: 'Quantity',
  people: 'People',
  condition: 'Condition',
  cause: 'Cause',
  statement: 'Statement',
  omission: 'Omission',
};
