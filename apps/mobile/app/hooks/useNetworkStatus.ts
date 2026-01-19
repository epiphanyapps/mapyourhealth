/**
 * useNetworkStatus Hook
 *
 * Detects online/offline network state using @react-native-community/netinfo.
 * Used to show offline banners and determine whether to use cached data.
 */

import { useState, useEffect } from "react"
import NetInfo, { NetInfoState } from "@react-native-community/netinfo"

interface NetworkStatus {
  /** Whether the device has network connectivity */
  isConnected: boolean
  /** Whether the device is offline (no network connectivity) */
  isOffline: boolean
  /** The type of network connection (wifi, cellular, etc.) */
  type: string | null
  /** Whether the initial check has completed */
  isReady: boolean
}

/**
 * Hook to monitor network connectivity status.
 *
 * @returns Object with isConnected, isOffline, type, and isReady properties
 *
 * @example
 * const { isOffline, isReady } = useNetworkStatus()
 *
 * if (isOffline) {
 *   return <OfflineBanner />
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true)
  const [type, setType] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
      setType(state.type)
      setIsReady(true)
    })

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true)
      setType(state.type)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    isConnected,
    isOffline: !isConnected,
    type,
    isReady,
  }
}
