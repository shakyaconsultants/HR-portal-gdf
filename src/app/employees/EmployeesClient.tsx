"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { CompactKpi } from "@/components/ui/CompactKpi";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFriendlyApiMessage, parseApiResponse } from "@/lib/client-api";
import { formatStatusLabel, statusToVariant } from "@/lib/status-ui";

type Candidate = { id: string; fullName: string; status: string };
type Employee = {
  id: string;
  candidateId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  city: string;
  joinedAt: string;
  department?: string;
  status?: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function EmployeesClient() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [transferOpen, setTransferOpen] = useState(searchParams.get("transfer") === "1");
  const [search, setSearch] = useState("");

  async function loadData() {
    const [candRes, empRes] = await Promise.all([
      fetch("/api/candidates?page=1&pageSize=200&lifecycleStage=EMPLOYEE", { cache: "no-store" }),
      fetch("/api/employees", { cache: "no-store" }),
    ]);
    const cJson = await candRes.json();
    const eJson = await empRes.json();
    setCandidates(cJson.data?.items ?? []);
    setEmployees(eJson.data?.items ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (searchParams.get("transfer") === "1") setTransferOpen(true);
  }, [searchParams]);

  async function transferToEmployee() {
    if (!candidateId) return;
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId }),
    });
    const json = await parseApiResponse(res);
    if (res.ok && json.ok) {
      setCandidateId("");
      setTransferOpen(false);
      await loadData();
      toast.success("Candidate transferred to employee records.");
    } else {
      toast.error(getFriendlyApiMessage(json, "Unable to transfer candidate."));
    }
  }

  const filtered = employees.filter(
    (e) =>
      !search.trim() ||
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const metrics = {
    total: employees.length,
    active: employees.filter((e) => (e.status ?? "ACTIVE") === "ACTIVE").length,
    probation: employees.filter((e) => e.status === "PROBATION").length,
    resigned: employees.filter((e) => e.status === "RESIGNED").length,
  };

  return (
    <div className="employees-hub">
      <section className="dash-kpi-row">
        <CompactKpi label="Employees" value={metrics.total} />
        <CompactKpi label="Active" value={metrics.active} />
        <CompactKpi label="Probation" value={metrics.probation} />
        <CompactKpi label="Resigned" value={metrics.resigned} />
      </section>

      <div className="candidates-toolbar-row glass-card">
        <Field label="Search employees" className="search-field-full">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or employee ID…" />
        </Field>
        <button type="button" className="btn-sm" onClick={() => setTransferOpen(true)}>
          + Transfer Candidate
        </button>
      </div>

      <div className="glass-card">
        {filtered.length === 0 ? (
          <EmptyState
            icon="employees"
            title="No employees yet"
            description="Transfer onboarded candidates to build your employee directory."
            action={
              <button type="button" onClick={() => setTransferOpen(true)}>
                + Transfer Candidate
              </button>
            }
          />
        ) : (
          <div className="data-table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>City</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr key={employee.id} className="row-clickable">
                    <td>
                      <div className="cell-with-avatar">
                        <span className="candidate-avatar candidate-avatar-sm">{initials(employee.fullName)}</span>
                        <div>
                          <div className="cell-name">{employee.fullName}</div>
                          <div className="cell-muted">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{employee.employeeCode}</td>
                    <td>{employee.department ?? "—"}</td>
                    <td>{employee.city}</td>
                    <td>{new Date(employee.joinedAt).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={statusToVariant(employee.status ?? "ACTIVE")}>
                        {formatStatusLabel(employee.status ?? "ACTIVE")}
                      </Badge>
                    </td>
                    <td className="cell-actions">
                      {employee.candidateId ? (
                        <Link href={`/candidates/${employee.candidateId}`} className="btn-ghost btn-sm">
                          Profile
                        </Link>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer to Employee"
        description="Move an onboarded candidate into the employee directory."
        footer={
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setTransferOpen(false)}>
              Cancel
            </button>
            <button type="button" onClick={() => void transferToEmployee()} disabled={!candidateId}>
              Transfer
            </button>
          </div>
        }
      >
        <Field label="Candidate">
          <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
            <option value="">Select candidate at Employee stage</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName}
              </option>
            ))}
          </select>
        </Field>
      </Modal>
    </div>
  );
}
