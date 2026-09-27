/**
 * One threshold for every free-bed read-out (manager bars, nurse steppers):
 * critical at 0 free, warning under 20% free, success above. The number beside
 * the bar always states the count, so the colour is never the only signal.
 */
export function capacityTone(free: number, total: number): { text: string; bar: string; level: 'full' | 'low' | 'ok' } {
  const ratio = total > 0 ? free / total : 0;
  if (free <= 0) return { level: 'full', text: 'text-critical-700 dark:text-critical-300', bar: 'bg-critical-700 dark:bg-critical-400' };
  if (ratio < 0.2) return { level: 'low', text: 'text-warning-800 dark:text-warning-300', bar: 'bg-warning-800 dark:bg-warning-400' };
  return { level: 'ok', text: 'text-success-700 dark:text-success-300', bar: 'bg-success-700 dark:bg-success-400' };
}
