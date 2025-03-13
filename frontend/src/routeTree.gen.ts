/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as IndexImport } from './routes/index'
import { Route as RepoIdImport } from './routes/repo.$id'

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const RepoIdRoute = RepoIdImport.update({
  id: '/repo/$id',
  path: '/repo/$id',
  getParentRoute: () => rootRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/repo/$id': {
      id: '/repo/$id'
      path: '/repo/$id'
      fullPath: '/repo/$id'
      preLoaderRoute: typeof RepoIdImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/repo/$id': typeof RepoIdRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/repo/$id': typeof RepoIdRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/repo/$id': typeof RepoIdRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/repo/$id'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/repo/$id'
  id: '__root__' | '/' | '/repo/$id'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  RepoIdRoute: typeof RepoIdRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  RepoIdRoute: RepoIdRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/repo/$id"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/repo/$id": {
      "filePath": "repo.$id.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
