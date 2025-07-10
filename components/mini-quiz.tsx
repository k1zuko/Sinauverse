"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Users, Play, RotateCcw } from "lucide-react"

interface Question {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

const quizQuestions: Question[] = [
  {
    id: 1,
    question: "Apa ibu kota Indonesia?",
    options: ["Bandung", "Jakarta", "Surabaya", "Medan"],
    correctAnswer: 1,
    explanation: "Jakarta adalah ibu kota Indonesia sejak kemerdekaan.",
  },
  {
    id: 2,
    question: "Berapa hasil dari 15 + 27?",
    options: ["41", "42", "43", "44"],
    correctAnswer: 1,
    explanation: "15 + 27 = 42",
  },
  {
    id: 3,
    question: "Planet mana yang paling dekat dengan Matahari?",
    options: ["Venus", "Mars", "Merkurius", "Bumi"],
    correctAnswer: 2,
    explanation: "Merkurius adalah planet terdekat dengan Matahari.",
  },
  {
    id: 4,
    question: "Siapa penemu lampu pijar?",
    options: ["Albert Einstein", "Thomas Edison", "Nikola Tesla", "Alexander Bell"],
    correctAnswer: 1,
    explanation: "Thomas Edison dikenal sebagai penemu lampu pijar praktis.",
  },
]

const answerColors = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
]

const answerShapes = ["△", "◇", "○", "□"]

export default function MiniQuiz() {
  const [gameState, setGameState] = useState<"waiting" | "playing" | "finished">("waiting")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [playerCount, setPlayerCount] = useState(1247)

  // Timer effect
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showResult) {
      handleTimeUp()
    }
  }, [timeLeft, gameState, showResult])

  // Simulate player count changes
  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(() => {
        setPlayerCount((prev) => prev + Math.floor(Math.random() * 3) - 1)
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [gameState])

  const startQuiz = () => {
    setGameState("playing")
    setCurrentQuestion(0)
    setScore(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setTimeLeft(20)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || showResult) return

    setSelectedAnswer(answerIndex)
    const isCorrect = answerIndex === quizQuestions[currentQuestion].correctAnswer

    if (isCorrect) {
      setScore(score + 1000)
    }

    setShowResult(true)

    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setShowResult(false)
        setTimeLeft(20)
      } else {
        setGameState("finished")
      }
    }, 3000)
  }

  const handleTimeUp = () => {
    setShowResult(true)
    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setShowResult(false)
        setTimeLeft(20)
      } else {
        setGameState("finished")
      }
    }, 2000)
  }

  const resetQuiz = () => {
    setGameState("waiting")
    setCurrentQuestion(0)
    setScore(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setTimeLeft(20)
  }

  if (gameState === "waiting") {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-2">Demo Kuis Mini</h3>
            <p className="text-white/90 text-lg">Main kuis, seru-seruan sambil belajar!</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{playerCount.toLocaleString()} pemain online</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>4 pertanyaan</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>20 detik per soal</span>
            </div>
          </div>

          <Button
            onClick={startQuiz}
            size="lg"
            className="bg-white text-purple-600 hover:bg-white/90 text-xl px-12 py-6 rounded-full font-bold"
          >
            <Play className="w-6 h-6 mr-2" />
            Mulai Demo
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (gameState === "finished") {
    const percentage = Math.round((score / (quizQuestions.length * 1000)) * 100)
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-green-500 to-blue-500 border-0 text-white">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-12 h-12 text-yellow-300" />
            </div>
            <h3 className="text-4xl font-bold mb-2">Selamat!</h3>
            <p className="text-white/90 text-xl">Kamu telah menyelesaikan demo kuis</p>
          </div>

          <div className="bg-white/10 rounded-2xl p-6 mb-8">
            <div className="text-5xl font-bold mb-2">{score.toLocaleString()}</div>
            <div className="text-xl mb-4">Total Poin</div>
            <div className="text-lg">
              Jawaban Benar: {Math.round(score / 1000)} dari {quizQuestions.length} ({percentage}%)
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={resetQuiz}
              size="lg"
              className="bg-white text-green-600 hover:bg-white/90 text-lg px-8 py-4 rounded-full"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Main Lagi
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-4 rounded-full bg-transparent"
            >
              Daftar Gratis
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const question = quizQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white border-0 shadow-2xl">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">
              Pertanyaan {currentQuestion + 1} dari {quizQuestions.length}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">{playerCount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-2xl font-bold">{timeLeft}</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>

        {/* Question */}
        <div className="p-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 leading-tight">{question.question}</h2>

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {question.options.map((option, index) => {
              let buttonClass = `${answerColors[index]} text-white text-xl font-bold py-6 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden`

              if (showResult) {
                if (index === question.correctAnswer) {
                  buttonClass =
                    "bg-green-500 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden ring-4 ring-green-300"
                } else if (index === selectedAnswer && index !== question.correctAnswer) {
                  buttonClass =
                    "bg-red-500 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden ring-4 ring-red-300"
                } else {
                  buttonClass =
                    "bg-gray-400 text-white text-xl font-bold py-6 px-8 rounded-2xl relative overflow-hidden opacity-50"
                }
              }

              return (
                <Button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={buttonClass}
                >
                  <span className="text-3xl mr-3">{answerShapes[index]}</span>
                  {option}
                  {showResult && index === question.correctAnswer && (
                    <div className="absolute inset-0 bg-green-400/20 animate-pulse" />
                  )}
                </Button>
              )
            })}
          </div>

          {/* Explanation */}
          {showResult && question.explanation && (
            <div className="mt-8 p-4 bg-blue-50 rounded-xl max-w-2xl mx-auto">
              <p className="text-blue-800 font-medium">{question.explanation}</p>
            </div>
          )}

          {/* Score Display */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold">
              <Trophy className="w-5 h-5" />
              Poin: {score.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
