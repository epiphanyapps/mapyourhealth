/**
 * PendingActionContext
 *
 * Stores pending actions that require authentication to complete.
 * Used for guest users who try to perform auth-gated actions like
 * following a location or reporting a hazard.
 */

import { createContext, FC, PropsWithChildren, useCallback, useContext, useState } from "react"

import { createUserSubscription } from "@/services/amplify/data"

export type PendingActionType = "follow_location" | "report_hazard" | "notify_when_available"

export interface PendingAction {
  type: PendingActionType
  payload: {
    city?: string
    state?: string
    country?: string
  }
}

export type PendingActionContextType = {
  pendingAction: PendingAction | null
  setPendingAction: (action: PendingAction) => void
  clearPendingAction: () => void
  executePendingAction: () => Promise<boolean>
}

export const PendingActionContext = createContext<PendingActionContextType | null>(null)

export interface PendingActionProviderProps {}

export const PendingActionProvider: FC<PropsWithChildren<PendingActionProviderProps>> = ({
  children,
}) => {
  const [pendingAction, setPendingActionState] = useState<PendingAction | null>(null)

  const setPendingAction = useCallback((action: PendingAction) => {
    setPendingActionState(action)
  }, [])

  const clearPendingAction = useCallback(() => {
    setPendingActionState(null)
  }, [])

  /**
   * Execute the pending action after successful authentication
   * Returns true if action was executed successfully, false otherwise
   */
  const executePendingAction = useCallback(async (): Promise<boolean> => {
    if (!pendingAction) {
      return false
    }

    try {
      switch (pendingAction.type) {
        case "follow_location": {
          const { city, state, country } = pendingAction.payload
          await createUserSubscription(city || "", state || "", country || "US")
          clearPendingAction()
          return true
        }
        case "report_hazard": {
          // Report hazard flow - just clear and navigate to Report screen
          // The actual report will be created on the Report screen
          clearPendingAction()
          return true
        }
        case "notify_when_available": {
          const { city, state, country } = pendingAction.payload
          await createUserSubscription(city || "", state || "", country || "US", undefined, {
            notifyWhenDataAvailable: true,
          })
          clearPendingAction()
          return true
        }
        default:
          clearPendingAction()
          return false
      }
    } catch (error) {
      console.error("Error executing pending action:", error)
      clearPendingAction()
      return false
    }
  }, [pendingAction, clearPendingAction])

  const value = {
    pendingAction,
    setPendingAction,
    clearPendingAction,
    executePendingAction,
  }

  return <PendingActionContext.Provider value={value}>{children}</PendingActionContext.Provider>
}

export const usePendingAction = () => {
  const context = useContext(PendingActionContext)
  if (!context) {
    throw new Error("usePendingAction must be used within a PendingActionProvider")
  }
  return context
}
