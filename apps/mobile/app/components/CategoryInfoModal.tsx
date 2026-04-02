import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Divider, IconButton } from "react-native-paper"

import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"

const OVERLAY_COLOR = "rgba(0, 0, 0, 0.5)"

interface CategoryInfoModalProps {
  name: string
  description: string
  visible: boolean
  onClose: () => void
}

export function CategoryInfoModal({ name, description, visible, onClose }: CategoryInfoModalProps) {
  const { theme } = useAppTheme()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{name}</Text>
            <IconButton icon="close" size={24} onPress={onClose} />
          </View>

          <Divider />

          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <Text style={[styles.body, { color: theme.colors.text }]}>{description}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    borderRadius: 12,
    margin: 20,
    maxHeight: "80%",
    padding: 0,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: OVERLAY_COLOR,
    flex: 1,
    justifyContent: "center",
  },
  section: {
    marginBottom: 16,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
})
