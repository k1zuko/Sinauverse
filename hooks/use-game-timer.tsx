"use client"

import { useState, useEffect, useCallback } from "react"

interface UseGameTimerProps {
  initialTime: number
  isActive: boolean
  onTimeUp: () => void
  gameState: string
}

export function useGameTimer({ initialTime, isActive, onTimeUp, gameState }: UseGameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(false)

  // Reset timer when initialTime changes
  useEffect(() => {
    setTimeLeft(initialTime)
    setIsRunning(isActive && gameState === 'playing')
  }, [initialTime, isActive, gameState])

  // Timer logic
  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, timeLeft, onTimeUp])

  const pauseTimer = useCallback(() => {
    setIsRunning(false)
  }, [])

  const resumeTimer = useCallback(() => {
    if (timeLeft > 0 && gameState === 'playing') {
      setIsRunning(true)
    }
  }, [timeLeft, gameState])

  return {
    timeLeft,
    isRunning,
    pauseTimer,
    resumeTimer
  }
}