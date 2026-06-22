import Link from "next/link";
import { UserSwitcher } from "./UserSwitcher";

const navItems = [
  { href: "/", label: "Дашборд" },
  { href: "/requests", label: "Заявки" },
  { href: "/tasks", label: "Мои задачи" },
  { href: "/directories", label: "Справочники" }
];

export function Nav() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brandMark">У</div>
        <div>
          <strong>UDS Tender CRM</strong>
          <span>Входящие заявки и тендеры</span>
        </div>
      </div>
      <UserSwitcher />

      <nav className="navList">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href} className="navLink">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
