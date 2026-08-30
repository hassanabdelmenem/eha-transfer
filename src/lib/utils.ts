import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { format } from 'date-fns';

export function formatDateTime(isoString?: string | null) {
  if (!isoString) return 'Unknown Time';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return format(date, 'MMM d, yyyy h:mm a');
}
