"use client";

import { useCrmStore } from "@/lib/client-store";
import { users } from "@/lib/mock-data";

export function UserSwitcher() {
  const { currentUserId, setCurrentUser, isHydrated } = useCrmStore();

  if (!isHydrated) {
    return <div className="userSwitcher" role="status">Текущий пользователь: загрузка…</div>;
  }

  return (
    <div className="userSwitcher">
      <label className="formField" htmlFor="current-user-select">
        Текущий пользователь
        <select
          id="current-user-select"
          name="currentUserId"
          className="select"
          value={currentUserId}
          onChange={(event) => setCurrentUser(event.target.value)}
        >
          {users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}
        </select>
      </label>
    </div>
  );
}
