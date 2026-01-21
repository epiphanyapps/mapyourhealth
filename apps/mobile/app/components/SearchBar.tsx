import { View, TextInput, ViewStyle, TextStyle, StyleProp } from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useAppTheme } from "@/theme/context"

export interface SearchBarProps {
  /**
   * Current value of the search input
   */
  value?: string
  /**
   * Callback when the search text changes
   */
  onChangeText?: (text: string) => void
  /**
   * Callback when the search is submitted
   */
  onSubmit?: () => void
  /**
   * Placeholder text
   * @default "Search zip codes..."
   */
  placeholder?: string
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A search bar component for searching zip codes.
 *
 * @example
 * <SearchBar
 *   value={searchText}
 *   onChangeText={setSearchText}
 * />
 */
export function SearchBar(props: SearchBarProps) {
  const {
    value,
    onChangeText,
    onSubmit,
    placeholder = "Search zip codes...",
    style,
  } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
  }

  const $searchInputContainer: ViewStyle = {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  }

  const $searchIcon: ViewStyle = {
    marginRight: 8,
  }

  const $input: TextStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    padding: 0,
  }

  return (
    <View style={[$container, style]}>
      <View style={$searchInputContainer}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={theme.colors.textDim}
          style={$searchIcon}
          accessibilityLabel="Search"
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textDim}
          style={$input}
          returnKeyType="search"
          keyboardType="number-pad"
          accessibilityLabel="Search zip codes"
          accessibilityHint="Enter a zip code to search"
        />
      </View>
    </View>
  )
}
