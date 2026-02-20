/**
 * SearchSuggestionsDropdown
 *
 * A dropdown overlay component that displays search suggestions.
 * Shows city, state, and postal code suggestions with icons.
 */

import { useCallback, useEffect, useRef } from "react"
import {
  Animated,
  View,
  FlatList,
  ScrollView,
  Pressable,
  ViewStyle,
  TextStyle,
  Platform,
  StyleSheet,
} from "react-native"
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
  /** Whether search is in progress — shows skeleton loaders */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
}

/**
 * Skeleton loader row with animated pulse
 */
function SkeletonRow({
  theme,
  opacity,
}: {
  theme: ReturnType<typeof useAppTheme>["theme"]
  opacity: Animated.Value
}) {
  const $row: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  }
  const $circle: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.palette.neutral200,
    marginRight: 12,
  }
  const $lineShort: ViewStyle = {
    height: 14,
    width: "60%" as unknown as number,
    borderRadius: 4,
    backgroundColor: theme.colors.palette.neutral200,
    marginBottom: 6,
  }
  const $lineLong: ViewStyle = {
    height: 10,
    width: "40%" as unknown as number,
    borderRadius: 4,
    backgroundColor: theme.colors.palette.neutral200,
  }
  const $textContainer: ViewStyle = {
    flex: 1,
  }

  return (
    <Animated.View style={[$row, { opacity }]} accessibilityElementsHidden>
      <View style={$circle} />
      <View style={$textContainer}>
        <View style={$lineShort} />
        <View style={$lineLong} />
      </View>
    </Animated.View>
  )
}

/**
 * Animated pulse value for skeleton loaders
 */
function usePulseAnimation() {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return opacity
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
  const buttonStyle: React.CSSProperties = {
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
  }

  const $webIconContainer: ViewStyle = {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.palette.neutral200,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  }

  const $webDisplayText: TextStyle = {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: "500",
  }

  const $webSecondaryText: TextStyle = {
    fontSize: 13,
    color: theme.colors.textDim,
    marginTop: 2,
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={`Select ${item.displayText}`}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.colors.palette.neutral200
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent"
      }}
    >
      <View style={$webIconContainer}>
        <MaterialCommunityIcons
          name={getIconForType(item.type)}
          size={20}
          color={theme.colors.tint}
        />
      </View>
      <View style={webStyles.textContainer}>
        <Text style={$webDisplayText}>{item.displayText}</Text>
        <Text style={$webSecondaryText}>{item.secondaryText}</Text>
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
  const { suggestions, visible, onSelect, isLoading = false, error = null } = props
  const { theme } = useAppTheme()
  const pulseOpacity = usePulseAnimation()

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

  if (!visible && !isLoading && !error) {
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

  const $errorContainer: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  }

  const $errorText: TextStyle = {
    fontSize: 14,
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
  }

  const renderLoadingSkeletons = () => (
    <>
      {[0, 1, 2].map((i) => (
        <SkeletonRow key={`skeleton-${i}`} theme={theme} opacity={pulseOpacity} />
      ))}
    </>
  )

  const renderError = () => (
    <View style={$errorContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
      <Text style={$errorText}>{error}</Text>
    </View>
  )

  // renderContent function removed - was unused

  // Web: Use native HTML button elements to avoid Pressable's wrapper div issue
  // Native: Use FlatList for virtualization benefits
  if (Platform.OS === "web") {
    return (
      <View style={$dropdownContainer} accessibilityLiveRegion="polite">
        <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          {error ? (
            renderError()
          ) : isLoading && suggestions.length === 0 ? (
            renderLoadingSkeletons()
          ) : suggestions.length === 0 ? (
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
    <View style={$dropdownContainer} accessibilityLiveRegion="polite">
      {error ? (
        renderError()
      ) : isLoading && suggestions.length === 0 ? (
        renderLoadingSkeletons()
      ) : (
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
      )}
    </View>
  )
}

const webStyles = StyleSheet.create({
  textContainer: {
    flex: 1,
  },
})
