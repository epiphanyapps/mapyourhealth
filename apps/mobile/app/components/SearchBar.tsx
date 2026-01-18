import { View, TextInput, ViewStyle, TextStyle, StyleProp, Pressable } from "react-native"
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
   * Callback when the settings icon is pressed
   */
  onSettingsPress?: () => void
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
 * A search bar component with a search icon on the left and settings icon on the right.
 *
 * @example
 * <SearchBar
 *   value={searchText}
 *   onChangeText={setSearchText}
 *   onSettingsPress={() => navigation.navigate("Settings")}
 * />
 */
export function SearchBar(props: SearchBarProps) {
  const {
    value,
    onChangeText,
    onSubmit,
    onSettingsPress,
    placeholder = "Search zip codes...",
    style,
  } = props
  const { theme } = useAppTheme()

  const $container: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
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

  const $settingsButton: ViewStyle = {
    marginLeft: 8,
    padding: 4,
  }

  return (
    <View style={[$container, style]}>
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
      <Pressable
        onPress={onSettingsPress}
        style={$settingsButton}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="cog" size={20} color={theme.colors.textDim} />
      </Pressable>
    </View>
  )
}
