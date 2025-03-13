import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="p-2 flex gap-2 bg-slate-800">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>
      </div>
      <Outlet />
    </div>
  ),
})
