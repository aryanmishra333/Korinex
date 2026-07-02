import React, { createContext, useContext, useEffect, useState } from 'react'

// Temporary no-auth local stub. Supabase Auth has been removed; the whole app
// runs as a single local user so the translation pipeline can be tested
// end-to-end. Real OAuth (Passport.js) arrives in Phase 2.

interface AuthUser {
  id: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password?: string) => Promise<void>
  signUp: (email: string, password?: string) => Promise<void>
  signOut: () => Promise<void>
}

const STORAGE_KEY = 'korinex_user'
const DEFAULT_USER: AuthUser = { id: 'local-user', email: 'local@korinex.dev' }

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUser(JSON.parse(stored))
      } else {
        // Auto-provision a local user so the app is immediately usable.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER))
        setUser(DEFAULT_USER)
      }
    } catch {
      setUser(DEFAULT_USER)
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = async (email: string) => {
    const nextUser: AuthUser = { id: 'local-user', email: email || DEFAULT_USER.email }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const signUp = signIn

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
