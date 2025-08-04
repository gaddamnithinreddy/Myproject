"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import SplashScreen from "@/components/SplashScreen"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ScrollProgress from "@/components/ScrollProgress"
import BackToTop from "@/components/BackToTop"

import CookieConsent from "@/components/CookieConsent"
import InteractiveDemo from "@/components/InteractiveDemo"
import PricingSection from "@/components/PricingSection"
import NewsletterSignup from "@/components/NewsletterSignup"
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && user) {
        router.push("/dashboard")
    }
  }, [user, loading, router])

  useEffect(() => {
    // Initialize Swiper
    if (typeof window !== 'undefined') {
      const initSwiper = async () => {
        const { default: Swiper } = await import('swiper')
        const { Navigation, Pagination, Autoplay } = await import('swiper/modules')
        
        Swiper.use([Navigation, Pagination, Autoplay])
        
        new Swiper(".mySwiper", {
          effect: "slide",
          grabCursor: true,
          centeredSlides: true,
          slidesPerView: 1,
          loop: true,
          autoplay: {
            delay: 5000,
            disableOnInteraction: false,
          },
          pagination: {
            el: ".swiper-pagination",
            clickable: true,
          },
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
        })
      }
      
      // Initialize ScrollReveal
      const initScrollReveal = async () => {
        const ScrollReveal = (await import('scrollreveal')).default
        const sr = ScrollReveal({
          distance: '60px',
          duration: 1000,
          easing: 'ease-in-out',
          reset: false
        })
        
        // Header animations
        sr.reveal('.header-logo', { 
          delay: 100, 
          origin: 'left',
          scale: 0.8
        })
        sr.reveal('.header-nav', { 
          delay: 300, 
          origin: 'right',
          distance: '30px'
        })
        
        // Main content animations
        sr.reveal('.swiper-container', { 
          delay: 200, 
          origin: 'bottom',
          scale: 0.9
        })
        
        // Company section animations
        sr.reveal('#headline', { 
          delay: 200, 
          distance: '40px', 
          origin: 'top', 
          duration: 800, 
          easing: 'ease-in-out'
        })
        sr.reveal('#subheadline', { 
          delay: 400, 
          distance: '40px', 
          origin: 'bottom', 
          duration: 800, 
          easing: 'ease-in-out'
        })
        sr.reveal('.feature-card', { 
          interval: 200, 
          delay: 600, 
          distance: '60px', 
          origin: 'bottom', 
          duration: 900, 
          easing: 'ease-in-out'
        })
        sr.reveal('.cta-btn', { 
          delay: 1200, 
          scale: 0.85, 
          duration: 700, 
          easing: 'ease-in-out'
        })
        
        // Additional animations for icons
        sr.reveal('.feature-icon', { 
          interval: 300, 
          delay: 800, 
          origin: 'top',
          scale: 0.5,
          duration: 600
        })
        
        // New section animations
        sr.reveal('.stats-section', { 
          delay: 1400, 
          distance: '40px', 
          origin: 'bottom', 
          duration: 800 
        })
        
        sr.reveal('.testimonial-card', { 
          interval: 200, 
          delay: 1600, 
          distance: '60px', 
          origin: 'bottom', 
          duration: 900 
        })
        
        sr.reveal('.feature-grid-item', { 
          interval: 150, 
          delay: 1800, 
          distance: '50px', 
          origin: 'bottom', 
          duration: 800 
        })
        
        sr.reveal('.footer-section', { 
          delay: 2000, 
          distance: '30px', 
          origin: 'bottom', 
          duration: 700 
        })
      }
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initSwiper()
        initScrollReveal()
      }, 100)
    }
  }, [])

  if (loading) {
    return <SplashScreen />
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <>
      <ScrollProgress />
      <BackToTop />
      <CookieConsent />
      
      <div className="fade-in bg-gradient-to-br from-blue-50 via-white to-green-50 min-h-screen relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-green-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-40 left-20 w-24 h-24 bg-yellow-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-20 right-10 w-12 h-12 bg-blue-300 rounded-full opacity-20 animate-pulse" style={{animationDelay: '0.5s'}}></div>
        </div>
      {/* Header */}
      <div className="flex justify-center px-4">
        <header className="bg-white/90 backdrop-blur-md mt-6 lg:w-[70%] w-[90%] flex flex-col items-center justify-between px-10 py-4 rounded-[20px] fixed z-10 transition-opacity duration-500 shadow-lg border border-gray-100">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center header-logo">
              <img src="/logo.png" alt="Logo" className="w-12 h-12" />
              <div className="ml-3">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">KeyConnect</h1>
              </div>
            </div>
            <nav className="hidden lg:flex items-center space-x-8 header-nav">
              <Link href="/auth/login" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Login
              </Link>
              <Link href="/auth/register" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Register
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                About
              </Link>
              <Link href="#contact" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Contact
              </Link>
            </nav>
            <button 
              className="lg:hidden text-gray-700 hover:text-blue-600 transition-colors" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <i className="fas fa-bars text-2xl"></i>
            </button>
          </div>
          <div className={`w-full mt-4 backdrop-blur-lg bg-white/50 rounded-lg ${mobileMenuOpen ? 'block' : 'hidden'}`}>
            <nav className="flex flex-col space-y-4 py-4 px-4">
              <Link href="/auth/login" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Login
              </Link>
              <Link href="/auth/register" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Register
              </Link>
              <Link href="#about" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                About
              </Link>
              <Link href="#contact" className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200">
                Contact
              </Link>
            </nav>
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex flex-col justify-center items-center min-h-screen w-full">
        <section className="w-full lg:w-[80%] -mt-10">
          <div className="swiper mySwiper swiper-container">
            <div className="swiper-wrapper">
              <div className="swiper-slide">
                <img src="/cricket.jpg" alt="Cricket" />
              </div>
              <div className="swiper-slide">
                <img src="/football.jpg" alt="Football" />
              </div>
              <div className="swiper-slide">
                <img src="/basketball.jpg" alt="Basketball" />
              </div>
              <div className="swiper-slide">
                <img src="/golf.jpg" alt="Golf" />
              </div>
              <div className="swiper-slide">
                <img src="/tennis.jpg" alt="Tennis" />
              </div>
            </div>
            <div className="swiper-button-next text-white"></div>
            <div className="swiper-button-prev text-white"></div>
            <div className="swiper-pagination"></div>
          </div>
        </section>
      </main>

      {/* Company Introduction Section */}
      <section className="w-full flex justify-center mt-4 px-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-16 px-8 flex flex-col items-center text-center border border-gray-100">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-800 leading-tight" id="headline">
            Empowering Sports Clubs to <span className="gradient-text">Connect & Grow</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl leading-relaxed" id="subheadline">
            KeyConnect is the ultimate platform for club owners to manage, promote, and expand their sports communities. 
            Unlock new opportunities, streamline operations, and connect with passionate athletes and fans.
          </p>
          <div className="flex flex-col md:flex-row gap-8 w-full justify-center mb-12">
            <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:shadow-xl transition-all duration-300 feature-card border border-blue-200 magnetic-hover">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full p-5 mb-6 shadow-lg feature-icon">
                <i className="fas fa-chart-line text-4xl"></i>
              </div>
              <h3 className="font-bold text-2xl mb-4 text-gray-800">Grow Your Club</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Reach new members, boost your club's visibility, and expand your network effortlessly with our powerful growth tools.</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:shadow-xl transition-all duration-300 feature-card border border-green-200 magnetic-hover">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full p-5 mb-6 shadow-lg feature-icon">
                <i className="fas fa-users text-4xl"></i>
              </div>
              <h3 className="font-bold text-2xl mb-4 text-gray-800">Connect with Athletes</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Engage with talented athletes and passionate fans through our seamless communication and networking tools.</p>
            </div>
            <div className="flex-1 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:shadow-xl transition-all duration-300 feature-card border border-yellow-200 magnetic-hover">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-full p-5 mb-6 shadow-lg feature-icon">
                <i className="fas fa-calendar-check text-4xl"></i>
              </div>
              <h3 className="font-bold text-2xl mb-4 text-gray-800">Manage Events Easily</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Organize matches, training sessions, and events with intuitive scheduling and management features.</p>
            </div>
          </div>
          <Link href="/auth/register">
            <Button className="mt-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-xl cta-btn btn-enhanced button-glow magnetic-hover">
              Join KeyConnect Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="w-full flex justify-center mt-16 px-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-12 px-8 flex flex-col items-center text-center border border-gray-100 stats-section">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">Trusted by Sports Communities Worldwide</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">Active Clubs</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-green-600 mb-2">10K+</div>
              <div className="text-gray-600">Athletes</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">50+</div>
              <div className="text-gray-600">Sports Types</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">100+</div>
              <div className="text-gray-600">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full flex justify-center mt-16 px-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-12 px-8 flex flex-col items-center text-center border border-gray-100">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 testimonial-card">
              <div className="text-4xl mb-4">⭐</div>
              <p className="text-gray-700 mb-4">"KeyConnect has revolutionized how I manage my basketball team. The scheduling and communication features are incredible!"</p>
              <div className="font-semibold text-gray-800">- Coach Sarah</div>
              <div className="text-sm text-gray-600">Basketball Coach</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 testimonial-card">
              <div className="text-4xl mb-4">⭐</div>
              <p className="text-gray-700 mb-4">"As a tournament organizer, this platform has saved me countless hours. Everything is so intuitive!"</p>
              <div className="font-semibold text-gray-800">- Mark Johnson</div>
              <div className="text-sm text-gray-600">League Organizer</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200 testimonial-card">
              <div className="text-4xl mb-4">⭐</div>
              <p className="text-gray-700 mb-4">"I love how easy it is to connect with other athletes and find new opportunities. Highly recommend!"</p>
              <div className="font-semibold text-gray-800">- Emily Chen</div>
              <div className="text-sm text-gray-600">Tennis Player</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="w-full flex justify-center mt-16 px-2">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-6xl py-12 px-8 flex flex-col items-center text-center border border-gray-100">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-800">Everything You Need to Succeed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200 feature-grid-item">
              <div className="bg-blue-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-calendar text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Smart Scheduling</h3>
              <p className="text-gray-600">Automated scheduling with conflict detection and smart notifications.</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 feature-grid-item">
              <div className="bg-green-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-comments text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Team Communication</h3>
              <p className="text-gray-600">Real-time messaging and announcements for seamless team coordination.</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200 feature-grid-item">
              <div className="bg-yellow-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-trophy text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Tournament Management</h3>
              <p className="text-gray-600">Complete tournament organization with brackets and scoring systems.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 feature-grid-item">
              <div className="bg-purple-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-chart-bar text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Analytics & Insights</h3>
              <p className="text-gray-600">Detailed performance analytics and growth tracking for your club.</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 feature-grid-item">
              <div className="bg-red-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-mobile-alt text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Mobile App</h3>
              <p className="text-gray-600">Access everything on the go with our mobile-optimized platform.</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200 feature-grid-item">
              <div className="bg-indigo-500 text-white rounded-full p-3 mb-4 w-fit mx-auto">
                <i className="fas fa-shield-alt text-xl"></i>
              </div>
              <h3 className="font-bold text-xl mb-2 text-gray-800">Secure & Reliable</h3>
              <p className="text-gray-600">Enterprise-grade security with 99.9% uptime guarantee.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <InteractiveDemo />

      {/* Pricing Section */}
      <PricingSection />

      {/* Newsletter Signup */}
      <NewsletterSignup />

      {/* Footer */}
      <footer className="w-full bg-white/95 backdrop-blur-sm mt-16 py-12 border-t border-gray-200 footer-section">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img src="/logo.png" alt="Logo" className="w-8 h-8" />
                <h3 className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">KeyConnect</h3>
              </div>
              <p className="text-gray-600 mb-4">Empowering sports communities to connect, compete, and grow together.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <i className="fab fa-facebook text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <i className="fab fa-instagram text-xl"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <i className="fab fa-linkedin text-xl"></i>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">API</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-800 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-blue-600 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 KeyConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Additional CSS for animations */}
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* Floating animation for icons */
        .feature-icon {
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        /* Pulse animation for CTA button */
        .cta-btn {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
        
        /* Gradient text animation */
        .gradient-text {
          background: linear-gradient(45deg, #3b82f6, #10b981, #3b82f6);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        /* Hover effects for cards */
        .feature-card:hover {
          transform: translateY(-5px);
        }
        
        .feature-card:hover .feature-icon {
          animation: bounce 0.6s ease-in-out;
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(-10px);
          }
        }
        
        ::-webkit-scrollbar {
          display: none;
        }
        html {
          scroll-behavior: smooth;
        }
        .swiper {
          width: 100%;
          padding-top: 50px;
          padding-bottom: 50px;
        }
        .swiper-slide {
          background-position: center;
          background-size: cover;
          height: 400px;
        }
        .swiper-slide img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
          object-position: center;
        }
      `}</style>
      </div>
    </>
  )
}
