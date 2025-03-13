export default function SplashScreen() {
  return (
    <div className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] h-[400px] flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(45deg, #020817, #1e293b, #0f172a, #020817)",
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite",
        }}
      />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-slate-100 mb-3 sm:mb-4 relative z-10">
          Changelog Generator
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-400 relative z-10 max-w-xl sm:max-w-2xl mx-auto">
          Track and generate beautiful changelogs for your repositories
        </p>
      </div>
    </div>
  )
}
