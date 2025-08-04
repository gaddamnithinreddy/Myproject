"use client"

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Calendar,
  Users,
  Trophy,
  Target,
  Filter,
  Share,
  Mail,
  Printer,
  Eye,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area, AreaChart } from 'recharts'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { toast } from 'sonner'
import { FadeIn, SlideIn } from '@/components/ui/micro-animations'
import { useCache } from '@/lib/cache'

interface ReportData {
  teamPerformance: TeamPerformanceData[]
  playerStats: PlayerStatsData[]
  attendanceData: AttendanceData[]
  financialData: FinancialData[]
  engagementMetrics: EngagementData[]
  comparativeAnalysis: ComparisonData[]
  predictiveInsights: PredictiveData[]
}

interface TeamPerformanceData {
  teamId: string
  teamName: string
  matches: number
  wins: number
  losses: number
  draws: number
  winRate: number
  goalsFor: number
  goalsAgainst: number
  points: number
  rank: number
  trend: 'up' | 'down' | 'stable'
}

interface PlayerStatsData {
  playerId: string
  playerName: string
  position: string
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  attendance: number
  rating: number
  improvement: number
}

interface AttendanceData {
  date: string
  totalPlayers: number
  present: number
  absent: number
  rate: number
  eventType: 'practice' | 'match' | 'tournament'
}

interface FinancialData {
  month: string
  income: number
  expenses: number
  profit: number
  registrationFees: number
  tournamentFees: number
  equipment: number
  facilities: number
}

interface EngagementData {
  metric: string
  value: number
  change: number
  benchmark: number
  category: 'communication' | 'participation' | 'satisfaction'
}

interface ComparisonData {
  period: string
  current: number
  previous: number
  change: number
  metric: string
}

interface PredictiveData {
  metric: string
  current: number
  predicted: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
  factors: string[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export function EnhancedReporting({ teamId }: { teamId?: string }) {
  const { user } = useAuth()
  const [reportType, setReportType] = useState<'performance' | 'financial' | 'engagement' | 'predictive'>('performance')
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  const [isGenerating, setIsGenerating] = useState(false)

  // Cache report data
  const { data: reportData, loading, refresh } = useCache(
    `report-${reportType}-${dateRange}-${teamId}`,
    async () => await fetchReportData(reportType, dateRange, teamId),
    10 * 60 * 1000 // 10 minutes
  )

  const fetchReportData = async (type: string, range: string, teamId?: string): Promise<ReportData> => {
    // Mock data for demonstration
    return {
      teamPerformance: [
        {
          teamId: '1',
          teamName: 'Team Alpha',
          matches: 20,
          wins: 15,
          losses: 3,
          draws: 2,
          winRate: 75,
          goalsFor: 45,
          goalsAgainst: 18,
          points: 47,
          rank: 1,
          trend: 'up'
        },
        {
          teamId: '2',
          teamName: 'Team Beta',
          matches: 18,
          wins: 12,
          losses: 4,
          draws: 2,
          winRate: 66.7,
          goalsFor: 38,
          goalsAgainst: 22,
          points: 38,
          rank: 2,
          trend: 'stable'
        }
      ],
      playerStats: [
        {
          playerId: '1',
          playerName: 'John Doe',
          position: 'Forward',
          matches: 18,
          goals: 12,
          assists: 8,
          yellowCards: 2,
          redCards: 0,
          attendance: 95,
          rating: 8.5,
          improvement: 15
        }
      ],
      attendanceData: [
        { date: '2024-01', totalPlayers: 25, present: 23, absent: 2, rate: 92, eventType: 'practice' },
        { date: '2024-02', totalPlayers: 25, present: 24, absent: 1, rate: 96, eventType: 'practice' },
        { date: '2024-03', totalPlayers: 25, present: 22, absent: 3, rate: 88, eventType: 'match' }
      ],
      financialData: [
        {
          month: 'Jan',
          income: 5000,
          expenses: 3500,
          profit: 1500,
          registrationFees: 3000,
          tournamentFees: 2000,
          equipment: 1200,
          facilities: 2300
        }
      ],
      engagementMetrics: [
        { metric: 'Chat Activity', value: 85, change: 12, benchmark: 80, category: 'communication' },
        { metric: 'Event Participation', value: 92, change: 5, benchmark: 85, category: 'participation' },
        { metric: 'Team Satisfaction', value: 88, change: -3, benchmark: 90, category: 'satisfaction' }
      ],
      comparativeAnalysis: [
        { period: 'This Month', current: 85, previous: 78, change: 9, metric: 'Win Rate' },
        { period: 'This Quarter', current: 92, previous: 88, change: 4.5, metric: 'Attendance' }
      ],
      predictiveInsights: [
        {
          metric: 'Team Performance',
          current: 85,
          predicted: 92,
          confidence: 78,
          trend: 'increasing',
          factors: ['Improved training', 'Better attendance', 'New player additions']
        }
      ]
    }
  }

  const generateReport = async () => {
    setIsGenerating(true)
    
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would call an API to generate the report
      const reportData = {
        type: reportType,
        dateRange,
        teams: selectedTeams,
        format: exportFormat,
        generatedAt: new Date().toISOString(),
        data: reportData
      }

      // Simulate file download
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Report generated successfully!')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const shareReport = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${reportType} Report`,
          text: `Check out this ${reportType} report for our team`,
          url: window.location.href
        })
      } catch (error) {
        // Fallback to copying link
        navigator.clipboard.writeText(window.location.href)
        toast.success('Report link copied to clipboard!')
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Report link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Advanced Reporting</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate comprehensive reports and analytics
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={shareReport}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Report Configuration
          </CardTitle>
          <CardDescription>
            Configure your report parameters and filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                  <SelectItem value="predictive">Predictive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      <Tabs value={reportType} onValueChange={(value: any) => setReportType(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
        </TabsList>

        {/* Performance Report */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData?.teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="teamName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="winRate" fill="#8884d8" />
                    <Bar dataKey="points" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win Rate Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={reportData?.teamPerformance}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="wins"
                      label={({ teamName, wins }) => `${teamName}: ${wins}`}
                    >
                      {reportData?.teamPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Team Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Team</th>
                      <th className="text-left p-2">Matches</th>
                      <th className="text-left p-2">W/L/D</th>
                      <th className="text-left p-2">Win Rate</th>
                      <th className="text-left p-2">Goals</th>
                      <th className="text-left p-2">Points</th>
                      <th className="text-left p-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.teamPerformance.map((team, index) => (
                      <FadeIn key={team.teamId} delay={index * 0.1}>
                        <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-2 font-medium">{team.teamName}</td>
                          <td className="p-2">{team.matches}</td>
                          <td className="p-2">{team.wins}/{team.losses}/{team.draws}</td>
                          <td className="p-2">{team.winRate}%</td>
                          <td className="p-2">{team.goalsFor}/{team.goalsAgainst}</td>
                          <td className="p-2 font-bold">{team.points}</td>
                          <td className="p-2">
                            <Badge variant={
                              team.trend === 'up' ? 'default' : 
                              team.trend === 'down' ? 'destructive' : 'secondary'
                            }>
                              {team.trend === 'up' ? '↗️' : team.trend === 'down' ? '↘️' : '→'} {team.trend}
                            </Badge>
                          </td>
                        </tr>
                      </FadeIn>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={reportData?.financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="income" fill="#00C49F" />
                    <Bar dataKey="expenses" fill="#FF8042" />
                    <Line type="monotone" dataKey="profit" stroke="#8884d8" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData?.financialData[0] && (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Equipment</span>
                        <span className="font-bold">${reportData.financialData[0].equipment}</span>
                      </div>
                      <Progress value={30} className="h-2" />
                      
                      <div className="flex justify-between items-center">
                        <span>Facilities</span>
                        <span className="font-bold">${reportData.financialData[0].facilities}</span>
                      </div>
                      <Progress value={65} className="h-2" />
                      
                      <div className="flex justify-between items-center">
                        <span>Registration Fees</span>
                        <span className="font-bold">${reportData.financialData[0].registrationFees}</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Report */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reportData?.engagementMetrics.map((metric, index) => (
              <FadeIn key={metric.metric} delay={index * 0.1}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{metric.metric}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Current</span>
                        <span className="font-bold">{metric.value}%</span>
                      </div>
                      <Progress value={metric.value} className="h-3" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Benchmark: {metric.benchmark}%</span>
                        <span className={metric.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {metric.change >= 0 ? '+' : ''}{metric.change}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={reportData?.attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictive Report */}
        <TabsContent value="predictive" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportData?.predictiveInsights.map((insight, index) => (
              <FadeIn key={insight.metric} delay={index * 0.1}>
                <Card>
                  <CardHeader>
                    <CardTitle>{insight.metric} Prediction</CardTitle>
                    <CardDescription>
                      Based on current trends and historical data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Current Value</span>
                        <span className="font-bold">{insight.current}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Predicted Value</span>
                        <span className="font-bold text-blue-600">{insight.predicted}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Confidence</span>
                        <Badge variant="outline">{insight.confidence}%</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Key Factors:</h4>
                        <ul className="text-sm space-y-1">
                          {insight.factors.map((factor, i) => (
                            <li key={i} className="flex items-center">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Import Pie component
import { Pie } from 'recharts'
