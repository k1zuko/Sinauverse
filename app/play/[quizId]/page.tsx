"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Users, Trophy, Copy, Check, BookOpen, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function PlayQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [quiz, setQuiz] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchQuiz()
    }
  }, [user, loading, resolvedParams.quizId])

  const fetchQuiz = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
        *,
        questions (
          id,
          question_text,
          time_limit,
          points,
          answer_options (
            id,
            option_text,
            is_correct
          )
        ),
        profiles:creator_id (username, full_name)
      `)
        .eq("id", resolvedParams.quizId)
        .single()

      if (error) {
        console.error("Quiz fetch error:", error)
        setError(`Quiz tidak ditemukan: ${error.message}`)
        return
      }

      if (!data) {
        setError("Quiz tidak ditemukan")
        return
      }

      console.log("Quiz loaded:", data)
      setQuiz(data)
    } catch (err) {
      console.error("Unexpected error fetching quiz:", err)
      setError("Terjadi kesalahan saat memuat quiz")
    }
  }

  const createGameRoom = async (mode: "solo" | "multi" | "practice") => {
    if (!quiz) return

    setCreating(true)
    setError("")

    try {
      const { data: codeData, error: codeError } = await supabase.rpc("generate_room_code")

      if (codeError) {
        console.error("Error generating room code:", codeError)
        setError("Gagal membuat kode room")
        setCreating(false)
        return
      }

      const roomCode = codeData

      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .insert({
          room_code: roomCode,
          quiz_id: quiz.id,
          host_id: user!.id,
          is_solo: mode === "solo",
          mode: mode,
          status: "waiting",
        })
        .select("id")
        .single()

      if (roomError) {
        console.error("Room creation error:", roomError)
        setError(`Gagal membuat room game: ${roomError.message}`)
        setCreating(false)
        return
      }

      // Tambahkan peserta jika solo
      if (mode === "solo") {
        const { error: participantError } = await supabase.from("game_participants").insert({
          room_id: room.id,
          user_id: user!.id,
          nickname: user!.email?.split("@")[0] || "Player",
        })

        if (participantError) {
          console.error("Participant error:", participantError)
          setError(`Gagal bergabung ke game: ${participantError.message}`)
          setCreating(false)
          return
        }

        const { error: updateError } = await supabase.from("game_rooms").update({ status: "playing" }).eq("id", room.id)

        if (updateError) {
          setError("Gagal memulai game solo")
          setCreating(false)
          return
        }

        router.push(`/game/${room.id}`)
      }

      if (mode === "multi") {
        router.push(`/host/${room.id}`)
      }

      if (mode === "practice") {
        router.push(`/practice-host/${room.id}`)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Terjadi kesalahan yang tidak terduga")
    } finally {
      setCreating(false)
    }
  }

  const copyQuizLink = () => {
    const link = `${window.location.origin}/play/${quiz.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast({
      title: "Link disalin!",
      description: "Link quiz telah disalin ke clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
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

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-xl shadow-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Tidak Ditemukan</h2>
            <p className="text-gray-600 mb-6">Quiz yang Anda cari tidak ditemukan atau tidak tersedia.</p>
            <Button onClick={() => router.push("/dashboard")} className="bg-purple-600 hover:bg-purple-700">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalTime = quiz.questions?.reduce((acc: number, q: any) => acc + q.time_limit, 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500">
      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white/10 backdrop-blur-sm shadow-md">
        <Link href="/dashboard" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-purple-600 fill-current" />
          </div>
          <span className="font-bold text-2xl drop-shadow-md">Sinauverse</span>
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-2xl animate-fade-in">
          {error && (
            <Alert variant="destructive" className="mb-6 animate-pop-in">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="border-0 shadow-2xl rounded-xl">
            <CardHeader className="text-center pt-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Trophy className="w-10 h-10 text-yellow-300" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">{quiz.title}</CardTitle>
              <CardDescription className="text-lg text-gray-600">{quiz.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Quiz Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-blue-600">{quiz.questions?.length || 0}</div>
                  <div className="text-sm text-blue-600">Pertanyaan</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-emerald-600">
                    {totalTime >= 60 ? Math.round(totalTime / 60) : totalTime}
                  </div>
                  <div className="text-sm text-emerald-600">{totalTime >= 60 ? "Menit" : "Detik"}</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-purple-600">
                    {quiz.questions?.reduce((acc: number, q: any) => acc + q.points, 0) || 0}
                  </div>
                  <div className="text-sm text-purple-600">Max Poin</div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="text-center p-4 bg-gray-50 rounded-lg shadow-sm">
                <p className="text-sm text-gray-600">
                  Dibuat oleh{" "}
                  <span className="font-semibold text-gray-800">
                    {quiz.profiles?.full_name || quiz.profiles?.username}
                  </span>
                </p>
              </div>

              {/* Game Options */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-center text-gray-800">Pilih Mode Permainan</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Solo Mode */}
                  <Card className="flex flex-col items-center p-5 bg-blue-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <Play className="w-8 h-8 mb-2" />
                    <span className="font-bold text-lg">Solo</span>
                    <span className="text-xs opacity-90 mb-3">Bermain sendiri</span>
                    <Button
                      onClick={() => createGameRoom("solo")}
                      disabled={creating}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-full"
                    >
                      Mainkan
                    </Button>
                  </Card>

                  {/* Multiplayer Mode */}
                  <Card className="flex flex-col items-center p-5 bg-emerald-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <Users className="w-8 h-8 mb-2" />
                    <span className="font-bold text-lg">Multiplayer</span>
                    <span className="text-xs opacity-90 mb-3">Bermain dengan teman</span>
                    <Button
                      onClick={() => createGameRoom("multi")}
                      disabled={creating}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-full"
                    >
                      Mainkan
                    </Button>
                  </Card>

                  {/* Practice Mode */}
                  <Card className="flex flex-col items-center p-5 bg-orange-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                    <BookOpen className="w-8 h-8 mb-2" />
                    <span className="font-bold text-lg">Practice</span>
                    <span className="text-xs opacity-90 mb-3">Belajar santai</span>
                    <Button
                      onClick={() => createGameRoom("practice")}
                      disabled={creating}
                      className="w-full bg-orange-700 hover:bg-orange-800 text-white font-semibold rounded-full"
                    >
                      Mainkan
                    </Button>
                  </Card>
                </div>
              </div>

              {/* Share Quiz */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-xl font-bold text-center text-gray-800 mb-4">Bagikan Quiz</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={copyQuizLink}
                    className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 shadow-sm"
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Disalin!" : "Salin Link"}
                  </Button>
                </div>
              </div>

              {/* Back Button */}
              <div className="text-center mt-6">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
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
