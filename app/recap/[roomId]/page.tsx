"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, CheckCircle, XCircle, Clock, Trophy, Target, Home } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function RecapPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [room, setRoom] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [participant, setParticipant] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
      return
    }

    if (user) {
      fetchRecapData()
    }
  }, [user, loading, resolvedParams.roomId])

  const fetchRecapData = async () => {
    try {
      // Fetch room and quiz data
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            questions (
              id,
              question_text,
              points,
              order_index,
              answer_options (
                id,
                option_text,
                is_correct,
                option_index
              )
            )
          )
        `)
        .eq("id", resolvedParams.roomId)
        .single()

      if (roomError) {
        console.error("Room error:", roomError)
        toast({
          title: "Error",
          description: "Room tidak ditemukan",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setRoom(roomData)

      // Sort questions by order
      const sortedQuestions = roomData.quizzes.questions.sort((a: any, b: any) => a.order_index - b.order_index)
      setQuestions(sortedQuestions)

      // Fetch participant data
      const { data: participantData, error: participantError } = await supabase
        .from("game_participants")
        .select("*")
        .eq("room_id", resolvedParams.roomId)
        .eq("user_id", user!.id)
        .single()

      if (participantError) {
        console.error("Participant error:", participantError)
        toast({
          title: "Error",
          description: "Data peserta tidak ditemukan",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setParticipant(participantData)

      // Fetch answers
      const { data: answersData, error: answersError } = await supabase
        .from("game_answers")
        .select(`
          *,
          answer_options (
            option_text,
            is_correct,
            option_index
          )
        `)
        .eq("room_id", resolvedParams.roomId)
        .eq("participant_id", participantData.id)

      if (answersError) {
        console.error("Answers error:", answersError)
      }

      setAnswers(answersData || [])
    } catch (error) {
      console.error("Error fetching recap data:", error)
      toast({
        title: "Error",
        description: "Gagal memuat data rekap",
        variant: "destructive",
      })
    } finally {
      setDataLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getAnswerForQuestion = (questionId: string) => {
    return answers.find((answer) => answer.question_id === questionId)
  }

  const correctAnswers = answers.filter((answer) => answer.is_correct).length
  const totalQuestions = questions.length
  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
  const totalPoints = answers.reduce((sum, answer) => sum + answer.points_earned, 0)

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  if (!room || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl">Data tidak ditemukan</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white shadow-md border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-gray-900">Rekap Jawaban</span>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* Header Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white mb-8 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">{room.quizzes.title}</h1>
            <p className="text-lg opacity-90">Rekap Jawaban - {participant.nickname}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{correctAnswers}</div>
              <div className="text-sm opacity-90">Benar</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <XCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalQuestions - correctAnswers}</div>
              <div className="text-sm opacity-90">Salah</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{accuracy.toFixed(1)}%</div>
              <div className="text-sm opacity-90">Akurasi</div>
            </div>
            <div className="bg-white/20 rounded-lg p-4 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-sm opacity-90">Total Poin</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress Jawaban</span>
              <span>
                {answers.length}/{totalQuestions}
              </span>
            </div>
            <Progress
              value={(answers.length / totalQuestions) * 100}
              className="h-2 bg-white/20"
              indicatorClassName="bg-white"
            />
          </div>
        </div>

        {/* Questions and Answers */}
        <div className="space-y-6">
          {questions.map((question, index) => {
            const userAnswer = getAnswerForQuestion(question.id)
            const correctOption = question.answer_options.find((opt: any) => opt.is_correct)
            const userSelectedOption = userAnswer?.answer_options
            const isCorrect = userAnswer?.is_correct || false

            return (
              <Card key={question.id} className="border-0 shadow-lg rounded-xl overflow-hidden">
                <CardHeader
                  className={`${isCorrect ? "bg-emerald-50 border-b border-emerald-200" : "bg-red-50 border-b border-red-200"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold text-gray-900 mb-2">Pertanyaan {index + 1}</CardTitle>
                      <p className="text-gray-800 text-base leading-relaxed">{question.question_text}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isCorrect ? (
                        <Badge className="bg-emerald-500 text-white">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Benar
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500 text-white">
                          <XCircle className="w-4 h-4 mr-1" />
                          Salah
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-gray-600">
                        {question.points} poin
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Answer Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {question.answer_options
                        .sort((a: any, b: any) => a.option_index - b.option_index)
                        .map((option: any, optionIndex: number) => {
                          const isUserSelected = userSelectedOption?.option_index === optionIndex
                          const isCorrectOption = option.is_correct
                          const answerShapes = ["△", "◇", "○", "□"]

                          let optionClass = "p-4 rounded-lg border-2 transition-all"

                          if (isCorrectOption) {
                            optionClass += " bg-emerald-50 border-emerald-300 text-emerald-800"
                          } else if (isUserSelected && !isCorrectOption) {
                            optionClass += " bg-red-50 border-red-300 text-red-800"
                          } else {
                            optionClass += " bg-gray-50 border-gray-200 text-gray-700"
                          }

                          return (
                            <div key={option.id} className={optionClass}>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-bold">{answerShapes[optionIndex]}</span>
                                <span className="flex-1">{option.option_text}</span>
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                                  {isUserSelected && (
                                    <Badge variant="outline" className="text-xs">
                                      Pilihan Anda
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    {/* Answer Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Jawaban Anda:</span>
                          <div className="font-semibold text-gray-900">
                            {userSelectedOption ? userSelectedOption.option_text : "Tidak dijawab"}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Jawaban Benar:</span>
                          <div className="font-semibold text-emerald-600">
                            {correctOption?.option_text || "Tidak ada"}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Poin Diperoleh:</span>
                          <div className="font-semibold text-blue-600">
                            {userAnswer?.points_earned || 0} / {question.points}
                          </div>
                        </div>
                      </div>

                      {userAnswer?.answer_time && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Waktu menjawab: {formatTime(userAnswer.answer_time)}</span>
                            <span>•</span>
                            <span>Dijawab pada: {new Date(userAnswer.answered_at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
