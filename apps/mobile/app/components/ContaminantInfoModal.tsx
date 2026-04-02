import { ScrollView, StyleSheet, View } from "react-native"
import { Divider, IconButton, Modal, Portal } from "react-native-paper"

import { getContaminantHealthEffects } from "@/data/contaminantHealthEffects"
import { useAppTheme } from "@/theme/context"

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

  if (!healthEffects) return null

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{healthEffects.name}</Text>
          <IconButton icon="close" size={24} onPress={onClose} />
        </View>

        <Divider />

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.body, { color: theme.colors.text }]}>
              {healthEffects.description}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.tint }]}>Health Effects</Text>
            {healthEffects.healthEffects.map((effect, index) => (
              <Text key={index} style={[styles.listItem, { color: theme.colors.text }]}>
                {"• " + effect}
              </Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.tint }]}>Common Sources</Text>
            {healthEffects.sources.map((source, index) => (
              <Text key={index} style={[styles.listItem, { color: theme.colors.text }]}>
                {"• " + source}
              </Text>
            ))}
          </View>
        </ScrollView>
      </Modal>
    </Portal>
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
  listItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
  },
})
