import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@supabase/auth-helpers-react'
import { onboardingService } from '@/services/onboardingService'

export function useOnboarding() {
  const user = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onboardingStatus, setOnboardingStatus] = useState(null)
  const [business, setBusiness] = useState(null)
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    if (user) {
      loadOnboardingData()
    }
  }, [user])

  const loadOnboardingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get onboarding status (callback route handles creation)
      const status = await onboardingService.getOnboardingStatus()
      setOnboardingStatus(status)

      // Only proceed with additional data loading if we have a status
      if (status && !status.setup_completed) {
        // Get business data if it exists
        const businessData = await onboardingService.getBusiness(user.id)
        setBusiness(businessData)

        // Get subscription if business exists
        if (businessData) {
          const subscriptionData = await onboardingService.getSubscription(businessData.id)
          setSubscription(subscriptionData)
        }
      }
    } catch (err) {
      console.error('Error loading onboarding data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitBusinessInfo = async (businessData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await onboardingService.completeBusinessInfo(user.id, businessData)
      setBusiness(result)
      await loadOnboardingData()
      router.push('/onboarding/subscription')
    } catch (err) {
      console.error('Error submitting business info:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const submitSubscription = async (subscriptionData) => {
    try {
      setLoading(true)
      setError(null)
      const result = await onboardingService.completeSubscription(
        user.id,
        business.id,
        subscriptionData
      )
      setSubscription(result)
      await loadOnboardingData()
      router.push('/onboarding/payment')
    } catch (err) {
      console.error('Error submitting subscription:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const completePayment = async () => {
    try {
      setLoading(true)
      setError(null)
      await onboardingService.completePayment(user.id)
      await loadOnboardingData()
      router.push('/onboarding/setup')
    } catch (err) {
      console.error('Error completing payment:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const completeSetup = async () => {
    try {
      setLoading(true)
      setError(null)
      await onboardingService.completeSetup(user.id)
      await loadOnboardingData()
      router.push('/dashboard')
    } catch (err) {
      console.error('Error completing setup:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getCurrentStep = () => {
    if (!onboardingStatus) return 'business-info'
    return onboardingStatus.current_step
  }

  const isStepCompleted = (step) => {
    if (!onboardingStatus) return false
    switch (step) {
      case 'business-info':
        return onboardingStatus.business_info_completed
      case 'subscription':
        return onboardingStatus.subscription_completed
      case 'payment':
        return onboardingStatus.payment_completed
      case 'setup':
        return onboardingStatus.setup_completed
      default:
        return false
    }
  }

  return {
    loading,
    error,
    onboardingStatus,
    business,
    subscription,
    getCurrentStep,
    isStepCompleted,
    submitBusinessInfo,
    submitSubscription,
    completePayment,
    completeSetup,
  }
}
