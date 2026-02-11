"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, MapPin, TestTube, Droplets, Wind, Heart, AlertTriangle } from "lucide-react";

export default function TestingPage() {
  useEffect(() => {
    console.log("=== TESTING PAGE MOUNTED ===");
    console.log("majorCities:", majorCities);
    console.log("queensNeighborhoods:", queensNeighborhoods);
    console.log("manhattanNeighborhoods:", manhattanNeighborhoods);
    console.log("Total locations:", majorCities.length + queensNeighborhoods.length + manhattanNeighborhoods.length);
  }, []);

  console.log("=== TESTING PAGE RENDER ===");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Testing Locations</h1>
        <p className="text-muted-foreground">
          Reference guide for testing with seeded data
        </p>
      </div>

      {/* Production URLs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Production URLs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Mobile App:</span>
            <a
              href="https://app.mapyourhealth.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://app.mapyourhealth.info/
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Admin Dashboard:</span>
            <a
              href="https://admin.mapyourhealth.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://admin.mapyourhealth.info/
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Seeded Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Seeded Locations (34 total)
          </CardTitle>
          <CardDescription>
            These locations have been pre-populated with test data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Major US Cities */}
          <div>
            <h3 className="font-semibold mb-3">Major US Cities (10)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {majorCities.map((city) => (
                  <TableRow key={city.city}>
                    <TableCell className="font-medium">{city.city}</TableCell>
                    <TableCell>{city.state}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {city.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Queens, NY */}
          <div>
            <h3 className="font-semibold mb-3">Queens, NY (12)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queensNeighborhoods.map((loc) => (
                  <TableRow key={loc.neighborhood}>
                    <TableCell className="font-medium">{loc.neighborhood}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {loc.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Manhattan, NY */}
          <div>
            <h3 className="font-semibold mb-3">Manhattan, NY (12)</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Neighborhood</TableHead>
                  <TableHead>Notable Conditions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manhattanNeighborhoods.map((loc) => (
                  <TableRow key={loc.neighborhood}>
                    <TableCell className="font-medium">{loc.neighborhood}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {loc.conditions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Testing Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testing Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Mobile App</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Safe area:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Seattle</code>{" "}
                - should show mostly green/safe
              </li>
              <li>
                <span className="font-medium">Mixed warnings:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">New York</code>{" "}
                - should show multiple yellow warnings
              </li>
              <li>
                <span className="font-medium">Danger alerts:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Chicago</code>{" "}
                - should show red danger for lead
              </li>
              <li>
                <span className="font-medium">Flood risk:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Miami Beach</code>{" "}
                - should show flood danger
              </li>
              <li>
                <span className="font-medium">Wildfire risk:</span> Search{" "}
                <code className="px-1 py-0.5 bg-muted rounded">Phoenix</code>{" "}
                - should show wildfire danger
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">GPS Location Feature</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Use My Location button:</span> Tap
                the GPS icon (crosshairs) next to the search bar
              </li>
              <li>
                <span className="font-medium">Permission prompt:</span> Grant
                location permission when prompted
              </li>
              <li>
                <span className="font-medium">Auto-populate:</span> Verify city
                is auto-populated from device location
              </li>
              <li>
                <span className="font-medium">Loading state:</span> GPS button
                shows spinner while fetching location
              </li>
              <li>
                <span className="font-medium">Permission denied:</span> Decline
                permission - should show alert explaining how to enable
              </li>
              <li>
                <span className="font-medium">Location unavailable:</span> Test
                with location services disabled - should show error message
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Admin Dashboard</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="font-medium">Locations page:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">/zip-codes</code>{" "}
                - should list all 34 locations
              </li>
              <li>
                <span className="font-medium">Stats page:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">/stats</code> -
                should show 11 stat definitions
              </li>
              <li>
                <span className="font-medium">Location detail:</span>{" "}
                <code className="px-1 py-0.5 bg-muted rounded">
                  /zip-codes/New%20York
                </code>{" "}
                - should show all stats for NYC
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Stat Definitions */}
      <Card>
        <CardHeader>
          <CardTitle>Stat Definitions (11 total)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">Water (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">water-lead</code>{" "}
                - Lead Levels (ppb)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">water-nitrate</code>{" "}
                - Nitrate Levels (mg/L)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">water-bacteria</code>{" "}
                - Bacteria Count (CFU/100mL)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-gray-500" />
              <span className="font-semibold">Air (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-aqi</code> -
                Air Quality Index
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-pm25</code> -
                PM2.5 Levels (µg/m³)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">air-ozone</code>{" "}
                - Ozone Levels (ppb)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-semibold">Health (3)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">health-covid</code>{" "}
                - COVID-19 Cases (per 100k)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">health-flu</code>{" "}
                - Flu Cases (per 100k)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">health-access</code>{" "}
                - Healthcare Access (%)
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">Disaster (2)</span>
            </div>
            <ul className="text-sm space-y-1 ml-6">
              <li>
                <code className="text-xs bg-muted px-1 rounded">disaster-wildfire</code>{" "}
                - Wildfire Risk (level 1-10)
              </li>
              <li>
                <code className="text-xs bg-muted px-1 rounded">disaster-flood</code>{" "}
                - Flood Risk (level 1-10)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Seed Script */}
      <Card>
        <CardHeader>
          <CardTitle>Running the Seed Script</CardTitle>
          <CardDescription>
            From the repository root, run the following command
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
            <code>
              ADMIN_EMAIL=your-admin@email.com ADMIN_PASSWORD=your-password yarn
              seed:data
            </code>
          </pre>
          <p className="text-sm text-muted-foreground mt-3">
            The seed script is idempotent - it skips existing records and only
            creates missing ones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const majorCities = [
  { city: "Beverly Hills", state: "CA", conditions: "Wildfire warning" },
  { city: "New York", state: "NY", conditions: "Air quality & lead warnings" },
  { city: "Miami Beach", state: "FL", conditions: "Flood danger" },
  { city: "Chicago", state: "IL", conditions: "Lead danger, bacteria warning" },
  { city: "Seattle", state: "WA", conditions: "Very safe overall" },
  { city: "Atlanta", state: "GA", conditions: "Air quality warnings" },
  { city: "Dallas", state: "TX", conditions: "Ozone & flood warnings" },
  { city: "Phoenix", state: "AZ", conditions: "Ozone danger, wildfire danger" },
  { city: "Denver", state: "CO", conditions: "Wildfire danger" },
  { city: "Boston", state: "MA", conditions: "Lead & flu warnings" },
];

const queensNeighborhoods = [
  { neighborhood: "Corona", conditions: "Dense urban, multiple warnings" },
  { neighborhood: "College Point", conditions: "Flood danger (coastal)" },
  { neighborhood: "Long Island City", conditions: "Industrial area, flood warning" },
  { neighborhood: "Astoria", conditions: "Good transit, moderate air" },
  { neighborhood: "Flushing", conditions: "Busy commercial, air warnings" },
  { neighborhood: "Jackson Heights", conditions: "Dense, health warnings" },
  { neighborhood: "Elmhurst", conditions: "Dense residential" },
  { neighborhood: "Forest Hills", conditions: "Suburban feel, mostly safe" },
  { neighborhood: "Bayside", conditions: "Quiet residential" },
  { neighborhood: "Jamaica", conditions: "Transit hub, multiple warnings" },
  { neighborhood: "Ridgewood", conditions: "Border with Brooklyn" },
  { neighborhood: "Rockaway Beach", conditions: "Flood danger (coastal)" },
];

const manhattanNeighborhoods = [
  { neighborhood: "Lower East Side", conditions: "Older buildings, lead warning" },
  { neighborhood: "Greenwich Village", conditions: "Generally good" },
  { neighborhood: "SoHo", conditions: "Moderate air quality" },
  { neighborhood: "Tribeca", conditions: "Excellent healthcare, flood warning" },
  { neighborhood: "Murray Hill", conditions: "Dense residential" },
  { neighborhood: "Midtown East", conditions: "High traffic, air warnings" },
  { neighborhood: "Upper West Side", conditions: "Family-friendly, safe" },
  { neighborhood: "Upper East Side", conditions: "Affluent, excellent services" },
  { neighborhood: "East Harlem", conditions: "Lead danger, health disparities" },
  { neighborhood: "Harlem", conditions: "Aging infrastructure" },
  { neighborhood: "Washington Heights", conditions: "Diverse community" },
  { neighborhood: "Financial District", conditions: "Modern infrastructure, flood warning" },
];
