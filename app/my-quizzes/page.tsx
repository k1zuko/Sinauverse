"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/layout/loading-spinner"
import {
  Search,
  Play,
  Edit,
  Trash2,
  BookOpen,
  Filter,
  Plus,
  Clock,
  Eye,
  EyeOff,
  FileText,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
  questions: { id: string }[]
}

const categories = [
  { value: "all", label: "Semua Kategori" },
  { value: "general", label: "Umum" },
  { value: "science", label: "Sains" },
  { value: "math", label: "Matematika" },
  { value: "history", label: "Sejarah" },
  { value: "geography", label: "Geografi" },
  { value: "language", label: "Bahasa" },
  { value: "technology", label: "Teknologi" },
  { value: "sports", label: "Olahraga" },
  { value: "entertainment", label: "Hiburan" },
  { value: "business", label: "Bisnis" },
]

const statusFilters = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
]

export default function MyQuizzesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [dataLoading, setDataLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchMyQuizzes()
    }
  }, [user, loading])

  useEffect(() => {
    filterQuizzes()
  }, [searchQuery, selectedCategory, selectedStatus, quizzes])

  const fetchMyQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select(`
          *,
          questions (id)
        `)
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching quizzes:", error)
        toast({
          title: "Error",
          description: "Gagal memuat kuis",
          variant: "destructive",
        })
        return
      }

      setQuizzes(data || [])
    } catch (error) {
      console.error("Error fetching quizzes:", error)
    } finally {
      setDataLoading(false)
    }
  }

  const filterQuizzes = () => {
    let filtered = quizzes

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          quiz.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((quiz) => quiz.category === selectedCategory)
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((quiz) => {
        switch (selectedStatus) {
          case "draft":
            return quiz.is_draft
          case "published":
            return !quiz.is_draft
          case "public":
            return quiz.is_public && !quiz.is_draft
          case "private":
            return !quiz.is_public && !quiz.is_draft
          default:
            return true
        }
      })
    }

    setFilteredQuizzes(filtered)
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kuis ini? Tindakan ini tidak dapat dibatalkan.")) {
      return
    }

    setDeletingId(quizId)

    try {
      // Delete related data first
      await supabase.from("answer_options").delete().eq("question_id", quizId)
      await supabase.from("questions").delete().eq("quiz_id", quizId)

      // Delete the quiz
      const { error } = await supabase.from("quizzes").delete().eq("id", quizId)

      if (error) {
        console.error("Error deleting quiz:", error)
        toast({
          title: "Error",
          description: "Gagal menghapus kuis",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Berhasil",
        description: "Kuis berhasil dihapus",
      })

      // Refresh the list
      fetchMyQuizzes()
    } catch (error) {
      console.error("Error deleting quiz:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus kuis",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} menit`
  }

  const getCategoryLabel = (category: string) => {
    return categories.find((cat) => cat.value === category)?.label || category
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      general: "bg-gray-100 text-gray-800",
      science: "bg-green-100 text-green-800",
      math: "bg-blue-100 text-blue-800",
      history: "bg-yellow-100 text-yellow-800",
      geography: "bg-emerald-100 text-emerald-800",
      language: "bg-purple-100 text-purple-800",
      technology: "bg-indigo-100 text-indigo-800",
      sports: "bg-orange-100 text-orange-800",
      entertainment: "bg-pink-100 text-pink-800",
      business: "bg-red-100 text-red-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  const getStatusBadge = (quiz: Quiz) => {
    if (quiz.is_draft) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
          Draft
        </Badge>
      )
    }
    if (quiz.is_public) {
      return <Badge className="bg-green-100 text-green-800">Public</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800">Private</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <LoadingSpinner size="lg" text="Memuat kuis..." />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Kuis Saya 📚</h1>
            <p className="text-lg text-gray-600">Kelola semua kuis yang telah Anda buat</p>
          </div>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
          >
            <Link href="/create">
              <Plus className="w-5 h-5 mr-2" />
              Buat Kuis Baru
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100">Total Kuis</p>
                  <p className="text-3xl font-bold">{quizzes.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-100">Published</p>
                  <p className="text-3xl font-bold">{quizzes.filter((q) => !q.is_draft).length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-100">Draft</p>
                  <p className="text-3xl font-bold">{quizzes.filter((q) => q.is_draft).length}</p>
                </div>
                <FileText className="w-8 h-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-100">Public</p>
                  <p className="text-3xl font-bold">{quizzes.filter((q) => q.is_public && !q.is_draft).length}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="mb-8 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Cari berdasarkan judul atau deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 border-gray-300 focus:border-purple-500">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-48 border-gray-300 focus:border-purple-500">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-600">
            Menampilkan {filteredQuizzes.length} dari {quizzes.length} kuis
          </p>
        </div>

        {/* Quiz Grid */}
        {filteredQuizzes.length === 0 ? (
          <Card className="text-center py-12 shadow-lg border-0">
            <CardContent>
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Tidak ada kuis yang ditemukan"
                  : "Belum ada kuis"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Coba ubah kata kunci pencarian atau filter"
                  : "Mulai dengan membuat kuis pertama Anda!"}
              </p>
              {!searchQuery && selectedCategory === "all" && selectedStatus === "all" && (
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Kuis Pertama
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="group hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 shadow-lg"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`text-xs ${getCategoryColor(quiz.category)}`}>
                      {getCategoryLabel(quiz.category)}
                    </Badge>
                    {getStatusBadge(quiz)}
                  </div>
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors line-clamp-2">
                    {quiz.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || "Tidak ada deskripsi"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(quiz.total_time || 300)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{quiz.questions?.length || 0} soal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {quiz.is_public ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">Dibuat: {formatDate(quiz.created_at)}</div>

                  <div className="flex items-center gap-2">
                    {!quiz.is_draft && (
                      <Button
                        size="sm"
                        onClick={() => router.push(`/host?quiz=${quiz.id}`)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Main
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/edit/${quiz.id}`)}
                      className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      disabled={deletingId === quiz.id}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {deletingId === quiz.id ? (
                        <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
