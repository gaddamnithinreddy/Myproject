"use client"

import { useState } from 'react'
import { Plus, MessageCircle, Phone, Mail } from 'lucide-react'
import Link from 'next/link'

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="fixed bottom-8 left-8 z-50">
      {/* Main FAB */}
      <button
        onClick={toggleMenu}
        className="fab"
        aria-label="Quick actions"
      >
        <Plus className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} size={24} />
      </button>

      {/* Menu Items */}
      <div className={`absolute bottom-16 left-0 space-y-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <Link href="/auth/register" className="fab bg-blue-500 hover:bg-blue-600">
          <Plus size={20} />
        </Link>
        <button className="fab bg-green-500 hover:bg-green-600">
          <MessageCircle size={20} />
        </button>
        <button className="fab bg-yellow-500 hover:bg-yellow-600">
          <Phone size={20} />
        </button>
        <button className="fab bg-purple-500 hover:bg-purple-600">
          <Mail size={20} />
        </button>
      </div>
    </div>
  )
} 