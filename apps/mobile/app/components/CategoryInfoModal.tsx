import { Modal, Pressable, ScrollView, View } from "react-native"
import { Divider, IconButton } from "react-native-paper"

import { useAppTheme } from "@/theme/context"

import { infoModalStyles as styles } from "./infoModalStyles"
import { Text } from "./Text"

/** Strip markdown link syntax [text](url) to just text */
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
}

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
              <Text style={[styles.body, { color: theme.colors.text }]}>
                {stripMarkdownLinks(description)}
              </Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
