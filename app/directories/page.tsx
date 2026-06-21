import { directories, externalParticipants, statusLabels } from "@/lib/mock-data";

export default function DirectoriesPage() {
  const directoryGroups = directories.reduce<Record<string, typeof directories>>((acc, item) => {
    acc[item.directoryType] = acc[item.directoryType] ?? [];
    acc[item.directoryType].push(item);
    return acc;
  }, {});

  return (
    <>
      <header className="pageHeader">
        <div>
          <h1>Справочники</h1>
          <p>Базовые списки MVP. Редактирование будет добавлено после подключения базы.</p>
        </div>
      </header>

      <section className="sectionStack">
        <div className="card">
          <h2>Статусы заявки</h2>
          <div className="detailGrid">
            {Object.entries(statusLabels).map(([code, name]) => (
              <div className="field" key={code}>
                <span>{code}</span>
                <strong>{name}</strong>
              </div>
            ))}
          </div>
        </div>

        {Object.entries(directoryGroups).map(([type, items]) => (
          <div className="card" key={type}>
            <h2>{type}</h2>
            <div className="detailGrid">
              {items.map((item) => (
                <div className="field" key={`${item.directoryType}-${item.code}`}>
                  <span>{item.code}</span>
                  <strong>{item.name}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="card">
          <h2>Внешние участники</h2>
          <div className="detailGrid">
            {externalParticipants.map((participant) => (
              <div className="field" key={participant.id}>
                <span>{participant.type}</span>
                <strong>{participant.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
