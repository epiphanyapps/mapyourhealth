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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  Activity,
  Globe,
  Droplets,
  Users,
  Eye,
  Info,
  Loader2,
} from "lucide-react"

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

const CARD_TOOLTIPS = {
  measurements:
    "Total number of contaminant measurement records across all cities and contaminants.",
  cities: "Number of distinct cities with at least one measurement record.",
  contaminants:
    "Number of contaminant definitions configured in the system.",
  subscribers:
    "Number of active user subscriptions for push/email notifications.",
  visits:
    "Total times users have viewed a location dashboard in the mobile app. Click for city breakdown.",
} as const

interface LocationStat {
  city: string
  count: number
}

interface CategoryStat {
  name: string
  count: number
}

interface VisitStat {
  name: string
  count: number
}

/**
 * Fetch all records from an Amplify model, paginating through all pages.
 */
async function fetchAllRecords<T>(
  listFn: (opts: {
    limit: number
    nextToken?: string | null
  }) => Promise<{ data: T[]; nextToken?: string | null }>,
  limit = 1000,
): Promise<T[]> {
  const allRecords: T[] = []
  let nextToken: string | null | undefined = undefined
  do {
    const result = await listFn({ limit, nextToken })
    allRecords.push(...result.data)
    nextToken = result.nextToken
  } while (nextToken)
  return allRecords
}

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [totalMeasurements, setTotalMeasurements] = useState(0)
  const [totalLocations, setTotalLocations] = useState(0)
  const [totalContaminants, setTotalContaminants] = useState(0)
  const [totalSubscriptions, setTotalSubscriptions] = useState(0)
  const [totalVisits, setTotalVisits] = useState(0)
  const [locationStats, setLocationStats] = useState<LocationStat[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [visitStats, setVisitStats] = useState<VisitStat[]>([])
  const [showVisitsModal, setShowVisitsModal] = useState(false)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [measurements, contaminants, subscriptions] =
          await Promise.all([
            fetchAllRecords((opts) =>
              client.models.LocationMeasurement.list(opts),
            ),
            fetchAllRecords((opts) => client.models.Contaminant.list(opts)),
            fetchAllRecords((opts) =>
              client.models.UserSubscription.list(opts),
            ),
          ])

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
          contaminantCategoryMap.set(c.contaminantId, c.category || "Unknown")
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

  // Live subscription: observeQuery streams onCreate/onUpdate/onDelete events
  // and maintains a synchronized snapshot of LocationVisit, so the dashboard
  // updates within seconds of a user viewing a city in the mobile app.
  useEffect(() => {
    const sub = client.models.LocationVisit.observeQuery().subscribe({
      next: ({ items }) => {
        setTotalVisits(items.length)
        const visitCityMap = new Map<string, number>()
        for (const v of items) {
          const city = v.city || "Unknown"
          visitCityMap.set(city, (visitCityMap.get(city) || 0) + 1)
        }
        const sortedVisits = Array.from(visitCityMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
        setVisitStats(sortedVisits)
      },
      error: (err) => console.warn("LocationVisit observeQuery failed:", err),
    })
    return () => sub.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const visitsChartData = visitStats.slice(0, 10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Data inventory and platform statistics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Location Visits - primary KPI, clickable with mini pie chart */}
        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() => setShowVisitsModal(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Location Visits
            </CardTitle>
            <div className="flex items-center gap-1">
              <InfoTip text={CARD_TOOLTIPS.visits} />
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalVisits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All-time views</p>
            {visitsChartData.length > 0 && (
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie
                      data={visitsChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={40}
                      fill="#8884d8"
                      dataKey="count"
                      strokeWidth={1}
                    >
                      {visitsChartData.map((_entry, index) => (
                        <Cell
                          key={`mini-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  Click for details
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Measurements
            </CardTitle>
            <div className="flex items-center gap-1">
              <InfoTip text={CARD_TOOLTIPS.measurements} />
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-1">
              <InfoTip text={CARD_TOOLTIPS.cities} />
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <div className="flex items-center gap-1">
              <InfoTip text={CARD_TOOLTIPS.contaminants} />
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
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
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <div className="flex items-center gap-1">
              <InfoTip text={CARD_TOOLTIPS.subscribers} />
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              Active subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Location Visits Detail Modal */}
      <Dialog open={showVisitsModal} onOpenChange={setShowVisitsModal}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Location Visits Breakdown</DialogTitle>
            <DialogDescription>
              {totalVisits.toLocaleString()} total visits across{" "}
              {visitStats.length} {visitStats.length === 1 ? "city" : "cities"}
            </DialogDescription>
          </DialogHeader>
          {visitStats.length > 0 ? (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={visitsChartData}
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
                    {visitsChartData.map((_entry, index) => (
                      <Cell
                        key={`modal-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              {/* City detail table */}
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="pb-2 text-left font-medium">City</th>
                      <th className="pb-2 text-right font-medium">Visits</th>
                      <th className="pb-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitStats.map((stat, index) => (
                      <tr key={stat.name} className="border-b last:border-0">
                        <td className="flex items-center gap-2 py-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                index < 10
                                  ? PIE_COLORS[index % PIE_COLORS.length]
                                  : "#9CA3AF",
                            }}
                          />
                          {stat.name}
                        </td>
                        <td className="py-2 text-right">
                          {stat.count.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {totalVisits > 0
                            ? `${((stat.count / totalVisits) * 100).toFixed(1)}%`
                            : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No visit data available yet
            </p>
          )}
        </DialogContent>
      </Dialog>

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
                  <RechartsTooltip />
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
                  <RechartsTooltip />
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
