"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Play, Clock, Star, BookOpen, TrendingUp, History } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

export default function ExplorePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [quizzes, setQuizzes] = useState<any[]>([])
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchQuizzes()
      fetchRecentQuizzes()
    }
  }, [user, loading, searchTerm, sortBy])

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true)
      let query = supabase
        .from("quizzes")
        .select(`
          *,
          profiles (
            username,
            full_name
          ),
          questions (
            id
          )
        `)
        .eq("is_public", true)

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      if (sortBy === "created_at") {
        query = query.order("created_at", { ascending: false })
      } else if (sortBy === "title") {
        query = query.order("title", { ascending: true })
      }

      const { data, error } = await query.limit(20)

      if (error) throw error

      setQuizzes(data || [])
    } catch (error) {
      console.error("Error fetching quizzes:", error)
      toast({
        title: "Error",
        description: "Gagal memuat kuis",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentQuizzes = async () => {
    try {
      // Fetch recent games played by the user
      const { data: recentGames, error } = await supabase
        .from("game_participants")
        .select(`
          created_at,
          score,
          game_rooms (
            quiz_id,
            created_at,
            quizzes (
              id,
              title,
              description,
              cover_image,
              profiles (
                username,
                full_name
              ),
              questions (
                id
              )
            )
          )
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) throw error

      const processedRecentQuizzes =
        recentGames
          ?.filter((game) => game.game_rooms?.quizzes)
          .map((game) => ({
            ...game.game_rooms.quizzes,
            last_played: game.created_at,
            last_score: game.score,
          })) || []

      setRecentQuizzes(processedRecentQuizzes)
    } catch (error) {
      console.error("Error fetching recent quizzes:", error)
    }
  }

  const handlePlayQuiz = (quizId: string) => {
    router.push(`/host?quiz=${quizId}`)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} menit`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white mb-8 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <BookOpen className="w-12 h-12" />
            <div>
              <h1 className="text-4xl font-bold">Jelajahi Kuis</h1>
              <p className="text-xl opacity-90">Temukan kuis menarik dan uji pengetahuan Anda</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Cari kuis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 bg-white/20 border-white/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Terbaru</SelectItem>
                <SelectItem value="title">Nama A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* All Public Quizzes */}
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-gray-600" />
          <h2 className="text-2xl font-bold text-gray-900">Semua Kuis Publik</h2>
          <Badge variant="outline" className="ml-auto">
            {quizzes.length} kuis
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-0 shadow-lg rounded-xl animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="border-0 shadow-lg rounded-xl">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Tidak ada kuis ditemukan</h3>
              <p className="text-gray-500">
                {searchTerm ? "Coba ubah kata kunci pencarian" : "Belum ada kuis publik yang tersedia"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 bg-white"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">{quiz.title}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                    </div>
                    {quiz.cover_image && (
                      <img
                      src={quiz.cover_image || "/placeholder.svg"}
                      alt={quiz.title}
                        className="w-16 h-16 rounded-lg object-cover ml-4"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {quiz.questions?.length || 0} soal
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(quiz.total_time || 300)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>
                      Oleh: {quiz.profiles?.username || "Unknown"}
                      {quiz.profiles?.full_name && ` (${quiz.profiles.full_name})`}
                    </span>
                    <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                  </div>

                  <Button
                    onClick={() => handlePlayQuiz(quiz.id)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Main
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Quizzes */}
        {recentQuizzes.length > 0 && (
          <div className="mb-8 mt-8">
            <div className="flex items-center gap-3 mb-6">
              <History className="w-6 h-6 text-gray-600" />
              <h2 className="text-2xl font-bold text-gray-900">Kuis yang Baru Dimainkan</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentQuizzes.map((quiz) => (
                <Card
                  key={`recent-${quiz.id}`}
                  className="border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-l-purple-500"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">
                          {quiz.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 line-clamp-2">{quiz.description}</p>
                      </div>
                      {quiz.cover_image && (
                        <img
                          src={quiz.cover_image || "/placeholder.svg"}
                          alt={quiz.title}
                          className="w-16 h-16 rounded-lg object-cover ml-4"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {quiz.questions?.length || 0} soal
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {quiz.last_score?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>Dimainkan: {new Date(quiz.last_played).toLocaleDateString()}</span>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        Dimainkan
                      </Badge>
                    </div>

                    <Button
                      onClick={() => handlePlayQuiz(quiz.id)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Main Lagi
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
