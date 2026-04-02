import { useState } from "react"
import { StyleSheet, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { useAppTheme } from "@/theme/context"

import { CategoryInfoModal } from "./CategoryInfoModal"

interface CategoryInfoButtonProps {
  name: string
  description: string
}

export function CategoryInfoButton({ name, description }: CategoryInfoButtonProps) {
  const [modalVisible, setModalVisible] = useState(false)
  const { theme } = useAppTheme()

  return (
    <>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation()
          setModalVisible(true)
        }}
        style={[styles.button, { backgroundColor: theme.colors.tint + "20" }]}
        accessibilityLabel={`Info about ${name}`}
      >
        <MaterialCommunityIcons name="information" size={14} color={theme.colors.tint} />
      </TouchableOpacity>

      {modalVisible && (
        <CategoryInfoModal
          name={name}
          description={description}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
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
