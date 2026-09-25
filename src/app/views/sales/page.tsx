"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/DataProvider";
import { CenterLoading } from "@/components/Spinner";
import { RequireTab } from "@/components/RequireTab";
import { SortMark, useTableSort } from "@/components/SortTh";
import { MONTHS_TH, salesStats, yearsInData } from "@/lib/stats";

export default function SalesPage() {
  return (
    <RequireTab tab="sales">
      <SalesView />
    </RequireTab>
  );
}

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

function SalesView() {
  const { data, loading, error, reload } = useData();
  // ตั้งต้น "ทั้งหมด" เพื่อให้เห็นภาพรวมก่อน แล้วค่อยเลือกกรอง (ขาเข้า หน้า Sale)
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [jobType, setJobType] = useState("");
  const [customer, setCustomer] = useState("");
  const [sales, setSales] = useState("");

  const years = useMemo(() => (data ? yearsInData(data) : []), [data]);
  const jobTypes = useMemo(() => data?.lists?.job_type || [], [data]);
  const salesList = useMemo(() => data?.lists?.sales || [], [data]);
  // รายชื่อลูกค้า: เอาจากข้อมูลจริงที่มีงาน (ไม่ใช่ทั้ง dropdown) จะได้ไม่ต้องเลื่อนหาเยอะ
  const customers = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const key of ["cs-import", "cs-export"])
      for (const r of data.modules[key] || []) {
        const c = (r.customer || "").trim();
        if (c) set.add(c);
      }
    return Array.from(set).sort();
  }, [data]);

  const s = useMemo(
    () => (data ? salesStats(data, { year, month, day, jobType, customer, sales }) : null),
    [data, year, month, day, jobType, customer, sales]
  );

  const clear = () => {
    setYear("");
    setMonth("");
    setDay("");
    setJobType("");
    setCustomer("");
    setSales("");
  };
  const filtering = !!(year || month || day || jobType || customer || sales);

  // คลิกหัวคอลัมน์เพื่อเรียง (hook ต้องอยู่ก่อน return ด้านล่าง)
  const custRows = useMemo(() => s?.customers || [], [s]);
  const { sorted, th, dirOf } = useTableSort(custRows);

  if (loading && !data) return <main className="page fade-in"><CenterLoading /></main>;

  return (
    <main className="page fade-in">
      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>Sales View — ลูกค้า / ปริมาณตู้</h2>
          <div className="field"><label>ปี</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field"><label>เดือน</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {MONTHS_TH.map((m, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>)}
            </select>
          </div>
          <div className="field"><label>วันที่</label>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label>Job Type</label>
            <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field"><label>Sales / BKG by</label>
            <select value={sales} onChange={(e) => setSales(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {salesList.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field grow"><label>ลูกค้า</label>
            <select value={customer} onChange={(e) => setCustomer(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {filtering && <button className="btn" onClick={clear}>ล้างตัวกรอง</button>}
        </div>
        <p className="muted" style={{ margin: "8px 4px 0", fontSize: 12 }}>
          วัน/เดือน/ปี ยึด<b>วันที่หลักของงาน</b> (Import = ETA · Export = ETD)
        </p>
        {error || !s ? (
          <p className="muted">
            โหลดข้อมูลไม่สำเร็จ: {error}{" "}
            <button className="btn sm" onClick={() => reload(true)}>ลองใหม่</button>
          </p>
        ) : (
          <div className="lists-grid">
            <div className="list-card"><h3>Total Jobs</h3><div className="dash-total">{s.totalJobs}</div></div>
            <div className="list-card"><h3>Unique Customers</h3><div className="dash-total">{s.uniqueCustomers}</div></div>
            <div className="list-card"><h3>ตู้ 20 ฟุต</h3><div className="dash-total">{s.t20}</div></div>
            <div className="list-card"><h3>ตู้ 40 ฟุต</h3><div className="dash-total">{s.t40}</div></div>
          </div>
        )}
      </div>

      {s && !error && (
        <div className="panel">
          <h2 style={{ fontSize: 15 }}>งานแยกตามลูกค้า</h2>
          <div className="grid-wrap">
            <table className="view-table">
              <thead>
                <tr className="field-row">
                  <th {...th("name")}>Customer <SortMark dir={dirOf("name")} /></th>
                  <th {...th("jobs")}>Jobs <SortMark dir={dirOf("jobs")} /></th>
                  <th {...th("c20")}>ตู้ 20 ฟุต <SortMark dir={dirOf("c20")} /></th>
                  <th {...th("c40")}>ตู้ 40 ฟุต <SortMark dir={dirOf("c40")} /></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.jobs}</td>
                    <td>{c.c20}</td>
                    <td>{c.c40}</td>
                  </tr>
                ))}
                {s.customers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 30, textAlign: "center", color: "#777" }}>
                      ไม่มีข้อมูลตามตัวกรองที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
