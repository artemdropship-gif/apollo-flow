import { Workflow } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid p-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Workflow className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Apollo<span className="text-gradient">Flow</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Поиск клиентов · архитектура · база знаний
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
