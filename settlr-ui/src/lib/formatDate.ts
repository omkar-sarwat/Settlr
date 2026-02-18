// Date formatting helpers using date-fns
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

/** Converts ISO date string to relative time: "2 hours ago", "3 days ago" */
export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

/** Formats date as full readable string: "15 Jan 2025, 2:30 PM" */
export function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy, h:mm a');
}

/** Returns time portion: "2:30 PM IST" */
export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a');
}

/**
 * Groups transactions by date section for list display.
 * Returns "Today", "Yesterday", or formatted date like "12 Jan 2025"
 */
export function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd MMM yyyy');
}

/** Returns greeting based on current hour: Good morning/afternoon/evening */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
