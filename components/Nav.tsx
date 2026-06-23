"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Дашборд" },
  { href: "/requests", label: "Заявки" },
  { href: "/tasks", label: "Мои задачи" },
  { href: "/directories", label: "Справочники" }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">У</div>
        <div>
          <strong>UDS Tender CRM</strong>
          <span>Входящие заявки и тендеры</span>
        </div>
      </div>
      <nav className="navList" aria-label="Основная навигация">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link href={item.href} key={item.href} className={`navLink${isActive ? " active" : ""}`} aria-current={isActive ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
