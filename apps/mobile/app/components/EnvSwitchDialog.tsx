import { useState } from "react"
import { DevSettings, Modal, Pressable, StyleSheet, View } from "react-native"
import * as Updates from "expo-updates"
import { signOut } from "aws-amplify/auth"
import { Divider, IconButton } from "react-native-paper"

import { useAppTheme } from "@/theme/context"
import type { AppEnv } from "@/utils/envOverride"
import { getEnvOverride, setEnvOverride } from "@/utils/envOverride"

import { Button } from "./Button"
import { infoModalStyles as styles } from "./infoModalStyles"
import { Text } from "./Text"

interface EnvSwitchDialogProps {
  visible: boolean
  onClose: () => void
}

const ENV_LABEL: Record<AppEnv, string> = {
  prod: "PROD",
  staging: "STAGING",
}

export function EnvSwitchDialog({ visible, onClose }: EnvSwitchDialogProps) {
  const { theme } = useAppTheme()
  const [isSwitching, setIsSwitching] = useState(false)

  const current = getEnvOverride()
  const target: AppEnv = current === "staging" ? "prod" : "staging"

  async function handleConfirm() {
    setIsSwitching(true)
    try {
      try {
        await signOut()
      } catch {
        // user may not be signed in — best effort.
      }
      setEnvOverride(target)
      if (__DEV__) {
        DevSettings.reload()
      } else {
        await Updates.reloadAsync()
      }
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              text="Switch backend environment?"
            />
            <IconButton icon="close" size={24} onPress={onClose} disabled={isSwitching} />
          </View>

          <Divider />

          <View style={styles.content}>
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.tint }]}
                text={`Currently: ${ENV_LABEL[current]}  →  ${ENV_LABEL[target]}`}
              />
              <Text
                style={[styles.body, { color: theme.colors.text }]}
                text={
                  target === "staging"
                    ? "The app will restart and connect to the STAGING backend. Sign in with staging credentials. Production data will not be visible until you switch back."
                    : "The app will restart and connect to the PRODUCTION backend. Sign in with your normal credentials."
                }
              />
            </View>

            <Button
              text={isSwitching ? "Restarting..." : `Switch to ${ENV_LABEL[target]} & restart`}
              preset="reversed"
              onPress={handleConfirm}
              disabled={isSwitching}
              testID="env-switch-confirm-button"
            />
            <View style={localStyles.cancelSpacing} />
            <Button
              text="Cancel"
              preset="default"
              onPress={onClose}
              disabled={isSwitching}
              testID="env-switch-cancel-button"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const localStyles = StyleSheet.create({
  cancelSpacing: {
    height: 8,
  },
})
