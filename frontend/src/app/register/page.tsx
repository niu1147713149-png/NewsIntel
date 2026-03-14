import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function RegisterPage(): JSX.Element {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="page-container max-w-md space-y-4">
        <AuthForm mode="register" />
        <p className="text-center text-sm text-slate-600">
          已有账号？ <Link href="/login" className="font-medium text-[#2F6BFF] hover:text-[#1E40AF]">去登录</Link>
        </p>
      </section>
    </main>
  );
}
