import { useMemo, useState } from "react"
import {
  Pressable,
  StyleProp,
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native"

import { useCategories } from "@/context/CategoriesContext"
import { StatCategory } from "@/data/types/safety"
import { useAppTheme } from "@/theme/context"

import { Text } from "./Text"

export interface HazardReportFormData {
  /** Category ID as string (e.g., "water", "air") */
  category: string | null
  description: string
  location: string
}

export interface HazardReportFormProps {
  /**
   * Callback when form is submitted with valid data
   */
  onSubmit: (data: HazardReportFormData) => void
  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean
  /**
   * Optional style override for the container
   */
  style?: StyleProp<ViewStyle>
}

interface FormErrors {
  category?: string
  description?: string
  location?: string
}

/** Fallback category options if dynamic categories are not available */
const FALLBACK_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: StatCategory.water, label: "Water Quality" },
  { value: StatCategory.air, label: "Air Quality" },
  { value: StatCategory.health, label: "Health" },
  { value: StatCategory.disaster, label: "Disaster Risk" },
]

/**
 * A form component for submitting hazard reports.
 * Includes category picker, description, and location fields with validation.
 * Uses dynamic categories from backend with fallback to hardcoded options.
 *
 * @example
 * <HazardReportForm
 *   onSubmit={(data) => console.log(data)}
 *   isSubmitting={false}
 * />
 */
export function HazardReportForm(props: HazardReportFormProps) {
  const { onSubmit, isSubmitting = false, style } = props
  const { theme } = useAppTheme()
  const { categories } = useCategories()

  // Build category options from dynamic categories or use fallback
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((cat) => ({
        value: cat.categoryId,
        label: cat.name,
      }))
    }
    return FALLBACK_CATEGORY_OPTIONS
  }, [categories])

  const [formData, setFormData] = useState<HazardReportFormData>({
    category: null,
    description: "",
    location: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.category) {
      newErrors.category = "Please select a category"
    }

    if (formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters"
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    setTouched({ category: true, description: true, location: true })
    if (validate()) {
      onSubmit(formData)
    }
  }

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validate()
  }

  const $container: ViewStyle = {
    gap: 16,
  }

  const $fieldContainer: ViewStyle = {
    gap: 4,
  }

  const $label: TextStyle = {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  }

  const $input: TextStyle = {
    backgroundColor: theme.colors.palette.neutral200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
  }

  const $inputError: ViewStyle = {
    borderWidth: 1,
    borderColor: "#DC2626",
  }

  const $multilineInput: TextStyle = {
    minHeight: 100,
    textAlignVertical: "top",
  }

  const $errorText: TextStyle = {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  }

  const $categoryPicker: ViewStyle = {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  }

  const $categoryOption: ViewStyle = {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.palette.neutral200,
  }

  const $categoryOptionSelected: ViewStyle = {
    backgroundColor: theme.colors.tint,
  }

  const $categoryOptionText: TextStyle = {
    fontSize: 14,
    color: theme.colors.text,
  }

  const $categoryOptionTextSelected: TextStyle = {
    color: "#FFFFFF",
  }

  const $submitButton: ViewStyle = {
    backgroundColor: theme.colors.tint,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    opacity: isSubmitting ? 0.7 : 1,
  }

  const $submitButtonText: TextStyle = {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  }

  return (
    <View style={[$container, style]}>
      {/* Category Picker */}
      <View style={$fieldContainer}>
        <Text style={$label}>Hazard Category</Text>
        <View style={$categoryPicker}>
          {categoryOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setFormData((prev) => ({ ...prev, category: option.value }))
                setTouched((prev) => ({ ...prev, category: true }))
              }}
              style={[
                $categoryOption,
                formData.category === option.value && $categoryOptionSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: formData.category === option.value }}
            >
              <Text
                style={[
                  $categoryOptionText,
                  formData.category === option.value && $categoryOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {touched.category && errors.category && <Text style={$errorText}>{errors.category}</Text>}
      </View>

      {/* Description Input */}
      <View style={$fieldContainer}>
        <Text style={$label}>Description (min 10 characters)</Text>
        <TextInput
          value={formData.description}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
          onBlur={() => handleBlur("description")}
          placeholder="Describe the hazard you observed..."
          placeholderTextColor={theme.colors.textDim}
          multiline
          style={[
            $input,
            $multilineInput,
            touched.description && errors.description && $inputError,
          ]}
          accessibilityLabel="Hazard description"
        />
        {touched.description && errors.description && (
          <Text style={$errorText}>{errors.description}</Text>
        )}
      </View>

      {/* Location Input */}
      <View style={$fieldContainer}>
        <Text style={$label}>Location</Text>
        <TextInput
          value={formData.location}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, location: text }))}
          onBlur={() => handleBlur("location")}
          placeholder="Enter address or description of location"
          placeholderTextColor={theme.colors.textDim}
          style={[$input, touched.location && errors.location && $inputError]}
          accessibilityLabel="Hazard location"
        />
        {touched.location && errors.location && <Text style={$errorText}>{errors.location}</Text>}
      </View>

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [$submitButton, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Submit hazard report"
      >
        <Text style={$submitButtonText}>{isSubmitting ? "Submitting..." : "Submit Report"}</Text>
      </Pressable>
    </View>
  )
}
