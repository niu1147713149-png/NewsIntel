"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function ProfileEditForm({ initialName }: { initialName: string | null }): JSX.Element {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      await apiPost<AuthUser, { name: string | null }>("/api/v1/auth/profile", { name: name || null });
      setMessage("个人资料已更新。");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("更新失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="content-panel-strong space-y-4 p-5">
      <div>
        <p className="eyebrow-label">Profile settings</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">编辑个人资料</h2>
        <p className="mt-1 text-sm text-slate-600">当前先支持修改昵称，后续可继续扩展更多资料项。</p>
      </div>
      <label className="block space-y-1 text-sm text-slate-600">
        <span>昵称</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={255} className="input-surface h-11 w-full rounded-xl px-3" />
      </label>
      <button type="submit" disabled={isSubmitting || isPending} className="button-primary inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium disabled:opacity-60">
        {isSubmitting || isPending ? "保存中..." : "保存资料"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
