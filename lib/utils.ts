import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function calculatePoints(basePoints: number, timeLimit: number, answerTime: number): number {
  const timeBonus = Math.max(0, (timeLimit - answerTime) / timeLimit)
  return Math.floor(basePoints * (0.5 + 0.5 * timeBonus))
}
