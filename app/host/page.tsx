"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/layout/loading-spinner"
import { Play, Users, Clock, BookOpen, Gamepad2, User, Trophy, Zap, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/database"

type Quiz = Database["public"]["Tables"]["quizzes"]["Row"] & {
    questions: { id: string }[]
}

export default function HostPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [selectedQuiz, setSelectedQuiz] = useState<string>("")
    const [selectedMode, setSelectedMode] = useState<"solo" | "multiplayer">("multiplayer")
    const [creating, setCreating] = useState(false)
    const [dataLoading, setDataLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!loading && !user) {
            router.push("/auth/login")
            return
        }

        if (user) {
            fetchUserQuizzes()
        }
    }, [user, loading])

    
    
    // Auto-select quiz from URL params (from explore page)
    useEffect(() => {
        const quizParam = searchParams.get("quiz")
        if (quizParam && quizzes.length > 0) {
            const foundQuiz = quizzes.find((q) => q.id === quizParam)
            if (foundQuiz) {
                setSelectedQuiz(quizParam)
                toast({
                    title: "Kuis Dipilih",
                    description: `Kuis "${foundQuiz.title}" telah dipilih otomatis`,
                })
            }
        }
    }, [quizzes, searchParams])

    const fetchUserQuizzes = async () => {
        try {
            const { data, error } = await supabase
            .from("quizzes")
                .select(`
          *,
          questions (id)
          `)
          .eq("creator_id", user!.id)
          .eq("is_draft", false)
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

    const createGameRoom = async () => {
        if (!selectedQuiz) {
            setError("Pilih kuis yang akan dimainkan")
            return
        }

        setCreating(true)
        setError("")
        
        try {
            // For solo mode, create room and redirect directly to game
            if (selectedMode === "solo") {
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
                        quiz_id: selectedQuiz,
                        host_id: user!.id,
                        is_solo: true,
                        mode: "solo",
                        status: "playing", // Start immediately for solo
                        started_at: new Date().toISOString(),
                    })
                    .select("id")
                    .single()

                if (roomError) {
                    console.error("Room creation error:", roomError)
                    setError(`Gagal membuat room game: ${roomError.message}`)
                    setCreating(false)
                    return
                }

                // Add participant for solo mode
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

                // Redirect directly to game for solo mode
                router.push(`/game/${room.id}`)
                return
            }

            // For multiplayer mode, create room and go to host dashboard
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
                    quiz_id: selectedQuiz,
                    host_id: user!.id,
                    mode: selectedMode,
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

            // Redirect to host dashboard
            router.push(`/host/${room.id}`)
        } catch (err) {
            console.error("Unexpected error:", err)
            setError("Terjadi kesalahan yang tidak terduga")
        } finally {
            setCreating(false)
        }
    }
    
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60)
        return `${minutes} menit`
    }

    const selectedQuizData = quizzes.find((q) => q.id === selectedQuiz)

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
            <Header />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Enhanced Header */}
                <div className="text-center mb-12">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl animate-pulse">
                            <Gamepad2 className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                            <Zap className="w-4 h-4 text-orange-600" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                        Host Kuis 🎮
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Mulai sesi pembelajaran interaktif dan buat pengalaman belajar yang menyenangkan
                    </p>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-8 border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                {/* Quiz Selection */}
                <Card className="mb-8 shadow-xl border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">Pilih Kuis</CardTitle>
                                <CardDescription className="text-orange-100">
                                    Pilih kuis yang akan dimainkan dari koleksi Anda
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {quizzes.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BookOpen className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Belum Ada Kuis</h3>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                    Buat kuis terlebih dahulu untuk memulai sesi pembelajaran yang menarik
                                </p>
                                <Button
                                    asChild
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                                >
                                    <a href="/create">
                                        <Play className="w-5 h-5 mr-2" />
                                        Buat Kuis Pertama
                                    </a>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                                    <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-orange-500 text-lg">
                                        <SelectValue placeholder="🎯 Pilih kuis yang akan dimainkan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {quizzes.map((quiz) => (
                                            <SelectItem key={quiz.id} value={quiz.id} className="py-3">
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                                            <BookOpen className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="text-left">
                                                            <span className="font-semibold text-gray-900">{quiz.title}</span>
                                                            <div className="text-sm text-gray-500">{quiz.category}</div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="ml-4">
                                                        {quiz.questions?.length || 0} soal
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Enhanced Quiz Preview */}
                                {/* {selectedQuizData && (
                                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h4 className="text-xl font-bold text-gray-900 mb-2">{selectedQuizData.title}</h4>
                                                    <p className="text-gray-700 mb-4">{selectedQuizData.description}</p>
                                                </div>
                                                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1">
                                                    {selectedQuizData.category}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                                    <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {selectedQuizData.questions?.length || 0}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Pertanyaan</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {formatTime(selectedQuizData.total_time || 300)}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Durasi</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                                    <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {selectedQuizData.is_public ? "Publik" : "Privat"}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Visibilitas</div>
                                                </div>
                                                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                                                    <Target className="w-6 h-6 text-red-600 mx-auto mb-2" />
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {selectedQuizData.questions?.reduce((acc: number, q: any) => acc + (q.points || 10), 0) ||
                                                            0}
                                                    </div>
                                                    <div className="text-sm text-gray-600">Total Poin</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )} */}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Enhanced Mode Selection */}
                {selectedQuiz && (
                    <Card className="mb-8 shadow-xl border-0 overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <Gamepad2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold">Pilih Mode Permainan</CardTitle>
                                    <CardDescription className="text-blue-100">
                                        Tentukan cara bermain yang sesuai dengan kebutuhan Anda
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 gap-6">
                                <Card
                                    className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${selectedMode === "solo"
                                        ? "ring-4 ring-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-xl"
                                        : "hover:shadow-lg border-gray-200 bg-white"
                                        }`}
                                    onClick={() => setSelectedMode("solo")}
                                >
                                    <CardContent className="p-8 text-center">
                                        <div
                                            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${selectedMode === "solo" ? "bg-gradient-to-br from-blue-500 to-indigo-500" : "bg-blue-100"
                                                }`}
                                        >
                                            <User className={`w-10 h-10 ${selectedMode === "solo" ? "text-white" : "text-blue-600"}`} />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3 text-gray-900">Solo Play</h3>
                                        <p className="text-gray-600 mb-6">Bermain sendiri dengan kontrol penuh atas navigasi</p>
                                    </CardContent>
                                </Card>

                                <Card
                                    className={`cursor-pointer transition-all duration-300 transform hover:scale-105 ${selectedMode === "multiplayer"
                                        ? "ring-4 ring-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300 shadow-xl"
                                        : "hover:shadow-lg border-gray-200 bg-white"
                                        }`}
                                    onClick={() => setSelectedMode("multiplayer")}
                                >
                                    <CardContent className="p-8 text-center">
                                        <div
                                            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${selectedMode === "multiplayer"
                                                ? "bg-gradient-to-br from-emerald-500 to-green-500"
                                                : "bg-emerald-100"
                                                }`}
                                        >
                                            <Users
                                                className={`w-10 h-10 ${selectedMode === "multiplayer" ? "text-white" : "text-emerald-600"}`}
                                            />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-3 text-gray-900">Multiplayer</h3>
                                        <p className="text-gray-600 mb-6">Bermain bersama dengan leaderboard real-time</p>

                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Enhanced Start Button */}
                {selectedQuiz && (
                    <div className="text-center">
                        <div className="bg-white rounded-2xl p-8 shadow-xl border-0 mb-8">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Siap Memulai?</h3>
                            <p className="text-gray-600 mb-8">
                                {selectedMode === "solo"
                                    ? "Anda akan langsung bermain sendiri dengan navigasi bebas"
                                    : "Setelah dimulai, Anda akan mendapatkan kode room dan QR code untuk dibagikan"}
                            </p>

                            <Button
                                onClick={createGameRoom}
                                disabled={creating}
                                size="lg"
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold  rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                            >
                                {creating ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-3" />
                                        {selectedMode === "solo" ? "Memulai..." : "Membuat Room..."}
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-8 h-8 mr-4" />
                                        {selectedMode === "solo" ? "Mulai Bermain Solo" : "Mulai Sesi Multiplayer"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
