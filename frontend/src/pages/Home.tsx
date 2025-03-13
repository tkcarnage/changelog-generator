import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SplashScreen from '@/components/SplashScreen'
import ChangelogForm from '@/components/ChangelogForm'
import RepoList from '@/components/RepoList'
import { Repository } from '@/types'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ReloadIcon } from '@radix-ui/react-icons'

interface GenerateChangelogParams {
  owner: string
  repo: string
  startDate: string
  endDate: string
}

const generateChangelog = async (params: GenerateChangelogParams) => {
  const response = await fetch('/api/generate-changelog', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: params.owner,
      repo: params.repo,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to generate changelog')
  }

  return response.json()
}

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false)
  const queryClient = useQueryClient()
  const { data: repositories, isLoading, error, refetch } = useQuery<Repository[]>({
    queryKey: ['repositories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/repositories')
        if (!response.ok) {
          throw new Error('Failed to fetch repositories')
        }
        return response.json()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch repositories')
        throw error
      }
    },
    retry: 1,
  })

  const changelogMutation = useMutation({
    mutationFn: generateChangelog,
    onSuccess: () => {
      // Invalidate and refetch the repositories list
      queryClient.invalidateQueries({ queryKey: ['repositories'] })
      toast.success('Changelog updated successfully')
    }
  })

  const onChangelogGenerated = async () => {
    setIsGenerating(false)
    try {
      await refetch()
    } catch (error) {
      toast.error('Failed to refresh repository list')
    }
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="max-w-3xl mx-auto">
        <SplashScreen />
        <div className="w-full max-w-2xl mx-auto space-y-6 p-6 mb-8">
          <ChangelogForm 
            onGenerateStart={() => setIsGenerating(true)}
            onGenerateComplete={onChangelogGenerated}
            mutation={changelogMutation}
          />
        </div>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-slate-400">Loading repositories...</div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Failed to load repositories</p>
            <Button 
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <ReloadIcon className="h-4 w-4 animate-spin" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className={isGenerating ? 'opacity-50 pointer-events-none' : ''}>
            <RepoList data={repositories} />
          </div>
        )}
      </div>
    </>
  )
}
