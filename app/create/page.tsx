"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Save, Play, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Question {
  id?: string
  question_text: string
  time_limit: number
  points: number
  options: {
    option_text: string
    is_correct: boolean
  }[]
}

export default function CreateQuizPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
  })

  const [questions, setQuestions] = useState<Question[]>([
    {
      question_text: "",
      time_limit: 20,
      points: 1000,
      options: [
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
      ],
    },
  ])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        time_limit: 20,
        points: 1000,
        options: [
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
          { option_text: "", is_correct: false },
        ],
      },
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const updateOption = (questionIndex: number, optionIndex: number, field: string, value: any) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options[optionIndex] = {
      ...updatedQuestions[questionIndex].options[optionIndex],
      [field]: value,
    }

    // If setting this option as correct, make others incorrect
    if (field === "is_correct" && value === true) {
      updatedQuestions[questionIndex].options.forEach((option, i) => {
        if (i !== optionIndex) {
          option.is_correct = false
        }
      })
    }

    setQuestions(updatedQuestions)
  }

  const validateQuiz = () => {
    if (!quizData.title.trim()) {
      setError("Judul quiz harus diisi")
      return false
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      if (!question.question_text.trim()) {
        setError(`Pertanyaan ${i + 1} harus diisi`)
        return false
      }

      const hasCorrectAnswer = question.options.some((option) => option.is_correct)
      if (!hasCorrectAnswer) {
        setError(`Pertanyaan ${i + 1} harus memiliki jawaban yang benar`)
        return false
      }

      const emptyOptions = question.options.filter((option) => !option.option_text.trim())
      if (emptyOptions.length > 0) {
        setError(`Semua pilihan jawaban pada pertanyaan ${i + 1} harus diisi`)
        return false
      }
    }

    return true
  }

  const saveQuiz = async () => {
    if (!validateQuiz()) return

    setSaving(true)
    setError("")

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: quizData.title,
          description: quizData.description,
          creator_id: user!.id,
        })
        .select()
        .single()

      if (quizError) {
        setError("Gagal menyimpan quiz")
        setSaving(false)
        return
      }

      // Create questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            time_limit: question.time_limit,
            points: question.points,
            order_index: i + 1,
          })
          .select()
          .single()

        if (questionError) {
          setError(`Gagal menyimpan pertanyaan ${i + 1}`)
          setSaving(false)
          return
        }

        // Create answer options
        const optionsData = question.options.map((option, optionIndex) => ({
          question_id: questionData.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          option_index: optionIndex,
        }))

        const { error: optionsError } = await supabase.from("answer_options").insert(optionsData)

        if (optionsError) {
          setError(`Gagal menyimpan pilihan jawaban untuk pertanyaan ${i + 1}`)
          setSaving(false)
          return
        }
      }

      toast({
        title: "Quiz berhasil disimpan!",
        description: `Quiz "${quizData.title}" telah dibuat dengan ${questions.length} pertanyaan`,
      })

      router.push("/dashboard")
    } catch (err) {
      setError("Terjadi kesalahan yang tidak terduga")
      setSaving(false)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                Kembali
              </Link>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-bold text-xl text-gray-900">Buat Quiz Baru</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-700">Hi, {profile?.username}</span>
              <Button onClick={saveQuiz} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Menyimpan..." : "Simpan Quiz"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quiz Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Informasi Quiz</CardTitle>
            <CardDescription>Atur judul dan deskripsi quiz Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Quiz</Label>
              <Input
                id="title"
                placeholder="Masukkan judul quiz yang menarik"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan tentang quiz ini..."
                value={quizData.description}
                onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, questionIndex) => (
            <Card key={questionIndex}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Pertanyaan {questionIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pertanyaan</Label>
                  <Textarea
                    placeholder="Tulis pertanyaan Anda di sini..."
                    value={question.question_text}
                    onChange={(e) => updateQuestion(questionIndex, "question_text", e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Waktu (detik)</Label>
                    <Input
                      type="number"
                      min="10"
                      max="120"
                      value={question.time_limit}
                      onChange={(e) => updateQuestion(questionIndex, "time_limit", Number.parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Poin</Label>
                    <Input
                      type="number"
                      min="100"
                      max="2000"
                      step="100"
                      value={question.points}
                      onChange={(e) => updateQuestion(questionIndex, "points", Number.parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Pilihan Jawaban</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-3 p-3 border rounded-lg">
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={option.is_correct}
                          onChange={(e) => updateOption(questionIndex, optionIndex, "is_correct", e.target.checked)}
                          className="text-green-600"
                        />
                        <Input
                          placeholder={`Pilihan ${optionIndex + 1}`}
                          value={option.option_text}
                          onChange={(e) => updateOption(questionIndex, optionIndex, "option_text", e.target.value)}
                          className={option.is_correct ? "border-green-500 bg-green-50" : ""}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">Pilih jawaban yang benar dengan mencentang radio button</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="text-center mt-8">
          <Button onClick={addQuestion} variant="outline" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Tambah Pertanyaan
          </Button>
        </div>

        {/* Save Button */}
        <div className="text-center mt-8 pb-8">
          <Button onClick={saveQuiz} disabled={saving} size="lg" className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Menyimpan Quiz..." : "Simpan Quiz"}
          </Button>
        </div>
      </div>
    </div>
  )
}
