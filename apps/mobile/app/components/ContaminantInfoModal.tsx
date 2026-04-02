import { ScrollView, View, ViewStyle, TextStyle, Linking, TouchableOpacity } from "react-native"
import { Modal, Portal, IconButton, Divider } from "react-native-paper"

import { useAppTheme } from "@/theme/context"
import { Text } from "./Text"
import { getContaminantHealthEffects, hasHealthEffectsData } from "@/data/contaminantHealthEffects"

interface ContaminantInfoModalProps {
  contaminantId: string
  visible: boolean
  onClose: () => void
}

/**
 * Modal that displays detailed health effects information for a contaminant
 */
export function ContaminantInfoModal({ contaminantId, visible, onClose }: ContaminantInfoModalProps) {
  const { colors } = useAppTheme()
  const healthEffects = getContaminantHealthEffects(contaminantId)

  // Don't render if no health effects data available
  if (!hasHealthEffectsData(contaminantId) || !healthEffects) {
    return null
  }

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.warn("Failed to open URL:", err)
    })
  }

  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface,
    margin: 20,
    borderRadius: 12,
    padding: 0,
    maxHeight: "85%",
  }

  const headerStyle: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  }

  const contentStyle: ViewStyle = {
    paddingHorizontal: 20,
    paddingBottom: 20,
  }

  const sectionStyle: ViewStyle = {
    marginBottom: 16,
  }

  const titleStyle: TextStyle = {
    fontSize: 20,
    fontWeight: "600",
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  }

  const sectionTitleStyle: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 8,
  }

  const descriptionStyle: TextStyle = {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
    marginBottom: 8,
  }

  const listItemStyle: TextStyle = {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 18,
    marginBottom: 4,
  }

  const linkStyle: TextStyle = {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
    lineHeight: 20,
  }

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={containerStyle}
      >
        <View style={headerStyle}>
          <Text style={titleStyle}>{healthEffects.name}</Text>
          <IconButton
            icon="close"
            size={24}
            iconColor={colors.onSurface}
            onPress={onClose}
            accessibilityLabel="Close health effects information"
          />
        </View>
        
        <Divider />
        
        <ScrollView style={contentStyle} showsVerticalScrollIndicator={false}>
          {/* Description */}
          <View style={sectionStyle}>
            <Text style={sectionTitleStyle}>What is {healthEffects.name}?</Text>
            <Text style={descriptionStyle}>{healthEffects.description}</Text>
          </View>

          {/* Short-term Effects */}
          {healthEffects.shortTermEffects.length > 0 && (
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Short-term Health Effects</Text>
              {healthEffects.shortTermEffects.map((effect, index) => (
                <Text key={index} style={listItemStyle}>• {effect}</Text>
              ))}
            </View>
          )}

          {/* Long-term Effects */}
          {healthEffects.longTermEffects.length > 0 && (
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Long-term Health Effects</Text>
              {healthEffects.longTermEffects.map((effect, index) => (
                <Text key={index} style={listItemStyle}>• {effect}</Text>
              ))}
            </View>
          )}

          {/* At-risk Populations */}
          {healthEffects.atRiskPopulations.length > 0 && (
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Who is Most at Risk?</Text>
              {healthEffects.atRiskPopulations.map((population, index) => (
                <Text key={index} style={listItemStyle}>• {population}</Text>
              ))}
            </View>
          )}

          {/* Common Sources */}
          {healthEffects.commonSources.length > 0 && (
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Common Sources</Text>
              {healthEffects.commonSources.map((source, index) => (
                <Text key={index} style={listItemStyle}>• {source}</Text>
              ))}
            </View>
          )}

          {/* External Links */}
          {healthEffects.externalLinks.length > 0 && (
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Additional Information</Text>
              {healthEffects.externalLinks.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleLinkPress(link.url)}
                  style={{ marginBottom: 8 }}
                  accessibilityLabel={`Open ${link.title} in browser`}
                  accessibilityRole="link"
                >
                  <Text style={linkStyle}>{link.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Footer note */}
          <View style={{ marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.outline + "30" }}>
            <Text style={{
              fontSize: 12,
              color: colors.onSurface + "80",
              fontStyle: "italic",
              textAlign: "center",
              lineHeight: 16,
            }}>
              This information is for educational purposes only. 
              Consult with health professionals for specific concerns.
            </Text>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  )
}