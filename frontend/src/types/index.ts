export interface Repository {
  _id: string
  name: string
  full_name: string
  description: string
  owner: {
    login: string
    avatar_url: string
  }
  stargazers_count: number
  language: string
  topics: string[]
  updated_at: string
  html_url: string
  default_branch: string
  lastGeneratedAt?: string | null
  license?: {
    name: string
    url: string
  }
  changelog?: {
    lastUpdated: Date
    sections: Section[]
  }
}

export interface ActionStep {
  description: string
  code?: string
  codeLanguage?: string
  link?: {
    url: string
    text: string
  }
  deadline?: string
}

export interface Change {
  title: string
  description: string
  prNumber?: number
  prUrl?: string
  mergedAt?: Date
  files?: string[]
  actionRequired?: ActionStep[]
}

export interface Section {
  type: 'New Features' | 'Bug Fixes' | 'Breaking Changes' | 'Documentation' | 'Other'
  changes: Change[]
}
