import { Route, RootRoute, createRouter, Outlet } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import Home from './pages/Home'
import RepoDetail from './pages/RepoDetail'

// Create a new query client instance
const queryClient = new QueryClient()

const rootRoute = new RootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  ),
})

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

const repoDetailRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/repo/$id',
  component: RepoDetail,
})

const routeTree = rootRoute.addChildren([indexRoute, repoDetailRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
