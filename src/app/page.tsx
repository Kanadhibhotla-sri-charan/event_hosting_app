import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">CourtSync</h1>
        <p className="text-muted-foreground text-lg">
          Organize badminton games. Track payments. Manage waiting lists.
        </p>
        <Link href="/auth/login" className="block">
          <Button size="lg" className="w-full">
            Get started
          </Button>
        </Link>
      </div>
    </main>
  );
}
