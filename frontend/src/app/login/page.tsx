import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export default function LoginPage(): JSX.Element {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="page-container max-w-md space-y-4">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-[#94A3B8]">
          还没有账号？ <Link href="/register" className="text-[#60A5FA]">去注册</Link>
        </p>
      </section>
    </main>
  );
}
