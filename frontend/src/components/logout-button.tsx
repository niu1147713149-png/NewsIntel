"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function LogoutButton(): JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleLogout(): Promise<void> {
    await apiPost<AuthUser, Record<string, never>>("/api/v1/auth/logout", {});
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={() => void handleLogout()} disabled={isPending} className="rounded-md border border-[#1E293B] px-3 py-2 text-sm text-[#CBD5E1] disabled:opacity-60">
      {isPending ? "退出中..." : "退出"}
    </button>
  );
}
