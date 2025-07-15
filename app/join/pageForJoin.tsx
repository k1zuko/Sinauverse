"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Play, BookOpen, Clock, Trophy } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function JoinGame() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [roomCode, setRoomCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const [roomInfo, setRoomInfo] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    // Auto-fill room code from URL parameter
    const codeFromUrl = searchParams.get("code")
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase())
      checkRoomCode(codeFromUrl.toUpperCase())
    }

    // Auto-fill nickname from user email
    if (user?.email) {
      setNickname(user.email.split("@")[0])
    }
  }, [user, loading, searchParams])

  const checkRoomCode = async (code: string) => {
    if (!code || code.length !== 6) return

    try {
      const { data, error } = await supabase
        .from("game_rooms")
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            total_time
          )
        `)
        .eq("room_code", code)
        .eq("status", "waiting")
        .single()

      if (error || !data) {
        setRoomInfo(null)
        return
      }

      setRoomInfo(data)
    } catch (err) {
      setRoomInfo(null)
    }
  }

  const handleRoomCodeChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setRoomCode(upperValue)
    setError("")

    if (upperValue.length === 6) {
      checkRoomCode(upperValue)
    } else {
      setRoomInfo(null)
    }
  }

  const joinGame = async () => {
    if (!roomCode || !nickname.trim()) {
      setError("Mohon isi kode room dan nickname")
      return
    }

    if (roomCode.length !== 6) {
      setError("Kode room harus 6 karakter")
      return
    }

    setJoining(true)
    setError("")

    try {
      // Check if room exists and is waiting
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single()

      if (roomError || !room) {
        setError("Room tidak ditemukan atau sudah tidak aktif")
        setJoining(false)
        return
      }

      if (room.status !== "waiting") {
        setError("Room sudah dimulai atau sudah selesai")
        setJoining(false)
        return
      }

      // Check if user already joined this room
      const { data: existingParticipant } = await supabase
        .from("game_participants")
        .select("id")
        .eq("room_id", room.id)
        .eq("user_id", user!.id)
        .single()

      if (existingParticipant) {
        // User already joined, redirect to game
        router.push(`/game/${room.id}`)
        return
      }

      // Join the room
      const { error: joinError } = await supabase.from("game_participants").insert({
        room_id: room.id,
        user_id: user!.id,
        nickname: profile?.username,
        fullname: profile?.full_name,
      })

      if (joinError) {
        console.error("Join error:", joinError)
        setError(`Gagal bergabung: ${joinError.message}`)
        setJoining(false)
        return
      }

      // Redirect to game page
      router.push(`/game/${room.id}`)
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Terjadi kesalahan yang tidak terduga")
    } finally {
      setJoining(false)
    }
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "practice":
        return <BookOpen className="w-5 h-5 text-orange-600" />
      case "multi":
        return <Users className="w-5 h-5 text-green-600" />
      default:
        return <Play className="w-5 h-5 text-blue-600" />
    }
  }

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case "practice":
        return "Practice Mode - Belajar santai dengan navigasi bebas"
      case "multi":
        return "Multiplayer Mode - Kompetisi real-time"
      case "solo":
        return "Solo Mode - Bermain sendiri"
      default:
        return "Game Mode"
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} menit`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center">
        <div className="text-2xl text-white font-semibold">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-black/20 backdrop-blur-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-purple-600 fill-current" />
          </div>
          <span className="font-bold text-xl">Sinauverse</span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl backdrop-blur-sm bg-white/95">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Users className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">Bergabung ke Kuis</CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                Masukkan kode room untuk bergabung ke sesi pembelajaran
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {/* Room Code Input */}
              <div className="space-y-3">
                <Label htmlFor="roomCode" className="text-gray-700 font-semibold">
                  Kode Room
                </Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Masukkan 6 digit kode"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeChange(e.target.value)}
                  maxLength={6}
                  className="text-center text-3xl font-bold tracking-widest uppercase h-16 border-2 border-gray-300 focus:border-blue-500 bg-gray-50"
                />
              </div>

              {/* Room Info */}
              {roomInfo && (
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {getModeIcon(roomInfo.mode)}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-green-800 mb-1">{roomInfo.quizzes.title}</h3>
                        <p className="text-green-600 font-medium">{getModeDescription(roomInfo.mode)}</p>
                      </div>
                    </div>

                    <div className="bg-white/70 rounded-lg p-4 mb-4">
                      <p className="text-green-700 mb-3">{roomInfo.quizzes.description}</p>
                      <div className="flex items-center gap-4 text-sm text-green-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(roomInfo.quizzes.total_time || 300)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-4 h-4" />
                          <span>Room: {roomInfo.room_code}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Room ditemukan dan siap untuk bergabung
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Join Button */}
              <Button
                onClick={joinGame}
                disabled={joining || !roomCode || !nickname.trim() || roomCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                {joining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Bergabung...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Bergabung ke Kuis
                  </>
                )}
              </Button>

              {/* Back Button */}
              <div className="text-center pt-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  ← Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
