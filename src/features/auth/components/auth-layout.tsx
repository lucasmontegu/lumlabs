import { AuthBranding } from "./auth-branding"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Branding */}
      <AuthBranding />

      {/* Right side - Form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
