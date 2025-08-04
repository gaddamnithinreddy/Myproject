import { loadStripe, Stripe } from '@stripe/stripe-js'
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from './firebase'

// Initialize Stripe
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Payment Types
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'paypal'
  last4?: string
  brand?: string
  expMonth?: number
  expYear?: number
  isDefault: boolean
  customerId: string
}

export interface Subscription {
  id: string
  customerId: string
  planId: string
  planName: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  amount: number
  currency: string
  interval: 'month' | 'year'
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  customerId: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed' | 'canceled'
  type: 'payment' | 'refund' | 'subscription' | 'tournament_fee' | 'team_fee'
  description: string
  metadata: Record<string, any>
  paymentMethodId?: string
  subscriptionId?: string
  tournamentId?: string
  teamId?: string
  createdAt: string
  updatedAt: string
}

export interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
  isPopular?: boolean
  isActive: boolean
}

// Plans Configuration
export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individual players',
    price: 9.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 5 tournaments per month',
      'Basic team management',
      'Standard support',
      'Basic analytics'
    ],
    stripePriceId: 'price_basic_monthly',
    isActive: true
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'Ideal for serious players and teams',
    price: 19.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited tournaments',
      'Advanced team management',
      'Priority support',
      'Advanced analytics',
      'Custom branding',
      'API access'
    ],
    stripePriceId: 'price_pro_monthly',
    isPopular: true,
    isActive: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations and tournaments',
    price: 49.99,
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in Professional',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'Advanced security',
      'SLA guarantee'
    ],
    stripePriceId: 'price_enterprise_monthly',
    isActive: true
  }
]

// Payment Methods Management
export const getPaymentMethods = async (userId: string): Promise<PaymentMethod[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) {
      return []
    }

    const userData = userDoc.data()
    return userData.paymentMethods || []
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return []
  }
}

export const addPaymentMethod = async (userId: string, paymentMethod: PaymentMethod): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const paymentMethods = userData.paymentMethods || []
      
      // If this is the first payment method, make it default
      if (paymentMethods.length === 0) {
        paymentMethod.isDefault = true
      }
      
      // If this payment method is set as default, unset others
      if (paymentMethod.isDefault) {
        paymentMethods.forEach((pm: PaymentMethod) => {
          pm.isDefault = false
        })
      }
      
      paymentMethods.push(paymentMethod)
      
      await updateDoc(userRef, {
        paymentMethods,
        updatedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error adding payment method:', error)
    throw error
  }
}

export const updatePaymentMethod = async (userId: string, paymentMethodId: string, updates: Partial<PaymentMethod>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const paymentMethods = userData.paymentMethods || []
      
      const updatedMethods = paymentMethods.map((pm: PaymentMethod) => {
        if (pm.id === paymentMethodId) {
          return { ...pm, ...updates }
        }
        return pm
      })
      
      await updateDoc(userRef, {
        paymentMethods: updatedMethods,
        updatedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error updating payment method:', error)
    throw error
  }
}

export const removePaymentMethod = async (userId: string, paymentMethodId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      const userData = userDoc.data()
      const paymentMethods = userData.paymentMethods || []
      
      const updatedMethods = paymentMethods.filter((pm: PaymentMethod) => pm.id !== paymentMethodId)
      
      // If we removed the default payment method and there are others, make the first one default
      if (updatedMethods.length > 0 && !updatedMethods.some((pm: PaymentMethod) => pm.isDefault)) {
        updatedMethods[0].isDefault = true
      }
      
      await updateDoc(userRef, {
        paymentMethods: updatedMethods,
        updatedAt: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error removing payment method:', error)
    throw error
  }
}

// Subscription Management
export const getSubscription = async (userId: string): Promise<Subscription | null> => {
  try {
    const subscriptionsRef = collection(db, 'subscriptions')
    const q = query(
      subscriptionsRef,
      where('customerId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return null
    }
    
    const subscriptionDoc = querySnapshot.docs[0]
    return { id: subscriptionDoc.id, ...subscriptionDoc.data() } as Subscription
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return null
  }
}

export const createSubscription = async (userId: string, planId: string, paymentMethodId: string): Promise<Subscription> => {
  try {
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    // In a real implementation, you would create the subscription in Stripe first
    // For now, we'll create it directly in Firestore
    const subscription: Omit<Subscription, 'id'> = {
      customerId: userId,
      planId: plan.id,
      planName: plan.name,
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      cancelAtPeriodEnd: false,
      amount: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const docRef = await addDoc(collection(db, 'subscriptions'), subscription)
    
    // Create a transaction record
    await addDoc(collection(db, 'transactions'), {
      customerId: userId,
      amount: plan.price,
      currency: plan.currency,
      status: 'succeeded',
      type: 'subscription',
      description: `${plan.name} subscription`,
      metadata: { planId: plan.id },
      subscriptionId: docRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return { id: docRef.id, ...subscription }
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
  }
}

export const cancelSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId)
    await updateDoc(subscriptionRef, {
      cancelAtPeriodEnd: true,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

export const reactivateSubscription = async (subscriptionId: string): Promise<void> => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId)
    await updateDoc(subscriptionRef, {
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    throw error
  }
}

// Transaction Management
export const getTransactions = async (userId: string, limitCount = 50): Promise<Transaction[]> => {
  try {
    const transactionsRef = collection(db, 'transactions')
    const q = query(
      transactionsRef,
      where('customerId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Transaction)
    return transactions.slice(0, limitCount)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
}

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  try {
    const docRef = await addDoc(collection(db, 'transactions'), transaction)
    return { id: docRef.id, ...transaction }
  } catch (error) {
    console.error('Error creating transaction:', error)
    throw error
  }
}

// Tournament and Team Fees
export const processTournamentFee = async (
  userId: string,
  tournamentId: string,
  amount: number,
  paymentMethodId: string
): Promise<Transaction> => {
  try {
    // In a real implementation, you would process the payment through Stripe
    // For now, we'll create a transaction record directly
    
    const transaction: Omit<Transaction, 'id'> = {
      customerId: userId,
      amount,
      currency: 'usd',
      status: 'succeeded',
      type: 'tournament_fee',
      description: 'Tournament registration fee',
      metadata: { tournamentId },
      paymentMethodId,
    tournamentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return await createTransaction(transaction)
  } catch (error) {
    console.error('Error processing tournament fee:', error)
    throw error
  }
}

export const processTeamFee = async (
  userId: string,
  teamId: string,
  amount: number,
  paymentMethodId: string
): Promise<Transaction> => {
  try {
    const transaction: Omit<Transaction, 'id'> = {
      customerId: userId,
      amount,
      currency: 'usd',
      status: 'succeeded',
      type: 'team_fee',
      description: 'Team membership fee',
      metadata: { teamId },
      paymentMethodId,
      teamId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return await createTransaction(transaction)
  } catch (error) {
    console.error('Error processing team fee:', error)
    throw error
  }
}

// Stripe Integration Helpers
export const createPaymentIntent = async (amount: number, currency: string, metadata: Record<string, any> = {}) => {
  try {
    // In a real implementation, you would call your backend API
    // For now, we'll return a mock payment intent
    return {
      id: `pi_${Math.random().toString(36).substr(2, 9)}`,
      client_secret: `pi_${Math.random().toString(36).substr(2, 9)}_secret_${Math.random().toString(36).substr(2, 9)}`,
    amount,
      currency,
      metadata
    }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    throw error
  }
}

export const confirmPayment = async (paymentIntentId: string, paymentMethodId: string) => {
  try {
    // In a real implementation, you would confirm the payment with Stripe
    // For now, we'll return a mock confirmation
    return {
      id: paymentIntentId,
      status: 'succeeded',
      payment_method: paymentMethodId
    }
  } catch (error) {
    console.error('Error confirming payment:', error)
    throw error
  }
}

// Utility Functions
export const formatCurrency = (amount: number, currency: string = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount / 100) // Assuming amount is in cents
}

export const getPlanById = (planId: string): Plan | undefined => {
  return PLANS.find(plan => plan.id === planId)
}

export const getActivePlans = (): Plan[] => {
  return PLANS.filter(plan => plan.isActive)
}

// Webhook handlers (for backend implementation)
export const handleStripeWebhook = async (event: any) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error handling webhook:', error)
    throw error
  }
}

const handlePaymentSucceeded = async (paymentIntent: any) => {
  // Update transaction status
  const transactionRef = doc(db, 'transactions', paymentIntent.metadata.transactionId)
  await updateDoc(transactionRef, {
    status: 'succeeded',
    updatedAt: new Date().toISOString()
  })
}

const handlePaymentFailed = async (paymentIntent: any) => {
  // Update transaction status
  const transactionRef = doc(db, 'transactions', paymentIntent.metadata.transactionId)
  await updateDoc(transactionRef, {
    status: 'failed',
    updatedAt: new Date().toISOString()
  })
}

const handleSubscriptionCreated = async (subscription: any) => {
  // Update subscription in Firestore
  const subscriptionRef = doc(db, 'subscriptions', subscription.id)
  await setDoc(subscriptionRef, {
    id: subscription.id,
    customerId: subscription.customer,
    planId: subscription.metadata.planId,
    planName: subscription.metadata.planName,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    amount: subscription.items.data[0].price.unit_amount,
    currency: subscription.currency,
    interval: subscription.items.data[0].price.recurring.interval,
    createdAt: new Date(subscription.created * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  })
}

const handleSubscriptionUpdated = async (subscription: any) => {
  // Update subscription in Firestore
  const subscriptionRef = doc(db, 'subscriptions', subscription.id)
  await updateDoc(subscriptionRef, {
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString()
  })
}

const handleSubscriptionDeleted = async (subscription: any) => {
  // Update subscription status in Firestore
  const subscriptionRef = doc(db, 'subscriptions', subscription.id)
  await updateDoc(subscriptionRef, {
    status: 'canceled',
    updatedAt: new Date().toISOString()
  })
} 