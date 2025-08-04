"use client"

import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 text-white"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 120 }}
        className="flex items-center space-x-3"
      >
        <Loader2 className="h-12 w-12 animate-spin" />
        <span className="text-4xl font-bold tracking-tight">KeyConnect</span>
      </motion.div>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-4 text-lg"
      >
        Connecting Athletes, Teams, and Tournaments
      </motion.p>
    </motion.div>
  )
}
