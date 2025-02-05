import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@supabase/auth-helpers-react'
import { CircularProgress, Box } from '@mui/material'

export default function OnboardingGuard({ children }) {
  const user = useUser()
  const router = useRouter()

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (user) {
        try {
          const response = await fetch('/api/onboarding/status')
          if (response.status === 404) {
            // Status not found - user needs to start onboarding
            router.push('/onboarding/business-info')
            return
          } else if (!response.ok) {
            throw new Error('Failed to fetch onboarding status')
          }

          const data = await response.json()
          
          if (!data.isComplete) {
            router.push(`/onboarding/${data.currentStep || 'business-info'}`)
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error)
        }
      } else if (user === null) { // Explicitly check for null to confirm loading is complete
        router.push('/auth/signin')
      }
    }

    if (user !== undefined) { // Only run once loading is complete
      checkOnboardingStatus()
    }
  }, [user, router])

  // Show loading state while auth status is being determined
  if (user === undefined) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // Show children only when authenticated
  if (user) {
    return children
  }

  return null
}
