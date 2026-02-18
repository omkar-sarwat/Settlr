// Tailwind class merger — handles conditional classes and deduplication
import { clsx, type ClassValue } from 'clsx';

/** Merges Tailwind CSS class names safely. Usage: cn('text-sm', condition && 'text-red-500') */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
