"use client";

import { useEffect, useMemo, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";

type NewsletterSubscriber = Schema["NewsletterSubscriber"]["type"];

type FilterValue = "all" | "confirmed" | "pending";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.NewsletterSubscriber.list({
        limit: 1000,
      });

      if (errors) {
        console.error("Error fetching subscribers:", errors);
        toast.error("Failed to fetch subscribers");
        return;
      }

      const sorted = [...(data || [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setSubscribers(sorted);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Failed to fetch subscribers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDelete = async (subscriber: NewsletterSubscriber) => {
    if (
      !confirm(
        `Are you sure you want to delete the subscriber "${subscriber.email}"?`,
      )
    ) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.NewsletterSubscriber.delete({
        email: subscriber.email,
      });
      toast.success("Subscriber deleted");
      fetchSubscribers();
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      toast.error("Failed to delete subscriber");
    }
  };

  const stats = useMemo(() => {
    const total = subscribers.length;
    const confirmed = subscribers.filter((s) => s.confirmed === true).length;
    return { total, confirmed, pending: total - confirmed };
  }, [subscribers]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (filter === "confirmed" && s.confirmed !== true) return false;
      if (filter === "pending" && s.confirmed === true) return false;
      if (query && !s.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [subscribers, filter, search]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLocationDisplay = (subscriber: NewsletterSubscriber) => {
    const parts = [subscriber.country, subscriber.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
        <p className="text-muted-foreground">
          Newsletter signups from the landing page
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Subscribers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Confirmation
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>
            {visible.length} of {subscribers.length} subscriber
            {subscribers.length !== 1 ? "s" : ""} shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as FilterValue)}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {subscribers.length === 0
                ? "No subscribers yet."
                : "No subscribers match the current filters."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((subscriber) => (
                  <TableRow key={subscriber.email}>
                    <TableCell className="font-mono text-sm">
                      {subscriber.email}
                    </TableCell>
                    <TableCell>{subscriber.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {subscriber.source || "landingPage"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getLocationDisplay(subscriber)}</TableCell>
                    <TableCell>
                      {subscriber.confirmed ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Confirmed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(subscriber.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subscriber)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
