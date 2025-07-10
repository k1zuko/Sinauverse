'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard') // ganti ke tujuanmu
      }
    }
    check()
  }, [])

  return (
    <div className="p-6 text-center">
      ✅ Verifikasi berhasil! Mengarahkan ke dashboard...
    </div>
  )
}
