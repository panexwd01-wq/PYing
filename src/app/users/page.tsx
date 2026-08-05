"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CenterLoading } from "@/components/Spinner";
import { SavingOverlay } from "@/components/SavingOverlay";
import { Toast } from "@/components/Toast";
import { RequireTab } from "@/components/RequireTab";
import { useAuth } from "@/components/AuthProvider";
import { Perms, TABS, TabPerm, defaultUserPerms, emptyPerms } from "@/lib/perms";
import type { Role } from "@/lib/session";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  perms: Perms;
}

const ACTIONS: { key: keyof TabPerm; label: string; title: string }[] = [
  { key: "view", label: "เห็น", title: "เห็นเมนู + เข้าหน้านี้ได้" },
  { key: "add", label: "เพิ่ม", title: "เพิ่มรายการใหม่" },
  { key: "edit", label: "แก้ไข", title: "แก้ไขข้อมูล" },
  { key: "del", label: "ลบ", title: "ลบรายการ" },
  { key: "end", label: "END", title: "เพิ่ม / แก้ไข / ลบ งานที่สถานะ End" },
];

const blank = () => ({
  id: "",
  username: "",
  displayName: "",
  role: "user" as Role,
  active: true,
  perms: defaultUserPerms(),
});

function UsersPageInner() {
  const { user: me, reload: reloadMe } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [password, setPassword] = useState("");

  const flash = (text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), err ? 4200 : 2600);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/users").then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setUsers(r.users || []);
    } catch (e: any) {
      flash("โหลดรายชื่อผู้ใช้ไม่สำเร็จ: " + e.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setEditing(blank());
    setPassword("");
  };
  const startEdit = (u: UserRow) => {
    setEditing({ ...u, perms: { tabs: { ...(u.perms?.tabs || {}) }, lists: !!u.perms?.lists } });
    setPassword("");
  };

  const setPerm = (tabKey: string, action: keyof TabPerm, value: boolean) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const tabs = { ...prev.perms.tabs };
      const cur = { ...(tabs[tabKey] || {}) };
      cur[action] = value;
      // ปิด "เห็น" = ปิดสิทธิ์อื่นทั้งหมดของ tab นั้น
      if (action === "view" && !value) {
        cur.add = false;
        cur.edit = false;
        cur.del = false;
        cur.end = false;
      }
      // เปิดสิทธิ์อื่น = ต้องเห็นก่อน
      if (action !== "view" && value) cur.view = true;
      tabs[tabKey] = cur;
      return { ...prev, perms: { ...prev.perms, tabs } };
    });
  };

  const setAllForTab = (tabKey: string, value: boolean) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const def = TABS.find((t) => t.key === tabKey);
      const next: Partial<TabPerm> = def?.crud
        ? { view: value, add: value, edit: value, del: value, end: value }
        : { view: value };
      return { ...prev, perms: { ...prev.perms, tabs: { ...prev.perms.tabs, [tabKey]: next } } };
    });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.username.trim()) return flash("ต้องกรอก username", true);
    if (!editing.id && !password) return flash("ผู้ใช้ใหม่ต้องตั้งรหัสผ่าน", true);
    setSaving(true);
    try {
      const body: any = {
        id: editing.id || undefined,
        username: editing.username.trim(),
        displayName: editing.displayName.trim() || editing.username.trim(),
        role: editing.role,
        active: editing.active,
        perms: editing.perms,
      };
      if (password) body.password = password;
      const r = await fetch("/api/users", {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setEditing(null);
      setPassword("");
      await load();
      if (me && editing.username.toLowerCase() === me.username.toLowerCase()) await reloadMe();
      flash("บันทึกผู้ใช้เรียบร้อย");
    } catch (e: any) {
      flash("บันทึกไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: UserRow) => {
    if (!confirm(`ยืนยันลบผู้ใช้ "${u.username}"?`)) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/users?id=${encodeURIComponent(u.id)}`, { method: "DELETE" }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      await load();
      flash("ลบผู้ใช้เรียบร้อย");
    } catch (e: any) {
      flash("ลบไม่สำเร็จ: " + e.message, true);
    } finally {
      setSaving(false);
    }
  };

  const permCount = (p: Perms) =>
    TABS.filter((t) => !t.adminOnly && p.tabs?.[t.key]?.view).length;

  const editableTabs = useMemo(() => TABS.filter((t) => !t.adminOnly), []);

  return (
    <main className="page fade-in">
      <SavingOverlay show={saving} message="กำลังบันทึก…" />

      <div className="panel">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ flex: 1 }}>ผู้ใช้ระบบ &amp; สิทธิ์การใช้งาน</h2>
          <button className="btn" onClick={load} disabled={loading}>รีเฟรช</button>
          <button className="btn primary" onClick={startNew}>＋ เพิ่มผู้ใช้</button>
        </div>
        <p className="muted">
          กำหนดได้ต่อคนว่า <b>เห็น / เพิ่ม / แก้ไข / ลบ</b> tab ไหนได้บ้าง และ <b>END</b> = จัดการงานที่สถานะ End ได้ไหม ·
          สิทธิ์ <b>admin</b> ได้ทุกอย่างเสมอ
        </p>
      </div>

      {loading ? (
        <CenterLoading text="กำลังโหลดผู้ใช้…" />
      ) : (
        <div className="grid-wrap">
          <table className="view-table">
            <thead>
              <tr className="field-row">
                <th>Username</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>สถานะ</th><th>Tab ที่เห็น</th><th>แก้ Dropdown</th><th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.username}</b>{me?.username === u.username && <span className="role-pill">คุณ</span>}</td>
                  <td>{u.displayName}</td>
                  <td>{u.role === "admin" ? <span className="role-pill">admin</span> : "user"}</td>
                  <td>{u.active ? "ใช้งาน" : <span style={{ color: "#c0392b" }}>ปิดใช้งาน</span>}</td>
                  <td>{u.role === "admin" ? "ทั้งหมด" : `${permCount(u.perms)} / ${editableTabs.length}`}</td>
                  <td>{u.role === "admin" || u.perms?.lists ? "ได้" : "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm" onClick={() => startEdit(u)}>แก้ไข</button>
                      <button className="btn sm danger" onClick={() => remove(u)}>ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#777" }}>ยังไม่มีผู้ใช้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal wide" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? `แก้ไขผู้ใช้: ${editing.username}` : "เพิ่มผู้ใช้ใหม่"}</h3>

            <div className="user-form">
              <div className="field">
                <label>Username</label>
                <input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
              </div>
              <div className="field">
                <label>ชื่อที่แสดง</label>
                <input value={editing.displayName} onChange={(e) => setEditing({ ...editing, displayName: e.target.value })} />
              </div>
              <div className="field">
                <label>รหัสผ่าน {editing.id && <span className="muted">(เว้นว่าง = ไม่เปลี่ยน)</span>}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="field">
                <label>สิทธิ์</label>
                <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>
                  <option value="user">user</option>
                  <option value="admin">admin (ได้ทุกอย่าง)</option>
                </select>
              </div>
              <div className="field">
                <label>สถานะ</label>
                <select value={editing.active ? "Yes" : "No"} onChange={(e) => setEditing({ ...editing, active: e.target.value === "Yes" })}>
                  <option value="Yes">ใช้งาน</option>
                  <option value="No">ปิดใช้งาน</option>
                </select>
              </div>
              <div className="field">
                <label>แก้ไข Dropdown (หน้าตั้งค่า)</label>
                <select
                  value={editing.perms.lists ? "Yes" : "No"}
                  onChange={(e) => setEditing({ ...editing, perms: { ...editing.perms, lists: e.target.value === "Yes" } })}
                  disabled={editing.role === "admin"}
                >
                  <option value="No">ไม่ได้</option>
                  <option value="Yes">แก้ไขได้</option>
                </select>
              </div>
            </div>

            {editing.role === "admin" ? (
              <p className="muted" style={{ marginTop: 12 }}>
                ผู้ใช้สิทธิ์ <b>admin</b> เข้าถึงและแก้ไขได้ทุก tab อยู่แล้ว — ไม่ต้องตั้งค่ารายข้อ
              </p>
            ) : (
              <>
                <div className="perm-actions">
                  <button className="btn sm" onClick={() => setEditing({ ...editing, perms: defaultUserPerms() })}>ตั้งค่าเริ่มต้น</button>
                  <button className="btn sm" onClick={() => setEditing({ ...editing, perms: emptyPerms() })}>ล้างทั้งหมด</button>
                </div>
                <div className="grid-wrap" style={{ marginTop: 8, maxHeight: "44vh" }}>
                  <table className="view-table perm-table">
                    <thead>
                      <tr className="field-row">
                        <th style={{ textAlign: "left" }}>Tab</th>
                        {ACTIONS.map((a) => <th key={a.key} title={a.title}>{a.label}</th>)}
                        <th>ทั้งหมด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableTabs.map((t) => {
                        const p = editing.perms.tabs[t.key] || {};
                        return (
                          <tr key={t.key}>
                            <td style={{ textAlign: "left" }}>{t.label}{!t.crud && <span className="muted"> (ดูอย่างเดียว)</span>}</td>
                            {ACTIONS.map((a) => (
                              <td key={a.key} style={{ textAlign: "center" }}>
                                {a.key === "view" || t.crud ? (
                                  <input
                                    type="checkbox"
                                    checked={!!p[a.key]}
                                    onChange={(e) => setPerm(t.key, a.key, e.target.checked)}
                                  />
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                            ))}
                            <td style={{ textAlign: "center" }}>
                              <button className="btn sm" onClick={() => setAllForTab(t.key, true)}>เปิด</button>{" "}
                              <button className="btn sm" onClick={() => setAllForTab(t.key, false)}>ปิด</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="btn" onClick={() => setEditing(null)}>ยกเลิก</button>
              <button className="btn primary" onClick={save} disabled={saving}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast text={toast.text} err={toast.err} onClose={() => setToast(null)} />}
    </main>
  );
}

export default function UsersPage() {
  return (
    <RequireTab tab="users">
      <UsersPageInner />
    </RequireTab>
  );
}
