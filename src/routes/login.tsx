import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error || "Falha no login");
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background">
      <div className="hidden md:flex bg-[image:var(--gradient-primary)] text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Mundo 3D LAB" className="h-12 object-contain rounded-lg shadow-sm" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Gestão completa para seu negócio de impressão 3D.
          </h1>
          <p className="text-primary-foreground/80 text-lg">
            Controle financeiro, produção, estoque e vendas em um só lugar.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} Print3D Manager
        </div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="md:hidden flex items-center gap-3 mb-4">
            <img src="/logo.png" alt="Mundo 3D LAB" className="h-10 object-contain rounded-lg" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Entrar</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse seu painel de gestão.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="voce@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Senha</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground font-medium shadow-[var(--shadow-elegant)] hover:opacity-95 disabled:opacity-50 transition"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Sistema interno · acesso restrito a usuários cadastrados.
          </p>
        </form>
      </div>
    </div>
  );
}