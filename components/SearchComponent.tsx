"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'feature' | 'page' | 'help'
  url: string
}

const searchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Team Management',
    description: 'Manage your sports team members and roles',
    type: 'feature',
    url: '/teams'
  },
  {
    id: '2',
    title: 'Tournament Organization',
    description: 'Create and manage sports tournaments',
    type: 'feature',
    url: '/tournaments'
  },
  {
    id: '3',
    title: 'Schedule Management',
    description: 'Plan and organize team schedules',
    type: 'feature',
    url: '/schedule'
  },
  {
    id: '4',
    title: 'Getting Started Guide',
    description: 'Learn how to set up your first club',
    type: 'help',
    url: '/help/getting-started'
  },
  {
    id: '5',
    title: 'Pricing Plans',
    description: 'View our pricing and plans',
    type: 'page',
    url: '/pricing'
  }
]

export default function SearchComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    
    if (searchQuery.trim() === '') {
      setResults([])
      return
    }

    const filtered = searchResults.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setResults(filtered)
  }

  const handleResultClick = (result: SearchResult) => {
    // In a real app, you would navigate to the result
    console.log('Navigating to:', result.url)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  return (
    <>
      {/* Search Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-8 left-8 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-300 hover:shadow-xl magnetic-hover z-50"
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-gray-600" />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-96 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search features, help articles, and more..."
                    className="pl-10 pr-4 py-3 text-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-64 overflow-y-auto">
              {results.length > 0 ? (
                <div className="p-4 space-y-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          result.type === 'feature' ? 'bg-blue-100 text-blue-600' :
                          result.type === 'help' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          <Search size={16} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{result.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                            result.type === 'feature' ? 'bg-blue-100 text-blue-700' :
                            result.type === 'help' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {result.type}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim() !== '' ? (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No results found for "{query}"</p>
                  <p className="text-sm mt-2">Try different keywords or check our help center</p>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Search for features, help articles, and more</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 