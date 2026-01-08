import { AuthLayout } from "@/features/auth"

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthLayout>{children}</AuthLayout>
}
