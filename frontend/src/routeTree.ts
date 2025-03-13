import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as repoRoute } from './routes/repo.$id'

export const routeTree = rootRoute.addChildren([
  indexRoute,
  repoRoute,
])
