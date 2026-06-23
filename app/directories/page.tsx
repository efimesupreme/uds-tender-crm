"use client";

import { useCrmStore } from "@/lib/client-store";
import { directories, externalParticipants } from "@/lib/mock-data";
import { lossReasons, nonParticipationReasons, statusLabels, taskTypeLabels } from "@/lib/workflow";
import { PLAN_YEARS, QUARTERS } from "@/lib/dashboard-metrics";

export default function DirectoriesPage() {
  const { resetDemoData, kpOfferPlans, updateKpOfferPlan } = useCrmStore();
  const directoryGroups = directories.reduce<Record<string, typeof directories>>((acc, item) => {
    acc[item.directoryType] = acc[item.directoryType] ?? [];
    acc[item.directoryType].push(item);
    return acc;
  }, {});

  return (
    <>
      <div className="toolbar"><button className="button buttonDanger" type="button" onClick={resetDemoData}>Сбросить демо-данные</button></div>

      <section className="sectionStack">

        <div className="card">
          <div className="sectionHeader">
            <div>
              <h2>Планы КП</h2>
              <p>Плановые суммы выданных КП по кварталам. Значения сохраняются в localStorage.</p>
            </div>
          </div>
          <div className="planSettingsGrid">
            {PLAN_YEARS.map((year) => (
              <div className="field planYearCard" key={year}>
                <strong>{year}</strong>
                <div className="quarterInputs">
                  {QUARTERS.map((quarter) => (
                    <label className="formField" key={`${year}-${quarter}`}>
                      План КП {quarter}
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="10000"
                        value={kpOfferPlans[String(year)]?.[quarter] ?? 0}
                        onChange={(event) => updateKpOfferPlan(year, quarter, Number(event.target.value))}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

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

        <div className="card">
          <h2>Типы задач</h2>
          <div className="detailGrid">
            {Object.entries(taskTypeLabels).map(([code, name]) => (
              <div className="field" key={code}>
                <span>{code}</span>
                <strong>{name}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Причины неучастия</h2>
          <div className="detailGrid">
            {nonParticipationReasons.map((reason) => (
              <div className="field" key={reason.code}>
                <span>{reason.code}</span>
                <strong>{reason.name}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Причины проигрыша</h2>
          <div className="detailGrid">
            {lossReasons.map((reason) => (
              <div className="field" key={reason.code}>
                <span>{reason.code}</span>
                <strong>{reason.name}</strong>
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
