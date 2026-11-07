import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <BrandMark alt="TradeReady passport" />
        <h1 className="page-title text-balance">TradeReady</h1>
        <p className="text-lg text-pretty text-muted">
          Add the documents a buyer asked for and read an evidence report: what is documented, what
          is still open, and what to provide next.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {session ? (
          <>
            <Button href="/workspace">Supplier workspace</Button>
            <Button href="/buyer" variant="secondary">
              Buyer workspace
            </Button>
          </>
        ) : (
          <>
            <Button href="/sign-in">Sign in</Button>
            <Button href="/sign-up" variant="secondary">
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
