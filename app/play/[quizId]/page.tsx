"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Users, Trophy, Copy, Check } from "lucide-react"
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

  const createGameRoom = async (isSolo = false) => {
    if (!quiz) return

    setCreating(true)
    setError("")

    try {
      // Use database function to generate unique room code
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
          is_solo: isSolo,
          status: "waiting",
        })
        .select('id')
        .single()

      if (roomError) {
        console.error("Room creation error:", roomError)
        setError(`Gagal membuat room game: ${roomError.message}`)
        setCreating(false)
        return
      }

      if (isSolo) {
        // For solo game, add the user as participant and start immediately
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

        const { error: updateError } = await supabase
          .from("game_rooms")
          .update({ status: "playing" })
          .eq("id", room.id)

        if (updateError) {
          setError("Gagal memulai game solo")
          setCreating(false)
          return
        }


        // Redirect to solo game
        router.push(`/game/${room.id}`)
      } else {
        // For multiplayer, redirect to host lobby
        router.push(`/host/${room.id}`)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Terjadi kesalahan yang tidak terduga")
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
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Tidak Ditemukan</h2>
            <p className="text-gray-600 mb-6">Quiz yang Anda cari tidak ditemukan atau tidak tersedia.</p>
            <Button onClick={() => router.push("/dashboard")}>Kembali ke Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
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
        <div className="w-full max-w-2xl">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* {process.env.NODE_ENV === "development" && (
            <div className="mb-4 p-4 bg-gray-100 rounded text-sm">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>User ID: {user?.id}</p>
              <p>Quiz ID: {resolvedParams.quizId}</p>
              <p>Quiz loaded: {quiz ? "Yes" : "No"}</p>
              <p>Creating: {creating ? "Yes" : "No"}</p>
            </div>
          )} */}

          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl">{quiz.title}</CardTitle>
              <CardDescription className="text-lg">{quiz.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Quiz Info */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{quiz.questions?.length || 0}</div>
                  <div className="text-sm text-blue-600">Pertanyaan</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((quiz.questions?.reduce((acc: number, q: any) => acc + q.time_limit, 0) || 0) / 60)}
                  </div>
                  <div className="text-sm text-green-600">Menit</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {quiz.questions?.reduce((acc: number, q: any) => acc + q.points, 0) || 0}
                  </div>
                  <div className="text-sm text-purple-600">Max Poin</div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Dibuat oleh{" "}
                  <span className="font-semibold">{quiz.profiles?.full_name || quiz.profiles?.username}</span>
                </p>
              </div>

              {/* Game Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Pilih Mode Permainan</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Solo Mode */}
                  <Button
                    onClick={() => createGameRoom(true)}
                    disabled={creating}
                    className="h-20 flex-col bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-6 h-6 mb-2" />
                    <span className="font-semibold">Main Solo</span>
                    <span className="text-xs opacity-90">Bermain sendiri</span>
                  </Button>

                  {/* Multiplayer Mode */}
                  <Button
                    onClick={() => createGameRoom(false)}
                    disabled={creating}
                    className="h-20 flex-col bg-green-600 hover:bg-green-700"
                  >
                    <Users className="w-6 h-6 mb-2" />
                    <span className="font-semibold">Multiplayer</span>
                    <span className="text-xs opacity-90">Bermain dengan teman</span>
                  </Button>
                </div>
              </div>

              {/* Share Quiz */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-center mb-4">Bagikan Quiz</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copyQuizLink} className="flex-1 bg-transparent">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Disalin!" : "Salin Link"}
                  </Button>
                </div>
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
