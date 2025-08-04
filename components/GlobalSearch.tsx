"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Clock, Filter, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { useDebounce } from '@/hooks/use-debounce'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'team' | 'tournament' | 'schedule' | 'chat' | 'user' | 'video'
  url: string
  metadata?: Record<string, any>
  timestamp?: Date
  relevanceScore?: number
}

interface SearchFilters {
  types: string[]
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year'
  sortBy: 'relevance' | 'date' | 'title'
}

export default function GlobalSearch() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    dateRange: 'all',
    sortBy: 'relevance'
  })
  const [showFilters, setShowFilters] = useState(false)

  const debouncedQuery = useDebounce(query, 300)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('keyconnect_recent_searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Save recent searches
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10)
    setRecentSearches(updated)
    localStorage.setItem('keyconnect_recent_searches', JSON.stringify(updated))
  }, [recentSearches])

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return

    setLoading(true)
    const searchResults: SearchResult[] = []

    try {
      // Search teams
      if (filters.types.length === 0 || filters.types.includes('team')) {
        const teamsQuery = query(
          collection(db, 'teams'),
          where('memberIds', 'array-contains', user.uid),
          limit(10)
        )
        const teamsSnapshot = await getDocs(teamsQuery)
        
        teamsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              data.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
            searchResults.push({
              id: doc.id,
              title: data.name,
              description: data.description || `${data.sport} team`,
              type: 'team',
              url: `/teams/${doc.id}`,
              metadata: { sport: data.sport, memberCount: data.memberIds?.length || 0 },
              timestamp: data.createdAt?.toDate()
            })
          }
        })
      }

      // Search tournaments
      if (filters.types.length === 0 || filters.types.includes('tournament')) {
        const tournamentsQuery = query(
          collection(db, 'tournaments'),
          orderBy('startDate', 'desc'),
          limit(10)
        )
        const tournamentsSnapshot = await getDocs(tournamentsQuery)
        
        tournamentsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              data.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
            searchResults.push({
              id: doc.id,
              title: data.name,
              description: data.description || `${data.sport} tournament`,
              type: 'tournament',
              url: `/tournaments/${doc.id}`,
              metadata: { sport: data.sport, status: data.status },
              timestamp: data.startDate?.toDate()
            })
          }
        })
      }

      // Search schedules
      if (filters.types.length === 0 || filters.types.includes('schedule')) {
        const scheduleQuery = query(
          collection(db, 'schedules'),
          where('participants', 'array-contains', user.uid),
          orderBy('date', 'desc'),
          limit(10)
        )
        const scheduleSnapshot = await getDocs(scheduleQuery)
        
        scheduleSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              data.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
            searchResults.push({
              id: doc.id,
              title: data.title,
              description: data.description || `${data.scheduleType} event`,
              type: 'schedule',
              url: `/schedule?event=${doc.id}`,
              metadata: { type: data.scheduleType, status: data.status },
              timestamp: data.date?.toDate()
            })
          }
        })
      }

      // Search chat messages (limited for privacy)
      if (filters.types.length === 0 || filters.types.includes('chat')) {
        const chatRoomsQuery = query(
          collection(db, 'chatRooms'),
          where('participants', 'array-contains', user.uid),
          limit(5)
        )
        const chatRoomsSnapshot = await getDocs(chatRoomsQuery)
        
        chatRoomsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
            searchResults.push({
              id: doc.id,
              title: data.name || 'Chat Room',
              description: `${data.type} chat with ${data.participants?.length || 0} members`,
              type: 'chat',
              url: `/chat?room=${doc.id}`,
              metadata: { type: data.type, memberCount: data.participants?.length || 0 },
              timestamp: data.lastMessage?.timestamp?.toDate()
            })
          }
        })
      }

      // Apply filters and sorting
      let filteredResults = searchResults

      // Date filtering
      if (filters.dateRange !== 'all') {
        const now = new Date()
        const cutoff = new Date()
        
        switch (filters.dateRange) {
          case 'today':
            cutoff.setHours(0, 0, 0, 0)
            break
          case 'week':
            cutoff.setDate(now.getDate() - 7)
            break
          case 'month':
            cutoff.setMonth(now.getMonth() - 1)
            break
          case 'year':
            cutoff.setFullYear(now.getFullYear() - 1)
            break
        }
        
        filteredResults = filteredResults.filter(result => 
          result.timestamp && result.timestamp >= cutoff
        )
      }

      // Sorting
      filteredResults.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date':
            return (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
          case 'title':
            return a.title.localeCompare(b.title)
          case 'relevance':
          default:
            // Simple relevance scoring based on title match
            const aScore = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 1
            const bScore = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 1
            return bScore - aScore
        }
      })

      setResults(filteredResults)
      saveRecentSearch(searchQuery)
      
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [user, filters, saveRecentSearch])

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
    } else {
      setResults([])
    }
  }, [debouncedQuery, performSearch])

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('keyconnect_recent_searches')
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'team': return '👥'
      case 'tournament': return '🏆'
      case 'schedule': return '📅'
      case 'chat': return '💬'
      case 'user': return '👤'
      case 'video': return '🎥'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'team': return 'bg-blue-100 text-blue-800'
      case 'tournament': return 'bg-yellow-100 text-yellow-800'
      case 'schedule': return 'bg-green-100 text-green-800'
      case 'chat': return 'bg-purple-100 text-purple-800'
      case 'user': return 'bg-gray-100 text-gray-800'
      case 'video': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      {/* Search Trigger Button */}
      <Button
        variant="outline"
        className="relative w-full max-w-sm justify-start text-sm text-muted-foreground sm:pr-12"
        onClick={() => setIsOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search everything...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="sr-only">Global Search</DialogTitle>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search teams, tournaments, schedules..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-4"
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Filters */}
          {showFilters && (
            <div className="px-6 py-4 border-b space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Content Type</label>
                  <div className="space-y-2">
                    {['team', 'tournament', 'schedule', 'chat', 'video'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={filters.types.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, types: [...prev.types, type] }))
                            } else {
                              setFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }))
                            }
                          }}
                        />
                        <label htmlFor={type} className="text-sm capitalize">
                          {getTypeIcon(type)} {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select value={filters.dateRange} onValueChange={(value: any) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Past week</SelectItem>
                      <SelectItem value="month">Past month</SelectItem>
                      <SelectItem value="year">Past year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort by</label>
                  <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Searching...</span>
              </div>
            )}

            {/* Results */}
            {!loading && query && results.length > 0 && (
              <div className="p-2">
                {results.map((result) => (
                  <Card key={result.id} className="mb-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => {
                    window.location.href = result.url
                    setIsOpen(false)
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">{getTypeIcon(result.type)}</span>
                            <Badge variant="secondary" className={getTypeColor(result.type)}>
                              {result.type}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm mb-1">{result.title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{result.description}</p>
                          {result.metadata && (
                            <div className="flex space-x-2">
                              {Object.entries(result.metadata).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {result.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {result.timestamp.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && query && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">Try different keywords or adjust your filters</p>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    Recent Searches
                  </h4>
                  <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      onClick={() => setQuery(search)}
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!query && recentSearches.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start typing to search</p>
                <p className="text-sm mt-2">Search across teams, tournaments, schedules, and more</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
