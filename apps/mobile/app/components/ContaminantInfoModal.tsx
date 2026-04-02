import { ScrollView, View } from "react-native"
import { Modal, Portal, IconButton, Divider } from "react-native-paper"
import { useAppTheme } from "@/theme/context"
import { Text } from "./Text"
import { getContaminantHealthEffects } from "@/data/contaminantHealthEffects"

interface ContaminantInfoModalProps {
  contaminantId: string
  visible: boolean
  onClose: () => void
}

export function ContaminantInfoModal({ contaminantId, visible, onClose }: ContaminantInfoModalProps) {
  const { colors } = useAppTheme()
  const healthEffects = getContaminantHealthEffects(contaminantId)

  if (!healthEffects) return null

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={{
          backgroundColor: colors.surface,
          margin: 20,
          borderRadius: 12,
          padding: 0,
          maxHeight: "80%",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", flex: 1 }}>{healthEffects.name}</Text>
          <IconButton icon="close" size={24} onPress={onClose} />
        </View>
        
        <Divider />
        
        <ScrollView style={{ padding: 20 }}>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, lineHeight: 20 }}>{healthEffects.description}</Text>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: colors.primary }}>
              Health Effects
            </Text>
            {healthEffects.healthEffects.map((effect, index) => (
              <Text key={index} style={{ fontSize: 14, marginBottom: 4 }}>• {effect}</Text>
            ))}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8, color: colors.primary }}>
              Common Sources
            </Text>
            {healthEffects.sources.map((source, index) => (
              <Text key={index} style={{ fontSize: 14, marginBottom: 4 }}>• {source}</Text>
            ))}
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  )
}