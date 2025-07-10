"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Play, Users, Trophy, Zap, Shield, Globe } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
      <Header variant="transparent" />

      {/* Hero Section */}
      <section className="relative px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Belajar Jadi
            <span className="inline-block pb-2 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
              Seru & Menyenangkan!
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
            Buat kuis interaktif, mainkan game pembelajaran, dan jadikan setiap sesi belajar sebagai petualangan yang
            tak terlupakan!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-full"
              asChild
            >
              <Link href="/auth/register">
                <Play className="w-5 h-5 mr-2" />
                Mulai Bermain Gratis
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-6 rounded-full bg-transparent"
              asChild
            >
              <Link href="/demo">Coba Demo</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto text-white">
            <div>
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm opacity-90">Pengguna Aktif</div>
            </div>
            <div>
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-sm opacity-90">Kuis Dibuat</div>
            </div>
            <div>
              <div className="text-3xl font-bold">1M+</div>
              <div className="text-sm opacity-90">Game Dimainkan</div>
            </div>
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
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Mudah & Cepat</h3>
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

      {/* Additional Features */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Fitur Lengkap untuk Semua Kebutuhan</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Dari pembuatan kuis hingga analisis hasil, semua ada dalam satu platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Play className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Gaming</h3>
              <p className="text-gray-600 text-sm">
                Permainan berlangsung secara real-time dengan sinkronisasi sempurna
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aman & Privat</h3>
              <p className="text-gray-600 text-sm">Data Anda aman dengan enkripsi tingkat enterprise</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Akses Dimana Saja</h3>
              <p className="text-gray-600 text-sm">Bermain dari perangkat apa saja, kapan saja, dimana saja</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Siap Memulai Petualangan Belajar?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan pengguna yang sudah merasakan pengalaman belajar yang menyenangkan
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-white/90 text-lg px-8 py-6 rounded-full"
              asChild
            >
              <Link href="/auth/register">Daftar Gratis Sekarang</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20 text-lg px-8 py-6 rounded-full bg-transparent"
              asChild
            >
              <Link href="/join">Join Game</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
                <span className="font-bold text-xl">Sinauverse</span>
              </div>
              <p className="text-gray-400 text-sm">
                Platform pembelajaran interaktif yang membuat belajar jadi menyenangkan.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produk</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/demo" className="hover:text-white">
                    Demo
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="hover:text-white">
                    Daftar
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-white">
                    Join Game
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Dukungan</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Bantuan
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Kontak
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Privasi
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Syarat
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Cookie
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Sinauverse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
