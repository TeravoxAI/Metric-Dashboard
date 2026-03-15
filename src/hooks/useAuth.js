import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAuthenticated, signOut as authSignOut } from '@/lib/auth'

export function useAuth() {
  const [authed, setAuthed] = useState(isAuthenticated)
  const queryClient = useQueryClient()

  function logout() {
    authSignOut()
    queryClient.clear() // wipe all cached sensitive data
    setAuthed(false)
  }

  function onLogin() {
    setAuthed(true)
  }

  return { authed, logout, onLogin }
}
