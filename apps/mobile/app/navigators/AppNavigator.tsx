/**
 * The app navigator (formerly "AppNavigator" and "MainNavigator") is used for the primary
 * navigation flows of your app.
 * Generally speaking, it will contain an auth flow (registration, login, forgot password)
 * and a "main" flow which the user will use once logged in.
 */
import { ActivityIndicator, View, ViewStyle } from "react-native"
import * as Linking from "expo-linking"
import { NavigationContainer, LinkingOptions } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { useAuth } from "@/context/AuthContext"
import { CategoryDetailScreen } from "@/screens/CategoryDetailScreen"
import { CompareScreen } from "@/screens/CompareScreen"
import { ConfirmSignupScreen } from "@/screens/ConfirmSignupScreen"
import { DashboardScreen } from "@/screens/DashboardScreen"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen"
import { LoginScreen } from "@/screens/LoginScreen"
import { MagicLinkScreen } from "@/screens/MagicLinkScreen"
import { MagicLinkSentScreen } from "@/screens/MagicLinkSentScreen"
import { MagicLinkVerifyScreen } from "@/screens/MagicLinkVerifyScreen"
import { OnboardingZipCodesScreen } from "@/screens/OnboardingZipCodesScreen"
import { ProfileScreen } from "@/screens/ProfileScreen"
import { ReportScreen } from "@/screens/ReportScreen"
import { SignupScreen } from "@/screens/SignupScreen"
import { StatTrendScreen } from "@/screens/StatTrendScreen"
import { SubscriptionsSettingsScreen } from "@/screens/SubscriptionsSettingsScreen"
import { WelcomeScreen } from "@/screens/WelcomeScreen"
import { useAppTheme } from "@/theme/context"

import { DemoNavigator } from "./DemoNavigator"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"

/**
 * This is a list of all the route names that will exit the app if the back button
 * is pressed while in that screen. Only affects Android.
 */
const exitRoutes = Config.exitRoutes

// Documentation: https://reactnavigation.org/docs/stack-navigator/
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const { isAuthenticated, isLoading } = useAuth()

  const {
    theme: { colors },
  } = useAppTheme()

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={[$loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
      initialRouteName="Dashboard"
    >
      {/* Screens available to all users (guests and authenticated) */}
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="StatTrend" component={StatTrendScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />

      {/* Auth screens - available to guests for login/signup flow */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ConfirmSignup" component={ConfirmSignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MagicLink" component={MagicLinkScreen} />
      <Stack.Screen name="MagicLinkSent" component={MagicLinkSentScreen} />
      <Stack.Screen name="MagicLinkVerify" component={MagicLinkVerifyScreen} />

      {/* Authenticated-only screens */}
      {isAuthenticated && (
        <>
          <Stack.Screen name="OnboardingZipCodes" component={OnboardingZipCodesScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="SubscriptionsSettings" component={SubscriptionsSettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Demo" component={DemoNavigator} />
        </>
      )}

      {/** 🔥 Your screens go here */}
      {/* IGNITE_GENERATOR_ANCHOR_APP_STACK_SCREENS */}
    </Stack.Navigator>
  )
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

/**
 * Deep linking configuration for the app
 * Handles magic link authentication URLs
 */
const linking: LinkingOptions<AppStackParamList> = {
  prefixes: [Linking.createURL("/"), "mapyourhealth://"],
  config: {
    screens: {
      MagicLinkVerify: {
        path: "auth/verify",
        parse: {
          email: (email: string) => decodeURIComponent(email),
          token: (token: string) => token,
        },
      },
      Dashboard: {
        path: "zip/:zipCode",
        parse: {
          zipCode: (zipCode: string) => decodeURIComponent(zipCode),
        },
      },
      Login: "login",
      Signup: "signup",
    },
  },
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()

  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <AppStack />
      </ErrorBoundary>
    </NavigationContainer>
  )
}
