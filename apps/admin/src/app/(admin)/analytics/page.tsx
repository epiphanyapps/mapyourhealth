"use client"

import { useEffect, useState } from "react"
import { generateClient } from "aws-amplify/data"
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Activity, Globe, Droplets, Users, Loader2 } from "lucide-react"

const client = generateClient<Schema>()

const PIE_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F97316",
  "#06B6D4",
]

interface LocationStat {
  city: string
  count: number
}

interface CategoryStat {
  name: string
  count: number
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [totalMeasurements, setTotalMeasurements] = useState(0)
  const [totalLocations, setTotalLocations] = useState(0)
  const [totalContaminants, setTotalContaminants] = useState(0)
  const [totalSubscriptions, setTotalSubscriptions] = useState(0)
  const [locationStats, setLocationStats] = useState<LocationStat[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [measurementsRes, contaminantsRes, subscriptionsRes] =
          await Promise.all([
            client.models.LocationMeasurement.list({ limit: 10000 }),
            client.models.Contaminant.list({ limit: 1000 }),
            client.models.UserSubscription.list({ limit: 1000 }),
          ])

        const measurements = measurementsRes.data || []
        const contaminants = contaminantsRes.data || []
        const subscriptions = subscriptionsRes.data || []

        setTotalMeasurements(measurements.length)
        setTotalContaminants(contaminants.length)
        setTotalSubscriptions(subscriptions.length)

        // Count measurements per city
        const cityMap = new Map<string, number>()
        for (const m of measurements) {
          const city = m.city || "Unknown"
          cityMap.set(city, (cityMap.get(city) || 0) + 1)
        }
        const sortedCities = Array.from(cityMap.entries())
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        setLocationStats(sortedCities)
        setTotalLocations(cityMap.size)

        // Count measurements per contaminant category
        const contaminantCategoryMap = new Map<string, string>()
        for (const c of contaminants) {
          contaminantCategoryMap.set(c.id, c.category || "Unknown")
        }
        const catMap = new Map<string, number>()
        for (const m of measurements) {
          const cat = contaminantCategoryMap.get(m.contaminantId) || "Unknown"
          catMap.set(cat, (catMap.get(cat) || 0) + 1)
        }
        const catStats = Array.from(catMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
        setCategoryStats(catStats)
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Platform overview and engagement metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Measurements
            </CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMeasurements.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cities Tracked
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLocations}</div>
            <p className="text-xs text-muted-foreground">
              With measurement data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contaminants Defined
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContaminants}</div>
            <p className="text-xs text-muted-foreground">
              Tracked substances
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Measurements by City */}
        <Card>
          <CardHeader>
            <CardTitle>Measurements by City</CardTitle>
            <CardDescription>
              Top 10 cities by number of contaminant measurements
            </CardDescription>
          </CardHeader>
          <CardContent>
            {locationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={locationStats}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="city"
                    type="category"
                    width={75}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Measurements by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Measurements by Category</CardTitle>
            <CardDescription>
              Distribution of measurements across contaminant categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {categoryStats.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
