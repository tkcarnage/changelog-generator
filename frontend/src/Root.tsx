import { Outlet } from "@tanstack/react-router";

export function Root() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Changelog Generator
        </h1>
        <Outlet />
      </div>
    </div>
  );
}
