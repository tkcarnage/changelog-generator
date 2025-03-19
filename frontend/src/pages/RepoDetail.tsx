import { useParams, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Repository } from '@/types'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import cn from 'classnames'

export default function RepoDetail() {
  const { id } = useParams({ from: '/repo/$id' })

  const { data: repo, isLoading, error } = useQuery<Repository>({
    queryKey: ['repository', id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/repositories/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch repository')
        }
        return response.json()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to fetch repository')
        throw error
      }
    },
    retry: 1,
  })

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-400">Failed to load repository</h2>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (!repo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-red-400">Repository not found</h2>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{repo.name}</h2>
            <p className="text-slate-400 mb-2">{repo.description}</p>
            <a
              href={`https://github.com/${repo.owner.login}/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-1" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>View on GitHub</div>
            </a>
          </div>
          <Link to="/" className="ml-8">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Changelog</h3>
          {repo.changelog ? (
            <div className="bg-slate-800/50 rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">
                  Last updated {format(new Date(repo.changelog.lastUpdated), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              {repo.changelog.sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-4">
                  {section.changes?.length > 0 && (
                    <h4 className={cn(
                      "text-lg font-semibold px-4 py-2 rounded-md inline-block",
                      section.type === 'Breaking Changes' ? "bg-red-900/50 text-red-200" :
                      section.type === 'New Features' ? "bg-green-900/50 text-green-200" :
                      "bg-blue-900/50 text-blue-200"
                    )}>
                      {section.type}
                    </h4>
                  )}
                  <div className="space-y-4">
                    {section.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="bg-slate-800/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-medium">{change.title}</h4>
                          {change.mergedAt && (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Clock className="h-4 w-4" />
                              <span>Merged {format(new Date(change.mergedAt), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-slate-300 mb-4">{change.description}</p>
                        {change.actionRequired && change.actionRequired !== 'No action required.' && (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="action-required">
                              <AccordionTrigger className="text-sm font-medium text-yellow-500">
                                Action Required
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pt-2">
                                  <p className="text-sm text-slate-300">{change.actionRequired}</p>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                        {change.prUrl && (
                          <a
                            href={change.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
                          >
                            View Pull Request #{change.prNumber}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No changelog available yet.</p>
          )}
        </div>
      </div>
    </>
  )
}
