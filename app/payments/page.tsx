"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  getPaymentMethods, 
  addPaymentMethod, 
  removePaymentMethod, 
  getSubscription, 
  createSubscription, 
  cancelSubscription, 
  reactivateSubscription,
  getTransactions,
  PLANS,
  formatCurrency,
  type PaymentMethod,
  type Subscription,
  type Transaction
} from "@/lib/payments"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import DashboardLayout from "@/components/DashboardLayout"
import { 
  AnimatedPage, 
  AnimatedCard, 
  FadeIn, 
  SlideUp, 
  AnimatedButton,
  StaggeredContainer,
  StaggeredItem,
  AnimatedModal,
  AnimatedCounter
} from "@/components/AnimatedComponents"
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Calendar, 
  DollarSign, 
  Users, 
  Zap,
  Shield,
  Star,
  ArrowRight,
  Download,
  Receipt,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  CreditCard as CreditCardIcon,
  Building,
  Crown,
  Trophy,
  ArrowLeft
} from "lucide-react"

export default function PaymentsPage() {
  const { user } = useAuth()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    isDefault: false
  })

  useEffect(() => {
    if (user) {
      loadPaymentData()
    }
  }, [user])

  const loadPaymentData = async () => {
    if (!user) return

    try {
      const [methods, sub, trans] = await Promise.all([
        getPaymentMethods(user.uid),
        getSubscription(user.uid),
        getTransactions(user.uid)
      ])

      setPaymentMethods(methods)
      setSubscription(sub)
      setTransactions(trans)
    } catch (error) {
      console.error("Error loading payment data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // In a real implementation, you would tokenize the card with Stripe
      const paymentMethod: PaymentMethod = {
        id: `pm_${Math.random().toString(36).substr(2, 9)}`,
        type: 'card',
        last4: newPaymentMethod.cardNumber.slice(-4),
        brand: 'visa', // This would be determined by Stripe
        expMonth: parseInt(newPaymentMethod.expiryDate.split('/')[0]),
        expYear: parseInt('20' + newPaymentMethod.expiryDate.split('/')[1]),
        isDefault: newPaymentMethod.isDefault,
        customerId: user.uid
      }

      await addPaymentMethod(user.uid, paymentMethod)
      await loadPaymentData()
      setAddPaymentModalOpen(false)
      setNewPaymentMethod({
        cardNumber: "",
        expiryDate: "",
        cvv: "",
        cardholderName: "",
        isDefault: false
      })
    } catch (error) {
      console.error("Error adding payment method:", error)
    }
  }

  const handleRemovePaymentMethod = async (paymentMethodId: string) => {
    if (!user) return

    try {
      await removePaymentMethod(user.uid, paymentMethodId)
      await loadPaymentData()
    } catch (error) {
      console.error("Error removing payment method:", error)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!user || !paymentMethods.length) {
      alert("Please add a payment method first")
      return
    }

    try {
      const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault)
      if (!defaultPaymentMethod) {
        alert("Please set a default payment method")
        return
      }

      await createSubscription(user.uid, planId, defaultPaymentMethod.id)
      await loadPaymentData()
      setSelectedPlan("")
    } catch (error) {
      console.error("Error creating subscription:", error)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription) return

    try {
      await cancelSubscription(subscription.id)
      await loadPaymentData()
    } catch (error) {
      console.error("Error canceling subscription:", error)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription) return

    try {
      await reactivateSubscription(subscription.id)
      await loadPaymentData()
    } catch (error) {
      console.error("Error reactivating subscription:", error)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="w-4 h-4" />
      case 'tournament_fee':
        return <Trophy className="w-4 h-4" />
      case 'team_fee':
        return <Users className="w-4 h-4" />
      case 'refund':
        return <ArrowLeft className="w-4 h-4" />
      default:
        return <DollarSign className="w-4 h-4" />
    }
  }

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'failed':
        return 'text-red-600'
      case 'canceled':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTransactionStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'canceled':
        return <X className="w-4 h-4 text-gray-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments & Billing</h1>
            <p className="text-gray-600">
              Manage your subscription, payment methods, and view transaction history
            </p>
          </div>
        </FadeIn>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <AnimatedCard>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Current Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">
                            {subscription ? subscription.planName : "Free"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {subscription ? formatCurrency(subscription.amount * 100) : "No active subscription"}
                          </p>
                        </div>
                        {subscription && (
                          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                            {subscription.status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  <AnimatedCard>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Payment Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">{paymentMethods.length}</p>
                          <p className="text-sm text-gray-600">Saved cards</p>
                        </div>
                        <CreditCard className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </AnimatedCard>

                  <AnimatedCard>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">
                            {formatCurrency(
                              transactions
                                .filter(t => t.status === 'succeeded')
                                .reduce((sum, t) => sum + t.amount, 0)
                            )}
                          </p>
                          <p className="text-sm text-gray-600">All time</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </div>
              </StaggeredItem>

              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Your latest payment activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactions.slice(0, 5).length > 0 ? (
                      <div className="space-y-3">
                        {transactions.slice(0, 5).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getTransactionIcon(transaction.type)}
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(transaction.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {formatCurrency(transaction.amount)}
                              </span>
                              {getTransactionStatusIcon(transaction.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No transactions yet</p>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <StaggeredContainer>
              {subscription ? (
                <StaggeredItem>
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5" />
                        Current Subscription
                      </CardTitle>
                      <CardDescription>
                        Manage your active subscription
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Plan</Label>
                          <p className="text-lg font-semibold">{subscription.planName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Status</Label>
                          <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                            {subscription.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Amount</Label>
                          <p className="text-lg font-semibold">
                            {formatCurrency(subscription.amount * 100)}/{subscription.interval}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Next Billing</Label>
                          <p className="text-sm">
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-3">
                        {subscription.cancelAtPeriodEnd ? (
                          <Button
                            onClick={handleReactivateSubscription}
                            className="flex-1"
                          >
                            Reactivate Subscription
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={handleCancelSubscription}
                            className="flex-1"
                          >
                            Cancel Subscription
                          </Button>
                        )}
                                                  <Button variant="outline" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            Download Invoice
                          </Button>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </StaggeredItem>
              ) : (
                <StaggeredItem>
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle>Choose a Plan</CardTitle>
                      <CardDescription>
                        Select a subscription plan that fits your needs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => (
                          <AnimatedCard
                            key={plan.id}
                            className={`relative ${plan.isPopular ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            {plan.isPopular && (
                              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
                                Most Popular
                              </Badge>
                            )}
                            <CardHeader>
                              <CardTitle className="text-center">{plan.name}</CardTitle>
                              <CardDescription className="text-center">
                                {plan.description}
                              </CardDescription>
                              <div className="text-center">
                                <span className="text-3xl font-bold">
                                  {formatCurrency(plan.price * 100)}
                                </span>
                                <span className="text-gray-600">/{plan.interval}</span>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <ul className="space-y-2">
                                {plan.features.map((feature, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span className="text-sm">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                              <AnimatedButton
                                onClick={() => handleSubscribe(plan.id)}
                                className="w-full"
                                disabled={!paymentMethods.length}
                              >
                                {paymentMethods.length ? 'Subscribe Now' : 'Add Payment Method First'}
                              </AnimatedButton>
                            </CardContent>
                          </AnimatedCard>
                        ))}
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </StaggeredItem>
              )}
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="payment-methods" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Payment Methods</h3>
                  <AnimatedButton
                    onClick={() => setAddPaymentModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment Method
                  </AnimatedButton>
                </div>
              </StaggeredItem>

              <StaggeredItem>
                {paymentMethods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentMethods.map((method, index) => (
                      <AnimatedCard
                        key={method.id}
                        className="p-4"
                        delay={index * 0.1}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCardIcon className="w-8 h-8 text-gray-400" />
                            <div>
                              <p className="font-medium">
                                {method.brand?.toUpperCase()} •••• {method.last4}
                              </p>
                              <p className="text-sm text-gray-600">
                                Expires {method.expMonth}/{method.expYear}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {method.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePaymentMethod(method.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </AnimatedCard>
            ))}
                  </div>
                ) : (
                  <AnimatedCard className="text-center py-12">
                    <CreditCardIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods</h3>
                    <p className="text-gray-600 mb-4">
                      Add a payment method to subscribe to plans and make purchases
                    </p>
                    <AnimatedButton
                      onClick={() => setAddPaymentModalOpen(true)}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add Payment Method
                    </AnimatedButton>
                  </AnimatedCard>
                )}
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <StaggeredContainer>
              <StaggeredItem>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      View all your payment transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {transactions.length > 0 ? (
                      <div className="space-y-4">
                        {transactions.map((transaction, index) => (
                          <AnimatedCard
                            key={transaction.id}
                            className="p-4"
                            delay={index * 0.05}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getTransactionIcon(transaction.type)}
                                <div>
                                  <p className="font-medium">{transaction.description}</p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                                    {new Date(transaction.createdAt).toLocaleTimeString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID: {transaction.id}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {formatCurrency(transaction.amount)}
                                </span>
                                {getTransactionStatusIcon(transaction.status)}
                              </div>
                            </div>
                          </AnimatedCard>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Transactions</h3>
                        <p className="text-gray-600">
                          Your transaction history will appear here once you make payments
                        </p>
                  </div>
              )}
                  </CardContent>
                </AnimatedCard>
              </StaggeredItem>
            </StaggeredContainer>
          </TabsContent>
        </Tabs>

        {/* Add Payment Method Modal */}
        <AnimatedModal
          isOpen={addPaymentModalOpen}
          onClose={() => setAddPaymentModalOpen(false)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>
                Add a new credit or debit card to your account
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddPaymentMethod} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  value={newPaymentMethod.cardholderName}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardholderName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  value={newPaymentMethod.cardNumber}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    value={newPaymentMethod.expiryDate}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryDate: e.target.value })}
                    placeholder="MM/YY"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    value={newPaymentMethod.cvv}
                    onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
                    placeholder="123"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={newPaymentMethod.isDefault}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, isDefault: e.target.checked })}
                />
                <Label htmlFor="isDefault">Set as default payment method</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddPaymentModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <AnimatedButton type="submit" className="flex-1">
                  Add Card
                </AnimatedButton>
              </div>
            </form>
          </div>
        </AnimatedModal>
      </div>
    </DashboardLayout>
  )
}
