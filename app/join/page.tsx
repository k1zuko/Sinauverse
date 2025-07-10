"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Users, GamepadIcon, Home } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
// import { useSearchParams } from "next/navigation"


export default function JoinGamePage({ searchParams,
}: {
  searchParams: { code?: string }
}) {
  // const searchParams = useSearchParams()
  const [roomCode, setRoomCode] = useState(searchParams.code?.toUpperCase() || '')
  const [nickname, setNickname] = useState('')
const { user, profile, loading } = useAuth()
const router = useRouter()
const { toast } = useToast()
const [joining, setJoining] = useState(false)
const [error, setError] = useState("")

useEffect(() => {
  const codeFromUrl = searchParams.get("code")
  if (codeFromUrl) {
    setRoomCode(codeFromUrl.toUpperCase())
  }
}, [])


const handleJoinGame = async (e: React.FormEvent) => {
  e.preventDefault()
  setJoining(true)
  setError("")

  if (!roomCode.trim()) {
    setError("Masukkan kode room")
    setJoining(false)
    return
  }

  if (!nickname.trim()) {
    setError("Masukkan nickname")
    setJoining(false)
    return
  }

  try {
    // Check if room exists and is active
    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("room_code", roomCode.toUpperCase())
      .eq("status", "waiting")
      .single()

    if (roomError || !room) {
      setError("Kode room tidak ditemukan atau game sudah dimulai")
      setJoining(false)
      return
    }

    // Check if nickname is already taken in this room
    const { data: existingParticipant } = await supabase
      .from("game_participants")
      .select("id")
      .eq("room_id", room.id)
      .eq("nickname", nickname)
      .single()

    if (existingParticipant) {
      setError("Nickname sudah digunakan di room ini")
      setJoining(false)
      return
    }

    // Join the game
    const { error: joinError } = await supabase.from("game_participants").insert({
      room_id: room.id,
      user_id: user?.id || null,
      nickname: nickname,
    })

    if (joinError) {
      setError("Gagal bergabung ke game")
      setJoining(false)
      return
    }

    toast({
      title: "Berhasil bergabung!",
      description: `Kamu telah bergabung ke room ${roomCode}`,
    })

    // Redirect to game room
    router.push(`/game/${room.id}`)
  } catch (err) {
    setError("Terjadi kesalahan yang tidak terduga")
    setJoining(false)
  }
}

if (loading) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-2xl">Loading...</div>
    </div>
  )
}

return (
  <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-500 to-pink-400">
    {/* Header */}
    <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white/10 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Play className="w-5 h-5 text-purple-600 fill-current" />
        </div>
        <span className="text-white font-bold text-xl">Sinauverse</span>
      </Link>

      <nav className="ml-auto hidden md:flex gap-6">
        {user && (
          <>
            <Link href="/dashboard" className="text-white/90 hover:text-white font-medium">
              Dashboard
            </Link>
            <Link href="/create" className="text-white/90 hover:text-white font-medium">
              Buat Kuis
            </Link>
          </>
        )}
      </nav>

      <div className="ml-6 flex gap-3">
        {user ? (
          <Button onClick={() => router.push("/dashboard")} className="bg-white text-purple-600 hover:bg-white/90">
            Dashboard
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => router.push("/auth/login")}
            >
              Masuk
            </Button>
            <Button
              className="bg-white text-purple-600 hover:bg-white/90"
              onClick={() => router.push("/auth/register")}
            >
              Daftar
            </Button>
          </>
        )}
      </div>
    </header>

    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <GamepadIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Join Game</h1>
          <p className="text-white/80 text-lg">Masukkan kode room untuk bergabung</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Bergabung ke Game</CardTitle>
            <CardDescription className="text-center">
              Masukkan kode room dan nickname untuk mulai bermain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinGame} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="roomCode">Kode Room</Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Masukkan kode 6 digit"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  disabled={joining}
                  className="text-center text-2xl font-bold tracking-widest"
                />
                <p className="text-xs text-gray-500 text-center">Kode room biasanya terdiri dari 6 digit angka</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="Nama yang akan ditampilkan"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  required
                  disabled={joining}
                />
                {user && profile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNickname(profile.username || profile.full_name || "")}
                    className="text-xs"
                  >
                    Gunakan nama profil: {profile.username || profile.full_name}
                  </Button>
                )}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={joining}>
                {joining ? (
                  <>
                    <Users className="w-4 h-4 mr-2 animate-spin" />
                    Bergabung...
                  </>
                ) : (
                  <>
                    <GamepadIcon className="w-4 h-4 mr-2" />
                    Bergabung ke Game
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Atau</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => router.push("/demo")} className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Demo Game
                </Button>
                <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Beranda
                </Button>
              </div>

              {!user && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600">
                    Belum punya akun?{" "}
                    <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
                      Daftar gratis
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-white">
              <Users className="w-5 h-5 mt-0.5 text-white/80" />
              <div className="text-sm">
                <p className="font-medium mb-1">Tips bergabung ke game:</p>
                <ul className="text-white/80 space-y-1 text-xs">
                  <li>• Minta kode room dari host game</li>
                  <li>• Gunakan nickname yang unik</li>
                  <li>• Pastikan koneksi internet stabil</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)
}
