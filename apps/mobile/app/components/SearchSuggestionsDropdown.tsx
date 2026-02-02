/**
 * SearchSuggestionsDropdown
 *
 * A dropdown overlay component that displays search suggestions.
 * Shows city, state, and postal code suggestions with icons.
 */

import { useCallback } from "react"
import { View, FlatList, Pressable, ViewStyle, TextStyle } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Text } from "@/components/Text"
import { SearchSuggestion } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

interface SearchSuggestionsDropdownProps {
  /** List of suggestions to display */
  suggestions: SearchSuggestion[]
  /** Whether the dropdown is visible */
  visible: boolean
  /** Callback when a suggestion is selected */
  onSelect: (suggestion: SearchSuggestion) => void
  /** Callback when the dropdown should be dismissed (unused, kept for API compatibility) */
  onDismiss?: () => void
}

/**
 * Get the icon name for a suggestion type
 */
function getIconForType(
  type: SearchSuggestion["type"],
): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  switch (type) {
    case "postalCode":
      return "map-marker"
    case "city":
      return "city"
    case "state":
      return "map"
    default:
      return "map-marker"
  }
}

/**
 * SearchSuggestionsDropdown component
 *
 * @example
 * <SearchSuggestionsDropdown
 *   suggestions={suggestions}
 *   visible={suggestions.length > 0}
 *   onSelect={handleSelect}
 *   onDismiss={clearSuggestions}
 * />
 */
export function SearchSuggestionsDropdown(props: SearchSuggestionsDropdownProps) {
  const { suggestions, visible, onSelect } = props
  const { theme } = useAppTheme()

  const renderItem = useCallback(
    ({ item }: { item: SearchSuggestion }) => {
      const $itemContainer: ViewStyle = {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }

      const $iconContainer: ViewStyle = {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.palette.neutral200,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
      }

      const $textContainer: ViewStyle = {
        flex: 1,
      }

      const $displayText: TextStyle = {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: "500",
      }

      const $secondaryText: TextStyle = {
        fontSize: 13,
        color: theme.colors.textDim,
        marginTop: 2,
      }

      return (
        <Pressable
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            $itemContainer,
            pressed && { backgroundColor: theme.colors.palette.neutral200 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.displayText}`}
          accessibilityHint={item.secondaryText}
        >
          <View style={$iconContainer}>
            <MaterialCommunityIcons
              name={getIconForType(item.type)}
              size={20}
              color={theme.colors.tint}
            />
          </View>
          <View style={$textContainer}>
            <Text style={$displayText}>{item.displayText}</Text>
            <Text style={$secondaryText}>{item.secondaryText}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDim} />
        </Pressable>
      )
    },
    [theme, onSelect],
  )

  const keyExtractor = useCallback(
    (item: SearchSuggestion, index: number) => `${item.type}-${item.displayText}-${index}`,
    [],
  )

  if (!visible || suggestions.length === 0) {
    return null
  }

  const $dropdownContainer: ViewStyle = {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    maxHeight: 300,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 1000,
  }

  const $emptyContainer: ViewStyle = {
    padding: 24,
    alignItems: "center",
  }

  const $emptyText: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
    textAlign: "center",
  }

  return (
    <View style={$dropdownContainer}>
      <FlatList
        data={suggestions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={$emptyContainer}>
            <Text style={$emptyText}>No locations found</Text>
          </View>
        }
      />
    </View>
  )
}
