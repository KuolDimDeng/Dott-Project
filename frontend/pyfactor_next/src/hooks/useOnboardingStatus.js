///Users/kuoldeng/projectx/frontend/pyfactor_next/src/hooks/useOnboardingStatus.js
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/onboarding/status')
        if (!response.ok) {
          throw new Error('Failed to fetch onboarding status')
        }

        const data = await response.json()
        
        if (!data.isComplete) {
          router.push(`/onboarding/${data.currentStep}`)
        } else {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [router])

  return { isLoading, error }
}
