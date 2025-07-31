"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import SplashScreen from "@/components/SplashScreen"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/auth/login")
      }
    }
  }, [user, loading, router])

  if (loading) {
    return <SplashScreen />
  }

  // This component will typically redirect before rendering anything
  return null

  // Hero Section
  // <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48">
  //   <div className="container px-4 md:px-6">
  //     <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.6 }}
  //         className="flex flex-col justify-center space-y-4"
  //       >
  //         <div className="space-y-2">
  //           <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
  //             Connect, Compete, Conquer.
  //           </h1>
  //           <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
  //             Your ultimate platform for managing sports teams, schedules, and tournaments.
  //           </p>
  //         </div>
  //         <div className="flex flex-col gap-2 min-[400px]:flex-row">
  //           <Button asChild>
  //             <Link href="/auth/register">Get Started</Link>
  //           </Button>
  //           <Button variant="outline" asChild>
  //             <Link href="/auth/login">Login</Link>
  //           </Button>
  //         </div>
  //       </motion.div>
  //       <motion.img
  //         initial={{ opacity: 0, scale: 0.9 }}
  //         animate={{ opacity: 1, scale: 1 }}
  //         transition={{ duration: 0.6, delay: 0.2 }}
  //         src="/placeholder.svg?height=400&width=600"
  //         width="600"
  //         height="400"
  //         alt="Hero"
  //         className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
  //       />
  //     </div>
  //   </div>
  // </section>

  // Features Section
  // <section className="w-full py-12 md:py-24 lg:py-32 bg-white dark:bg-gray-900">
  //   <div className="container px-4 md:px-6">
  //     <div className="flex flex-col items-center justify-center space-y-4 text-center">
  //       <div className="space-y-2">
  //         <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">Features</div>
  //         <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything you need to succeed</h2>
  //         <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
  //           From team management to tournament organization, we've got you covered.
  //         </p>
  //       </div>
  //     </div>
  //     <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
  //       <motion.div
  //         initial={{ opacity: 0, x: -20 }}
  //         animate={{ opacity: 1, x: 0 }}
  //         transition={{ duration: 0.6, delay: 0.3 }}
  //         className="flex flex-col justify-center space-y-4"
  //       >
  //         <ul className="grid gap-6">
  //           <li>
  //             <div className="grid gap-1">
  //               <h3 className="text-xl font-bold">Team Management</h3>
  //               <p className="text-gray-500 dark:text-gray-400">
  //                 Organize your roster, track member details, and communicate effortlessly.
  //               </p>
  //             </div>
  //           </li>
  //           <li>
  //             <div className="grid gap-1">
  //               <h3 className="text-xl font-bold">Schedule & Events</h3>
  //               <p className="text-gray-500 dark:text-gray-400">
  //                 Create and manage practices, games, and other team events with ease.
  //               </p>
  //             </div>
  //           </li>
  //           <li>
  //             <div className="grid gap-1">
  //               <h3 className="text-xl font-bold">Tournament Organization</h3>
  //               <p className="text-gray-500 dark:text-gray-400">
  //                 Host or join tournaments, manage registrations, and track progress.
  //               </p>
  //             </div>
  //           </li>
  //           <li>
  //             <div className="grid gap-1">
  //               <h3 className="text-xl font-bold">Real-time Chat</h3>
  //               <p className="text-gray-500 dark:text-gray-400">
  //                 Stay connected with your team and other participants through instant messaging.
  //               </p>
  //             </div>
  //           </li>
  //         </ul>
  //       </motion.div>
  //       <motion.img
  //         initial={{ opacity: 0, x: 20 }}
  //         animate={{ opacity: 1, x: 0 }}
  //         transition={{ duration: 0.6, delay: 0.4 }}
  //         src="/placeholder.svg?height=400&width=600"
  //         width="600"
  //         height="400"
  //         alt="Features"
  //         className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
  //       />
  //     </div>
  //   </div>
  // </section>

  // Testimonials Section
  // <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-950">
  //   <div className="container px-4 md:px-6">
  //     <div className="flex flex-col items-center justify-center space-y-4 text-center">
  //       <div className="space-y-2">
  //         <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">Testimonials</div>
  //         <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">What our users say</h2>
  //         <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
  //           Hear from coaches, players, and organizers who love our platform.
  //         </p>
  //       </div>
  //     </div>
  //     <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-8">
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.6, delay: 0.5 }}
  //       >
  //         <Card>
  //           <CardHeader>
  //             <CardTitle>Amazing for Team Coordination</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               "KeyConnect has revolutionized how I manage my basketball team. Scheduling practices and games is a
  //               breeze, and the chat feature keeps everyone on the same page."
  //             </CardDescription>
  //             <p className="mt-4 text-sm font-semibold">- Coach Sarah</p>
  //           </CardContent>
  //         </Card>
  //       </motion.div>
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.6, delay: 0.6 }}
  //       >
  //         <Card>
  //           <CardHeader>
  //             <CardTitle>Seamless Tournament Experience</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               "As a tournament organizer, this platform has saved me countless hours. From registration to bracket
  //               management, it's all so intuitive."
  //             </CardDescription>
  //             <p className="mt-4 text-sm font-semibold">- Mark, League Organizer</p>
  //           </CardContent>
  //         </Card>
  //       </motion.div>
  //       <motion.div
  //         initial={{ opacity: 0, y: 20 }}
  //         animate={{ opacity: 1, y: 0 }}
  //         transition={{ duration: 0.6, delay: 0.7 }}
  //       >
  //         <Card>
  //           <CardHeader>
  //             <CardTitle>Stay Connected with Teammates</CardTitle>
  //           </CardHeader>
  //           <CardContent>
  //             <CardDescription>
  //               "I love the chat feature! It's so easy to communicate with my teammates and get updates on our
  //               schedule. Highly recommend!"
  //             </CardDescription>
  //             <p className="mt-4 text-sm font-semibold">- Emily, Player</p>
  //           </CardContent>
  //         </Card>
  //       </motion.div>
  //     </div>
  //   </div>
  // </section>

  // Call to Action Section
  // <section className="w-full py-12 md:py-24 lg:py-32 bg-blue-600 text-white">
  //   <div className="container px-4 md:px-6 text-center">
  //     <motion.div
  //       initial={{ opacity: 0, y: 20 }}
  //       animate={{ opacity: 1, y: 0 }}
  //       transition={{ duration: 0.6, delay: 0.8 }}
  //       className="space-y-4"
  //     >
  //       <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Ready to get started?</h2>
  //       <p className="mx-auto max-w-[700px] text-blue-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
  //         Join thousands of athletes, coaches, and organizers who are streamlining their sports management.
  //       </p>
  //       <Button asChild variant="secondary" className="mt-6">
  //         <Link href="/auth/register">Sign Up for Free</Link>
  //       </Button>
  //     </motion.div>
  //   </div>
  // </section>

  // Footer
  // <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white dark:bg-gray-900">
  //   <p className="text-xs text-gray-500 dark:text-gray-400">&copy; 2023 KeyConnect. All rights reserved.</p>
  //   <nav className="sm:ml-auto flex gap-4 sm:gap-6">
  //     <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
  //       Terms of Service
  //     </Link>
  //     <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
  //       Privacy
  //     </Link>
  //   </nav>
  // </footer>
}
