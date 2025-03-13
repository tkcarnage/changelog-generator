export interface Repository {
  _id: string
  name: string
  full_name: string
  description: string
  owner: {
    avatar_url: string
    login: string
  }
  stargazers_count: number
  language: string
  topics: string[]
  updated_at: string
  html_url: string
  license?: {
    name: string
    url: string
  }
}
