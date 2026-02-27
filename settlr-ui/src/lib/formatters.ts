/**
 * Formatting utilities for Settlr UI
 * All money formatting, date formatting, and text utilities
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Converts paise (stored in database) to formatted rupees string
 * 
 * ALWAYS use this for displaying money amounts to users.
 * Never show raw paise numbers.
 * 
 * @param paise - Amount in paise (e.g., 50000 = ₹500.00)
 * @returns Formatted string like "₹500.00"
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats a date as "X mins ago", "2 hours ago", "3 days ago"
 * 
 * @param date - Date object or ISO string
 * @returns Human-readable time ago string
 */
export function timeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Formats a full date as "Jan 15, 2024, 3:45 PM"
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Shortens a long string with ellipsis
 * 
 * @param str - String to shorten
 * @param maxLength - Maximum length before truncating
 * @returns Shortened string with "..." if truncated
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from a full name
 * 
 * @param name - Full name like "Rahul Kumar"
 * @returns Initials like "RK"
 */
export function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
