"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PanelIcon } from "@/components/workspace/icons";
import { subscribeWorkspaceDirective } from "@/components/workspace/workspace-events";
import { useSession } from "@/lib/auth-client";

import { loadOpen, saveOpen } from "./assistant-history";
import { AssistantPanel } from "./assistant-panel";

const PANEL_WIDTH = 400;
const WIDE = "(min-width: 768px)";

function isWide(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(WIDE).matches;
}

/**
 * The Assistant button and its panel, the same on every signed-in page. On wide
 * screens the panel is a side panel that stays open while the user navigates and
 * leaves room for the page. Below 768 px it covers the page and closes after the
 * assistant navigates. The chat itself lives in sessionStorage, not here.
 */
export function AssistantDock() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { data } = useSession();
  const userId = data?.user.id;
  const productId =
    pathname.startsWith("/workspace/") && typeof params.productId === "string"
      ? params.productId
      : undefined;
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    // A panel left open on a wide screen does not cover a phone-sized page on load.
    setOpen(loadOpen() && isWide());
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(WIDE);
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const change = useCallback((next: boolean) => {
    setOpen(next);
    saveOpen(next);
  }, []);

  const closeWhenNarrow = useCallback(() => {
    if (!isWide()) change(false);
  }, [change]);

  useEffect(() => {
    if (!open || !wide) return;
    document.body.style.paddingRight = `${PANEL_WIDTH}px`;
    return () => {
      document.body.style.paddingRight = "";
    };
  }, [open, wide]);

  useEffect(() => {
    if (!open || wide) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") change(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, wide, change]);

  useEffect(
    () =>
      subscribeWorkspaceDirective((directive) => {
        const id = directive.productId ?? productId;
        if (!id) return;
        closeWhenNarrow();
        const base = `/workspace/${encodeURIComponent(id)}`;
        if (directive.type === "show_report") {
          router.push(`${base}/report?result=${encodeURIComponent(directive.resultId)}`);
        } else if (directive.type === "request_replacement") {
          router.push(`${base}?replace=${encodeURIComponent(directive.documentId)}#upload-card`);
        } else if (directive.type === "navigate" && directive.view === "report") {
          router.push(`${base}/report`);
        } else if (directive.type === "navigate" && directive.view === "product") {
          router.push(`${base}?view=product#product-draft`);
        } else {
          router.push(`${base}?view=uploads#upload-card`);
        }
      }),
    [productId, router, closeWhenNarrow],
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls="assistant-panel"
        onClick={() => change(!open)}
      >
        <PanelIcon /> Assistant
      </Button>
      <aside
        id="assistant-panel"
        aria-label="Assistant"
        hidden={!open}
        className="fixed inset-0 z-40 border-line bg-card text-ink md:inset-y-0 md:right-0 md:left-auto md:w-[400px] md:border-l"
      >
        {userId ? (
          <AssistantPanel
            userId={userId}
            path={pathname}
            productId={productId}
            onCollapse={() => change(false)}
            onNavigated={closeWhenNarrow}
          />
        ) : null}
      </aside>
    </>
  );
}
