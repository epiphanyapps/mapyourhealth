import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useMMKVString } from "react-native-mmkv"
import {
  getCurrentUser,
  signOut as amplifySignOut,
  signIn,
  confirmSignIn,
  AuthUser,
} from "aws-amplify/auth"
import Config from "@/config"
import {
  initializePushNotifications,
  addNotificationResponseListener,
  getLastNotificationResponse,
} from "@/services/notifications"
import { navigate } from "@/navigators/navigationUtilities"

/**
 * Notification data structure from backend (process-notifications Lambda)
 */
interface NotificationData {
  screen?: string
  postalCode?: string
  contaminantId?: string
}

/**
 * Handle navigation based on notification data
 * Called when user taps a notification or app is launched from notification
 */
function handleNotificationNavigation(data: NotificationData | undefined): void {
  if (!data) return

  console.log("Navigating from notification:", data)

  // Navigate to Dashboard with the postal code
  if (data.postalCode) {
    navigate("Dashboard", { zipCode: data.postalCode })
  } else if (data.screen === "Dashboard") {
    navigate("Dashboard", undefined)
  }
}

// Magic link API endpoint - this will be set from backend outputs
const MAGIC_LINK_API_URL = Config.MAGIC_LINK_API_URL || ""

export type AuthContextType = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  authEmail?: string
  setAuthEmail: (email: string) => void
  logout: () => Promise<void>
  refreshAuthState: () => Promise<void>
  validationError: string
  requestMagicLink: (email: string) => Promise<boolean>
  verifyMagicLink: (email: string, token: string) => Promise<boolean>
  expoPushToken: string | null
}

export const AuthContext = createContext<AuthContextType | null>(null)

export interface AuthProviderProps {}

export const AuthProvider: FC<PropsWithChildren<AuthProviderProps>> = ({ children }) => {
  const [authEmail, setAuthEmail] = useMMKVString("AuthProvider.authEmail")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const notificationListenerRef = useRef<ReturnType<typeof addNotificationResponseListener> | null>(null)

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

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize push notifications and get token
      initializePushNotifications()
        .then((token) => {
          if (token) {
            setExpoPushToken(token)
            console.log("Push notifications initialized with token:", token)
          }
        })
        .catch((error) => {
          console.error("Failed to initialize push notifications:", error)
        })

      // Set up notification response listener (when user taps notification)
      notificationListenerRef.current = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data as NotificationData
        console.log("Notification tapped:", data)
        handleNotificationNavigation(data)
      })

      // Check if app was opened from a notification
      getLastNotificationResponse().then((response) => {
        if (response) {
          const data = response.notification.request.content.data as NotificationData
          console.log("App launched from notification:", data)
          // Small delay to ensure navigation is ready
          setTimeout(() => {
            handleNotificationNavigation(data)
          }, 100)
        }
      })
    }

    return () => {
      // Clean up notification listener
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove()
      }
    }
  }, [user])

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

  /**
   * Request a magic link for passwordless authentication
   *
   * @param email - The email address to send the magic link to
   * @returns true if the request was successful
   */
  const requestMagicLink = useCallback(async (email: string): Promise<boolean> => {
    if (!MAGIC_LINK_API_URL) {
      console.error("Magic link API URL is not configured")
      throw new Error("Magic link is not available. Please use password login.")
    }

    try {
      const response = await fetch(MAGIC_LINK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.")
        }
        throw new Error(data.error || "Failed to send magic link")
      }

      return data.success === true
    } catch (error) {
      console.error("Request magic link error:", error)
      throw error
    }
  }, [])

  /**
   * Verify a magic link token and complete authentication
   *
   * @param email - The email address associated with the magic link
   * @param token - The token from the magic link
   * @returns true if verification was successful
   */
  const verifyMagicLink = useCallback(async (email: string, token: string): Promise<boolean> => {
    try {
      // Initiate sign in with custom auth flow (no SRP)
      const signInResult = await signIn({
        username: email.toLowerCase().trim(),
        options: {
          authFlowType: "CUSTOM_WITHOUT_SRP",
        },
      })

      // Check if we need to respond to a custom challenge
      if (signInResult.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE") {
        // Respond with the magic link token
        const confirmResult = await confirmSignIn({
          challengeResponse: token,
        })

        if (confirmResult.isSignedIn) {
          return true
        }
      }

      // If we got here without being signed in, something went wrong
      console.error("Unexpected sign in state:", signInResult)
      return false
    } catch (error) {
      console.error("Verify magic link error:", error)
      throw error
    }
  }, [])

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
    requestMagicLink,
    verifyMagicLink,
    expoPushToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
