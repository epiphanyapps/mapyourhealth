/* eslint-disable react-native/no-inline-styles */
/**
 * SubscriptionsSettingsScreen
 *
 * Screen for managing location subscriptions.
 * Lists current subscriptions and allows adding/removing locations.
 */

import { FC, useState, useCallback, useEffect } from "react"
import {
  View,
  TextStyle,
  ViewStyle,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native"
import { MaterialCommunityIcons } from "@expo/vector-icons"

import { Button } from "@/components/Button"
import { PlacesSearchBar } from "@/components/PlacesSearchBar"
import { Screen } from "@/components/Screen"
import { SubscriptionCard } from "@/components/SubscriptionCard"
import { Text } from "@/components/Text"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import {
  getUserZipCodeSubscriptions,
  createZipCodeSubscription,
  deleteZipCodeSubscription,
  ZipCodeSubscription,
} from "@/services/amplify/data"
import { useAppTheme } from "@/theme/context"
import type { ThemedStyle } from "@/theme/types"

const MAX_SUBSCRIPTIONS = 10

interface SubscriptionsSettingsScreenProps extends AppStackScreenProps<"SubscriptionsSettings"> {}

export const SubscriptionsSettingsScreen: FC<SubscriptionsSettingsScreenProps> = ({
  navigation,
}) => {
  const [subscriptions, setSubscriptions] = useState<ZipCodeSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newSelections, setNewSelections] = useState<
    { city: string; state: string; country: string }[]
  >([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const { themed, theme } = useAppTheme()

  /**
   * Load user's subscriptions from backend
   */
  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getUserZipCodeSubscriptions()
      setSubscriptions(data)
    } catch (err) {
      console.error("Error loading subscriptions:", err)
      setError("Failed to load subscriptions")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  /**
   * Delete a subscription
   */
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await deleteZipCodeSubscription(id)
      setSubscriptions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error("Error deleting subscription:", err)
      setError("Failed to delete subscription")
    } finally {
      setDeletingId(null)
    }
  }, [])

  /**
   * Open the add modal
   */
  const handleOpenModal = useCallback(() => {
    setNewSelections([])
    setIsModalVisible(true)
  }, [])

  /**
   * Close the add modal
   */
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false)
    setNewSelections([])
  }, [])

  /**
   * Save new subscriptions from modal
   */
  const handleSaveNewSubscriptions = useCallback(async () => {
    if (newSelections.length === 0) {
      handleCloseModal()
      return
    }

    setIsSaving(true)
    try {
      const promises = newSelections.map((selection) =>
        createZipCodeSubscription(selection.city, selection.state, selection.country),
      )
      const newSubs = await Promise.all(promises)
      setSubscriptions((prev) => [...prev, ...newSubs])
      handleCloseModal()
    } catch (err) {
      console.error("Error saving subscriptions:", err)
      setError("Failed to save new subscriptions")
    } finally {
      setIsSaving(false)
    }
  }, [newSelections, handleCloseModal])

  const canAddMore = subscriptions.length < MAX_SUBSCRIPTIONS
  const remainingSlots = MAX_SUBSCRIPTIONS - subscriptions.length

  // Styles
  const $headerContainer: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  }

  const $countText: TextStyle = {
    fontSize: 14,
    color: theme.colors.textDim,
  }

  const $listContent: ViewStyle = {
    gap: 12,
    paddingBottom: 100,
  }

  const $emptyContainer: ViewStyle = {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  }

  const $emptyText: TextStyle = {
    fontSize: 16,
    color: theme.colors.textDim,
    textAlign: "center",
    marginTop: 16,
  }

  const $addButton: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  }

  const $modalOverlay: ViewStyle = {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  }

  const $modalContent: ViewStyle = {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  }

  const $modalHeader: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  }

  const $modalTitle: TextStyle = {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  }

  const $modalButtons: ViewStyle = {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  }

  const $modalButton: ViewStyle = {
    flex: 1,
  }

  const renderSubscription = ({ item }: { item: ZipCodeSubscription }) => (
    <SubscriptionCard
      city={item.city}
      state={item.state}
      country={item.country}
      county={(item as any).county ?? undefined}
      onDelete={() => handleDelete(item.id)}
      isDeleting={deletingId === item.id}
    />
  )

  const renderEmpty = () => (
    <View style={$emptyContainer}>
      <MaterialCommunityIcons name="map-marker-off" size={48} color={theme.colors.textDim} />
      <Text style={$emptyText}>
        No locations subscribed yet.{"\n"}Add locations to monitor safety conditions.
      </Text>
    </View>
  )

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Header */}
      <View style={themed($titleContainer)}>
        <Pressable onPress={() => navigation.goBack()} style={themed($backButton)}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
        </Pressable>
        <Text text="My Subscriptions" preset="heading" style={themed($title)} />
      </View>

      {error ? <Text text={error} style={themed($errorText)} size="sm" /> : null}

      {/* Subscription count and add button */}
      <View style={$headerContainer}>
        <Text style={$countText}>
          {subscriptions.length} of {MAX_SUBSCRIPTIONS} locations
        </Text>
        {canAddMore && (
          <Pressable onPress={handleOpenModal} style={$addButton}>
            <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.tint} />
            <Text text="Add" style={{ color: theme.colors.tint, fontWeight: "600" }} />
          </Pressable>
        )}
      </View>

      {/* Subscriptions list */}
      {isLoading ? (
        <View style={$emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscription}
          keyExtractor={(item) => item.id}
          contentContainerStyle={$listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Location Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <View style={$modalHeader}>
              <Text style={$modalTitle}>Add Locations</Text>
              <Pressable onPress={handleCloseModal}>
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <Text style={{ color: theme.colors.textDim, marginBottom: 16 }}>
              You can add up to {remainingSlots} more location{remainingSlots !== 1 ? "s" : ""}.
            </Text>

            <PlacesSearchBar
              onLocationSelect={(city, state, country) => {
                if (newSelections.some((s) => s.city === city && s.state === state)) return
                if (newSelections.length >= remainingSlots) return
                setNewSelections([...newSelections, { city, state, country }])
              }}
              placeholder="Search city or location..."
            />

            <View style={$modalButtons}>
              <Button
                text="Cancel"
                style={$modalButton}
                preset="default"
                onPress={handleCloseModal}
              />
              <Button
                text={
                  isSaving
                    ? "Saving..."
                    : `Add ${newSelections.length > 0 ? `(${newSelections.length})` : ""}`
                }
                style={$modalButton}
                preset="reversed"
                onPress={handleSaveNewSubscriptions}
                disabled={newSelections.length === 0 || isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
})

const $titleContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.md,
  marginTop: spacing.sm,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
  padding: spacing.xs,
})

const $title: ThemedStyle<TextStyle> = () => ({
  flex: 1,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  marginBottom: spacing.sm,
})
