import { ReactNode, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Factory,
  Boxes,
  ShoppingCart,
  BarChart3,
  LogOut,
  Menu,
  X,
  Printer,
  Settings,
  ContactRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/cadastros", label: "Cadastros", icon: ContactRound },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 bg-card border-b border-border z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Mundo 3D LAB" className="h-8 object-contain" />
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border z-30 transition-transform duration-200 flex flex-col",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <img src="/logo.png" alt="Mundo 3D LAB" className="h-10 object-contain" />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.name || user?.email?.split("@")[0]}
            </div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-foreground/20 z-20"
        />
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}