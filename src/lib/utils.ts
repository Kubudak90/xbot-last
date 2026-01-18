import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return sleep(delay)
}

export const TWEET_MAX_LENGTH = 280

export function countTweetLength(text: string): number {
  // Twitter counts URLs as 23 characters
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = text.match(urlRegex) || []
  let length = text.length

  for (const url of urls) {
    length = length - url.length + 23
  }

  return length
}

export function isValidTweetLength(text: string): boolean {
  return countTweetLength(text) <= TWEET_MAX_LENGTH
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
