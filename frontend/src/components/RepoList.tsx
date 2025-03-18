import { Link } from "@tanstack/react-router"
import { Repository } from "@/types"

interface RepoListProps {
  data?: Repository[]
}

const RepoCard = ({ repo }: { repo: Repository }) => (
  <Link to="/repo/$id" params={{ id: repo._id }} className="block">
    <div className="flex items-start space-x-4 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
      <img 
        src={repo.owner.avatar_url} 
        alt={`${repo.owner.login}'s avatar`}
        className="w-10 h-10 rounded-full"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-slate-100 truncate">{repo.full_name}</h3>
        <p className="text-sm text-slate-400 line-clamp-2">{repo.description || 'No description available'}</p>
        <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
          {repo.language && <span>{repo.language}</span>}
          <span>⭐ {repo.stargazers_count}</span>
          {repo.lastGeneratedAt ? (
            <span>Generated {new Date(repo.lastGeneratedAt).toLocaleDateString()}</span>
          ) : (
            <span>Never generated</span>
          )}
        </div>
        {repo.topics?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {repo.topics.slice(0, 3).map(topic => (
              <span key={`${repo._id}-${topic}`} className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </Link>
)

export default function RepoList({ data }: RepoListProps) {
  if (!data?.length) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Generated Changelogs</h2>
        <div className="text-center py-10 text-slate-500">
          <p>No repositories found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-100 mb-6 text-center">Generated Changelogs</h2>
      <div className="space-y-4">
        {data.map((repo) => (
          <div key={repo._id}>
            <RepoCard repo={repo} />
          </div>
        ))}
      </div>
    </div>
  )
}
