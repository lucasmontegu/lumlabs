export function AuthBranding() {
  return (
    <div className="relative hidden h-full flex-col bg-zinc-950 p-10 text-white lg:flex">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-zinc-950 to-zinc-950" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Glow effect */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex items-center gap-2.5 text-lg font-medium">
        <Logo />
        <span className="tracking-tight">LumLabs</span>
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

/**
 * LumLabs Logo - A geometric shape inspired by light refraction
 * The overlapping translucent shapes create depth and represent
 * the "illumination" aspect of the brand name
 */
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle with gradient */}
      <circle cx="16" cy="16" r="16" fill="url(#bg-gradient)" />

      {/* Main geometric shape - rotated square */}
      <rect
        x="16"
        y="6"
        width="14"
        height="14"
        rx="2"
        transform="rotate(45 16 6)"
        fill="url(#shape-gradient-1)"
        fillOpacity="0.9"
      />

      {/* Secondary shape - offset for depth */}
      <rect
        x="16"
        y="9"
        width="10"
        height="10"
        rx="1.5"
        transform="rotate(45 16 9)"
        fill="url(#shape-gradient-2)"
        fillOpacity="0.95"
      />

      {/* Center accent - light burst */}
      <circle cx="16" cy="16" r="3" fill="white" fillOpacity="0.95" />

      <defs>
        <linearGradient id="bg-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#172554" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="shape-gradient-1" x1="16" y1="6" x2="30" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="shape-gradient-2" x1="16" y1="9" x2="26" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93c5fd" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export { Logo }
