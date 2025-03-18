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
  changelog?: Changelog[]
}

export interface Change {
  title: string
  description: string
  prNumber?: number
  prUrl?: string
  mergedAt?: Date
  files?: string[]
  actionRequired?: string
}

export interface Section {
  type: 'New Features' | 'Bug Fixes' | 'Breaking Changes' | 'Documentation' | 'Other'
  changes: Change[]
}

export interface Changelog {
  timestamp: Date
  sections: Section[]
}
