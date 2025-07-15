"use client"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/layout/loading-spinner"
import { Plus, Users, Search, Gamepad2, ChevronRight, BookOpen } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/types/database"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  questions: { id: string }[]
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
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

      // Fetch recent games hosted by user
      const { data: gamesData } = await supabase
        .from("game_rooms")
        .select(`
          *,
          game_participants (id)
        `)
        .eq("host_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Selamat datang, {profile?.full_name || profile?.username}! 👋
          </h1>
          <p className="text-lg text-gray-600">Kelola kuis Anda dan mulai pembelajaran interaktif</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white animate-pop-in delay-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-100">Total Kuis</p>
                  <p className="text-4xl font-bold">{stats.totalQuizzes}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white animate-pop-in delay-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100">Game Dimainkan</p>
                  <p className="text-4xl font-bold">{stats.totalGames}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white animate-pop-in delay-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-100">Total Pemain</p>
                  <p className="text-4xl font-bold">{stats.totalPlayers}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center shadow-md">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:grid-cols-2">
          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-0 shadow-lg">
            <Link href="/create">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Buat Kuis</h3>
                <p className="text-sm text-gray-600">Buat kuis interaktif baru</p>
                <ChevronRight className="w-5 h-5 text-gray-400 mx-auto mt-3 group-hover:text-purple-600 transition-colors" />
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-0 shadow-lg">
            <Link href="/explore">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Jelajahi Kuis</h3>
                <p className="text-sm text-gray-600">Temukan kuis menarik</p>
                <ChevronRight className="w-5 h-5 text-gray-400 mx-auto mt-3 group-hover:text-blue-600 transition-colors" />
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-0 shadow-lg">
            <Link href="/join">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Join Kuis</h3>
                <p className="text-sm text-gray-600">Bergabung dengan kode</p>
                <ChevronRight className="w-5 h-5 text-gray-400 mx-auto mt-3 group-hover:text-emerald-600 transition-colors" />
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-0 shadow-lg">
            <Link href="/host">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-xl transition-shadow">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">Host Kuis</h3>
                <p className="text-sm text-gray-600">Mulai sesi pembelajaran</p>
                <ChevronRight className="w-5 h-5 text-gray-400 mx-auto mt-3 group-hover:text-orange-600 transition-colors" />
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Quick Start Section */}
        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0">
                <h2 className="text-2xl font-bold mb-2">Siap Memulai Pembelajaran?</h2>
                <p className="text-indigo-100 text-lg">Buat kuis pertama Anda atau jelajahi kuis yang tersedia</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href="/create">
                    <Plus className="w-5 h-5 mr-2" />
                    Buat Kuis
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/20 font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all bg-transparent"
                  asChild
                >
                  <Link href="/explore">
                    <Search className="w-5 h-5 mr-2" />
                    Jelajahi
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
