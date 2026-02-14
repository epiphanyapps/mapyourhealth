/**
 * SearchSuggestionsDropdown
 *
 * A dropdown overlay component that displays search suggestions.
 * Shows city, state, and postal code suggestions with icons.
 */

import { useCallback } from "react"
import { View, FlatList, ScrollView, Pressable, ViewStyle, TextStyle, Platform } from "react-native"
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
    case "city":
      return "city"
    case "county":
      return "map-marker-radius"
    case "state":
      return "map"
    case "country":
      return "earth"
    default:
      return "map-marker"
  }
}

/**
 * Web-specific suggestion item using native DOM elements
 * This avoids React Native Web's Pressable wrapper div issue
 */
function WebSuggestionItem({
  item,
  onSelect,
  theme,
}: {
  item: SearchSuggestion
  onSelect: (item: SearchSuggestion) => void
  theme: ReturnType<typeof useAppTheme>["theme"]
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={`Select ${item.displayText}`}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        padding: "12px 16px",
        border: "none",
        borderBottom: `1px solid ${theme.colors.border}`,
        backgroundColor: "transparent",
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        zIndex: 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.palette.neutral200
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent"
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.palette.neutral200,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <MaterialCommunityIcons
          name={getIconForType(item.type)}
          size={20}
          color={theme.colors.tint}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: "500" }}>
          {item.displayText}
        </Text>
        <Text style={{ fontSize: 13, color: theme.colors.textDim, marginTop: 2 }}>
          {item.secondaryText}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.textDim} />
    </button>
  )
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

  // Web: Use native HTML button elements to avoid Pressable's wrapper div issue
  // Native: Use FlatList for virtualization benefits
  if (Platform.OS === "web") {
    return (
      <View style={$dropdownContainer}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {suggestions.length === 0 ? (
            <View style={$emptyContainer}>
              <Text style={$emptyText}>No locations found</Text>
            </View>
          ) : (
            suggestions.map((item, index) => (
              <WebSuggestionItem
                key={keyExtractor(item, index)}
                item={item}
                onSelect={onSelect}
                theme={theme}
              />
            ))
          )}
        </ScrollView>
      </View>
    )
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
