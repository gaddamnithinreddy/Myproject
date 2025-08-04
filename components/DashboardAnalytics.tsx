"use client"

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Trophy, 
  Target,
  Activity,
  Clock,
  MapPin,
  Star,
  Award,
  Zap,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, AreaChart, Area } from 'recharts'
import { formatDistanceToNow, startOfWeek, endOfWeek, format, subDays, subWeeks, subMonths } from 'date-fns'
import { FadeIn, CountUp, SlideIn } from '@/components/ui/micro-animations'
import { useCache } from '@/lib/cache'

interface DashboardStats {
  totalTeams: number
  totalPlayers: number
  upcomingEvents: number
  completedTournaments: number
  winRate: number
  attendanceRate: number
  activeUsers: number
  recentActivity: Activity[]
  performanceMetrics: PerformanceMetric[]
  teamComparison: TeamComparison[]
  monthlyTrends: MonthlyTrend[]
  topPerformers: Player[]
  upcomingMilestones: Milestone[]
}

interface Activity {
  id: string
  type: 'match' | 'practice' | 'tournament' | 'registration'
  description: string
  timestamp: Date
  teamId?: string
  userId?: string
}

interface PerformanceMetric {
  name: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  target?: number
}

interface TeamComparison {
  teamId: string
  teamName: string
  wins: number
  losses: number
  draws: number
  points: number
  rank: number
}

interface MonthlyTrend {
  month: string
  events: number
  participants: number
  engagement: number
}

interface Player {
  id: string
  name: string
  avatar?: string
  stats: {
    matches: number
    wins: number
    points: number
    attendance: number
  }
}

interface Milestone {
  id: string
  title: string
  description: string
  progress: number
  target: number
  dueDate: Date
  type: 'team' | 'individual' | 'tournament'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function DashboardAnalytics({ teamId, userId }: { teamId?: string; userId?: string }) {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedMetric, setSelectedMetric] = useState<'performance' | 'engagement' | 'growth'>('performance')

  // Cache dashboard data
  const { data: dashboardStats, loading, refresh } = useCache(
    `dashboard-${teamId || userId}-${timeRange}`,
    async () => await fetchDashboardStats(teamId, userId, timeRange),
    5 * 60 * 1000 // 5 minutes
  )

  const fetchDashboardStats = async (teamId?: string, userId?: string, range?: string): Promise<DashboardStats> => {
    // This would fetch real data from Firebase
    // For demo purposes, returning mock data
    return {
      totalTeams: 12,
      totalPlayers: 156,
      upcomingEvents: 8,
      completedTournaments: 24,
      winRate: 78.5,
      attendanceRate: 85.2,
      activeUsers: 89,
      recentActivity: [
        {
          id: '1',
          type: 'match',
          description: 'Team Alpha won against Team Beta 3-1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: '2',
          type: 'tournament',
          description: 'Spring Championship registration opened',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
        },
        {
          id: '3',
          type: 'practice',
          description: 'Team Gamma completed training session',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
        }
      ],
      performanceMetrics: [
        { name: 'Win Rate', value: 78.5, change: 5.2, trend: 'up', target: 80 },
        { name: 'Attendance', value: 85.2, change: -2.1, trend: 'down', target: 90 },
        { name: 'Engagement', value: 92.3, change: 8.7, trend: 'up', target: 95 },
        { name: 'Team Morale', value: 88.9, change: 3.4, trend: 'up', target: 90 }
      ],
      teamComparison: [
        { teamId: '1', teamName: 'Team Alpha', wins: 15, losses: 3, draws: 2, points: 47, rank: 1 },
        { teamId: '2', teamName: 'Team Beta', wins: 12, losses: 5, draws: 3, points: 39, rank: 2 },
        { teamId: '3', teamName: 'Team Gamma', wins: 10, losses: 6, draws: 4, points: 34, rank: 3 }
      ],
      monthlyTrends: [
        { month: 'Jan', events: 12, participants: 145, engagement: 78 },
        { month: 'Feb', events: 15, participants: 162, engagement: 82 },
        { month: 'Mar', events: 18, participants: 178, engagement: 85 },
        { month: 'Apr', events: 22, participants: 195, engagement: 88 },
        { month: 'May', events: 20, participants: 187, engagement: 91 },
        { month: 'Jun', events: 25, participants: 210, engagement: 94 }
      ],
      topPerformers: [
        { id: '1', name: 'John Doe', stats: { matches: 20, wins: 16, points: 245, attendance: 95 } },
        { id: '2', name: 'Jane Smith', stats: { matches: 18, wins: 14, points: 220, attendance: 92 } },
        { id: '3', name: 'Mike Johnson', stats: { matches: 22, wins: 15, points: 235, attendance: 88 } }
      ],
      upcomingMilestones: [
        {
          id: '1',
          title: '100 Team Wins',
          description: 'Reach 100 total team victories',
          progress: 87,
          target: 100,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          type: 'team'
        },
        {
          id: '2',
          title: 'Perfect Attendance Month',
          description: 'Achieve 100% attendance for the month',
          progress: 78,
          target: 100,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          type: 'team'
        }
      ]
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboardStats) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your team's performance and growth
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Tabs value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button variant="outline" onClick={refresh}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FadeIn>
          <MetricCard
            title="Total Teams"
            value={dashboardStats.totalTeams}
            icon={Users}
            trend="up"
            change={12}
            color="blue"
          />
        </FadeIn>
        
        <FadeIn delay={0.1}>
          <MetricCard
            title="Active Players"
            value={dashboardStats.totalPlayers}
            icon={Activity}
            trend="up"
            change={8}
            color="green"
          />
        </FadeIn>
        
        <FadeIn delay={0.2}>
          <MetricCard
            title="Upcoming Events"
            value={dashboardStats.upcomingEvents}
            icon={Calendar}
            trend="stable"
            change={0}
            color="orange"
          />
        </FadeIn>
        
        <FadeIn delay={0.3}>
          <MetricCard
            title="Win Rate"
            value={`${dashboardStats.winRate}%`}
            icon={Trophy}
            trend="up"
            change={5.2}
            color="purple"
          />
        </FadeIn>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Track key performance indicators and progress towards goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardStats.performanceMetrics.map((metric, index) => (
              <FadeIn key={metric.name} delay={index * 0.1}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <div className="flex items-center space-x-1">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : metric.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <span className={`text-sm ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <CountUp end={metric.value} decimals={1} suffix="%" />
                      {metric.target && (
                        <span className="text-gray-500">Target: {metric.target}%</span>
                      )}
                    </div>
                    <Progress 
                      value={metric.target ? (metric.value / metric.target) * 100 : metric.value} 
                      className="h-2"
                    />
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dashboardStats.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="participants" 
                  stackId="1"
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="events" 
                  stackId="1"
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Team Rankings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.teamComparison.map((team, index) => (
                <SlideIn key={team.teamId} direction="right" delay={index * 0.1}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {team.rank}
                      </Badge>
                      <div>
                        <p className="font-medium">{team.teamName}</p>
                        <p className="text-sm text-gray-600">
                          {team.wins}W - {team.losses}L - {team.draws}D
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{team.points}</p>
                      <p className="text-sm text-gray-600">points</p>
                    </div>
                  </div>
                </SlideIn>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.recentActivity.map((activity, index) => (
                <FadeIn key={activity.id} delay={index * 0.1}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'match' ? 'bg-green-100 text-green-600' :
                      activity.type === 'tournament' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'practice' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'match' ? <Trophy className="h-4 w-4" /> :
                       activity.type === 'tournament' ? <Award className="h-4 w-4" /> :
                       activity.type === 'practice' ? <Target className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.topPerformers.map((player, index) => (
                <SlideIn key={player.id} direction="up" delay={index * 0.1}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-gray-600">
                          {player.stats.wins}/{player.stats.matches} wins
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{player.stats.points}</p>
                      <p className="text-xs text-gray-600">pts</p>
                    </div>
                  </div>
                </SlideIn>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats.upcomingMilestones.map((milestone, index) => (
                <FadeIn key={milestone.id} delay={index * 0.1}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{milestone.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {milestone.progress}/{milestone.target}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{milestone.description}</p>
                    <Progress value={(milestone.progress / milestone.target) * 100} className="h-2" />
                    <p className="text-xs text-gray-500">
                      Due {formatDistanceToNow(milestone.dueDate, { addSuffix: true })}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  change, 
  color 
}: { 
  title: string
  value: string | number
  icon: any
  trend: 'up' | 'down' | 'stable'
  change: number
  color: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CountUp end={typeof value === 'number' ? value : parseFloat(value.toString())} />
          {typeof value === 'string' && value.includes('%') && '%'}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          {trend === 'up' ? (
            <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
          ) : trend === 'down' ? (
            <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
          ) : (
            <div className="h-3 w-3 mr-1" />
          )}
          <span className={
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }>
            {change > 0 ? '+' : ''}{change}% from last {timeRange}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
