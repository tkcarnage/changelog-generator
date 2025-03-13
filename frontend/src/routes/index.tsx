import { createFileRoute } from '@tanstack/react-router'
import Home from '../pages/Home'

// @ts-ignore - TanStack Router type issue
export const Route = createFileRoute('/')({
  component: Home
})
