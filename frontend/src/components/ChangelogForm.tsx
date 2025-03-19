'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { addDays, format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Calendar as CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { UseMutationResult } from '@tanstack/react-query'

interface ChangelogProgress {
  progress: number
  step: string
  error?: string
}

interface ChangelogSection {
  type: string
  changes: {
    title: string
    description: string
    actionRequired: string
    commits?: string[]
  }[]
}

interface ChangelogData {
  sections: ChangelogSection[]
}

interface GenerateChangelogParams {
  owner: string
  repo: string
  startDate: string
  endDate: string
}

interface ChangelogFormProps {
  onGenerateStart: () => void
  onGenerateComplete: () => Promise<void>
  mutation: UseMutationResult<ChangelogData, Error, GenerateChangelogParams>
}

const useChangelogProgress = () => {
  const [progress, setProgress] = useState<ChangelogProgress>({ progress: 0, step: '' })
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  const establishConnection = useCallback(async (owner: string, repo: string) => {
    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    return new Promise<void>((resolve, reject) => {
      const eventSource = new EventSource(`/api/generate-changelog/progress?owner=${owner}&repo=${repo}`)
      eventSourceRef.current = eventSource
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        eventSource.close()
        reject(new Error('Connection timeout'))
      }, 5000)

      eventSource.onopen = () => {
        clearTimeout(connectionTimeout)
        setIsConnected(true)
        resolve()
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ChangelogProgress
          
          // Ignore keepalive messages
          if (data.step === 'keepalive') return

          if (data.error) {
            console.error('SSE Error received:', data.error)
            eventSource.close()
            setProgress({ progress: 0, step: '' })
            setIsConnected(false)
            throw new Error(data.error)
          }

          setProgress({
            progress: Math.min(Math.round(data.progress), 100),
            step: data.step
          })

          // Close connection when complete
          if (data.step === 'Complete' && data.progress === 100) {
            console.log('Generation complete, closing connection')
            eventSource.close()
            setProgress({ progress: 0, step: '' })
            setIsConnected(false)
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error)
          eventSource.close()
          setProgress({ progress: 0, step: '' })
          setIsConnected(false)
          throw error
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE Connection error:', error)
        clearTimeout(connectionTimeout)
        eventSource.close()
        setProgress({ progress: 0, step: '' })
        setIsConnected(false)
        reject(new Error('Failed to establish connection'))
      }
    })
  }, [])

  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Closing SSE connection')
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsConnected(false)
      setProgress({ progress: 0, step: '' })
    }
  }, [])

  return { progress, isConnected, establishConnection, closeConnection }
}

export default function ChangelogForm({ onGenerateStart, onGenerateComplete, mutation }: ChangelogFormProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from: addDays(new Date(), -14),
    to: new Date(),
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const { progress, establishConnection, closeConnection } = useChangelogProgress()

  const handleGenerate = async () => {
    if (!repoUrl) {
      toast.error('Please enter a GitHub repository URL')
      return
    }
    if (!date?.from) {
      toast.error('Please select a start date')
      return
    }
    if (!date?.to) {
      toast.error('Please select an end date')
      return
    }
    if (date.to < date.from) {
      toast.error('End date cannot be before start date')
      return
    }

    try {
      const url = new URL(repoUrl)
      const [owner, repo] = url.pathname.split('/').filter(Boolean)

      if (!owner || !repo || url.hostname !== 'github.com') {
        throw new Error('Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)')
      }

      setIsGenerating(true)
      onGenerateStart()

      // Step 1: Establish SSE connection
      console.log('Establishing SSE connection...')
      await establishConnection(owner, repo)

      // Step 2: Generate changelog
      console.log('Generating changelog...')
      await mutation.mutateAsync({
        owner,
        repo,
        startDate: format(date.from, 'yyyy-MM-dd'),
        endDate: format(date.to, 'yyyy-MM-dd'),
      })

      // Step 3: Complete
      onGenerateComplete()
    } catch (error) {
      console.error('Generation failed:', error)
      closeConnection()
      setIsGenerating(false)
      toast.error(error instanceof Error ? error.message : 'Failed to generate changelog')
    } finally {
      setIsGenerating(false)
    }
  }

  // Clean up connection on unmount
  useEffect(() => {
    return () => {
      closeConnection()
    }
  }, [closeConnection])

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="repoUrl" className="text-sm font-medium text-slate-200">
          GitHub Repository URL
        </label>
        <Input
          id="repoUrl"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full focus:border-blue-500"
          disabled={mutation.isPending}
          onPaste={(e) => {
            e.preventDefault()
            const pastedText = e.clipboardData.getData('text')
            setRepoUrl(pastedText.trim())
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">
          Select Start Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={mutation.isPending}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                <>
                  From {format(date.from, "LLL dd, y")}
                </>
              ) : (
                <span>Pick a start date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={date?.from}
              selected={date?.from}
              onSelect={(selectedDate) => {
                if (selectedDate) {
                  setDate(prev => ({ ...prev, from: selectedDate }))
                }
              }}
              numberOfMonths={1}
              disabled={mutation.isPending}
              toDate={new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">
          Select End Date
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              disabled={mutation.isPending}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.to ? (
                <>
                  Until {format(date.to, "LLL dd, y")}
                </>
              ) : (
                <span>Pick an end date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={date?.to}
              selected={date?.to}
              onSelect={(selectedDate) => {
                if (selectedDate) {
                  setDate(prev => ({ ...prev, to: selectedDate }))
                }
              }}
              numberOfMonths={1}
              disabled={mutation.isPending}
              fromDate={date.from}
              toDate={new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {mutation.isPending && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>{progress.step}</span>
            <span>{progress.progress}%</span>
          </div>
          <Progress value={progress.progress} className="w-full" />
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={mutation.isPending || isGenerating}
      >
        {mutation.isPending || isGenerating ? 'Generating Changelog...' : 'Generate Changelog'}
      </Button>
    </>
  )
}