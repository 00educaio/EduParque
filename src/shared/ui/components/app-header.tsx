"use client";

import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "./brand-mark";

export type AppHeaderLink = { href: Route; label: string };

export function AppHeader({ links = [], actions }: { links?: AppHeaderLink[]; actions?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigationLinks = links.some((item) => item.href === "/ajuda") ? links : [...links, { href: "/ajuda" as const, label: "Ajuda" }];

  return (
    <header className="site-header app-header">
      <BrandMark href="/" />
      <button
        className="app-header__toggle"
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="app-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
      <nav id="app-navigation" className={`app-header__navigation ${open ? "is-open" : ""}`} aria-label="Navegação principal">
        {navigationLinks.map((item) => (
          <Link key={`${item.href}-${item.label}`} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>
            {item.label}
          </Link>
        ))}
        {actions && <div className="app-header__actions">{actions}</div>}
      </nav>
    </header>
  );
}
