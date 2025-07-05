'use client'

import { useEffect } from 'react'
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-none">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-[90%] text-center pointer-events-auto">
        <h2 className="text-xl font-semibold mb-4">
          Setting up your account
        </h2>

        <div className="w-full mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-primary-main h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <p className="text-base mt-4">
          {currentTask ? (currentTask.description || currentTask.name) : 'Completing setup...'}
        </p>

        <p className="text-sm text-gray-500 mt-2">
          {completedTasks.length} of {tasks.length} tasks completed
        </p>

        <div className="mt-6 space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between"
            >
              <span className={`text-sm ${task.completed ? 'text-success-main' : 'text-gray-600'}`}>
                {task.name}
              </span>
              <span className={`text-sm ${
                task.status === 'failed' 
                  ? 'text-error-main'
                  : task.completed
                    ? 'text-success-main'
                    : 'text-gray-500'
              }`}>
                {task.status === 'failed'
                  ? 'Failed'
                  : task.completed
                    ? 'Completed'
                    : task.status === 'in_progress'
                      ? 'In Progress'
                      : 'Pending'}
              </span>
            </div>
          ))}
        </div>

        {tasks.some(task => task.status === 'failed') && (
          <p className="mt-4 text-error-main text-sm">
            Some tasks failed. Please contact support for assistance.
          </p>
        )}
      </div>
    </div>
  )
}