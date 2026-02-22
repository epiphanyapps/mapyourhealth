/**
 * CategoriesContext - Caches categories and sub-categories from Amplify backend.
 *
 * This context fetches categories and sub-categories on app startup
 * using React Query and caches them for use throughout the app.
 * Falls back to mock data if API fails.
 */

import { createContext, FC, PropsWithChildren, useCallback, useContext, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { mockCategories, mockSubCategories } from "@/data/mock"
import type { Category, CategoryLink, SubCategory } from "@/data/types/safety"
import { queryKeys } from "@/lib/queryKeys"
import {
  getCategories as fetchCategories,
  getSubCategories as fetchSubCategories,
  AmplifyCategory,
  AmplifySubCategory,
} from "@/services/amplify/data"

interface CategoriesContextType {
  /** All categories */
  categories: Category[]
  /** Map of categoryId to category for quick lookup */
  categoryMap: Map<string, Category>
  /** All sub-categories */
  subCategories: SubCategory[]
  /** Map of subCategoryId to sub-category for quick lookup */
  subCategoryMap: Map<string, SubCategory>
  /** Whether data is still loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Whether we're using mock data as fallback */
  isMockData: boolean
  /** Refresh data from the backend */
  refresh: () => Promise<void>
  /** Get a category by ID */
  getCategoryById: (categoryId: string) => Category | undefined
  /** Get sub-categories for a category */
  getSubCategoriesByCategoryId: (categoryId: string) => SubCategory[]
  /** Get a sub-category by ID */
  getSubCategoryById: (subCategoryId: string) => SubCategory | undefined
  /** Get the color for a category (with fallback) */
  getCategoryColor: (categoryId: string) => string
  /** Get the icon for a category (with fallback) */
  getCategoryIcon: (categoryId: string) => string
  /** Get the localized name for a category */
  getCategoryName: (categoryId: string, locale?: string) => string
  /** Get the localized description for a category */
  getCategoryDescription: (
    categoryId: string,
    values?: { count?: number },
    locale?: string,
  ) => string
}

const CategoriesContext = createContext<CategoriesContextType | null>(null)

export type { CategoriesContextType }

/**
 * Parse links from JSON string or object
 */
function parseLinks(links: unknown): CategoryLink[] | undefined {
  if (!links) return undefined
  if (typeof links === "string") {
    try {
      return JSON.parse(links) as CategoryLink[]
    } catch {
      return undefined
    }
  }
  if (Array.isArray(links)) {
    return links as CategoryLink[]
  }
  return undefined
}

/**
 * Maps Amplify Category to frontend Category type
 */
function mapAmplifyCategory(amplify: AmplifyCategory): Category {
  return {
    categoryId: amplify.categoryId,
    name: amplify.name,
    nameFr: amplify.nameFr ?? undefined,
    description: amplify.description ?? undefined,
    descriptionFr: amplify.descriptionFr ?? undefined,
    icon: amplify.icon,
    color: amplify.color,
    sortOrder: amplify.sortOrder ?? 0,
    isActive: amplify.isActive ?? true,
    links: parseLinks(amplify.links),
    showStandardsTable: amplify.showStandardsTable ?? false,
  }
}

/**
 * Maps Amplify SubCategory to frontend SubCategory type
 */
function mapAmplifySubCategory(amplify: AmplifySubCategory): SubCategory {
  return {
    subCategoryId: amplify.subCategoryId,
    categoryId: amplify.categoryId,
    name: amplify.name,
    nameFr: amplify.nameFr ?? undefined,
    description: amplify.description ?? undefined,
    descriptionFr: amplify.descriptionFr ?? undefined,
    icon: amplify.icon ?? undefined,
    color: amplify.color ?? undefined,
    sortOrder: amplify.sortOrder ?? 0,
    isActive: amplify.isActive ?? true,
    links: parseLinks(amplify.links),
  }
}

/**
 * Fetches categories from API; returns mock data on failure or empty result.
 */
async function fetchCategoriesWithFallback(): Promise<{
  categories: Category[]
  isMock: boolean
}> {
  try {
    const amplifyCategories = await fetchCategories()
    if (amplifyCategories.length > 0) {
      const mapped = amplifyCategories
        .map(mapAmplifyCategory)
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return { categories: mapped, isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch categories:", err)
  }
  return { categories: mockCategories, isMock: true }
}

async function fetchSubCategoriesWithFallback(): Promise<{
  subCategories: SubCategory[]
  isMock: boolean
}> {
  try {
    const amplifySubCategories = await fetchSubCategories()
    if (amplifySubCategories.length > 0) {
      const mapped = amplifySubCategories
        .map(mapAmplifySubCategory)
        .filter((sc) => sc.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      return { subCategories: mapped, isMock: false }
    }
  } catch (err) {
    console.error("Failed to fetch sub-categories:", err)
  }
  return { subCategories: mockSubCategories, isMock: true }
}

export const CategoriesProvider: FC<PropsWithChildren> = ({ children }) => {
  const queryClientInstance = useQueryClient()

  const {
    data: categoriesResult,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategoriesWithFallback,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  })

  const {
    data: subCategoriesResult,
    isLoading: subCategoriesLoading,
    error: subCategoriesError,
  } = useQuery({
    queryKey: queryKeys.categories.subCategories(),
    queryFn: fetchSubCategoriesWithFallback,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const categories = useMemo(() => categoriesResult?.categories ?? [], [categoriesResult])
  const subCategories = useMemo(
    () => subCategoriesResult?.subCategories ?? [],
    [subCategoriesResult],
  )
  const isLoading = categoriesLoading || subCategoriesLoading
  const isMockData = (categoriesResult?.isMock ?? true) || (subCategoriesResult?.isMock ?? true)

  const error =
    categoriesError || subCategoriesError
      ? "Failed to load category data from server. Using local data."
      : null

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.categories.list() }),
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.categories.subCategories() }),
    ])
  }, [queryClientInstance])

  // Create maps for quick lookup
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.categoryId, c])), [categories])

  const subCategoryMap = useMemo(
    () => new Map(subCategories.map((sc) => [sc.subCategoryId, sc])),
    [subCategories],
  )

  // Get a category by ID
  const getCategoryById = useCallback(
    (categoryId: string): Category | undefined => {
      return categoryMap.get(categoryId)
    },
    [categoryMap],
  )

  // Get sub-categories for a category
  const getSubCategoriesByCategoryId = useCallback(
    (categoryId: string): SubCategory[] => {
      return subCategories.filter((sc) => sc.categoryId === categoryId)
    },
    [subCategories],
  )

  // Get a sub-category by ID
  const getSubCategoryById = useCallback(
    (subCategoryId: string): SubCategory | undefined => {
      return subCategoryMap.get(subCategoryId)
    },
    [subCategoryMap],
  )

  // Get the color for a category with fallback
  const getCategoryColor = useCallback(
    (categoryId: string): string => {
      const category = categoryMap.get(categoryId)
      return category?.color ?? "#6B7280" // Default gray
    },
    [categoryMap],
  )

  // Get the icon for a category with fallback
  const getCategoryIcon = useCallback(
    (categoryId: string): string => {
      const category = categoryMap.get(categoryId)
      return category?.icon ?? "help-circle"
    },
    [categoryMap],
  )

  // Get the localized name for a category
  const getCategoryName = useCallback(
    (categoryId: string, locale?: string): string => {
      const category = categoryMap.get(categoryId)
      if (!category) return categoryId

      if (locale === "fr" && category.nameFr) {
        return category.nameFr
      }
      return category.name
    },
    [categoryMap],
  )

  // Get the localized description for a category
  const getCategoryDescription = useCallback(
    (categoryId: string, values?: { count?: number }, locale?: string): string => {
      const category = categoryMap.get(categoryId)
      if (!category) return ""

      let description =
        locale === "fr" && category.descriptionFr
          ? category.descriptionFr
          : (category.description ?? "")

      // Handle {count} placeholder
      if (values?.count !== undefined) {
        if (values.count === 0 && categoryId === "water") {
          // No risks detected for water category
          return locale === "fr"
            ? "Aucun contaminant dépassant les seuils de sécurité n'a été détecté. Votre eau du robinet respecte les [normes de qualité de l'eau potable de l'OMS](https://www.who.int/publications/i/item/9789241549950)."
            : "No contaminants exceeding safety thresholds were detected. Your tap water meets [WHO drinking water quality standards](https://www.who.int/publications/i/item/9789241549950)."
        }
        description = description.replace("{count}", values.count.toString())
      }

      return description
    },
    [categoryMap],
  )

  const value: CategoriesContextType = {
    categories,
    categoryMap,
    subCategories,
    subCategoryMap,
    isLoading,
    error,
    isMockData,
    refresh,
    getCategoryById,
    getSubCategoriesByCategoryId,
    getSubCategoryById,
    getCategoryColor,
    getCategoryIcon,
    getCategoryName,
    getCategoryDescription,
  }

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

/**
 * Hook to access categories data from context
 */
export function useCategories(): CategoriesContextType {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider")
  }
  return context
}
