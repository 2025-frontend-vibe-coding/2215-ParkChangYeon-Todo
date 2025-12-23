'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // 초기 사용자 상태 확인
    const checkUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      
      if (!isMounted) return
      
      setUser(currentUser)
      setLoading(false)

      // 인증 상태에 따른 리다이렉트 처리
      if (currentUser && (pathname === '/login' || pathname === '/signup')) {
        // 로그인된 사용자가 로그인/회원가입 페이지에 접근하면 메인으로
        router.replace('/')
      } else if (!currentUser && pathname === '/') {
        // 로그인하지 않은 사용자가 메인 페이지에 접근하면 로그인으로
        router.replace('/login')
      }
    }

    checkUser()

    // 인증 상태 변화 리스너 (실시간 반영)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return
      
      setUser(session?.user ?? null)

      // 로그인/로그아웃 시 리다이렉트
      if (event === 'SIGNED_IN') {
        const currentPath = window.location.pathname
        if (currentPath === '/login' || currentPath === '/signup') {
          router.replace('/')
          router.refresh()
        }
      } else if (event === 'SIGNED_OUT') {
        const currentPath = window.location.pathname
        if (currentPath === '/') {
          router.replace('/login')
          router.refresh()
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname])

  return { user, loading }
}

