"use client";

import { useState, useTransition } from "react";

import { apiPost } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

export function ChangePasswordForm(): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      await apiPost<AuthUser, { current_password: string; new_password: string }>("/api/v1/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("密码修改成功。");
    } catch {
      setMessage("修改失败，请确认当前密码是否正确。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="content-panel-strong space-y-4 p-5">
      <div>
        <p className="eyebrow-label">Security</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">修改密码</h2>
        <p className="mt-1 text-sm text-slate-600">更新当前账号密码，修改后下次登录请使用新密码。</p>
      </div>
      <label className="block space-y-1 text-sm text-slate-600">
        <span>当前密码</span>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} minLength={8} required className="input-surface h-11 w-full rounded-xl px-3" />
      </label>
      <label className="block space-y-1 text-sm text-slate-600">
        <span>新密码</span>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required className="input-surface h-11 w-full rounded-xl px-3" />
      </label>
      <button type="submit" disabled={isSubmitting || isPending} className="button-primary inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium disabled:opacity-60">
        {isSubmitting || isPending ? "提交中..." : "修改密码"}
      </button>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
