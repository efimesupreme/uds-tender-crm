"use client";

import { usePathname } from "next/navigation";
import { UserSwitcher } from "@/components/UserSwitcher";

const sectionTitles = [
  { href: "/requests", title: "Заявки" },
  { href: "/tasks", title: "Мои задачи" },
  { href: "/directories", title: "Справочники" },
];

function getSectionTitle(pathname: string) {
  if (pathname === "/") return "Дашборд";
  return sectionTitles.find((item) => pathname.startsWith(item.href))?.title ?? "UDS Tender CRM";
}

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="appTopBar">
      <div className="appTopBarTitle">{getSectionTitle(pathname)}</div>
      <div className="appTopBarRight">
        <div className="pageActions" aria-label="Действия раздела" />
        <UserSwitcher />
      </div>
    </header>
  );
}
