"use client"

import DashboardLayout from "@/components/DashboardLayout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare } from "lucide-react"

export default function ChatLoadingPage() {
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Chat Rooms Sidebar Skeleton */}
        <Card className="hidden md:flex flex-col w-72 shrink-0 animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto">
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Window Skeleton */}
        <Card className="flex flex-col flex-1 animate-pulse">
          <CardHeader className="border-b">
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2 pt-4 border-t">
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
