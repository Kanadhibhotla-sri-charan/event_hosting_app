import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">CourtSync</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to continue
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
