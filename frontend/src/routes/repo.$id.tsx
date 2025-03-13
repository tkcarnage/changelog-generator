import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Skeleton } from "../components/ui/skeleton"
import { Repository } from "@/types/repository"

const RepoDetailsSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-start gap-6">
      <Skeleton className="w-16 h-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-40" />
    </div>
    <div className="flex gap-3">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-8 w-24" />
    </div>
  </div>
)

export const Route = createFileRoute('/repo/$id')({
  component: RepoDetails
})

function RepoDetails() {
  const { id } = Route.useParams()
  const { data: repo, isLoading, error } = useQuery<Repository>({
    queryKey: ["repository", id],
    queryFn: async () => {
      const response = await fetch(`/api/repositories/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch repository details")
      }
      return response.json()
    },
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <Link 
        to="/" 
        className="inline-flex items-center text-slate-400 hover:text-slate-300 mb-6"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 mr-2" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
            clipRule="evenodd" 
          />
        </svg>
        Back to Repositories
      </Link>

      {isLoading ? (
        <RepoDetailsSkeleton />
      ) : error ? (
        <div className="text-red-500">
          {error instanceof Error ? error.message : "An error occurred"}
        </div>
      ) : !repo ? (
        <div className="text-slate-500">Repository not found</div>
      ) : (
        <>
          <div className="flex items-start gap-6">
            <img 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login}'s avatar`}
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{repo.full_name}</h1>
              <p className="text-lg text-slate-400 mt-2">{repo.description}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <span>⭐ {repo.stargazers_count} stars</span>
                {repo.language && (
                  <>
                    <span>•</span>
                    <span>{repo.language}</span>
                  </>
                )}
              </div>
              
              {repo.license && (
                <div className="text-slate-400">
                  License: <a href={repo.license.url} className="text-blue-400 hover:underline">{repo.license.name}</a>
                </div>
              )}

              <div className="text-slate-400">
                Last updated: {new Date(repo.updated_at).toLocaleDateString()}
              </div>

              {repo.topics?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {repo.topics.map(topic => (
                    <span key={topic} className="px-3 py-1 text-sm rounded-full bg-slate-700 text-slate-300">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <a 
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md transition-colors"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
