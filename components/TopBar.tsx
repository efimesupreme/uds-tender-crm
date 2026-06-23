"use client";

import { usePathname } from "next/navigation";
import { UserSwitcher } from "@/components/UserSwitcher";

const sections = [
  { href: "/requests", title: "Заявки", description: "Реестр входящих обращений и коммерческих предложений" },
  { href: "/tasks", title: "Мои задачи", description: "Рабочие задачи выбранного пользователя" },
  { href: "/directories", title: "Справочники", description: "Настройки, планы и служебные данные демо-CRM" },
];

function getSectionMeta(pathname: string) {
  if (pathname === "/") return { title: "Дашборд", description: "Управленческий обзор обращений, КП, воронки и портфеля" };
  return sections.find((item) => pathname.startsWith(item.href)) ?? { title: "UDS Tender CRM", description: "Демо-система управления тендерной CRM" };
}

export function TopBar() {
  const pathname = usePathname();

  const section = getSectionMeta(pathname);

  return (
    <header className="appTopBar">
      <div className="appTopBarHeading">
        <div className="appTopBarTitle">{section.title}</div>
        <div className="appTopBarDescription">{section.description}</div>
      </div>
      <div className="appTopBarRight">
        <UserSwitcher />
      </div>
    </header>
  );
}
