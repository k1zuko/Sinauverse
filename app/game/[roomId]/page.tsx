"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Users, Home, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

const answerColors = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
]

const answerShapes = ["△", "◇", "○", "□"]

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
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting")
  const [hasAnswered, setHasAnswered] = useState(false)
  const [gameMode, setGameMode] = useState<"solo" | "multi" | "practice">("multi")

  // Practice mode specific state
  const [practiceAnswers, setPracticeAnswers] = useState<{ [key: number]: number }>({})
  const [practiceTimeLeft, setPracticeTimeLeft] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  // Refs for preventing stale closures and managing timers
  const gameStateRef = useRef(gameState)
  const currentQuestionRef = useRef(currentQuestion)
  const selectedAnswerRef = useRef(selectedAnswer)
  const showResultRef = useRef(showResult)
  const hasAnsweredRef = useRef(hasAnswered)
  const subscriptionRef = useRef<any>(null)
  const isInitialized = useRef(false)
  const lastQuestionUpdate = useRef(0)
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null)
  const isResetting = useRef(false)

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])
  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])
  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer
  }, [selectedAnswer])
  useEffect(() => {
    showResultRef.current = showResult
  }, [showResult])
  useEffect(() => {
    hasAnsweredRef.current = hasAnswered
  }, [hasAnswered])

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

  useEffect(() => {
    if (questions.length > 0 && gameMode !== "practice") {
      forceResetQuestionState(currentQuestion, questions)
    }
  }, [currentQuestion, gameMode])

  // Practice mode timer
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameMode === "practice" && gameState === "playing" && practiceTimeLeft > 0 && !isFinished) {
      timer = setTimeout(() => {
        setPracticeTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime === 0) {
            handlePracticeTimeUp()
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [practiceTimeLeft, gameState, gameMode, isFinished])

  // Regular game timer (non-practice)
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (gameMode !== "practice" && gameState === "playing" && timeLeft > 0 && !showResult && !isResetting.current) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1
          if (newTime === 0 && !showResultRef.current && !hasAnsweredRef.current && !isResetting.current) {
            handleTimeUp()
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [timeLeft, gameState, showResult, gameMode])

  const cleanup = useCallback(() => {
    console.log("Cleaning up game page...")

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current)
      autoAdvanceTimer.current = null
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
        .select(`
          *,
          quizzes (
            id,
            title,
            questions (
              id,
              question_text,
              time_limit,
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
        `)
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
      setGameMode(roomData.mode || "multi")
      setCurrentQuestion(roomData.current_question || 0)

      // Sort questions by order
      const sortedQuestions = roomData.quizzes.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      setQuestions(sortedQuestions)

      // Initialize based on game mode
      if (roomData.mode === "practice") {
        const totalTime = sortedQuestions.reduce((acc: number, q: any) => acc + q.time_limit, 0)
        setPracticeTimeLeft(totalTime)
        setCurrentQuestion(0) // Always start from first question in practice
      } else {
        forceResetQuestionState(roomData.current_question, sortedQuestions)
      }

      // Fetch participants
      await fetchParticipants()
    } catch (error) {
      console.error("Error fetching game data:", error)
    }
  }

  const forceResetQuestionState = useCallback(
    (questionIndex: number, questionsArray: any[]) => {
      if (gameMode === "practice") return // Don't reset in practice mode

      console.log("FORCE RESET question state for question:", questionIndex)

      isResetting.current = false

      // Clear any existing auto-advance timer
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current)
        autoAdvanceTimer.current = null
      }

      // FORCE reset ALL question-related state
      setSelectedAnswer(null)
      setShowResult(false)
      setHasAnswered(false)

      // Set timer for the new question
      if (questionsArray && questionsArray[questionIndex]) {
        const newTimeLimit = questionsArray[questionIndex].time_limit || 20
        console.log("Setting time limit to:", newTimeLimit)
        setTimeLeft(newTimeLimit)
      } else {
        setTimeLeft(20)
      }

      // Allow interactions after a short delay
      setTimeout(() => {
        isResetting.current = false
        console.log("Reset complete, allowing interactions")
      }, 100)
    },
    [gameMode],
  )

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
        if (gameMode !== "practice") {
          setCurrentQuestion(myData?.current_question || 0)
        }
        setMyParticipant(myData)
        setIsFinished(myData?.is_finished || false)
      }
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const setupSubscriptions = useCallback(() => {
    if (gameMode === "practice") return // No real-time updates needed for practice mode

    console.log("Setting up real-time subscriptions...")

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const channel = supabase
      .channel(`game-${resolvedParams.roomId}-${Date.now()}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user?.id },
        },
      })
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
          const now = Date.now()

          // Debounce rapid updates
          if (now - lastQuestionUpdate.current < 500) {
            console.log("Debouncing rapid update")
            return
          }

          // Update game state
          if (newData.status !== gameStateRef.current) {
            console.log("Game state changed from", gameStateRef.current, "to", newData.status)
            setGameState(newData.status)
          }

          // Handle question change - ONLY if it's different from current
          if (newData.current_question !== currentQuestionRef.current) {
            console.log("Question changed from", currentQuestionRef.current, "to", newData.current_question)
            lastQuestionUpdate.current = now

            // IMMEDIATELY update current question
            setCurrentQuestion(newData.current_question)

            // FORCE reset state for new question
            if (questions.length > 0) {
              forceResetQuestionState(newData.current_question, questions)
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
        (payload) => {
          const newData = payload.new

          if (newData.user_id === user?.id) {
            if (newData.current_question !== currentQuestionRef.current) {
              console.log("Your question index updated to:", newData.current_question)
              setCurrentQuestion(newData.current_question)
              forceResetQuestionState(newData.current_question, questions)
            }
          }

          fetchParticipants()
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to real-time updates")
        } else if (status === "CHANNEL_ERROR") {
          console.error("Subscription error, retrying...")
          setTimeout(() => {
            setupSubscriptions()
          }, 2000)
        }
      })

    subscriptionRef.current = channel
  }, [resolvedParams.roomId, user?.id, questions, forceResetQuestionState, gameMode])

  // Re-setup subscriptions when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && user && !subscriptionRef.current && gameMode !== "practice") {
      setupSubscriptions()
    }
  }, [questions, user, setupSubscriptions, gameMode])

  // Practice mode functions
  const handlePracticeAnswerSelect = (answerIndex: number) => {
    if (isFinished) return

    const newAnswers = { ...practiceAnswers, [currentQuestion]: answerIndex }
    setPracticeAnswers(newAnswers)

    // Auto-save answer
    savePracticeAnswer(answerIndex)
  }

  const savePracticeAnswer = async (answerIndex: number) => {
    if (!myParticipant || !questions[currentQuestion]) return

    const question = questions[currentQuestion]
    const selectedOption = question.answer_options.find((opt: any) => opt.option_index === answerIndex)
    const isCorrect = selectedOption?.is_correct || false
    const points = isCorrect ? question.points : 0

    try {
      // Save or update answer
      const { data: existingAnswer, error: fetchError } = await supabase
        .from("game_answers")
        .select("id")
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", myParticipant.id)
        .eq("question_id", question.id)
        .maybeSingle()

      if (fetchError) {
        console.error("Gagal cek jawaban:", fetchError)
        return
      }

      if (existingAnswer) {
        const { error: updateError } = await supabase
          .from("game_answers")
          .update({
            selected_option_id: selectedOption?.id,
            is_correct: isCorrect,
            points_earned: points,
            answer_time: 0,
          })
          .eq("id", existingAnswer.id)

        if (updateError) {
          console.error("Gagal update jawaban:", updateError)
        }
      } else {
        const { error: insertError } = await supabase
          .from("game_answers")
          .insert({
            room_id: resolvedParams.roomId,
            participant_id: myParticipant.id,
            question_id: question.id,
            selected_option_id: selectedOption?.id,
            is_correct: isCorrect,
            points_earned: points,
            answer_time: 0,
          })

        if (insertError) {
          console.error("Gagal insert jawaban:", insertError)
        }

      }
    } catch (error) {
      console.error("Error saving practice answer:", error)
    }
  }

  const navigateQuestion = (direction: "prev" | "next") => {
    if (isFinished) return

    if (direction === "prev" && currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    } else if (direction === "next" && currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const finishPractice = async () => {
    if (!myParticipant) return

    try {
      // Calculate total score from all answers
      const { data: answers } = await supabase
        .from("game_answers")
        .select("points_earned")
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", myParticipant.id)

      const totalScore = answers?.reduce((acc, answer) => acc + answer.points_earned, 0) || 0

      // Update participant as finished
      const { error } = await supabase
        .from("game_participants")
        .update({
          is_finished: true,
          score: totalScore,
          finished_at: new Date().toISOString(),
        })
        .eq("id", myParticipant.id)

      if (error) throw error

      setIsFinished(true)

      toast({
        title: "Practice Selesai!",
        description: `Skor akhir Anda: ${totalScore} poin`,
      })

      // Check if this was the first to finish - if so, end the game for everyone
      const { data: allParticipants } = await supabase
        .from("game_participants")
        .select("is_finished")
        .eq("room_id", resolvedParams.roomId)

      const finishedCount = allParticipants?.filter((p) => p.is_finished).length || 0

      if (finishedCount === 1) {
        // First to finish
        // End the game for everyone
        await supabase
          .from("game_rooms")
          .update({
            status: "finished",
            finished_at: new Date().toISOString(),
          })
          .eq("id", resolvedParams.roomId)

        toast({
          title: "Game Berakhir",
          description: "Anda adalah yang pertama selesai! Game berakhir untuk semua pemain.",
        })
      }
    } catch (error) {
      console.error("Error finishing practice:", error)
      toast({
        title: "Error",
        description: "Gagal menyelesaikan practice",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
  if (room?.mode === "practice" && room.practice_started_at && questions.length > 0) {
    const totalTime = questions.reduce((acc, q) => acc + q.time_limit, 0)

    const startTime = new Date(room.practice_started_at).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - startTime) / 1000)

    const remaining = Math.max(totalTime - elapsed, 0)
    setPracticeTimeLeft(remaining)
  }
}, [room, questions])

  const handlePracticeTimeUp = () => {
    toast({
      title: "Waktu Habis!",
      description: "Practice session berakhir karena waktu habis",
    })
    finishPractice()
  }

  // Regular game functions (non-practice)
  const handleAnswerSelect = async (answerIndex: number) => {
    if (
      selectedAnswerRef.current !== null ||
      showResultRef.current ||
      hasAnsweredRef.current ||
      !myParticipant ||
      gameStateRef.current !== "playing" ||
      isResetting.current ||
      gameMode === "practice"
    ) {
      console.log("Answer selection blocked:", {
        selectedAnswer: selectedAnswerRef.current,
        showResult: showResultRef.current,
        hasAnswered: hasAnsweredRef.current,
        gameState: gameStateRef.current,
        isResetting: isResetting.current,
      })
      return
    }

    console.log("Selecting answer:", answerIndex, "for question:", currentQuestionRef.current)
    setSelectedAnswer(answerIndex)
    setHasAnswered(true)

    const question = questions[currentQuestionRef.current]
    if (!question) {
      console.error("Question not found for index:", currentQuestionRef.current)
      return
    }

    const selectedOption = question.answer_options.find((opt: any) => opt.option_index === answerIndex)
    const isCorrect = selectedOption?.is_correct || false

    // Calculate points based on speed
    const timeBonus = Math.max(0, timeLeft / question.time_limit)
    const points = isCorrect ? Math.floor(question.points * (0.5 + 0.5 * timeBonus)) : 0

    try {
      // Save answer to database
      await supabase.from("game_answers").insert({
        room_id: resolvedParams.roomId,
        participant_id: myParticipant.id,
        question_id: question.id,
        selected_option_id: selectedOption?.id,
        is_correct: isCorrect,
        points_earned: points,
        answer_time: question.time_limit - timeLeft,
      })

      // Update participant score if correct
      if (isCorrect) {
        const { error: scoreError } = await supabase
          .from("game_participants")
          .update({ score: myParticipant.score + points })
          .eq("id", myParticipant.id)

        if (scoreError) {
          console.error("Error updating score:", scoreError)
        }
      }

      // Show result
      setShowResult(true)
      console.log("Answer submitted successfully, showing result")

      // Auto-advance after 3 seconds
      autoAdvanceTimer.current = setTimeout(() => {
        updateMyQuestionIndex()
      }, 3000)
    } catch (error) {
      console.error("Error submitting answer:", error)
      setSelectedAnswer(null)
      setHasAnswered(false)
      toast({
        title: "Error",
        description: "Gagal menyimpan jawaban",
        variant: "destructive",
      })
    }
  }

  const handleTimeUp = useCallback(() => {
    if (!showResultRef.current && !hasAnsweredRef.current && !isResetting.current) {
      console.log("⏰ Time up, showing result")
      setShowResult(true)
      setHasAnswered(true)

      const tryUpdateAfterReady = () => {
        if (!myParticipant || !questions.length) {
          console.warn("⏳ myParticipant or questions not ready, retrying...")
          setTimeout(tryUpdateAfterReady, 200)
          return
        }

        updateMyQuestionIndex()
      }

      autoAdvanceTimer.current = setTimeout(() => {
        tryUpdateAfterReady()
      }, 2000)
    }
  }, [myParticipant, questions])

  const updateMyQuestionIndex = async () => {
    if (!myParticipant) {
      console.warn("⛔ myParticipant belum ready, skip update")
      return
    }

    if (!questions.length) {
      console.warn("⛔ questions masih kosong, skip update")
      return
    }

    const nextIndex = (myParticipant?.current_question || 0) + 1
    const totalQuestions = questions.length

    console.log("🔥 Trying to update to question:", nextIndex, "of", totalQuestions)

    if (nextIndex < totalQuestions) {
      try {
        const { error } = await supabase
          .from("game_participants")
          .update({ current_question: nextIndex })
          .eq("id", myParticipant.id)

        if (error) {
          console.error("❌ Error updating my question index:", error)
        } else {
          console.log("✅ Updated to next question:", nextIndex)
        }

        await fetchParticipants()
      } catch (err) {
        console.error("🔥 Failed to update question index:", err)
      }
    } else {
      console.log("✅ Game finished locally, all questions done")
      await supabase
        .from("game_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", resolvedParams.roomId)
      setGameState("finished")
    }
  }

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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Menunggu Host</h2>
            <p className="text-gray-600 mb-6">
              {gameMode === "practice" ? "Practice session" : "Game"} akan dimulai sebentar lagi...
            </p>
            <div className="animate-pulse">
              <Users className="w-12 h-12 mx-auto text-purple-600" />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Room: {room.room_code} | Mode: {gameMode} | Status: {gameState}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (gameState === "finished") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-6">
                {gameMode === "practice" ? "Practice Selesai!" : "Game Selesai!"}
              </h2>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Leaderboard Final</h3>
                <div className="space-y-3">
                  {participants.slice(0, 5).map((participant, index) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : index === 2
                                ? "bg-orange-500"
                                : "bg-gray-300"
                            }`}
                        >
                          {index + 1}
                        </div>
                        <span className="font-semibold">{participant.nickname}</span>
                      </div>
                      <span className="font-bold">{participant.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Final Position */}
              {myParticipant && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Posisi Anda</h4>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-2xl font-bold text-blue-600">
                      #{participants.findIndex((p) => p.id === myParticipant.id) + 1}
                    </div>
                    <div className="text-lg text-blue-700">{myParticipant.score.toLocaleString()} poin</div>
                  </div>
                </div>
              )}

              <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700">
                <Home className="w-4 h-4 mr-2" />
                Kembali ke Dashboard
              </Button>
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

  // Practice Mode UI
  if (gameMode === "practice") {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto p-4">
          {/* Practice Header */}
          <div className="bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg p-6 text-white mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-lg font-semibold">
                  Practice Mode - Pertanyaan {currentQuestion + 1} dari {questions.length}
                </div>
                <div className="text-sm opacity-90">{room.quizzes.title}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{participants.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span className="text-2xl font-bold">{formatTime(practiceTimeLeft)}</span>
                </div>
                {isFinished && <div className="bg-green-500 px-3 py-1 rounded-full text-sm font-bold">✓ Selesai</div>}
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-white/20" />
            <div className="text-xs opacity-75 mt-2">
              Navigasi bebas • Waktu total: {formatTime(practiceTimeLeft)} • Klik selesai kapan saja
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Question */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight text-center">
                    {question.question_text}
                  </h2>

                  {/* Answer Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
                    {question.answer_options
                      .sort((a: any, b: any) => a.option_index - b.option_index)
                      .map((option: any, index: number) => {
                        const isSelected = practiceAnswers[currentQuestion] === index
                        let buttonClass = `${answerColors[index]} text-white text-xl font-bold py-6 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden`

                        if (isSelected) {
                          buttonClass += " ring-4 ring-white shadow-2xl scale-105"
                        }

                        if (isFinished) {
                          buttonClass =
                            "bg-gray-400 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden opacity-50 cursor-not-allowed"
                        }

                        return (
                          <Button
                            key={`${question.id}-${option.id}`}
                            onClick={() => handlePracticeAnswerSelect(index)}
                            disabled={isFinished}
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
                      disabled={currentQuestion === 0 || isFinished}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Sebelumnya
                    </Button>

                    <div className="flex gap-2">
                      {!isFinished && (
                        <Button onClick={finishPractice} className="bg-green-600 hover:bg-green-700 px-8">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Selesai Practice
                        </Button>
                      )}
                    </div>

                    <Button
                      onClick={() => navigateQuestion("next")}
                      disabled={currentQuestion === questions.length - 1 || isFinished}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      Selanjutnya
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Question Progress Indicator */}
                  <div className="flex justify-center mt-6">
                    <div className="flex gap-2">
                      {questions.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => !isFinished && setCurrentQuestion(index)}
                          disabled={isFinished}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${index === currentQuestion
                            ? "bg-orange-500 text-white"
                            : practiceAnswers[index] !== undefined
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            }`}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* My Score */}
                  {myParticipant && (
                    <div className="mt-8 text-center">
                      <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold">
                        <Trophy className="w-5 h-5" />
                        Poin Saya: {myParticipant.score.toLocaleString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Leaderboard
                  </h3>
                  <div className="space-y-3">
                    {participants.slice(0, 10).map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`flex items-center justify-between p-2 rounded-lg ${participant.id === myParticipant?.id ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${participant.is_finished
                              ? "bg-green-500"
                              : index === 0
                                ? "bg-yellow-500"
                                : index === 1
                                  ? "bg-gray-400"
                                  : index === 2
                                    ? "bg-orange-500"
                                    : "bg-gray-300"
                              }`}
                          >
                            {participant.is_finished ? "✓" : index + 1}
                          </div>
                          <span className="text-sm font-medium truncate">{participant.nickname}</span>
                        </div>
                        <span className="text-sm font-bold">{participant.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular Game Mode UI (Solo/Multi)
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg font-semibold">
                Pertanyaan {currentQuestion + 1} dari {questions.length}
              </div>
              <div className="text-sm opacity-90">{room.quizzes.title}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">{participants.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight">
                  {question.question_text}
                </h2>

                {/* Answer Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
                  {question.answer_options
                    .sort((a: any, b: any) => a.option_index - b.option_index)
                    .map((option: any, index: number) => {
                      let buttonClass = `${answerColors[index]} text-white text-xl font-bold py-6 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden`

                      if (showResult) {
                        if (option.is_correct) {
                          buttonClass =
                            "bg-green-500 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden ring-4 ring-green-300 animate-pulse"
                        } else if (index === selectedAnswer) {
                          buttonClass =
                            "bg-red-500 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden ring-4 ring-red-300"
                        } else {
                          buttonClass =
                            "bg-gray-400 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden opacity-50"
                        }
                      }

                      return (
                        <Button
                          key={`${question.id}-${option.id}`}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={selectedAnswer !== null || hasAnswered || isResetting.current}
                          className={buttonClass}
                        >
                          <span className="text-3xl mr-3">{answerShapes[index]}</span>
                          {option.option_text}
                        </Button>
                      )
                    })}
                </div>

                {/* Result Display */}
                {showResult && (
                  <div className="space-y-4">
                    {selectedAnswer !== null && (
                      <div className="text-center">
                        {questions[currentQuestion].answer_options[selectedAnswer]?.is_correct ? (
                          <div className="text-green-600 font-bold text-lg">✓ Benar!</div>
                        ) : (
                          <div className="text-red-600 font-bold text-lg">✗ Salah</div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-3">
                      <p className="text-sm text-gray-500">
                        {currentQuestion < questions.length - 1
                          ? "Otomatis lanjut ke pertanyaan selanjutnya dalam beberapa detik..."
                          : "Menunggu hasil akhir..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* My Score */}
                {myParticipant && (
                  <div className="mt-8">
                    <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold">
                      <Trophy className="w-5 h-5" />
                      Poin Saya: {myParticipant.score.toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Leaderboard
                </h3>
                <div className="space-y-3">
                  {participants.slice(0, 10).map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${participant.id === myParticipant?.id ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : index === 2
                                ? "bg-orange-500"
                                : "bg-gray-300"
                            }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium truncate">{participant.nickname}</span>
                      </div>
                      <span className="text-sm font-bold">{participant.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
