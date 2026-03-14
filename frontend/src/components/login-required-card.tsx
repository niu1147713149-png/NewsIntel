import Link from "next/link";

interface LoginRequiredCardProps {
  title: string;
  description: string;
}

export function LoginRequiredCard({ title, description }: LoginRequiredCardProps): JSX.Element {
  return (
    <section className="content-panel-strong p-10 text-center">
      <p className="eyebrow-label">Authentication required</p>
      <h2 className="mt-3 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5 flex justify-center gap-3">
        <Link href="/login" className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
          去登录
        </Link>
        <Link href="/register" className="button-secondary rounded-xl px-4 py-2 text-sm font-medium">
          去注册
        </Link>
      </div>
    </section>
  );
}
