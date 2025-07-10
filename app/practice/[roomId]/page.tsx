// app/practice/[roomId]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  text: string
  options: string[]
  correct_index: number
  time_limit: number // per soal, tapi di sini untuk total
}

export default function PracticePage({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number | null>>({})
  const [timeLeft, setTimeLeft] = useState<number>(60) // default total
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [submitted, setSubmitted] = useState(false)

  const roomId = params.roomId

  useEffect(() => {
    const fetchData = async () => {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('quiz_id')
        .eq('id', roomId)
        .single()

      const { data: quizQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', room.quiz_id)

      const totalTime = quizQuestions.reduce((sum, q) => sum + q.time_limit, 0)
      setTimeLeft(totalTime)
      setQuestions(quizQuestions)
    }
    fetchData()
  }, [roomId])

  useEffect(() => {
    if (submitted || questions.length === 0) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted, questions])

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    for (const [questionId, selected] of Object.entries(answers)) {
      if (selected !== null) {
        await supabase.from('game_answers').insert({
          room_id: roomId,
          question_id: questionId,
          selected_index: selected,
        })
      }
    }
    router.push(`/result/${roomId}`)
  }

  if (questions.length === 0) return <div>Loading soal...</div>

  const current = questions[currentIndex]

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="text-right font-mono text-sm">⏱️ {timeLeft} detik</div>

      <div>
        <h2 className="font-semibold text-lg mb-2">{current.text}</h2>
        <div className="space-y-2">
          {current.options.map((opt, idx) => (
            <Button
              key={idx}
              onClick={() => handleOptionSelect(current.id, idx)}
              variant={answers[current.id] === idx ? 'default' : 'outline'}
              className="w-full"
            >
              {opt}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))} disabled={currentIndex === 0}>
          ⬅️ Sebelumnya
        </Button>
        <Button onClick={() => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))}>
          Berikutnya ➡️
        </Button>
      </div>

      <div className="text-center pt-6">
        <Button onClick={handleSubmit} disabled={submitted} className="bg-green-600">
          ✅ Kirim Jawaban
        </Button>
      </div>
    </div>
  )
}
