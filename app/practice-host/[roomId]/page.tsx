"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Play, Crown, Home, CheckCircle, BookOpen, Timer } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { QRCodeSVG } from "qrcode.react"

export default function PracticeHostPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting")
  const [actionLoading, setActionLoading] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [playerProgress, setPlayerProgress] = useState<{ [key: string]: number }>({})
  const [practiceTimeLeft, setPracticeTimeLeft] = useState(0)

  useEffect(() => {
    if (!loading && user) {
      fetchRoomData()

      const cleanup = subscribeToUpdates()
      return cleanup
    }
  }, [user, loading, resolvedParams.roomId])

  const fetchRoomData = async () => {
    try {
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

      const sortedQuestions = roomData.quizzes.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      setQuestions(sortedQuestions)

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
      fetchPlayerProgress()
    }
  }

  const subscribeToUpdates = () => {
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
        () => {
          fetchParticipants()
        },
      )
      .subscribe()

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
          setGameState(newData.status)
        },
      )
      .subscribe()

    // ✅ RETURN fungsi cleanup-nya
    return () => {
      supabase.removeChannel(participantsChannel)
      supabase.removeChannel(roomChannel)
    }
  }

  const startGame = async () => {
    setActionLoading(true)
    try {
      const totalTime = questions.reduce((acc, q) => acc + q.time_limit, 0)

      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          practice_started_at: new Date().toISOString(),
          current_question: 0,
          practice_total_time: totalTime,
        })
        .eq("id", resolvedParams.roomId)

      if (error) throw error

      toast({
        title: "Practice Mode Dimulai!",
        description: `Pemain memiliki ${totalTime >= 60
          ? `${Math.round(totalTime / 60)} menit`
          : `${totalTime} detik`} untuk menyelesaikan semua soal`,
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

  const endGame = async () => {
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
        description: "Practice session telah dihentikan",
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

  // Add this effect to calculate and maintain practice timer
  useEffect(() => {
    if (room?.mode === "practice" && room.practice_started_at && questions.length > 0) {
      const totalTime = questions.reduce((acc, q) => acc + q.time_limit, 0)

      const startTime = new Date(room.practice_started_at).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)

      const remaining = Math.max(totalTime - elapsed, 0)
      setPracticeTimeLeft(remaining)

      // Update timer every second
      const timer = setInterval(() => {
        const currentTime = Date.now()
        const currentElapsed = Math.floor((currentTime - startTime) / 1000)
        const currentRemaining = Math.max(totalTime - currentElapsed, 0)

        setPracticeTimeLeft(currentRemaining)

        if (currentRemaining === 0) {
          clearInterval(timer)
        }
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [room, questions])

  // Add function to fetch player progress
  const fetchPlayerProgress = async () => {
    if (!questions.length) return

    try {
      const { data: answers } = await supabase
        .from("game_answers")
        .select("participant_id")
        .eq("room_id", resolvedParams.roomId)

      if (answers) {
        const progress: { [key: string]: number } = {}
        participants.forEach((participant) => {
          const participantAnswers = answers.filter((a) => a.participant_id === participant.id)
          progress[participant.id] = participantAnswers.length
        })
        setPlayerProgress(progress)
      }
    } catch (error) {
      console.error("Error fetching player progress:", error)
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

  const totalTime = questions.reduce((acc, q) => acc + q.time_limit, 0)
  const finishedParticipants = participants.filter((p) => p.is_finished).length

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg p-6 text-white mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <BookOpen className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Practice Host Dashboard</h1>
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
                {gameState === "waiting" ? "Menunggu" : gameState === "playing" ? "Practice Mode" : "Selesai"}
              </Badge>
            </div>
          </div>

          {gameState === "playing" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Waktu Tersisa: {Math.floor(practiceTimeLeft / 60)}:
                  {(practiceTimeLeft % 60).toString().padStart(2, "0")}
                </span>
                <span>
                  Selesai: {finishedParticipants}/{participants.length} pemain
                </span>
              </div>
              <Progress
                value={(finishedParticipants / Math.max(participants.length, 1)) * 100}
                className="h-2 bg-white/20"
              />
              <div className="text-xs opacity-75">
                Mode Practice: Pemain dapat navigasi bebas • Siapa cepat dia duluan!
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
                  Practice Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState === "waiting" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <Timer className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                      <p className="text-sm text-orange-800">Menunggu pemain bergabung...</p>
                      <p className="text-xs text-orange-600 mt-1">{participants.length} pemain terdaftar</p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Practice Mode Info</h4>
                      <div className="space-y-1 text-sm text-blue-700">
                        <p>• Total waktu: {Math.round(totalTime / 60)} menit</p>
                        <p>• {questions.length} pertanyaan</p>
                        <p>• Navigasi bebas (back/next)</p>
                        <p>• Selesai kapan saja</p>
                      </div>
                    </div>

                    <Button
                      onClick={startGame}
                      disabled={actionLoading || participants.length === 0}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {actionLoading ? "Memulai..." : "Mulai Practice Session"}
                    </Button>
                  </div>
                )}

                {gameState === "playing" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <BookOpen className="w-8 h-8 mx-auto text-green-600 mb-2" />
                      <p className="text-sm text-green-800">Practice Session Aktif</p>
                      <p className="text-xs text-green-600 mt-1">Pemain belajar dengan santai</p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Progress Pemain</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Selesai:</span>
                          <span className="font-bold">
                            {finishedParticipants}/{participants.length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Masih belajar:</span>
                          <span>{participants.length - finishedParticipants}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={endGame}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full"
                      size="sm"
                    >
                      {actionLoading ? "Menghentikan..." : "Akhiri Session"}
                    </Button>
                  </div>
                )}

                {gameState === "finished" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Trophy className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-800">Practice session selesai</p>
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

          {/* Participants List */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {gameState === "finished" ? (
                    <>
                      <Trophy className="w-5 h-5" />
                      Hasil Practice ({participants.length} pemain)
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
                    {participants.map((participant, index) => {
                      const progress = playerProgress[participant.id] || 0
                      const progressPercentage = questions.length > 0 ? (progress / questions.length) * 100 : 0

                      return (
                        <div
                          key={participant.id}
                          className={`p-4 rounded-lg border ${gameState === "finished"
                            ? index === 0
                              ? "bg-yellow-100 border-2 border-yellow-300"
                              : "bg-gray-50"
                            : participant.is_finished
                              ? "bg-green-50 border border-green-200"
                              : "bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${participant.is_finished
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
                              <div>
                                <p className="font-semibold flex items-center gap-2">
                                  {participant.nickname}
                                  {gameState === "finished" && index === 0 && (
                                    <span className="text-yellow-600">👑</span>
                                  )}
                                  {participant.is_finished && gameState === "playing" && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                  <span>Bergabung: {new Date(participant.joined_at).toLocaleTimeString()}</span>
                                  {gameState === "playing" && (
                                    <span
                                      className={`px-2 py-1 rounded ${participant.is_finished
                                        ? "bg-green-100 text-green-800"
                                        : "bg-blue-100 text-blue-800"
                                        }`}
                                    >
                                      {participant.is_finished ? "✅ Selesai" : "📚 Belajar"}
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

                          {/* Progress Bar */}
                          {gameState === "playing" && !participant.is_finished && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>
                                  Progress: {progress}/{questions.length} soal
                                </span>
                                <span>{Math.round(progressPercentage)}%</span>
                              </div>
                              <Progress value={progressPercentage} className="h-2" />
                            </div>
                          )}

                          {/* {participant.is_finished && (
                            <div className="mt-2 text-xs text-green-600 font-medium">
                              ✅ Selesai pada: {new Date(participant.finished_at).toLocaleTimeString()}
                            </div>
                          )} */}
                        </div>
                      )
                    })}
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

          {/* Questions Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Soal Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto">
                {questions.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading questions...</p>
                ) : (
                  <div className="space-y-3">
                    {questions.map((question, qIndex) => (
                      <div key={question.id} className="p-3 rounded-lg border bg-gray-50 border-gray-200">
                        <div className="flex items-start gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {qIndex + 1}
                          </Badge>
                          <p className="text-sm font-medium leading-tight">{question.question_text}</p>
                        </div>
                        <div className="ml-6 text-xs text-gray-500">
                          {question.time_limit}s • {question.points} poin
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm font-semibold text-orange-800">Total Practice Time</p>
                      <p className="text-lg font-bold text-orange-600">{totalTime >= 60
                        ? `${Math.round(totalTime / 60)} menit`
                        : `${totalTime} detik`}</p>
                    </div>
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
