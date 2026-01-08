export function AuthBranding() {
  return (
    <div className="relative hidden h-full flex-col bg-zinc-950 p-10 text-white lg:flex">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-zinc-950 to-zinc-950" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Glow effect */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
        <Logo />
        <span>VibeCode</span>
      </div>

      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          <p className="text-lg text-zinc-400">
            Build features with AI. Describe what you want, and watch it come to life.
          </p>
        </blockquote>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
    </div>
  )
}

function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-violet-400"
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-violet-500/20"
      />
      <path
        d="M8 12L16 8L24 12V20L16 24L8 20V12Z"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 14V18"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16H20"
        className="stroke-current"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export { Logo }
