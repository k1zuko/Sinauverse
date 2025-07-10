"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Play, LogOut, User } from "lucide-react"

interface HeaderProps {
  variant?: "default" | "transparent"
}

export function Header({ variant = "default" }: HeaderProps) {
  const { user, profile, signOut } = useAuth()

  const baseClasses = "relative z-10 px-4 lg:px-6 h-16 flex items-center"
  const variantClasses = {
    default: "bg-white shadow-sm border-b",
    transparent: "bg-white/10 backdrop-blur-sm",
  }

  const textColor = variant === "transparent" ? "text-white" : "text-gray-900"
  const buttonVariant = variant === "transparent" ? "ghost" : "outline"

  return (
    <header className={`${baseClasses} ${variantClasses[variant]}`}>
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <Play className="w-5 h-5 text-purple-600 fill-current" />
        </div>
        <span className={`font-bold text-xl ${textColor}`}>Sinauverse</span>
      </Link>

      <nav className="ml-auto hidden md:flex gap-6">
        {user && (
          <>
            <Link href="/dashboard" className={`${textColor} hover:opacity-80 font-medium`}>
              Dashboard
            </Link>
            <Link href="/create" className={`${textColor} hover:opacity-80 font-medium`}>
              Buat Kuis
            </Link>
            <Link href="/join" className={`${textColor} hover:opacity-80 font-medium`}>
              Join Game
            </Link>
          </>
        )}
      </nav>

      <div className="ml-6 flex items-center gap-3">
        {user ? (
          <>
            <div className={`hidden sm:flex items-center gap-2 ${textColor}`}>
              <User className="w-4 h-4" />
              <span className="text-sm">{profile?.username || user.email?.split("@")[0]}</span>
            </div>
            <Button
              variant={buttonVariant}
              size="sm"
              onClick={() => signOut()}
              className={variant === "transparent" ? "text-white hover:bg-white/20" : ""}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={buttonVariant}
              asChild
              className={variant === "transparent" ? "text-white hover:bg-white/20" : ""}
            >
              <Link href="/auth/login">Masuk</Link>
            </Button>
            <Button asChild className={variant === "transparent" ? "bg-white text-purple-600 hover:bg-white/90" : ""}>
              <Link href="/auth/register">Daftar</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
