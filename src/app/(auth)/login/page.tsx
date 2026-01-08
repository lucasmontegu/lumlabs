import Link from "next/link"
import { OAuthButtons, EmailForm } from "@/features/auth"

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* OAuth Buttons */}
      <OAuthButtons mode="signin" />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Email Form */}
      <EmailForm mode="signin" />

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  )
}
