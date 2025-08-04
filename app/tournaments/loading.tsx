"use client"

import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TournamentsLoadingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <Tabs defaultValue="public" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">
              <Skeleton className="h-6 w-32" />
            </TabsTrigger>
            <TabsTrigger value="my-tournaments">
              <Skeleton className="h-6 w-32" />
            </TabsTrigger>
            <TabsTrigger value="registrations">
              <Skeleton className="h-6 w-32" />
            </TabsTrigger>
          </TabsList>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-48" />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-sm">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-10 w-full mt-4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
