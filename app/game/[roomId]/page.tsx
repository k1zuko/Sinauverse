"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Users,
  Home,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  Play,
  Flag,
  Timer,
  Medal,
  Crown,
  FileText,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Core game state
  const [room, setRoom] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [participants, setParticipants] = useState<any[]>([])
  const [myParticipant, setMyParticipant] = useState<any>(null)
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting")
  const [gameMode, setGameMode] = useState<"solo" | "multiplayer">("multiplayer")

  // Timer and answers state
  const [answers, setAnswers] = useState<{ [key: number]: number }>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)

  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(10) // 10 seconds countdown
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Refs for managing subscriptions and preventing memory leaks
  const subscriptionRef = useRef<any>(null)
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null) // Renamed from timerRef to gameTimerRef
  const isInitialized = useRef(false)
  const answersLoadedRef = useRef(false)

  // Initialize game data
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    if (user && !isInitialized.current) {
      isInitialized.current = true
      initializeGame()
    }

    return () => {
      cleanup()
    }
  }, [user, loading, resolvedParams.roomId])

  // Game Timer effect
  useEffect(() => {
    // Clear existing game timer
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }

    // Start game timer only when game is playing, not finished, has a start time, and countdown is not active
    if (gameState === "playing" && !isFinished && gameStartTime && !showCountdown) {
      console.log("Starting game timer with totalTime:", totalTime, "and startTime:", gameStartTime)

      gameTimerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - gameStartTime.getTime()) / 1000)
        const actualRemaining = Math.max(totalTime - elapsed, 0)

        console.log("Game Timer tick - Elapsed:", elapsed, "Actual Remaining:", actualRemaining)

        setTimeLeft(actualRemaining) // Update timeLeft based on actual elapsed time

        if (actualRemaining <= 0) {
          console.log("Game Time's up!")
          handleTimeUp()
          if (gameTimerRef.current) {
            clearInterval(gameTimerRef.current)
            gameTimerRef.current = null
          }
        }
      }, 1000)
    }

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current)
        gameTimerRef.current = null
      }
    }
  }, [gameState, isFinished, gameStartTime, totalTime, showCountdown])

  // Countdown Timer effect
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }

    if (showCountdown && countdownValue > 0) {
      countdownTimerRef.current = setInterval(() => {
        setCountdownValue((prev) => prev - 1)
      }, 1000)
    } else if (countdownValue === 0 && showCountdown) {
      // Countdown finished, hide countdown and let game timer start
      setShowCountdown(false)
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
      // The main game timer useEffect will now trigger because showCountdown is false
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [showCountdown, countdownValue])

  const cleanup = useCallback(() => {
    console.log("Cleaning up game page...")
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
  }, [])

  const initializeGame = async () => {
    try {
      console.log("Initializing game for room:", resolvedParams.roomId)
      await fetchGameData()
      setupSubscriptions()
    } catch (error) {
      console.error("Error initializing game:", error)
    }
  }

  const fetchGameData = async () => {
    try {
      console.log("Fetching game data...")

      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select(
          `
          *,
          quizzes (
            id,
            title,
            total_time,
            questions (
              id,
              question_text,
              points,
              order_index,
              answer_options (
                id,
                option_text,
                is_correct,
                option_index
              )
            )
          )
        `,
        )
        .eq("id", resolvedParams.roomId)
        .single()

      if (roomError) {
        console.error("Room error:", roomError)
        toast({
          title: "Error",
          description: "Room tidak ditemukan",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      console.log("Room data fetched:", roomData)

      setRoom(roomData)
      setGameState(roomData.status)
      setGameMode(roomData.mode || "multiplayer")

      // Sort questions by order
      const sortedQuestions = roomData.quizzes.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      setQuestions(sortedQuestions)

      // Set total time from quiz
      const quizTotalTime = roomData.quizzes.total_time || 300
      setTotalTime(quizTotalTime)

      // Handle timer based on game state
      if (roomData.status === "playing" && roomData.started_at) {
        const startTime = new Date(roomData.started_at)
        setGameStartTime(startTime)

        const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
        const remaining = Math.max(quizTotalTime - elapsed, 0)

        setTimeLeft(remaining)

        if (remaining <= 0) {
          handleTimeUp()
        } else {
          // ADD THIS
          if (elapsed < 10) {
            setShowCountdown(true)
            setCountdownValue(10 - elapsed)
          } else {
            setShowCountdown(false)
          }
        }
      }



      // Fetch participants
      await fetchParticipants()
    } catch (error) {
      console.error("Error fetching game data:", error)
    }
  }

  const fetchParticipants = async () => {
    try {
      const { data } = await supabase
        .from("game_participants")
        .select("*")
        .eq("room_id", resolvedParams.roomId)
        .order("score", { ascending: false })

      if (data) {
        setParticipants(data)
        const myData = data.find((p) => p.user_id === user?.id)
        setMyParticipant(myData)
        setIsFinished(myData?.is_finished || false)

        // Load existing answers if participant exists and not already loaded
        if (myData && !answersLoadedRef.current) {
          await loadExistingAnswers(myData.id)
          answersLoadedRef.current = true
        }
      }
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const loadExistingAnswers = async (participantId: string) => {
    try {
      console.log("Loading existing answers for participant:", participantId)

      const { data: answersData, error } = await supabase
        .from("game_answers")
        .select(`
          question_id,
          selected_option_id,
          selected_option:answer_options (
            option_index
          )
        `)
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", participantId)

      if (error) {
        console.error("Error loading existing answers:", error)
        return
      }

      if (answersData && answersData.length > 0) {
        const existingAnswers: { [key: number]: number } = {}

        answersData.forEach((answer: any) => {
          const questionIndex = questions.findIndex((q) => q.id === answer.question_id)
          if (questionIndex !== -1 && answer.selected_option) {
            existingAnswers[questionIndex] = answer.selected_option.option_index
          }
        })

        console.log("Loaded existing answers:", existingAnswers)
        setAnswers(existingAnswers)
      }
    } catch (error) {
      console.error("Error loading existing answers:", error)
    }
  }

  // Load answers when questions are available and participant is set
  useEffect(() => {
    if (questions.length > 0 && myParticipant && !answersLoadedRef.current) {
      loadExistingAnswers(myParticipant.id)
      answersLoadedRef.current = true
    }
  }, [questions, myParticipant])

  const setupSubscriptions = useCallback(() => {
    console.log("Setting up real-time subscriptions...")

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const channel = supabase
      .channel(`game-${resolvedParams.roomId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${resolvedParams.roomId}`,
        },
        (payload) => {
          console.log("Room update received:", payload)
          const newData = payload.new as any

          if (newData.status !== gameState) {
            console.log("Game state changed to:", newData.status)
            setGameState(newData.status)

            // Handle game start
            if (newData.status === "playing" && newData.started_at) {
              const startTime = new Date(newData.started_at)
              setGameStartTime(startTime)

              // Calculate remaining time based on actual elapsed time
              const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
              const remaining = Math.max(totalTime - elapsed, 0) // Use totalTime from state

              setTimeLeft(remaining)

              if (remaining > 0) {
                setShowCountdown(true) // Start 10-second countdown
                setCountdownValue(10)
                // toast({
                //   title: "Game Dimulai!",
                //   description: "Bersiaplah! Quiz akan segera dimulai...",
                // })
              } else {
                handleTimeUp() // If no time left, immediately handle time up
              }
            }

            // Handle game finish
            if (newData.status === "finished") {
              setIsFinished(true)
              if (gameTimerRef.current) {
                clearInterval(gameTimerRef.current)
                gameTimerRef.current = null
              }
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current)
                countdownTimerRef.current = null
              }
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_participants",
          filter: `room_id=eq.${resolvedParams.roomId}`,
        },
        () => {
          fetchParticipants()
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
      })

    subscriptionRef.current = channel
  }, [resolvedParams.roomId, gameState, totalTime])

  // Re-setup subscriptions when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && user && !subscriptionRef.current) {
      setupSubscriptions()
    }
  }, [questions, user, setupSubscriptions])

  // Handle answer selection with improved persistence and prevent auto-clicking
  const handleAnswerSelect = async (answerIndex: number) => {
    if (isFinished || gameState !== "playing" || showCountdown) return

    // Prevent rapid clicking
    const button = document.activeElement as HTMLButtonElement
    if (button) {
      button.disabled = true
      setTimeout(() => {
        button.disabled = false
      }, 500)
    }

    console.log("Answer selected:", answerIndex, "for question:", currentQuestion)

    const newAnswers = { ...answers, [currentQuestion]: answerIndex }
    setAnswers(newAnswers)

    // Save answer immediately
    await saveAnswer(answerIndex)

    // toast({
    //   title: "Jawaban Tersimpan",
    //   description: `Jawaban untuk pertanyaan ${currentQuestion + 1} telah disimpan`,
    // })
  }

  const saveAnswer = async (answerIndex: number) => {
    if (!myParticipant || !questions[currentQuestion]) return

    const question = questions[currentQuestion]
    const selectedOption = question.answer_options.find((opt: any) => opt.option_index === answerIndex)
    const isCorrect = selectedOption?.is_correct || false

    // Calculate points (simple scoring for now)
    const points = isCorrect ? question.points : 0

    try {
      // Check if answer already exists
      const { data: existingAnswer, error: fetchError } = await supabase
        .from("game_answers")
        .select("id")
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", myParticipant.id)
        .eq("question_id", question.id)
        .maybeSingle()

      if (fetchError) {
        console.error("Error checking existing answer:", fetchError)
        return
      }

      const answerTime = gameStartTime ? Math.floor((Date.now() - gameStartTime.getTime()) / 1000) : 0

      if (existingAnswer) {
        // Update existing answer
        const { error: updateError } = await supabase
          .from("game_answers")
          .update({
            selected_option_id: selectedOption?.id,
            is_correct: isCorrect,
            points_earned: points,
            answer_time: answerTime,
            answered_at: new Date().toISOString(),
          })
          .eq("id", existingAnswer.id)

        if (updateError) {
          console.error("Error updating answer:", updateError)
        } else {
          console.log("Answer updated successfully")
        }
      } else {
        // Insert new answer
        const { error: insertError } = await supabase.from("game_answers").insert({
          room_id: resolvedParams.roomId,
          participant_id: myParticipant.id,
          question_id: question.id,
          selected_option_id: selectedOption?.id,
          is_correct: isCorrect,
          points_earned: points,
          answer_time: answerTime,
          answered_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error("Error inserting answer:", insertError)
        } else {
          console.log("Answer inserted successfully")
        }
      }

      // Update participant score
      await updateParticipantScore()
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const updateParticipantScore = async () => {
    if (!myParticipant) return

    try {
      // Calculate total score from all answers
      const { data: answersData } = await supabase
        .from("game_answers")
        .select("points_earned")
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", myParticipant.id)

      const totalScore = answersData?.reduce((acc, answer) => acc + answer.points_earned, 0) || 0

      // Update participant score
      const { error } = await supabase
        .from("game_participants")
        .update({ score: totalScore })
        .eq("id", myParticipant.id)

      if (error) {
        console.error("Error updating participant score:", error)
      } else {
        setMyParticipant({ ...myParticipant, score: totalScore })
      }
    } catch (error) {
      console.error("Error updating participant score:", error)
    }
  }

  // Navigation functions
  const navigateQuestion = (direction: "prev" | "next") => {
    if (isFinished || showCountdown) return

    if (direction === "prev" && currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    } else if (direction === "next" && currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const goToQuestion = (questionIndex: number) => {
    if (isFinished || showCountdown) return
    setCurrentQuestion(questionIndex)
  }

  // Finish quiz
  const finishQuiz = async () => {
    console.log("Trying to finish quiz...")
    if (!myParticipant) return

    try {
      // Calculate total score from all answers
      const { data: answersData } = await supabase
        .from("game_answers")
        .select("points_earned")
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", myParticipant.id)

      const totalScore = answersData?.reduce((acc, answer) => acc + answer.points_earned, 0) || 0

      // Update participant as finished
      const { error } = await supabase
        .from("game_participants")
        .update({
          is_finished: true,
          score: totalScore,
          finished_at: new Date().toISOString(),
        })
        .eq("id", myParticipant.id)

      // if (error) throw error
      if (error) {
        console.error("Error finishing quiz:", error)
      } else {
        console.log("Quiz finished successfully")
      }


      setIsFinished(true)

      // Clear timers
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current)
        gameTimerRef.current = null
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }

      // toast({
      //   title: "Quiz Selesai!",
      //   description: `Skor Anda: ${totalScore.toLocaleString()} poin`,
      // })

      // Check if all players finished (for solo mode or last player)
      const { data: allParticipants } = await supabase
        .from("game_participants")
        .select("is_finished")
        .eq("room_id", resolvedParams.roomId)

      const allFinished = allParticipants?.every((p) => p.is_finished) || false

      if (allFinished || gameMode === "solo") {
        // End the game
        await supabase
          .from("game_rooms")
          .update({
            status: "finished",
            finished_at: new Date().toISOString(),
          })
          .eq("id", resolvedParams.roomId)
          .then((res) => console.log("✅ Room marked as finished:", res))

      }
    } catch (error) {
      console.error("Error finishing quiz:", error)
      toast({
        title: "Error",
        description: "Gagal menyelesaikan quiz",
        variant: "destructive",
      })
    }
  }

  const handleTimeUp = useCallback(() => {
    console.log("Time's up! Auto-finishing quiz...")
    setIsFinished(true)

    // Clear timers
    if (gameTimerRef.current) {
      clearInterval(gameTimerRef.current)
      gameTimerRef.current = null
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }

    toast({
      title: "Waktu Habis!",
      description: "Quiz berakhir karena waktu habis",
      variant: "destructive",
    })

    // Auto-finish the quiz
    finishQuiz()
  }, [myParticipant])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getTimeColor = () => {
    if (timeLeft <= 0) return "text-red-600"
    const percentage = (timeLeft / totalTime) * 100
    if (percentage > 50) return "text-green-600"
    if (percentage > 20) return "text-yellow-600"
    return "text-red-600"
  }

  // Podium Component for Final Results Only
  const PodiumLeaderboard = ({ participants }: { participants: any[] }) => {
    const topThree = participants.slice(0, 3)
    const remaining = participants.slice(3, 10)

    return (
      <div className="space-y-4">
        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <div className="relative">
            <div className="flex items-end justify-center gap-2 mb-4">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center mb-1">
                    <Medal className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-400 text-white px-2 py-3 rounded-t text-center min-w-[60px] text-xs">
                    <div className="font-bold">2</div>
                    <div className="truncate text-xs">{topThree[1].nickname}</div>
                    <div className="font-bold text-xs">{topThree[1].score.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center mb-1">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-yellow-500 text-white px-2 py-4 rounded-t text-center min-w-[70px] text-xs">
                    <div className="text-sm font-bold">1</div>
                    <div className="truncate text-xs font-medium">{topThree[0].nickname}</div>
                    <div className="font-bold text-xs">{topThree[0].score.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mb-1">
                    <Medal className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-orange-500 text-white px-2 py-2 rounded-t text-center min-w-[60px] text-xs">
                    <div className="font-bold">3</div>
                    <div className="truncate text-xs">{topThree[2].nickname}</div>
                    <div className="font-bold text-xs">{topThree[2].score.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remaining Players (4-10) */}
        {remaining.length > 0 && (
          <div className="space-y-1">
            {remaining.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${participant.id === myParticipant?.id
                  ? "bg-blue-50 border border-blue-200"
                  : "bg-gray-50 border border-gray-200"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {index + 4}
                  </div>
                  <span className="font-medium truncate">
                    {participant.nickname}
                    {participant.fullname && <span className="text-gray-500"> ({participant.fullname})</span>}
                  </span>
                </div>
                <span className="font-bold">{participant.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Check if all questions are answered
  const allQuestionsAnswered = questions.every((_, index) => answers[index] !== undefined)
  const answeredCount = Object.keys(answers).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (!room || !questions.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading game...</div>
      </div>
    )
  }

  if (gameState === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center rounded-xl shadow-2xl border-0 bg-white">
          <CardContent className="p-10">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl animate-pulse">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Menunggu Host</h2>
            <p className="text-gray-600 mb-8 text-xl">Game akan dimulai sebentar lagi...</p>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-gray-600 font-medium mb-1">Room Code</p>
                  <p className="text-3xl font-bold text-blue-600">{room.room_code}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium mb-1">Mode</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {gameMode === "solo" ? "Solo" : "Multiplayer"}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-gray-600 font-medium mb-1">Durasi</p>
                <p className="text-lg font-semibold text-gray-800">{formatTime(totalTime)}</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-blue-600 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl animate-fade-in">
          <Card className="border-0 shadow-2xl rounded-xl">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <Trophy className="w-20 h-20 text-yellow-300 mx-auto mb-4" />
                <h2 className="text-4xl font-bold mb-6 text-black drop-shadow-md">Quiz Selesai!</h2>
                <p className="text-xl text-white/90">Terima kasih telah berpartisipasi</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* My Results */}
                {myParticipant && (
                  <Card className="bg-white rounded-lg shadow-md">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">🎯 Hasil Anda</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Skor Total:</span>
                          <span className="text-2xl font-bold text-emerald-600">
                            {myParticipant.score.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Posisi:</span>
                          <span className="text-xl font-bold text-blue-600">
                            #{participants.findIndex((p) => p.id === myParticipant.id) + 1}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Jawaban Benar:</span>
                          <span className="text-lg font-semibold text-gray-800">
                            {answeredCount}/{questions.length}
                          </span>
                        </div>
                      </div>

                      {/* View Recap Button */}
                      <div className="mt-6">
                        <Button
                          onClick={() => router.push(`/recap/${resolvedParams.roomId}`)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Lihat Rekap Jawaban
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Leaderboard with Podium */}
                <Card className="bg-white rounded-lg shadow-md">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">🏆 Leaderboard</h3>
                    <div className="max-h-64 overflow-y-auto">
                      <PodiumLeaderboard participants={participants} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => router.push("/dashboard")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Make sure we have a valid question
  if (!questions[currentQuestion]) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading question...</div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  // Main Game UI - E-learning Style (NO LEADERBOARD DURING PLAY)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white shadow-md border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white fill-current" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Sinauverse</span>
        </Link>
      </header>

      {showCountdown && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="text-white text-9xl font-extrabold animate-pulse">
            {countdownValue > 0 ? countdownValue : "GO!"}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white mb-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg font-semibold">
                Pertanyaan {currentQuestion + 1} dari {questions.length}
              </div>
              <div className="text-sm opacity-90">{room.quizzes.title}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm">
                <Users className="w-4 h-4" />
                <span className="font-medium">{participants.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Timer className="w-5 h-5" />
                <span className={`text-2xl font-bold ${getTimeColor()}`}>
                  {timeLeft > 0 ? formatTime(timeLeft) : "0:00"}
                </span>
              </div>
              {isFinished && (
                <Badge className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md">
                  ✓ Selesai
                </Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" indicatorClassName="bg-white" />
          <div className="text-xs opacity-75 mt-2">
            Dijawab: {answeredCount}/{questions.length} • Mode: {gameMode === "solo" ? "Solo" : "Multiplayer"} • Waktu
            tersisa: {timeLeft > 0 ? formatTime(timeLeft) : "Habis"}
          </div>
        </div>

        {/* Question - Full Width */}
        <Card className="border-0 shadow-lg rounded-xl">
          <CardContent className="p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight text-center animate-pop-in">
              {question.question_text}
            </h2>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-8">
              {question.answer_options
                .sort((a: any, b: any) => a.option_index - b.option_index)
                .map((option: any, index: number) => {
                  const isSelected = answers[currentQuestion] === index
                  const answerColors = [
                    "bg-red-500 hover:bg-red-600",
                    "bg-blue-500 hover:bg-blue-600",
                    "bg-yellow-500 hover:bg-yellow-600",
                    "bg-emerald-500 hover:bg-emerald-600",
                  ]
                  const answerShapes = ["△", "◇", "○", "□"]

                  let buttonClass = `${answerColors[index]} text-white text-xl font-bold py-6 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden shadow-lg`

                  if (isSelected) {
                    buttonClass += " ring-4 ring-white shadow-2xl scale-105"
                  }

                  if (isFinished || showCountdown) {
                    buttonClass =
                      "bg-gray-400 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden opacity-50 cursor-not-allowed shadow-md"
                  }

                  return (
                    <Button
                      key={`${question.id}-${option.id}`}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isFinished || showCountdown}
                      className={buttonClass}
                    >
                      <span className="text-3xl mr-3">{answerShapes[index]}</span>
                      {option.option_text}
                      {isSelected && <CheckCircle className="w-6 h-6 ml-3" />}
                    </Button>
                  )
                })}
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center mt-8">
              <Button
                onClick={() => navigateQuestion("prev")}
                disabled={currentQuestion === 0 || isFinished || showCountdown}
                variant="outline"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm px-6 py-3"
              >
                <ChevronLeft className="w-5 h-5" />
                Sebelumnya
              </Button>

              <div className="flex gap-2">
                {!isFinished && allQuestionsAnswered && (
                  <Button
                    onClick={finishQuiz}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8 font-bold rounded-full shadow-lg text-lg"
                    disabled={showCountdown}
                  >
                    <Flag className="w-5 h-5 mr-2" />
                    Selesai
                  </Button>
                )}
                {!isFinished && !allQuestionsAnswered && (
                  <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                    Jawab semua soal untuk menyelesaikan ({answeredCount}/{questions.length})
                  </div>
                )}
              </div>

              <Button
                onClick={() => navigateQuestion("next")}
                disabled={currentQuestion === questions.length - 1 || isFinished || showCountdown}
                variant="outline"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm px-6 py-3"
              >
                Selanjutnya
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Question Progress Indicator */}
            <div className="flex justify-center mt-6">
              <div className="flex gap-2 flex-wrap">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => !isFinished && !showCountdown && goToQuestion(index)}
                    disabled={isFinished || showCountdown}
                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all shadow-sm ${index === currentQuestion
                      ? "bg-blue-500 text-white scale-110 shadow-lg"
                      : answers[index] !== undefined
                        ? "bg-emerald-500 text-white hover:bg-emerald-600"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* My Score */}
            {/* {myParticipant && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold shadow-md">
                  <Trophy className="w-5 h-5" />
                  Poin Saya: {myParticipant.score.toLocaleString()}
                </div>
              </div>
            )} */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
