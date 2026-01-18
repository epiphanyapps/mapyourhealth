/**
 * AuthGuard
 *
 * A wrapper component that protects routes requiring authentication.
 * Checks if user is authenticated using Amplify Auth getCurrentUser.
 * Shows loading state while checking and redirects to login if not authenticated.
 */

import { FC, PropsWithChildren, useCallback, useEffect, useState } from "react"
import { ActivityIndicator, View, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { getCurrentUser } from "aws-amplify/auth"

import type { AppStackParamList } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

export interface AuthGuardProps {
  /**
   * Optional callback when user is verified as authenticated
   */
  onAuthenticated?: () => void
  /**
   * Optional callback when user is not authenticated
   */
  onUnauthenticated?: () => void
  /**
   * Whether to automatically redirect to login when not authenticated
   * @default true
   */
  redirectToLogin?: boolean
}

type AuthState = "loading" | "authenticated" | "unauthenticated"

/**
 * AuthGuard component wraps protected content and verifies authentication
 * using Amplify Auth's getCurrentUser method.
 *
 * Usage:
 * ```tsx
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 *
 * With callbacks:
 * ```tsx
 * <AuthGuard
 *   onAuthenticated={() => console.log('User is authenticated')}
 *   onUnauthenticated={() => console.log('User not authenticated')}
 *   redirectToLogin={false}
 * >
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */
export const AuthGuard: FC<PropsWithChildren<AuthGuardProps>> = ({
  children,
  onAuthenticated,
  onUnauthenticated,
  redirectToLogin = true,
}) => {
  const [authState, setAuthState] = useState<AuthState>("loading")
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()

  const {
    theme: { colors },
  } = useAppTheme()

  const checkAuthStatus = useCallback(async () => {
    try {
      await getCurrentUser()
      setAuthState("authenticated")
      onAuthenticated?.()
    } catch {
      // getCurrentUser throws when no user is signed in
      setAuthState("unauthenticated")
      onUnauthenticated?.()

      if (redirectToLogin) {
        // Navigate to login screen
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      }
    }
  }, [navigation, onAuthenticated, onUnauthenticated, redirectToLogin])

  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  // Show loading indicator while checking authentication
  if (authState === "loading") {
    return (
      <View style={[$loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  // If unauthenticated and redirecting, show nothing (redirect is in progress)
  if (authState === "unauthenticated" && redirectToLogin) {
    return null
  }

  // If unauthenticated but not redirecting, still show children
  // (let the parent component handle the state)
  if (authState === "unauthenticated") {
    return <>{children}</>
  }

  // Authenticated - render children
  return <>{children}</>
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}
