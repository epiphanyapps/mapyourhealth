import { useState } from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"

import { ContaminantInfoModal } from "./ContaminantInfoModal"

interface ContaminantInfoButtonProps {
  contaminantId: string
}

export function ContaminantInfoButton({ contaminantId }: ContaminantInfoButtonProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const { theme } = useAppTheme()

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.button, { backgroundColor: theme.colors.tint + "20" }]}
        accessibilityLabel={`Health effects for ${contaminantId}`}
      >
        <MaterialCommunityIcons name="information" size={14} color={theme.colors.tint} />
      </TouchableOpacity>

      <ContaminantInfoModal
        contaminantId={contaminantId}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    marginLeft: 6,
    padding: 4,
    width: 24,
  },
})
