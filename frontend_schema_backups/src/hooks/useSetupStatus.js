'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export function useSetupStatus() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function fetchSetupTasks() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) return

        const { data: setupTasks, error: tasksError } = await supabase
          .from('setup_tasks')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true })

        if (tasksError) throw tasksError
        setTasks(setupTasks || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSetupTasks()
  }, [supabase])

  const createTask = async (name, description = '') => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No authenticated session')

      const { data, error } = await supabase
        .from('setup_tasks')
        .insert([{
          user_id: session.user.id,
          name,
          description,
          status: 'pending',
          completed: false
        }])
        .select()
        .single()

      if (error) throw error
      setTasks(prev => [...prev, data])
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('setup_tasks')
        .update({
          ...updates,
          ...(updates.completed && { completed_at: new Date().toISOString() }),
          ...(updates.status === 'in_progress' && { started_at: new Date().toISOString() })
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      setTasks(prev => prev.map(task => task.id === taskId ? data : task))
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const completeTask = async (taskId) => {
    return updateTask(taskId, {
      status: 'completed',
      completed: true
    })
  }

  const startTask = async (taskId) => {
    return updateTask(taskId, {
      status: 'in_progress'
    })
  }

  const failTask = async (taskId, errorMessage) => {
    return updateTask(taskId, {
      status: 'failed',
      error: errorMessage
    })
  }

  const areAllTasksComplete = () => {
    return tasks.length > 0 && tasks.every(task => task.completed)
  }

  const getTaskByName = (name) => {
    return tasks.find(task => task.name === name)
  }

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    startTask,
    failTask,
    areAllTasksComplete,
    getTaskByName
  }
}
