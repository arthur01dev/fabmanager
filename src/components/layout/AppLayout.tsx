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
  Settings,
  ContactRound,
  ChevronLeft,
  ChevronRight,
  User,
  KeyRound,
  Mail,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/cadastros", label: "Cadastros", icon: ContactRound },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
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
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-muted"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border z-30 transition-all duration-200 flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo + collapse button */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-sidebar-border">
          {!collapsed && (
            <img src="/logo.png" alt="Mundo 3D LAB" className="h-10 object-contain flex-1 min-w-0" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors flex-shrink-0"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {nav
            .filter((item) => {
              // Esconde "Configurações" para colaboradores
              if (item.to === "/configuracoes" && !isAdmin) return false;
              return true;
            })
            .map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  collapsed ? "justify-center" : "",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={() => setProfileOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left",
              collapsed ? "justify-center" : "",
            )}
            title={collapsed ? "Perfil" : undefined}
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.user_metadata?.name || user?.email?.split("@")[0]}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  {!isAdmin && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">Colaborador</span>
                  )}
                  {isAdmin && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">Admin</span>
                  )}
                </div>
              </div>
            )}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
              collapsed ? "justify-center" : "",
            )}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-foreground/20 z-20"
        />
      )}

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Profile Panel */}
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} userEmail={user?.email || ""} />}
    </div>
  );
}

function ProfileDialog({ onClose, userEmail }: { onClose: () => void; userEmail: string }) {
  const [tab, setTab] = useState<"password" | "email">("password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Senha mínima de 8 caracteres"); return; }
    if (newPassword !== confirmPassword) { toast.error("Senhas não coincidem"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Senha alterada com sucesso");
    setNewPassword(""); setConfirmPassword("");
    onClose();
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) { toast.error("Email inválido"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Verifique o novo email para confirmar a alteração");
    setNewEmail(""); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card rounded-2xl border border-border shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold">Perfil</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>

        <div className="flex gap-1 p-3 border-b border-border">
          <button
            onClick={() => setTab("password")}
            className={cn("flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all",
              tab === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KeyRound className="h-4 w-4" /> Senha
          </button>
          <button
            onClick={() => setTab("email")}
            className={cn("flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all",
              tab === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Mail className="h-4 w-4" /> Email
          </button>
        </div>

        <div className="p-6">
          {tab === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Alterando..." : "Alterar senha"}
              </button>
            </form>
          )}
          {tab === "email" && (
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Novo email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">Um link de confirmação será enviado para o novo email.</p>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Alterar email"}
              </button>
            </form>
          )}
        </div>
      </div>
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