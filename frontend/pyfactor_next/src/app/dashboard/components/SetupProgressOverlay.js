///Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/SetupProgressOverlay.js
'use client'

import { useEffect } from 'react'
import { Box, Typography, LinearProgress, Paper } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'
import { useSetupStatus } from '@/hooks/useSetupStatus'

export default function SetupProgressOverlay() {
  const router = useRouter()
  const { status: onboardingStatus } = useOnboardingStatus()
  const { tasks, loading: tasksLoading } = useSetupStatus()

  useEffect(() => {
    // If onboarding is not complete, redirect to the current step
    if (onboardingStatus && !onboardingStatus.setup_completed) {
      router.push(`/onboarding/${onboardingStatus.current_step}`)
    }
  }, [onboardingStatus, router])

  if (tasksLoading || !tasks.length) {
    return null
  }

  const completedTasks = tasks.filter(task => task.completed)
  const progress = (completedTasks.length / tasks.length) * 100
  const currentTask = tasks.find(task => task.status === 'in_progress')

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '90%',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Setting up your account
        </Typography>

        <Box sx={{ width: '100%', mt: 2 }}>
          <LinearProgress variant="determinate" value={progress} />
        </Box>

        <Typography variant="body1" sx={{ mt: 2 }}>
          {currentTask ? (
            currentTask.description || currentTask.name
          ) : (
            'Completing setup...'
          )}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {completedTasks.length} of {tasks.length} tasks completed
        </Typography>

        {tasks.map((task) => (
          <Box
            key={task.id}
            sx={{
              mt: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="body2"
              color={task.completed ? 'success.main' : 'text.secondary'}
            >
              {task.name}
            </Typography>
            <Typography
              variant="body2"
              color={
                task.status === 'failed'
                  ? 'error.main'
                  : task.completed
                  ? 'success.main'
                  : 'text.secondary'
              }
            >
              {task.status === 'failed'
                ? 'Failed'
                : task.completed
                ? 'Completed'
                : task.status === 'in_progress'
                ? 'In Progress'
                : 'Pending'}
            </Typography>
          </Box>
        ))}

        {tasks.some(task => task.status === 'failed') && (
          <Typography color="error" sx={{ mt: 2 }}>
            Some tasks failed. Please contact support for assistance.
          </Typography>
        )}
      </Paper>
    </Box>
  )
}
