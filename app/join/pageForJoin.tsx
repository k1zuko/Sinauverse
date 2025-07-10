"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Play, BookOpen } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function JoinGame() {
  const { user, loading } = useAuth()
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
            description
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
        nickname: nickname.trim(),
      })

      if (joinError) {
        console.error("Join error:", joinError)
        setError(`Gagal bergabung: ${joinError.message}`)
        setJoining(false)
        return
      }

      toast({
        title: "Berhasil bergabung!",
        description: `Bergabung ke room ${roomCode} sebagai ${nickname}`,
      })

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white/10 backdrop-blur-sm">
        <Link href="/dashboard" className="flex items-center gap-2 text-white hover:text-white/80">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-purple-600 fill-current" />
          </div>
          <span className="font-bold text-xl">Sinauverse</span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Bergabung ke Game</CardTitle>
              <CardDescription>Masukkan kode room untuk bergabung</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Room Code Input */}
              <div className="space-y-2">
                <Label htmlFor="roomCode">Kode Room</Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Masukkan 6 digit kode"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeChange(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl font-bold tracking-widest uppercase"
                />
              </div>

              {/* Room Info */}
              {roomInfo && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    {getModeIcon(roomInfo.mode)}
                    <div>
                      <h3 className="font-semibold text-green-800">{roomInfo.quizzes.title}</h3>
                      <p className="text-sm text-green-600">{getModeDescription(roomInfo.mode)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-700">{roomInfo.quizzes.description}</p>
                </div>
              )}

              {/* Nickname Input */}
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="Nama yang akan ditampilkan"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Join Button */}
              <Button
                onClick={joinGame}
                disabled={joining || !roomCode || !nickname.trim() || roomCode.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {joining ? "Bergabung..." : "Bergabung ke Game"}
              </Button>

              {/* Instructions */}
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>Kode room terdiri dari 6 karakter</p>
                <p>Pastikan game belum dimulai untuk bisa bergabung</p>
              </div>

              {/* Back Button */}
              <div className="text-center">
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                  Kembali ke Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
