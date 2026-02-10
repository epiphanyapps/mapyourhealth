import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

import type { StatCategory, StatHistoryEntry, StatStatus } from "@/data/types/safety"

// Demo Tab Navigator types
export type DemoTabParamList = {
  DemoCommunity: undefined
  DemoShowroom: { queryIndex?: string; itemIndex?: string }
  DemoDebug: undefined
  DemoPodcastList: undefined
}

// App Stack Navigator types
export type AppStackParamList = {
  Welcome: undefined
  Login: { email?: string } | undefined
  Signup: undefined
  ConfirmSignup: { email: string }
  ForgotPassword: undefined
  MagicLink: undefined
  MagicLinkSent: { email: string }
  MagicLinkVerify: { email: string; token: string }
  OnboardingZipCodes: undefined
  Demo: NavigatorScreenParams<DemoTabParamList>
  Dashboard: { zipCode?: string } | undefined
  CategoryDetail: { category: StatCategory; zipCode: string; subCategoryId?: string }
  Report: undefined
  SubscriptionsSettings: undefined
  Profile: undefined
  StatTrend: {
    statName: string
    statId: string
    unit: string
    currentValue: number
    currentStatus: StatStatus
    history: StatHistoryEntry[]
    higherIsBad: boolean
    lastUpdated: string
    zipCode: string
  }
  Compare: undefined
  // 🔥 Your screens go here
  // IGNITE_GENERATOR_ANCHOR_APP_STACK_PARAM_LIST
}

export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>

export type DemoTabScreenProps<T extends keyof DemoTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<DemoTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>

export interface NavigationProps extends Partial<
  ComponentProps<typeof NavigationContainer<AppStackParamList>>
> {}
