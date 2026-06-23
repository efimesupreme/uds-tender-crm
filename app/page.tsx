"use client";

import { useMemo, useState } from "react";
import { useCrmStore } from "@/lib/client-store";
import { formatMoney } from "@/lib/utils";
import { isActiveRequest } from "@/lib/workflow";
import type { RequestStatus, WorkType } from "@/lib/types";
import {
  HISTORICAL_CONTRACT_CONVERSION,
  PLAN_YEARS,
  QUARTERS,
  funnelStages,
  getAverageFunnelStageDuration,
  getOfferDate,
  getQuarterFromDate,
  getStatusListText,
  isKpContourRequest,
  matchesDashboardFilters,
  type Quarter,
  workTypeOptions
} from "@/lib/dashboard-metrics";

export default function DashboardPage() {
  const { requests, statusHistory, kpOfferPlans, isHydrated } = useCrmStore();
  const [year, setYear] = useState<number>(2026);
  const [quarter, setQuarter] = useState<Quarter>("all");
  const [workType, setWorkType] = useState<WorkType | "all">("all");

  const dashboard = useMemo(() => {
    const filtered = requests.filter((request) => matchesDashboardFilters(request, { year, quarter, workType, ownerUserId: "all" }));
    const kpRequests = filtered.filter(isKpContourRequest);
    const offerSum = kpRequests.reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);
    const contractCount = kpRequests.filter((request) => request.currentStatus === "won").length;
    const currentConversion = kpRequests.length > 0 ? Math.round((contractCount / kpRequests.length) * 100) : 0;
    const firstStageStatuses = new Set<RequestStatus>(funnelStages[0].statuses);
    const firstStageCount = filtered.filter((request) => firstStageStatuses.has(request.currentStatus)).length;
    const maxStageCount = Math.max(1, ...funnelStages.map((stage) => filtered.filter((request) => new Set<RequestStatus>(stage.statuses).has(request.currentStatus)).length));
    const planByYear = kpOfferPlans[String(year)] ?? { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

    return {
      activeCount: filtered.filter((request) => isActiveRequest(request.currentStatus)).length,
      kpRequests,
      offerSum,
      currentConversion,
      planFact: QUARTERS.map((item) => {
        const fact = kpRequests
          .filter((request) => getQuarterFromDate(getOfferDate(request)) === item)
          .reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);
        const plan = planByYear[item] ?? 0;
        return { quarter: item, plan, fact, percent: plan > 0 ? Math.round((fact / plan) * 100) : 0 };
      }),
      funnel: funnelStages.map((stage) => {
        const stageStatuses = new Set<RequestStatus>(stage.statuses);
        const stageRequests = filtered.filter((request) => stageStatuses.has(request.currentStatus));
        const count = stageRequests.length;
        return {
          ...stage,
          count,
          percent: firstStageCount > 0 ? Math.round((count / firstStageCount) * 100) : 0,
          width: Math.max(10, Math.round((count / maxStageCount) * 100)),
          averageDuration: getAverageFunnelStageDuration(stage.statuses, filtered, statusHistory)
        };
      }),
      portfolio: workTypeOptions.map((type, index) => {
        const typeRequests = kpRequests.filter((request) => request.workType === type);
        const amount = typeRequests.reduce((sum, request) => sum + (request.offerAmount ?? 0), 0);
        return { type, count: typeRequests.length, amount, percent: offerSum > 0 ? Math.round((amount / offerSum) * 100) : 0, color: ["#1f4e79", "#287f8f", "#6f8fb3", "#8f7aa8", "#bf8f45", "#8792a2"][index] };
      })
    };
  }, [kpOfferPlans, quarter, requests, statusHistory, workType, year]);

  if (!isHydrated) return <div className="card" role="status">Загрузка демо-данных…</div>;

  const maxPlanFact = Math.max(1, ...dashboard.planFact.flatMap((item) => [item.plan, item.fact]));

  return (
    <>

      <section className="filterBar dashboardFilters" aria-label="Фильтры дашборда">
        <label className="formField">Год<select className="select" value={year} onChange={(event) => setYear(Number(event.target.value))}>{PLAN_YEARS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="formField">Квартал<select className="select" value={quarter} onChange={(event) => setQuarter(event.target.value as Quarter)}><option value="all">Все кварталы</option>{QUARTERS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="formField">Направление / тип работ<select className="select" value={workType} onChange={(event) => setWorkType(event.target.value as WorkType | "all")}><option value="all">Все типы</option>{workTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>

      <section className="cardGrid dashboardKpis">
        <div className="card statCard"><div className="metric">{dashboard.activeCount}</div><div className="metricLabel">Текущие обращения</div></div>
        <div className="card statCard"><div className="metric">{dashboard.kpRequests.length}</div><div className="metricLabel">Выданные КП</div></div>
        <div className="card statCard"><div className="metric">{formatMoney(dashboard.offerSum)}</div><div className="metricLabel">Сумма КП</div></div>
        <div className="card statCard"><div className="metric">{dashboard.currentConversion}%</div><div className="metricLabel">Текущая конверсия в договор</div></div>
        <div className="card statCard"><div className="metric">{HISTORICAL_CONTRACT_CONVERSION}%</div><div className="metricLabel">Историческая конверсия · исторический ориентир</div></div>
      </section>

      <section className="dashboardAnalyticsRow">
        <div className="card planFactCard">
          <div className="sectionHeader"><div><h2>План / факт по сумме КП</h2><p>Факт КП привязан к дате подготовки КП, затем к дате подачи, затем к дате создания заявки.</p></div></div>
        <div className="planFactGrid">
          {dashboard.planFact.map((item) => (
            <div className="planFactItem" key={item.quarter}>
              <strong>{item.quarter}</strong>
              <div className="barPair" aria-label={`${item.quarter}: план КП ${formatMoney(item.plan)}, факт КП ${formatMoney(item.fact)}`}>
                <span className="planBar" style={{ height: `${Math.max(4, (item.plan / maxPlanFact) * 100)}%` }} />
                <span className="factBar" style={{ height: `${Math.max(4, (item.fact / maxPlanFact) * 100)}%` }} />
              </div>
              <div className="small"><b>План КП:</b> {formatMoney(item.plan)}</div>
              <div className="small"><b>Факт КП:</b> {formatMoney(item.fact)}</div>
              <div className="small muted">Выполнение: {item.percent}%</div>
            </div>
          ))}
        </div>
        </div>

        <div className="card funnelCard">
          <div className="sectionHeader"><div><h2>Воронка продаж</h2><p>Средние сроки этапов встроены в ступени воронки.</p></div></div>
          <div className="funnelDiagram">
            {dashboard.funnel.map((stage, index) => (
              <div className="funnelStep" key={stage.id} style={{ width: `${Math.max(44, stage.width)}%`, transform: `translateX(${index % 2 === 0 ? 0 : 1}px)` }}>
                <div className="funnelStepMain"><strong>{stage.title}</strong><span>{stage.count} заявок · {stage.percent}%</span></div>
                <div className="funnelStepMeta">срок {stage.averageDuration.text} · {getStatusListText(stage.statuses)}</div>
              </div>
            ))}
          </div>
        </div>


        <div className="card portfolioCard">
        <div className="sectionHeader"><div><h2>Структура портфеля</h2><p>КП-контур по типам работ и сумме КП.</p></div></div>
        <div className="portfolioDashboard">
          <div className="portfolioDonut" style={{ background: `conic-gradient(${dashboard.portfolio.reduce((acc, item) => { const start = acc.total; const end = start + item.percent; acc.parts.push(`${item.color} ${start}% ${end}%`); acc.total = end; return acc; }, { total: 0, parts: [] as string[] }).parts.join(", ") || "#d7dee8 0 100%"})` }} aria-label={`Общая сумма КП ${formatMoney(dashboard.offerSum)}`}>
            <div><span>Сумма КП</span><strong>{formatMoney(dashboard.offerSum)}</strong></div>
          </div>
          <div className="portfolioLegend">
            {dashboard.portfolio.map((item) => (
              <div className="portfolioLegendRow" key={item.type}>
                <span className="portfolioDot" style={{ background: item.color }} />
                <strong>{item.type} — {item.percent}% · {item.count} КП</strong>
                <span>{formatMoney(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
