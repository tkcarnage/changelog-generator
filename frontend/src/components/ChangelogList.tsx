import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Change {
  title: string;
  description: string;
  commits?: string[];
}

interface Section {
  type: string;
  changes: Change[];
}

interface ChangelogListProps {
  summary?: string;
  sections?: Section[];
}

function ChangelogList({ sections }: ChangelogListProps) {
  return (
    <div className="space-y-4">
      {!sections || sections.length === 0 ? (
        <p>No detailed changes found.</p>
      ) : (
        sections.map((section, index) => (
          section.changes && section.changes.length > 0 ? (
            <Card key={`section-${section.type}-${index}`}>
              <CardHeader>
                <CardTitle>{section.type}</CardTitle>
              </CardHeader>
              <CardContent>
                {section.changes.map((change, idx) => (
                  <div key={`change-${section.type}-${idx}`} className="mb-2">
                    <p className="font-bold">{change.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{change.description}</p>
                    {change.commits && (
                      <ul className="list-disc pl-4 text-xs text-gray-500 dark:text-gray-400">
                        {change.commits.map((commit, cIdx) => (
                          <li key={`commit-${section.type}-${idx}-${cIdx}`}>{commit}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null
        ))
      )}
    </div>
  );
}

export default ChangelogList;
