/**
 * One threshold for every free-bed read-out (manager bars, nurse steppers,
 * the network grid): critical at 0 free, warning under 20% free, success above.
 * The number beside or inside the mark always states the count, so the colour
 * is never the only signal.
 */
export function capacityTone(free: number, total: number): { text: string; bar: string; tint: string; level: 'full' | 'low' | 'ok' } {
  const ratio = total > 0 ? free / total : 0;
  if (free <= 0) return { level: 'full', text: 'text-critical-700 dark:text-critical-300', bar: 'bg-critical-700 dark:bg-critical-400', tint: 'bg-critical-100 text-critical-800 dark:bg-critical-900/70 dark:text-critical-100' };
  if (ratio < 0.2) return { level: 'low', text: 'text-warning-800 dark:text-warning-300', bar: 'bg-warning-800 dark:bg-warning-400', tint: 'bg-warning-100 text-warning-900 dark:bg-warning-900/70 dark:text-warning-100' };
  return { level: 'ok', text: 'text-success-700 dark:text-success-300', bar: 'bg-success-700 dark:bg-success-400', tint: 'bg-success-100 text-success-800 dark:bg-success-800/80 dark:text-success-100' };
}
