"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Users, Clock, Play, Crown, Home, AlertTriangle, ArrowLeft, Copy, Check, Medal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { QRCodeSVG } from "qrcode.react"
import Link from "next/link"

export default function HostPage({ params }: { params: Promise<{ roomId: string }> }) {
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
  const [copied, setCopied] = useState(false)

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
        })
        .eq("id", resolvedParams.roomId)

      if (error) throw error
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

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.room_code)
    setCopied(true)
    toast({
      title: "Kode disalin!",
      description: "Kode room telah disalin ke clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} menit`
  }

  // Podium Component
  const PodiumLeaderboard = ({ participants }: { participants: any[] }) => {
    const topThree = participants.slice(0, 3)
    const remaining = participants.slice(3, 10)

    return (
      <div className="space-y-6">
        {/* Podium for Top 3 */}
        {topThree.length > 0 && (
          <div className="relative">
            <h4 className="text-lg font-bold text-center mb-6 text-gray-800">🏆 Podium Juara</h4>
            <div className="flex items-end justify-center gap-4 mb-6">
              {/* 2nd Place */}
              {topThree[1] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <Medal className="w-8 h-8 text-white" />
                  </div>
                  <div className="bg-gray-400 text-white px-3 py-6 rounded-t-lg text-center min-w-[100px] shadow-lg">
                    <div className="text-lg font-bold">2</div>
                    <div className="text-sm font-medium truncate">{topThree[1].nickname}</div>
                    {topThree[1].fullname && (
                      <div className="text-xs opacity-90 truncate">({topThree[1].fullname})</div>
                    )}
                    <div className="text-sm font-bold mt-1">{topThree[1].score.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {topThree[0] && (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mb-2 shadow-xl animate-pulse">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                  <div className="bg-yellow-500 text-white px-4 py-8 rounded-t-lg text-center min-w-[120px] shadow-xl">
                    <div className="text-2xl font-bold">1</div>
                    <div className="text-sm font-bold truncate">{topThree[0].nickname}</div>
                    {topThree[0].fullname && (
                      <div className="text-xs opacity-90 truncate">({topThree[0].fullname})</div>
                    )}
                    <div className="text-lg font-bold mt-1">{topThree[0].score.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topThree[2] && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <Medal className="w-8 h-8 text-white" />
                  </div>
                  <div className="bg-orange-500 text-white px-3 py-4 rounded-t-lg text-center min-w-[100px] shadow-lg">
                    <div className="text-lg font-bold">3</div>
                    <div className="text-sm font-medium truncate">{topThree[2].nickname}</div>
                    {topThree[2].fullname && (
                      <div className="text-xs opacity-90 truncate">({topThree[2].fullname})</div>
                    )}
                    <div className="text-sm font-bold mt-1">{topThree[2].score.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remaining Players (4-10) */}
        {remaining.length > 0 && (
          <div>
            <h4 className="text-md font-semibold mb-3 text-gray-700">Peringkat 4-10</h4>
            <div className="space-y-2">
              {remaining.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 4}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {participant.nickname}
                        {participant.fullname && (
                          <span className="text-sm text-gray-500 ml-1">({participant.fullname})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>Bergabung: {new Date(participant.joined_at).toLocaleTimeString()}</span>
                        {gameState === "playing" && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${participant.is_finished ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                              }`}
                          >
                            {participant.is_finished ? "✅ Selesai" : "🎮 Bermain"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{participant.score.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">poin</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
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

  const finishedParticipants = participants.filter((p) => p.is_finished).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white shadow-md border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-white fill-current" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Sinauverse Host</span>
        </Link>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="max-h-xs bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-8 text-white mb-6 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Crown className="w-10 h-10 text-yellow-300" />
              <div>
                <h1 className="text-3xl font-bold">{quiz.title}</h1>
                <p className="text-lg opacity-90">{quiz.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="secondary"
                className={`${gameState === "waiting" ? "bg-yellow-500" : gameState === "playing" ? "bg-emerald-500" : "bg-gray-500"
                  } text-white text-lg px-6 py-2 rounded-full shadow-md`}
              >
                {gameState === "waiting" ? "Menunggu" : gameState === "playing" ? "Bermain" : "Selesai"}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">{questions.length}</div>
              <div className="text-sm opacity-90">Pertanyaan</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">{formatTime(quiz.total_time || 300)}</div>
              <div className="text-sm opacity-90">Waktu Total</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">{participants.length}</div>
              <div className="text-sm opacity-90">Pemain</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4">
              <div className="text-2xl font-bold">{room.mode === "solo" ? "Solo" : "Multi"}</div>
              <div className="text-sm opacity-90">Mode</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Room Code & QR Code - Optimized for Projector */}
          <div className="lg:col-span-2">
            <Card className="rounded-xl shadow-lg border-0 bg-white">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Kode Room untuk Peserta</h2>

                {/* Large Room Code for Projector */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 mb-6 shadow-lg">
                  <div className="text-6xl md:text-8xl font-bold text-white tracking-wider mb-4">{room.room_code}</div>
                  <Button
                    onClick={copyRoomCode}
                    variant="outline"
                    className="border-white text-white hover:bg-white/20 bg-transparent text-lg px-6 py-3"
                  >
                    {copied ? <Check className="w-5 h-5 mr-2" /> : <Copy className="w-5 h-5 mr-2" />}
                    {copied ? "Disalin!" : "Salin Kode"}
                  </Button>
                </div>

                {/* Large QR Code for Projector */}
                <div className="bg-white rounded-2xl p-8 shadow-inner border-4 border-gray-100">
                  <p className="text-xl font-semibold text-gray-800 mb-4">atau Scan QR Code</p>
                  <div className="w-full max-w-xs mx-auto">
                    <QRCodeSVG
                      value={`${window.location.origin}/join?code=${room.room_code}`}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      level="H"
                      className="w-full h-auto"
                    />
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <p className="text-sm text-gray-700 font-mono whitespace-nowrap">
                      <span className="text-orange-600 font-bold">{`${window.location.origin}/join?code=${room.room_code}`}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Controls */}
          <div className="space-y-6">
            <Card className="rounded-xl shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Kontrol Game
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gameState === "waiting" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm">
                      <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                      <p className="text-sm text-yellow-800 font-medium">Menunggu pemain bergabung...</p>
                      <p className="text-xs text-yellow-600 mt-1">{participants.length} pemain terdaftar</p>
                    </div>
                    <Button
                      onClick={startGame}
                      disabled={actionLoading || participants.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-full shadow-md hover:shadow-lg transition-all text-lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      {actionLoading ? "Memulai..." : "Mulai Game"}
                    </Button>
                    {participants.length === 0 && (
                      <p className="text-xs text-gray-500 text-center">Minimal 1 pemain untuk memulai</p>
                    )}
                  </div>
                )}

                {gameState === "playing" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 shadow-sm">
                      <Play className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-sm text-emerald-800 font-medium">Game Sedang Berlangsung</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {finishedParticipants}/{participants.length} selesai
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                      <h4 className="font-semibold text-blue-800 mb-2">Progress Pemain</h4>
                      <Progress
                        value={(finishedParticipants / Math.max(participants.length, 1)) * 100}
                        className="h-3 mb-2"
                      />
                      <p className="text-sm text-blue-700">
                        {finishedParticipants} dari {participants.length} pemain selesai
                      </p>
                    </div>

                    <Button
                      onClick={endGame}
                      disabled={actionLoading}
                      variant="destructive"
                      className="w-full font-bold py-3 rounded-full shadow-md hover:shadow-lg transition-all"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      {actionLoading ? "Menghentikan..." : "Hentikan Game"}
                    </Button>
                  </div>
                )}

                {gameState === "finished" && (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                      <Trophy className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                      <p className="text-sm text-gray-800 font-medium">Game telah selesai</p>
                      <p className="text-xs text-gray-600 mt-1">Lihat hasil final di bawah</p>
                    </div>
                    <Button
                      onClick={() => router.push("/dashboard")}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-full shadow-md hover:shadow-lg transition-all text-lg"
                    >
                      <Home className="w-5 h-5 mr-2" />
                      Kembali ke Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participants List with Podium */}
            <Card className="rounded-xl shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-800">
                  {gameState === "finished" ? (
                    <>
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Hasil Final ({participants.length} pemain)
                    </>
                  ) : (
                    <>
                      <Users className="w-5 h-5 text-blue-500" />
                      Pemain ({participants.length})
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Belum ada pemain bergabung</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto overscroll-contain">
                    <PodiumLeaderboard participants={participants} />
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
