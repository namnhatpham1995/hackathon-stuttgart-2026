import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">ExportReady</h1>
        <p className="text-lg text-pretty text-muted">
          Add the documents a buyer asked for and read an evidence report: what is documented, what
          is still open, and what to provide next.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {session ? (
          <Button href="/workspace">Open workspace</Button>
        ) : (
          <>
            <Button href="/sign-in?next=/workspace">Sign in</Button>
            <Button href="/sign-up?next=/workspace" variant="secondary">
              Create an account
            </Button>
          </>
        )}
      </div>
      <p className="max-w-prose text-sm text-muted">
        The report is an evidence review. It is not a certification.
      </p>
    </main>
  );
}
