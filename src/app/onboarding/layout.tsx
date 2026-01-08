import { Logo } from "@/features/auth/components/auth-branding";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-medium tracking-tight">LumLabs</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      {/* Footer */}
      <footer className="flex h-14 items-center justify-center border-t text-sm text-muted-foreground">
        <p>Build features with AI</p>
      </footer>
    </div>
  );
}
