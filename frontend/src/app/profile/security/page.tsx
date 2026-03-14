import { ChangePasswordForm } from "@/components/change-password-form";
import { LoginRequiredCard } from "@/components/login-required-card";
import { fetchCurrentUser } from "@/lib/auth";

export default async function ProfileSecurityPage(): Promise<JSX.Element> {
  const currentUser = await fetchCurrentUser();

  return (
    <main className="page-shell">
      <section className="page-container max-w-3xl space-y-6">
        <header className="page-hero p-6">
          <p className="eyebrow-label">Account security</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">账户安全</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">管理当前账户密码，保持登录凭证安全。</p>
        </header>
        {!currentUser ? (
          <LoginRequiredCard title="登录后修改密码" description="登录后可在此更新你的账户密码。" />
        ) : (
          <ChangePasswordForm />
        )}
      </section>
    </main>
  );
}
