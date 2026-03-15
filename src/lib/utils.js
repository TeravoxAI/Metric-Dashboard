import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCost(value) {
  if (value === null || value === undefined) return '$0.00'
  return `$${Number(value).toFixed(4)}`
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '0'
  return Number(value).toLocaleString()
}

/** Normalize grade strings to "Grade X" format */
export function normalizeGrade(grade) {
  if (!grade) return null
  if (/^Grade\s/i.test(grade)) return grade
  return `Grade ${grade}`
}
