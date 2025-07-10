"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock, Play, Crown, Home, CheckCircle, BookOpen, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { QRCodeSVG } from "qrcode.react"


export default function HostPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)

  // Refs for preventing stale closures
  const gameStateRef = useRef(gameState)
  const currentQuestionRef = useRef(currentQuestion)
  const participantsRef = useRef(participants)

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])
  useEffect(() => {
    currentQuestionRef.current = currentQuestion
  }, [currentQuestion])
  useEffect(() => {
    participantsRef.current = participants
  }, [participants])

  useEffect(() => {
    if (!loading && user) {
      fetchRoomData()

      const cleanup = subscribeToUpdates()
      return cleanup
    }
  }, [user, loading, resolvedParams.roomId])


  // Auto-advance logic based on player progress
  useEffect(() => {
    if (gameState === "playing" && participants.length > 0) {
      checkAutoAdvance()
    }
  }, [participants, gameState, currentQuestion])

  const fetchRoomData = async () => {
    try {
      // Fetch room with quiz data
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
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
        toast({
          title: "Error",
          description: "Room tidak ditemukan",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      // Check if user is host
      if (roomData.host_id !== user?.id) {
        toast({
          title: "Access Denied",
          description: "Anda bukan host dari room ini",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setRoom(roomData)
      setQuiz(roomData.quizzes)
      setGameState(roomData.status)
      setCurrentQuestion(roomData.current_question)

      // Sort questions by order
      const sortedQuestions = roomData.quizzes.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      setQuestions(sortedQuestions)

      // Fetch participants
      fetchParticipants()
    } catch (error) {
      console.error("Error fetching room data:", error)
    }
  }

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from("game_participants")
      .select("*")
      .eq("room_id", resolvedParams.roomId)
      .order("score", { ascending: false })

    if (data) {
      setParticipants(data)
    }
  }

  const checkAutoAdvance = useCallback(() => {
    if (gameStateRef.current !== "playing" || participantsRef.current.length === 0) {
      return
    }

    const totalQuestions = questions.length
    if (totalQuestions === 0) return

    // Get the fastest player's progress
    const maxPlayerQuestion = Math.max(...participantsRef.current.map((p) => p.current_question || 0))

    console.log(
      `Host current: ${currentQuestionRef.current}, Max player: ${maxPlayerQuestion}, Total: ${totalQuestions}`,
    )

    // If fastest player is ahead of host display, advance host display
    if (maxPlayerQuestion > currentQuestionRef.current) {
      console.log("Auto-advancing host display to follow fastest player")
      advanceHostDisplay(maxPlayerQuestion)
    }

    // Check if all players have finished all questions
    const allPlayersFinished = participantsRef.current.every((p) => (p.current_question || 0) >= totalQuestions)
    if (allPlayersFinished && gameStateRef.current === "playing") {
      console.log("🎯 All players finished! Auto-ending game...")
      toast({
        title: "Game Selesai Otomatis",
        description: "Semua pemain telah menyelesaikan quiz",
      })
      setTimeout(() => autoEndGame(), 2000) // Small delay to show final results
    }
  }, [questions.length])

  const advanceHostDisplay = async (targetQuestion: number) => {
    if (targetQuestion >= questions.length) {
      // Game should end
      await autoEndGame()
      return
    }

    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({ current_question: targetQuestion })
        .eq("id", resolvedParams.roomId)

      if (error) {
        console.error("Error advancing host display:", error)
      } else {
        console.log("Host display advanced to question", targetQuestion + 1)
      }
    } catch (error) {
      console.error("Error in advanceHostDisplay:", error)
    }
  }

  const subscribeToUpdates = () => {
    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel(`participants-${resolvedParams.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_participants",
          filter: `room_id=eq.${resolvedParams.roomId}`,
        },
        (payload) => {
          console.log("Participant update:", payload)
          fetchParticipants()
        },
      )
      .subscribe()

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room-${resolvedParams.roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${resolvedParams.roomId}`,
        },
        (payload) => {
          const newData = payload.new as any
          console.log("Room update:", newData)
          setGameState(newData.status)
          setCurrentQuestion(newData.current_question)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(participantsChannel)
      supabase.removeChannel(roomChannel)
    }
  }

  const startGame = async () => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          current_question: 0,
        })
        .eq("id", resolvedParams.roomId)

      if (error) throw error

      toast({
        title: "Game Dimulai!",
        description: "Game berjalan otomatis dan akan selesai sendiri ketika semua player selesai",
      })
    } catch (error) {
      console.error("Error starting game:", error)
      toast({
        title: "Error",
        description: "Gagal memulai game",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const autoEndGame = async () => {
    console.log("🤖 Auto-ending game...")
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", resolvedParams.roomId)

      if (error) throw error

      console.log("✅ Game auto-ended successfully")
    } catch (error) {
      console.error("❌ Error auto-ending game:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const manualEndGame = async () => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", resolvedParams.roomId)

      if (error) throw error

      toast({
        title: "Game Dihentikan",
        description: "Game telah dihentikan secara manual",
      })
    } catch (error) {
      console.error("Error ending game:", error)
      toast({
        title: "Error",
        description: "Gagal mengakhiri game",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (!room || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading room...</div>
      </div>
    )
  }

  const totalQuestions = quiz.questions?.length || 0
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0

  // Get player progress stats
  const playerProgress = participants.map((p) => p.current_question || 0)
  const maxPlayerQuestion = playerProgress.length > 0 ? Math.max(...playerProgress) : 0
  const avgPlayerQuestion =
    playerProgress.length > 0 ? playerProgress.reduce((a, b) => a + b, 0) / playerProgress.length : 0
  const allPlayersFinished =
    participants.length > 0 && participants.every((p) => (p.current_question || 0) >= totalQuestions)

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Crown className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Host Dashboard - Auto Mode</h1>
                <p className="text-sm opacity-90">{quiz.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="bg-white/20 text-white">
                Room: {room.room_code}
              </Badge>
              <Badge
                variant="secondary"
                className={`${gameState === "waiting" ? "bg-yellow-500" : gameState === "playing" ? "bg-green-500" : "bg-gray-500"
                  } text-white`}
              >
                {gameState === "waiting" ? "Menunggu" : gameState === "playing" ? "Auto Mode" : "Selesai"}
              </Badge>
              {allPlayersFinished && gameState === "playing" && (
                <Badge variant="secondary" className="bg-orange-500 text-white animate-pulse">
                  Auto-Ending...
                </Badge>
              )}
            </div>
          </div>

          {gameState === "playing" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Tampilan: Pertanyaan {currentQuestion + 1} dari {totalQuestions}
                </span>
                <span>
                  Player Tercepat: {maxPlayerQuestion + 1}/{totalQuestions}
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
              <div className="text-xs opacity-75 flex justify-between">
                <span>
                  Rata-rata player: {(avgPlayerQuestion + 1).toFixed(1)} | Mengikuti player tercepat secara otomatis
                </span>
                {allPlayersFinished && <span className="animate-pulse">🎯 Semua player selesai - Auto ending...</span>}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Status & Controls */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Game Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState === "waiting" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                      <p className="text-sm text-yellow-800">Menunggu pemain bergabung...</p>
                      <p className="text-xs text-yellow-600 mt-1">{participants.length} pemain terdaftar</p>
                    </div>
                    <Button
                      onClick={startGame}
                      disabled={actionLoading || participants.length === 0}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {actionLoading ? "Memulai..." : "Mulai Game (Auto Mode)"}
                    </Button>
                    <div className="text-xs text-gray-500 text-center">
                      Game akan berjalan otomatis dan selesai sendiri ketika semua player selesai
                    </div>
                  </div>
                )}

                {gameState === "playing" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Play className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-green-800">Game Auto Mode Aktif</p>
                      <p className="text-xs text-green-600 mt-1">Mengikuti player tercepat</p>
                    </div>

                    {/* Player Progress Stats */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Progress Pemain</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Player Tercepat:</span>
                          <span className="font-bold">
                            {maxPlayerQuestion + 1}/{totalQuestions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rata-rata:</span>
                          <span>
                            {(avgPlayerQuestion + 1).toFixed(1)}/{totalQuestions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Host Display:</span>
                          <span className="font-bold text-blue-600">
                            {currentQuestion + 1}/{totalQuestions}
                          </span>
                        </div>
                        {allPlayersFinished && (
                          <div className="bg-orange-100 text-orange-800 p-2 rounded text-center text-xs font-semibold animate-pulse">
                            🎯 Semua player selesai!
                            <br />
                            Auto-ending game...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Emergency Stop */}
                    <Button
                      onClick={manualEndGame}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                      size="sm"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {actionLoading ? "Menghentikan..." : "Hentikan Game Paksa"}
                    </Button>
                    <div className="text-xs text-gray-500 text-center">
                      Gunakan hanya jika diperlukan - Game akan selesai otomatis
                    </div>
                  </div>
                )}

                {gameState === "finished" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Trophy className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-800">Game telah selesai</p>
                      <p className="text-xs text-gray-600 mt-1">Lihat hasil final di samping</p>
                    </div>
                    <Button onClick={() => router.push("/dashboard")} className="w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Kembali ke Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Participants List / Final Results */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {gameState === "finished" ? (
                    <>
                      <Trophy className="w-5 h-5" />
                      Hasil Final ({participants.length} pemain)
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5" />
                      Live Progress ({participants.length} pemain)
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  null
                ) : (
                  <div className="space-y-3">
                    {gameState === "finished" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-yellow-800 mb-2">🏆 Leaderboard Final</h3>
                        <p className="text-sm text-yellow-700">
                          Game selesai otomatis! Berikut adalah hasil akhir dari {participants.length} pemain.
                        </p>
                      </div>
                    )}

                    {participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${gameState === "finished"
                          ? index === 0
                            ? "bg-yellow-100 border-2 border-yellow-300"
                            : "bg-gray-50"
                          : "bg-gray-50"
                          }`}
                      >
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
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {participant.nickname}
                              {gameState === "finished" && index === 0 && <span className="text-yellow-600">👑</span>}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>Bergabung: {new Date(participant.joined_at).toLocaleTimeString()}</span>
                              {gameState === "playing" && (
                                <span
                                  className={`px-2 py-1 rounded ${(participant.current_question || 0) >= totalQuestions
                                    ? "bg-green-100 text-green-800"
                                    : "bg-blue-100 text-blue-800"
                                    }`}
                                >
                                  {(participant.current_question || 0) >= totalQuestions
                                    ? "✅ Selesai"
                                    : `Q: ${(participant.current_question || 0) + 1}/${totalQuestions}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{participant.score.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">poin</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="flex flex-col items-center gap-3 justify-center text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto opacity-50" />
                  <p>Belum ada pemain yang bergabung</p>
                  <p className="text-sm">
                    Bagikan kode room: <strong>{room.room_code}</strong>
                  </p>
                  <QRCodeSVG
                    value={`${window.location.origin}/join?code=${room.room_code}`}
                    size={100}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    className="mt-3"
                  />
                  <p className="text-xs text-black opacity-70">Scan untuk join game</p>

                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Questions Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Kunci Jawaban
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading questions...</p>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, qIndex) => (
                      <div
                        key={question.id}
                        className={`p-3 rounded-lg border ${qIndex === currentQuestion ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                          }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant={qIndex === currentQuestion ? "default" : "secondary"} className="text-xs">
                            {qIndex + 1}
                          </Badge>
                          <p className="text-sm font-medium leading-tight">{question.question_text}</p>
                        </div>

                        <div className="space-y-1 ml-6">
                          {question.answer_options
                            ?.sort((a: any, b: any) => a.option_index - b.option_index)
                            .map((option: any, optIndex: number) => (
                              <div key={option.id} className="flex items-center gap-2 text-xs">
                                <span
                                  className={`w-4 h-4 rounded flex items-center justify-center text-white text-xs font-bold ${option.is_correct ? "bg-green-500" : "bg-gray-400"
                                    }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span
                                  className={`flex-1 ${option.is_correct ? "font-semibold text-green-700" : "text-gray-600"}`}
                                >
                                  {option.option_text}
                                </span>
                                {option.is_correct && <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />}
                              </div>
                            ))}
                        </div>

                        <div className="mt-2 ml-6 text-xs text-gray-500">
                          {question.time_limit}s • {question.points} poin
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
