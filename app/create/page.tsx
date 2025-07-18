// pages/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Save, Play, ArrowLeft, Clock, Eye, EyeOff, FileText, Bot } from "lucide-react" // Added Bot icon
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Question {
  id?: string
  question_text: string
  points: number
  options: {
    option_text: string
    is_correct: boolean
  }[]
}

const categories = [
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

export default function CreateQuizPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false) // New state for AI generation
  const [error, setError] = useState("")

  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    category: "general",
    total_time: 300, // 5 minutes default
    is_public: true,
    is_draft: false,
  })

  const [questions, setQuestions] = useState<Question[]>([
    {
      question_text: "",
      points: 100,
      options: [
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
      ],
    },
  ])

  const [aiPrompt, setAiPrompt] = useState(""); // State for user input prompt for AI
  const [numAiQuestions, setNumAiQuestions] = useState(5); // State for number of AI questions

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: "",
        points: 100,
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
      setError("Judul kuis harus diisi")
      return false
    }

    if (quizData.total_time < 60) {
      setError("Waktu total minimal 1 menit")
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

  const saveQuiz = async (isDraft = false) => {
    if (!validateQuiz() && !isDraft) {
      toast({
        title: "Validasi Gagal",
        description: error,
        variant: "destructive",
      });
      return
    }

    setSaving(true)
    setError("")

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: quizData.title,
          description: quizData.description,
          category: quizData.category,
          total_time: quizData.total_time,
          is_public: quizData.is_public,
          is_draft: isDraft,
          creator_id: user!.id,
        })
        .select()
        .single()

      if (quizError) {
        setError("Gagal menyimpan kuis")
        setSaving(false)
        return
      }

      // Create questions and options
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]

        // Skip saving empty questions if it's a draft
        if (!question.question_text.trim() && isDraft) continue

        // Ensure there's at least one non-empty option if not a draft, or if it is a draft and the question text is present
        if (!isDraft || (isDraft && question.question_text.trim())) {
          const hasNonEmptyOption = question.options.some(option => option.option_text.trim() !== '');
          if (!hasNonEmptyOption && !isDraft) {
            setError(`Pertanyaan ${i + 1} harus memiliki setidaknya satu pilihan jawaban yang diisi.`);
            setSaving(false);
            return;
          }
          // If saving as draft and question text is present, but no options, skip
          if (isDraft && question.question_text.trim() && !hasNonEmptyOption) continue;
        }


        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            question_text: question.question_text,
            points: question.points,
            order_index: i + 1,
          })
          .select()
          .single()

        if (questionError) {
          setError(`Gagal menyimpan pertanyaan ${i + 1}: ${questionError.message}`)
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
          setError(`Gagal menyimpan pilihan jawaban untuk pertanyaan ${i + 1}: ${optionsError.message}`)
          setSaving(false)
          return
        }
      }

      toast({
        title: isDraft ? "Draft berhasil disimpan!" : "Kuis berhasil dipublikasi!",
        description: `Kuis "${quizData.title}" telah ${isDraft ? "disimpan sebagai draft" : "dipublikasi"} dengan ${questions.length} pertanyaan`,
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Save Quiz Error:", err);
      setError(`Terjadi kesalahan yang tidak terduga: ${err.message || ""}`)
      setSaving(false)
    }
  }

  const generateQuestionsWithAI = async () => {
    setGenerating(true)

    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: aiPrompt || quizData.title,
        count: numAiQuestions,
        existingCount: questions.length, 
      }),
    })

    const data = await res.json()
    setGenerating(false)

    if (data.questions) {
      const cleaned = data.questions.map((q: any) => ({
        question_text: q.question_text || "",
        points: q.points || 100,
        options: (q.options || []).map((opt: any) => ({
          option_text: opt.option_text || "",
          is_correct: opt.is_correct || false,
        })),
      }))

      setQuestions((prev) => [...prev, ...cleaned])
      toast({
        title: "Berhasil",
        description: `Berhasil generate ${cleaned.length} soal dari AI`,
      })
    } else {
      toast({
        title: "Gagal",
        description: data.message || "Tidak dapat memproses AI",
        variant: "destructive",
      })
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl text-gray-700">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Kembali</span>
              </Link>
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="font-bold text-xl text-gray-900">Buat Kuis Baru</span>
            </div>

            <div className="flex items-center gap-3">
              {/* <span className="text-gray-700">Hi, {profile?.username}</span> */}
              <Button
                onClick={() => saveQuiz(true)}
                disabled={saving || generating}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <FileText className="w-4 h-4 mr-2" />
                {saving ? "Menyimpan..." : "Simpan Draft"}
              </Button>
              <Button onClick={() => saveQuiz(false)} disabled={saving || generating} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Mempublikasi..." : "Publikasi Kuis"}
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
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Informasi Kuis</CardTitle>
            <CardDescription className="text-purple-100">Atur detail dasar kuis Anda</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                  Judul Kuis *
                </Label>
                <Input
                  id="title"
                  placeholder="Masukkan judul kuis yang menarik"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                  Kategori
                </Label>
                <Select
                  value={quizData.category}
                  onValueChange={(value) => setQuizData({ ...quizData, category: value })}
                >
                  <SelectTrigger className="border-gray-300 focus:border-purple-500">
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
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Deskripsi
              </Label>
              <Textarea
                id="description"
                placeholder="Jelaskan tentang kuis ini..."
                value={quizData.description}
                onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                rows={3}
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="total_time" className="text-sm font-semibold text-gray-700">
                  Waktu Total
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="total_time"
                    type="number"
                    min="60"
                    max="3600"
                    step="60"
                    value={quizData.total_time}
                    onChange={(e) => setQuizData({ ...quizData, total_time: Number.parseInt(e.target.value) })}
                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(quizData.total_time)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_public" className="text-sm font-semibold text-gray-700">
                    Visibilitas
                  </Label>
                  <div className="flex items-center gap-2">
                    {quizData.is_public ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <Switch
                      id="is_public"
                      checked={quizData.is_public}
                      onCheckedChange={(checked) => setQuizData({ ...quizData, is_public: checked })}
                    />
                    <span className="text-sm text-gray-600">{quizData.is_public ? "Publik" : "Privat"}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {quizData.is_public
                    ? "Kuis dapat ditemukan dan dimainkan oleh pengguna lain"
                    : "Hanya Anda yang dapat melihat dan memainkan kuis ini"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Generation Section */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Buat Pertanyaan dengan AI</CardTitle>
            <CardDescription className="text-green-100">Gunakan AI untuk membantu Anda membuat pertanyaan</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt" className="text-sm font-semibold text-gray-700">
                Topik atau Instruksi untuk AI
              </Label>
              <Textarea
                id="ai-prompt"
                placeholder="Contoh: 5 soal pilihan ganda tentang sejarah Proklamasi Kemerdekaan Indonesia. Pastikan ada 4 pilihan dan 1 jawaban benar."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-ai-questions" className="text-sm font-semibold text-gray-700">
                Jumlah Pertanyaan AI
              </Label>
              <Input
                id="num-ai-questions"
                type="number"
                min="1"
                max="20" // Set a reasonable max to prevent excessive generation
                value={numAiQuestions}
                onChange={(e) => setNumAiQuestions(Number.parseInt(e.target.value))}
                className="w-32 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <Button
              onClick={generateQuestionsWithAI}
              disabled={generating || saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Bot className="w-4 h-4 mr-2" />
              {generating ? "Generate..." : "Generate dengan AI"}
            </Button>
            {/* <p className="text-sm text-gray-500 mt-2">
              AI akan menambahkan pertanyaan ke daftar pertanyaan yang ada. Harap periksa dan edit hasilnya.
              Untuk hasil terbaik, instruksikan AI untuk menyediakan format JSON jika memungkinkan.
            </p> */}
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, questionIndex) => (
            <Card key={questionIndex} className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Pertanyaan {questionIndex + 1}</CardTitle>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-white hover:bg-white/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Pertanyaan *</Label>
                  <Textarea
                    placeholder="Tulis pertanyaan Anda di sini..."
                    value={question.question_text}
                    onChange={(e) => updateQuestion(questionIndex, "question_text", e.target.value)}
                    rows={2}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Poin</Label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    step="10"
                    value={question.points}
                    onChange={(e) => updateQuestion(questionIndex, "points", Number.parseInt(e.target.value))}
                    className="w-32 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700">Pilihan Jawaban *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-colors ${option.is_correct ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                          }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={option.is_correct}
                          onChange={(e) => updateOption(questionIndex, optionIndex, "is_correct", e.target.checked)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <Input
                          placeholder={`Pilihan ${String.fromCharCode(65 + optionIndex)}`}
                          value={option.option_text}
                          onChange={(e) => updateOption(questionIndex, optionIndex, "option_text", e.target.value)}
                          className={`flex-1 border-0 bg-transparent focus:ring-0 ${option.is_correct ? "font-semibold text-green-800" : ""
                            }`}
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
          <Button
            onClick={addQuestion}
            variant="outline"
            size="lg"
            className="border-dashed border-2 border-gray-300 text-gray-600 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 px-8 py-4 bg-transparent"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Pertanyaan Manual
          </Button>
        </div>

        {/* Save Buttons */}
        <div className="flex justify-center gap-4 mt-8 pb-8">
          <Button
            onClick={() => saveQuiz(true)}
            disabled={saving || generating}
            variant="outline"
            size="lg"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3"
          >
            <FileText className="w-5 h-5 mr-2" />
            {saving ? "Menyimpan Draft..." : "Simpan sebagai Draft"}
          </Button>
          <Button
            onClick={() => saveQuiz(false)}
            disabled={saving || generating}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Mempublikasi..." : "Publikasi Kuis"}
          </Button>
        </div>
      </div>
    </div>
  )
}