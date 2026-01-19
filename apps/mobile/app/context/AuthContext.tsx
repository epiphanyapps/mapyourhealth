import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useMMKVString } from "react-native-mmkv"
import { getCurrentUser, signOut as amplifySignOut, AuthUser } from "aws-amplify/auth"

export type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  authEmail?: string
  setAuthEmail: (email: string) => void
  logout: () => Promise<void>
  refreshAuthState: () => Promise<void>
  validationError: string
}

export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const [authEmail, setAuthEmail] = useMMKVString("AuthProvider.authEmail")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Check the current Amplify auth state
   * This is called on mount and after login/logout
   */
  const checkAuthState = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch {
      // getCurrentUser throws when no user is signed in
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check auth state on mount
  useEffect(() => {
    checkAuthState()
  }, [checkAuthState])

  /**
   * Refresh auth state - call this after successful login
   */
  const refreshAuthState = useCallback(async () => {
    setIsLoading(true)
    await checkAuthState()
  }, [checkAuthState])

  /**
   * Logout the user via Amplify Auth
   */
  const logout = useCallback(async () => {
    try {
      await amplifySignOut()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      setAuthEmail("")
    }
  }, [setAuthEmail])

  const validationError = useMemo(() => {
    if (!authEmail || authEmail.length === 0) return "can't be blank"
    if (authEmail.length < 6) return "must be at least 6 characters"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) return "must be a valid email address"
    return ""
  }, [authEmail])

  const value = {
    isAuthenticated: !!user,
    isLoading,
    user,
    authEmail,
    setAuthEmail,
    logout,
    refreshAuthState,
    validationError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
