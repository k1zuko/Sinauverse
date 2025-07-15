"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface UseGameTimerProps {
  totalTime: number
  isActive: boolean
  onTimeUp?: () => void
}

export function useGameTimer({ totalTime, isActive, onTimeUp }: UseGameTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalTime)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Initialize timer
  useEffect(() => {
    setTimeLeft(totalTime)
    setIsRunning(false)
    startTimeRef.current = null
  }, [totalTime])

  // Start/stop timer based on isActive
  useEffect(() => {
    if (isActive && !isRunning) {
      startTimer()
    } else if (!isActive && isRunning) {
      stopTimer()
    }
  }, [isActive])

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = Math.max(prevTime - 1, 0)

          if (newTime === 0) {
            stopTimer()
            onTimeUp?.()
          }

          return newTime
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, timeLeft, onTimeUp])

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true)
      startTimeRef.current = Date.now()
    }
  }, [isRunning])

  const stopTimer = useCallback(() => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    stopTimer()
    setTimeLeft(totalTime)
    startTimeRef.current = null
  }, [totalTime])

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }, [])

  const getTimeColor = useCallback(() => {
    if (timeLeft <= 0) return "text-red-600"
    const percentage = (timeLeft / totalTime) * 100
    if (percentage > 50) return "text-green-600"
    if (percentage > 20) return "text-yellow-600"
    return "text-red-600"
  }, [timeLeft, totalTime])

  const getProgress = useCallback(() => {
    return ((totalTime - timeLeft) / totalTime) * 100
  }, [timeLeft, totalTime])

  return {
    timeLeft,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime: () => formatTime(timeLeft),
    getTimeColor,
    getProgress,
    isTimeUp: timeLeft === 0,
  }
}
