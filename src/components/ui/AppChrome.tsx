import { type HTMLAttributes, type ReactNode } from "react";

export function AppShell({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={`h-full flex flex-col bg-[var(--os-surface)] text-[var(--os-fg)] ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export function AppToolbar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 border-b border-white/10 flex-wrap ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function AppSidebar({
  children,
  widthClass = "w-48",
  className = "",
}: {
  children: ReactNode;
  widthClass?: string;
  className?: string;
}) {
  return (
    <aside
      className={`${widthClass} border-r border-white/10 p-2 overflow-y-auto text-sm ${className}`.trim()}
    >
      {children}
    </aside>
  );
}

export function AppBody({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`flex-1 min-h-0 overflow-auto ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function AppSplit({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 min-h-0">{children}</div>;
}
