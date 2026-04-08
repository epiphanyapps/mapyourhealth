import { Modal, Pressable, ScrollView, View } from "react-native"
import { Divider, IconButton } from "react-native-paper"

import { getContaminantHealthEffects } from "@/data/contaminantHealthEffects"
import { useAppTheme } from "@/theme/context"

import { infoModalStyles as styles } from "./infoModalStyles"
import { Text } from "./Text"

interface ContaminantInfoModalProps {
  contaminantId: string
  visible: boolean
  onClose: () => void
}

export function ContaminantInfoModal({
  contaminantId,
  visible,
  onClose,
}: ContaminantInfoModalProps) {
  const { theme } = useAppTheme()
  const healthEffects = getContaminantHealthEffects(contaminantId)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: theme.colors.background }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {healthEffects?.name ?? contaminantId}
            </Text>
            <IconButton icon="close" size={24} onPress={onClose} />
          </View>

          <Divider />

          <ScrollView style={styles.content}>
            {healthEffects ? (
              <>
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.tint }]}>
                    Health Concerns
                  </Text>
                  <Text style={[styles.body, { color: theme.colors.text }]}>
                    {healthEffects.description}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.section}>
                <Text style={[styles.body, { color: theme.colors.text }]}>
                  No health information available for this contaminant.
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
