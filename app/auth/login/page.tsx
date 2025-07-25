"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingSpinner } from "@/components/layout/loading-spinner"
import { Play, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { signIn } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await signIn(email, password)

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Email atau password salah")
        } else {
          setError(error.message)
        }
      } else {
        toast({
          title: "Berhasil masuk!",
          description: "Selamat datang kembali di Sinauverse",
        })
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Terjadi kesalahan yang tidak terduga")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500">
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <Play className="w-7 h-7 text-purple-600 fill-current" />
              </div>
              <span className="text-white font-bold text-3xl drop-shadow-md">Sinauverse</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">Selamat Datang Kembali!</h1>
            <p className="text-white/80 text-lg">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <Card className="border-0 shadow-2xl rounded-xl">
            <CardHeader className="space-y-1 text-center pt-8">
              <CardTitle className="text-2xl font-bold text-gray-900">Masuk</CardTitle>
              <CardDescription className="text-base text-gray-600">Masukkan email dan password Anda</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-pop-in">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="p-3 rounded-lg border-2 border-purple-300 focus:border-purple-500 transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="p-3 rounded-lg border-2 border-purple-300 focus:border-purple-500 transition-all shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-6 rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Memproses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Belum punya akun?{" "}
                  <Link href="/auth/register" className="text-purple-600 hover:underline font-medium">
                    Daftar di sini
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
