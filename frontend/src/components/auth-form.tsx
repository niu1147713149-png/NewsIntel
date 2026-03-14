"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await apiPost<AuthUser, { email: string; password: string; name?: string }>("/api/v1/auth/register", {
          email,
          password,
          name: name || undefined
        });
      } else {
        await apiPost<AuthUser, { email: string; password: string }>("/api/v1/auth/login", { email, password });
      }
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch {
      setMessage(mode === "register" ? "注册失败，请检查邮箱是否已存在。" : "登录失败，请检查邮箱或密码。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="page-hero space-y-5 p-6" aria-busy={isSubmitting || isPending}>
      <div>
        <p className="eyebrow-label">{mode === "register" ? "Create account" : "Secure sign in"}</p>
        <h1 className="text-2xl font-semibold text-slate-950">{mode === "register" ? "注册" : "登录"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{mode === "register" ? "创建账号后即可同步自选股与价格告警。" : "登录以访问自选股、告警与个人功能。"}</p>
      </div>
      {mode === "register" ? (
        <label className="block space-y-1.5 text-sm text-slate-600">
          <span>昵称</span>
          <input
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-surface h-12 w-full rounded-xl px-3.5"
          />
        </label>
      ) : null}
      <label className="block space-y-1.5 text-sm text-slate-600">
        <span>邮箱</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input-surface h-12 w-full rounded-xl px-3.5"
        />
      </label>
      <label className="block space-y-1.5 text-sm text-slate-600">
        <span>密码</span>
        <input
          type="password"
          name="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          className="input-surface h-12 w-full rounded-xl px-3.5"
        />
      </label>
      <button type="submit" disabled={isSubmitting || isPending} className="button-primary inline-flex h-12 items-center rounded-xl px-4 text-sm font-medium disabled:opacity-60">
        {isSubmitting || isPending ? "提交中..." : mode === "register" ? "注册并登录" : "登录"}
      </button>
      {message ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">{message}</p> : null}
    </form>
  );
}
