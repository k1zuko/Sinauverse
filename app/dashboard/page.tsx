"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/layout/loading-spinner"
import { Plus, Play, Users, Trophy, Trash2, Calendar } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/database"

import Swal from "sweetalert2"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  questions: { id: string }[]
}

type GameRoom = Database["public"]["Tables"]["game_rooms"]["Row"] & {
  quizzes: { title: string } | null
  game_participants: { id: string }[]
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [recentGames, setRecentGames] = useState<GameRoom[]>([])
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalGames: 0,
    totalPlayers: 0,
  })
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    // ✅ Tambahkan pengecekan data belum pernah di-load
    if (user && dataLoading) {
      fetchUserData()
    }
  }, [user, loading, router])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Fetch user's quizzes
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select(`
          *,
          questions (id)
        `)
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false })

      if (quizzesData) {
        setQuizzes(quizzesData)
      }

      // Fetch recent games hosted by user
      const { data: gamesData } = await supabase
        .from("game_rooms")
        .select(`
          *,
          quizzes (title),
          game_participants (id)
        `)
        .eq("host_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (gamesData) {
        setRecentGames(gamesData)
      }

      // Calculate stats
      setStats({
        totalQuizzes: quizzesData?.length || 0,
        totalGames: gamesData?.length || 0,
        totalPlayers: gamesData?.reduce((acc, game) => acc + (game.game_participants?.length || 0), 0) || 0,
      })
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data dashboard",
        variant: "destructive",
      })
    } finally {
      setDataLoading(false)
    }
  }

  const isDeleting = useRef(false)

  const deleteQuiz = async (quizId: string) => {
    if (isDeleting.current) {
      console.warn("🛑 Delete sedang berjalan, abaikan klik")
      return
    }

    const result = await Swal.fire({
      title: "Hapus Kuis?",
      text: "Kuis dan semua pertanyaannya akan dihapus secara permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e3342f",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    })

    if (!result.isConfirmed) return

    isDeleting.current = true // ✅ prevent double action

    try {
      // Coba delete relasi dulu kalau gak pakai cascade
      await supabase.from("game_rooms").delete().eq("quiz_id", quizId)
      await supabase.from("questions").delete().eq("quiz_id", quizId)

      const { error } = await supabase.from("quizzes").delete().eq("id", quizId)

      if (error) {
        console.error("❌ Gagal hapus kuis:", error)
        await Swal.fire({
          title: "Gagal!",
          text: "Kuis tidak bisa dihapus. Mungkin masih digunakan.",
          icon: "error",
        })
      } else {
        await Swal.fire({
          title: "Berhasil!",
          text: "Kuis berhasil dihapus.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        })
        fetchUserData()
      }
    } catch (err) {
      console.error("🔥 Error hapus kuis:", err)
      await Swal.fire({
        title: "Error",
        text: "Terjadi kesalahan teknis.",
        icon: "error",
      })
    } finally {
      isDeleting.current = false // ✅ reset flag biar bisa klik lagi
    }
  }


  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <LoadingSpinner size="lg" text="Memuat dashboard..." />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Selamat datang, {profile?.full_name || profile?.username}! 👋
          </h1>
          <p className="text-gray-600">Kelola kuis Anda dan lihat statistik permainan</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Kuis</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Game Dimainkan</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalGames}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pemain</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalPlayers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Quizzes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kuis Saya</CardTitle>
                  <CardDescription>Kelola kuis yang telah Anda buat</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Baru
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quizzes.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Belum ada kuis</p>
                  <Button asChild>
                    <Link href="/create">Buat Kuis Pertama</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <p className="text-sm text-gray-600">
                          {quiz.questions?.length || 0} soal • Dibuat{" "}
                          {new Date(quiz.created_at).toLocaleDateString("id-ID")}
                        </p>
                        {quiz.description && <p className="text-xs text-gray-500 mt-1">{quiz.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" asChild>
                          <Link href={`/play/${quiz.id}`}>
                            <Play className="w-4 h-4 mr-1" />
                            Main
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteQuiz(quiz.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Games */}
          <Card>
            <CardHeader>
              <CardTitle>Game Terbaru</CardTitle>
              <CardDescription>Riwayat game yang baru saja dimainkan</CardDescription>
            </CardHeader>
            <CardContent>
              {recentGames.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Belum ada game yang dimainkan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentGames.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">{game.quizzes?.title}</h3>
                        <p className="text-sm text-gray-600">
                          Kode: {game.room_code} • {game.game_participants?.length || 0} pemain • Status: {game.status}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(game.created_at).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {game.status === "waiting" && (
                          <Button size="sm" asChild>
                            <Link href={`/host/${game.id}`}>Lanjutkan</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 text-left justify-start bg-transparent hover:bg-gray-50" variant="outline" asChild>
              <Link href="/create">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Buat Kuis Baru</p>
                    <p className="text-sm text-gray-600">Mulai membuat kuis interaktif</p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button className="h-20 text-left justify-start bg-transparent hover:bg-gray-50" variant="outline" asChild>
              <Link href="/join">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Join Game</p>
                    <p className="text-sm text-gray-600">Bergabung dengan game lain</p>
                  </div>
                </div>
              </Link>
            </Button>

            <Button className="h-20 text-left justify-start bg-transparent hover:bg-gray-50" variant="outline" asChild>
              <Link href="/demo">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Play className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Demo Game</p>
                    <p className="text-sm text-gray-600">Coba fitur demo interaktif</p>
                  </div>
                </div>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
