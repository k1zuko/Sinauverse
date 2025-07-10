"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Users, Trophy } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
      {/* Header */}
      <header className="relative z-10 px-4 lg:px-6 h-16 flex items-center bg-white/10 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-purple-600 fill-current" />
          </div>
          <span className="text-white font-bold text-xl">Sinauverse</span>
        </Link>

        <div className="ml-auto flex gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/20">
            Masuk
          </Button>
          <Button className="bg-white text-purple-600 hover:bg-white/90">Daftar Gratis</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Belajar Jadi
            <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Seru & Menyenangkan!
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Buat kuis interaktif, mainkan game pembelajaran, dan jadikan setiap sesi belajar sebagai petualangan yang
            tak terlupakan!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-full">
              <Play className="w-5 h-5 mr-2" />
              Mulai Bermain Gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-6 rounded-full bg-transparent"
            >
              Coba Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Kenapa Memilih Kami?</h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Platform pembelajaran interaktif yang membuat belajar jadi lebih menyenangkan dan efektif
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg bg-white/10 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Mudah Dimainkan</h3>
                <p className="text-white/80">
                  Cukup dengan kode PIN, siapa saja bisa bergabung dan mulai bermain dalam hitungan detik
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/10 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Multiplayer</h3>
                <p className="text-white/80">
                  Bermain bersama teman, keluarga, atau rekan kerja. Mendukung hingga 50 pemain sekaligus
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/10 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Kompetitif</h3>
                <p className="text-white/80">
                  Sistem poin dan leaderboard yang membuat setiap permainan jadi lebih seru dan menantang
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
