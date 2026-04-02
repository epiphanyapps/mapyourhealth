import { useState } from "react"
import { TouchableOpacity, ViewStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"
import { ContaminantInfoModal } from "./ContaminantInfoModal"

interface ContaminantInfoButtonProps {
  contaminantId: string
  /** Optional style override */
  style?: ViewStyle
}

/**
 * Info button that shows health effects information for a contaminant
 * Only renders if health effects data is available for the contaminant
 */
export function ContaminantInfoButton({ contaminantId, style }: ContaminantInfoButtonProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const { colors } = useAppTheme()

  const handlePress = () => {
    setModalVisible(true)
  }

  const handleCloseModal = () => {
    setModalVisible(false)
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          {
            marginLeft: 4,
            padding: 2,
            borderRadius: 10,
            backgroundColor: colors.primary + "20", // 20% opacity
            justifyContent: "center",
            alignItems: "center",
            width: 20,
            height: 20,
          },
          style,
        ]}
        accessibilityLabel={`Health effects information for ${contaminantId}`}
        accessibilityRole="button"
        accessibilityHint="Opens detailed health effects information"
      >
        <MaterialCommunityIcons
          name="information"
          size={12}
          color={colors.primary}
        />
      </TouchableOpacity>

      <ContaminantInfoModal
        contaminantId={contaminantId}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  )
}