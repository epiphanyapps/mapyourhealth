/**
 * PasswordRequirements Component
 *
 * Displays password requirements with live validation feedback.
 * Shows checkmarks for met requirements and X marks for unmet ones.
 */

import { FC } from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

/**
 * Password requirement definition
 */
interface Requirement {
  id: string
  label: string
  test: (password: string) => boolean
}

/**
 * Cognito default password requirements
 * These match the default Cognito password policy
 */
const PASSWORD_REQUIREMENTS: Requirement[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "One special character (!@#$%^&*)",
    test: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  },
]

interface PasswordRequirementsProps {
  /**
   * Current password value to validate
   */
  password: string
  /**
   * Whether to show requirements (e.g., only when password field is focused)
   */
  visible?: boolean
  /**
   * Additional container style
   */
  style?: ViewStyle
}

/**
 * Individual requirement row
 */
const RequirementRow: FC<{
  label: string
  isMet: boolean
  isEmpty: boolean
}> = ({ label, isMet, isEmpty }) => {
  const { themed, theme } = useAppTheme()

  // Determine icon and color
  const iconName = isEmpty ? "circle-outline" : isMet ? "check-circle" : "close-circle"
  const iconColor = isEmpty
    ? theme.colors.textDim
    : isMet
      ? "#10B981" // Green for met
      : theme.colors.error

  return (
    <View style={$requirementRow}>
      <MaterialCommunityIcons name={iconName} size={16} color={iconColor} />
      <Text
        text={label}
        size="xs"
        style={[
          themed($requirementText),
          isEmpty
            ? themed($requirementTextDim)
            : isMet
              ? $requirementTextMet
              : themed($requirementTextUnmet),
        ]}
      />
    </View>
  )
}

/**
 * Password requirements component with live validation
 */
export const PasswordRequirements: FC<PasswordRequirementsProps> = ({
  password,
  visible = true,
  style,
}) => {
  const { themed } = useAppTheme()

  if (!visible) {
    return null
  }

  const isEmpty = password.length === 0

  return (
    <View style={[themed($container), style]}>
      <Text text="Password requirements:" size="xs" style={themed($headerText)} />
      {PASSWORD_REQUIREMENTS.map((req) => (
        <RequirementRow
          key={req.id}
          label={req.label}
          isMet={req.test(password)}
          isEmpty={isEmpty}
        />
      ))}
    </View>
  )
}

/**
 * Check if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password))
}

/**
 * Get list of unmet requirements
 */
export function getUnmetRequirements(password: string): string[] {
  return PASSWORD_REQUIREMENTS.filter((req) => !req.test(password)).map((req) => req.label)
}

// Styles
const $container: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  padding: spacing.sm,
  marginBottom: spacing.md,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.textDim,
  marginBottom: spacing.xs,
  fontWeight: "600",
})

const $requirementRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 2,
}

const $requirementText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginLeft: spacing.xs,
})

const $requirementTextDim: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
})

const $requirementTextMet: TextStyle = {
  color: "#10B981",
}

const $requirementTextUnmet: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
})
