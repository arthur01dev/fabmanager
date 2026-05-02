import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { StoreProvider } from "@/lib/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Print3D Manager — Gestão para Impressão 3D" },
      { name: "description", content: "Sistema completo de gestão para negócios de impressão 3D: financeiro, produção, estoque, vendas e relatórios." },
      { name: "author", content: "Print3D" },
      { property: "og:title", content: "Print3D Manager — Gestão para Impressão 3D" },
      { property: "og:description", content: "Sistema completo de gestão para negócios de impressão 3D: financeiro, produção, estoque, vendas e relatórios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Print3D Manager — Gestão para Impressão 3D" },
      { name: "twitter:description", content: "Sistema completo de gestão para negócios de impressão 3D: financeiro, produção, estoque, vendas e relatórios." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d3eaa0d6-aafe-40a6-b5ea-28e3f48b79f8/id-preview-bfb86e7c--5b801c9a-6750-4d2c-90a2-5fad1d2fec46.lovable.app-1777623624560.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d3eaa0d6-aafe-40a6-b5ea-28e3f48b79f8/id-preview-bfb86e7c--5b801c9a-6750-4d2c-90a2-5fad1d2fec46.lovable.app-1777623624560.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Outlet />
        <Toaster position="top-right" richColors />
      </StoreProvider>
    </AuthProvider>
  );
}
