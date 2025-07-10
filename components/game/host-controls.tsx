"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SkipForward, Square, Play, Crown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface HostControlsProps {
  roomId: string
  isHost: boolean
  gameState: "waiting" | "playing" | "finished"
  currentQuestion: number
  totalQuestions: number
  onNextQuestion: () => void
}

export function HostControls({
  roomId,
  isHost,
  gameState,
  currentQuestion,
  totalQuestions,
  onNextQuestion,
}: HostControlsProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  if (!isHost) return null

  const nextQuestion = async () => {
    setLoading(true)
    try {
      if (currentQuestion < totalQuestions - 1) {
        // Move to next question
        const { error } = await supabase
          .from("game_rooms")
          .update({ current_question: currentQuestion + 1 })
          .eq("id", roomId)

        if (error) throw error

        toast({
          title: "Pertanyaan Selanjutnya",
          description: `Beralih ke pertanyaan ${currentQuestion + 2}`,
        })
      } else {
        // End game
        const { error } = await supabase
          .from("game_rooms")
          .update({
            status: "finished",
            finished_at: new Date().toISOString(),
          })
          .eq("id", roomId)

        if (error) throw error

        toast({
          title: "Game Selesai",
          description: "Game telah berakhir",
        })
      }
      onNextQuestion()
    } catch (error) {
      console.error("Error advancing question:", error)
      toast({
        title: "Error",
        description: "Gagal melanjutkan pertanyaan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const endGame = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          status: "finished",
          finished_at: new Date().toISOString(),
        })
        .eq("id", roomId)

      if (error) throw error

      toast({
        title: "Game Dihentikan",
        description: "Game telah dihentikan oleh host",
      })
    } catch (error) {
      console.error("Error ending game:", error)
      toast({
        title: "Error",
        description: "Gagal menghentikan game",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (gameState !== "playing") return null

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Crown className="w-5 h-5 text-yellow-500" />
          Host Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status Game</span>
            <Badge variant="default" className="bg-green-500">
              <Play className="w-3 h-3 mr-1" />
              Playing
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pertanyaan</span>
            <Badge variant="outline">
              {currentQuestion + 1} / {totalQuestions}
            </Badge>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="space-y-3">
          <Button onClick={nextQuestion} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? (
              "Loading..."
            ) : currentQuestion < totalQuestions - 1 ? (
              <>
                <SkipForward className="w-4 h-4 mr-2" />
                Pertanyaan Selanjutnya
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Selesaikan Game
              </>
            )}
          </Button>

          <Button onClick={endGame} disabled={loading} variant="destructive" className="w-full">
            <Square className="w-4 h-4 mr-2" />
            Hentikan Game
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Klik "Pertanyaan Selanjutnya" untuk melanjutkan</p>
          <p>• Klik "Hentikan Game" untuk mengakhiri game</p>
          <p>• Pemain akan otomatis mengikuti kontrol host</p>
        </div>
      </CardContent>
    </Card>
  )
}
