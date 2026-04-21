"use client";

import {
  Activity, Users, Bed, Zap, ShieldAlert, CheckCircle2,
  AlertTriangle, Syringe, X, Save, Wifi, Plus, BarChart2, Calendar
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [epiOpen, setEpiOpen] = useState(false);
  const [epiSubmitting, setEpiSubmitting] = useState(false);
  const [epiSuccess, setEpiSuccess] = useState(false);
  const [epiError, setEpiError] = useState('');
  const [epiRecords, setEpiRecords] = useState<any[]>([]);

  const [epiForm, setEpiForm] = useState({
    diseaseName: '', category: 'Vector-Borne', caseCount: 0,
    reportPeriod: 'daily', notes: '',
    severityBreakdown: { mild: 0, moderate: 0, severe: 0, critical: 0 },
    ageGroupBreakdown: { children: 0, adults: 0, elderly: 0 },
  });

  // Editable telemetry state for the broadcast modal
  const [editTelemetry, setEditTelemetry] = useState({
    icuOccupied: 0,
    generalOccupied: 0,
    pediatricOccupied: 0,
    erWaitTime: 0,
  });

  const fetchData = () => {
    setLoading(true);
    fetch('/api/tenant/me')
      .then(res => res.json())
      .then(resData => {
        if (!resData.success) {
          router.push('/');
        } else {
          setData(resData);
          setEditTelemetry({
            icuOccupied: resData.tenant.bedTelemetry.icu.occupied,
            generalOccupied: resData.tenant.bedTelemetry.general.occupied,
            pediatricOccupied: resData.tenant.bedTelemetry.pediatric.occupied,
            erWaitTime: resData.tenant.currentERWaitTimeMinutes,
          });
        }
        setLoading(false);
      });
  };

  const fetchEpiRecords = () => {
    fetch('/api/epidemiology')
      .then(r => r.json())
      .then(d => { if (d.success) setEpiRecords(d.records); });
  };

  useEffect(() => { fetchData(); fetchEpiRecords(); }, [router]);

  const handleEpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEpiSubmitting(true);
    setEpiError('');
    try {
      const res = await fetch('/api/epidemiology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epiForm),
      });
      const result = await res.json();
      if (result.success) {
        setEpiSuccess(true);
        fetchEpiRecords();
        setTimeout(() => {
          setEpiOpen(false);
          setEpiSuccess(false);
          setEpiForm({ diseaseName: '', category: 'Vector-Borne', caseCount: 0, reportPeriod: 'daily', notes: '', severityBreakdown: { mild: 0, moderate: 0, severe: 0, critical: 0 }, ageGroupBreakdown: { children: 0, adults: 0, elderly: 0 } });
        }, 1500);
      } else {
        setEpiError(result.error);
      }
    } finally {
      setEpiSubmitting(false);
    }
  };

  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const res = await fetch('/api/tenant/telemetry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: data.tenant._id,
          telemetryUpdates: {
            'bedTelemetry.icu.occupied': editTelemetry.icuOccupied,
            'bedTelemetry.general.occupied': editTelemetry.generalOccupied,
            'bedTelemetry.pediatric.occupied': editTelemetry.pediatricOccupied,
            'currentERWaitTimeMinutes': editTelemetry.erWaitTime,
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        setBroadcastSuccess(true);
        setTimeout(() => {
          setBroadcastOpen(false);
          setBroadcastSuccess(false);
          fetchData(); // Refresh live data
        }, 1500);
      }
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Activity className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
  if (!data?.tenant) return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      No Hospital Data found. Are you assigned to a tenant?
    </div>
  );

  const { tenant, staff } = data;

  return (
    <>
      <div className="flex-1 w-full p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hospital Operations Center</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {tenant.name} · Live Telemetry Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </div>
            <button
              onClick={() => setBroadcastOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Wifi className="w-4 h-4" />
              Broadcast Status Update
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Bed Telemetry */}
            <section className="glass p-6 rounded-2xl border-border/50 shadow-sm">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                <Bed className="w-5 h-5 text-primary" />
                Live Bed Telemetry
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "ICU Beds", total: tenant.bedTelemetry.icu.total, occupied: tenant.bedTelemetry.icu.occupied, bg: "bg-rose-500" },
                  { label: "General Ward", total: tenant.bedTelemetry.general.total, occupied: tenant.bedTelemetry.general.occupied, bg: "bg-emerald-500" },
                  { label: "Pediatric ER", total: tenant.bedTelemetry.pediatric.total, occupied: tenant.bedTelemetry.pediatric.occupied, bg: "bg-blue-500" },
                ].map((stat, i) => {
                  const ratio = stat.total > 0 ? stat.occupied / stat.total : 0;
                  const alert = ratio > 0.9;
                  return (
                    <div key={i} className="bg-card/50 p-4 rounded-xl border border-border/50 flex flex-col relative overflow-hidden">
                      <span className="text-sm text-muted-foreground font-medium mb-1">{stat.label}</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold">{stat.total - stat.occupied}</span>
                        <span className="text-sm text-muted-foreground">/ {stat.total} available</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full mt-4 overflow-hidden">
                        <div className={`h-full ${alert ? 'bg-rose-500' : stat.bg} transition-all duration-1000`} style={{ width: `${ratio * 100}%` }} />
                      </div>
                      {alert && (
                        <div className="absolute top-3 right-3 text-rose-500 animate-pulse">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Machinery */}
            <section className="glass p-6 rounded-2xl border-border/50 shadow-sm">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                <Zap className="w-5 h-5 text-accent" />
                High-Value Machinery Status
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: "MRI Scanner", ...tenant.machinery.mri },
                  { name: "CT Scanner", ...tenant.machinery.ctScanner },
                  { name: "Dialysis Units", ...tenant.machinery.dialysis },
                  { name: "ECMO Machines", ...tenant.machinery.ecmo },
                ].map((machine, i) => {
                  const active = machine.status === 'Operational';
                  return (
                    <div key={i} className="flex flex-col p-4 bg-card/50 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-sm">{machine.name}</span>
                        {active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded w-max ${active ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {machine.status} (Qty: {machine.count})
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">

            {/* ER Wait Time Card */}
            <section className="glass p-6 rounded-2xl border-border/50 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Current ER Wait</h2>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-extrabold text-amber-400">{tenant.currentERWaitTimeMinutes}</span>
                <span className="text-muted-foreground mb-1">minutes</span>
              </div>
              <div className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-full w-max ${tenant.currentERWaitTimeMinutes > 60 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {tenant.currentERWaitTimeMinutes > 60 ? '⚠ High Load — Overflow routing may trigger' : '✓ Normal Load'}
              </div>
            </section>

            {/* Staffing Roster */}
            <section className="glass p-6 rounded-2xl border-border/50 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  Active Shift Roster
                </h2>
              </div>
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff recorded.</p>
                ) : staff.map((doc: any, i: number) => {
                  const activeShift = doc.shifts?.find((s: any) => s.status === 'On-Duty');
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-card/50 transition-colors border border-transparent hover:border-border/50">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                        {doc.firstName?.charAt(0)}{doc.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-sm truncate">Dr. {doc.lastName}</p>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${activeShift ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{doc.specialty} · {activeShift ? 'On Duty' : 'Off Duty'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Epidemiological Records */}
            <section className="glass p-6 rounded-2xl border-border/50 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -z-10" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-amber-500" />
                  Epidemiological Reports
                </h2>
                <button
                  onClick={() => setEpiOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Report
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {epiRecords.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    <BarChart2 className="w-8 h-8 opacity-20 mx-auto mb-2" />
                    No epidemiological reports yet. Click "Log Report" to submit one.
                  </div>
                ) : epiRecords.map((rec: any, i: number) => (
                  <div key={i} className="flex items-start justify-between p-3 rounded-xl bg-card/50 border border-border/30 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{rec.diseaseName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{rec.category}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(rec.reportDate).toLocaleDateString()}</span>
                        <span>{rec.reportPeriod}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-rose-400">{rec.caseCount}</div>
                      <div className="text-[10px] text-muted-foreground">cases</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[hsl(var(--card))] border border-primary/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

            <div className="bg-gradient-to-r from-primary/20 to-accent/10 px-6 py-5 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl"><Wifi className="w-5 h-5 text-primary" /></div>
                <div>
                  <h2 className="font-bold">Broadcast Status Update</h2>
                  <p className="text-xs text-muted-foreground">Updates live telemetry for the routing engine</p>
                </div>
              </div>
              <button onClick={() => setBroadcastOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {[
                { label: "ICU Beds Occupied", key: "icuOccupied", max: tenant.bedTelemetry.icu.total },
                { label: "General Ward Occupied", key: "generalOccupied", max: tenant.bedTelemetry.general.total },
                { label: "Pediatric ER Occupied", key: "pediatricOccupied", max: tenant.bedTelemetry.pediatric.total },
                { label: "ER Wait Time (minutes)", key: "erWaitTime", max: 300 },
              ].map(({ label, key, max }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <label className="font-medium">{label}</label>
                    <span className="text-muted-foreground">{(editTelemetry as any)[key]} / {max}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    value={(editTelemetry as any)[key]}
                    onChange={(e) => setEditTelemetry(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                  {key !== "erWaitTime" && (editTelemetry as any)[key] / max > 0.9 && (
                    <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Critical load — overflow routing will activate</p>
                  )}
                </div>
              ))}

              <button
                onClick={handleBroadcast}
                disabled={broadcasting || broadcastSuccess}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mt-2 ${broadcastSuccess ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'} disabled:opacity-70`}
              >
                {broadcastSuccess ? (
                  <><CheckCircle2 className="w-5 h-5" /> Broadcast Successful!</>
                ) : broadcasting ? (
                  <><Activity className="w-5 h-5 animate-spin" /> Broadcasting...</>
                ) : (
                  <><Save className="w-5 h-5" /> Broadcast to Routing Engine</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Epidemiology Entry Modal ───────────────────────────────── */}
      {epiOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[hsl(var(--card))] border border-amber-500/20 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 my-4">

            <div className="bg-gradient-to-r from-amber-900/30 to-amber-700/10 px-6 py-5 flex items-center justify-between border-b border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-xl"><Syringe className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <h2 className="font-bold">Log Epidemiological Report</h2>
                  <p className="text-xs text-muted-foreground">Anonymous statistical data only. No PHI collected.</p>
                </div>
              </div>
              <button onClick={() => setEpiOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleEpiSubmit} className="p-6 space-y-5">
              {epiError && <div className="bg-rose-500/10 text-rose-400 text-sm p-3 rounded-xl border border-rose-500/20">{epiError}</div>}

              {/* Disease & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Disease / Condition *</label>
                  <input
                    type="text" required list="diseases-list"
                    value={epiForm.diseaseName}
                    onChange={e => setEpiForm(p => ({ ...p, diseaseName: e.target.value }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-amber-500/50"
                    placeholder="e.g. Dengue Fever"
                  />
                  <datalist id="diseases-list">
                    {['Dengue Fever','Malaria','Seasonal Flu','COVID-19','Typhoid','Cholera','Tuberculosis','Hepatitis A','Hepatitis B','Chikungunya','Pneumonia'].map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category *</label>
                  <select
                    value={epiForm.category}
                    onChange={e => setEpiForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-amber-500/50"
                  >
                    {['Vector-Borne','Respiratory','Gastrointestinal','Cardiovascular','Neurological','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Case Count & Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Case Count *</label>
                  <input
                    type="number" required min={0}
                    value={epiForm.caseCount}
                    onChange={e => setEpiForm(p => ({ ...p, caseCount: Number(e.target.value) }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Report Period</label>
                  <select
                    value={epiForm.reportPeriod}
                    onChange={e => setEpiForm(p => ({ ...p, reportPeriod: e.target.value }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-amber-500/50"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Severity Breakdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Severity Breakdown (optional)</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['mild','moderate','severe','critical'] as const).map(sev => (
                    <div key={sev}>
                      <label className={`text-[10px] font-semibold block mb-1 capitalize ${sev === 'critical' ? 'text-rose-400' : sev === 'severe' ? 'text-amber-400' : sev === 'moderate' ? 'text-yellow-400' : 'text-emerald-400'}`}>{sev}</label>
                      <input
                        type="number" min={0} max={epiForm.caseCount}
                        value={epiForm.severityBreakdown[sev]}
                        onChange={e => setEpiForm(p => ({ ...p, severityBreakdown: { ...p.severityBreakdown, [sev]: Number(e.target.value) } }))}
                        className="w-full bg-card/50 border border-border/50 rounded-lg p-2.5 text-sm outline-none focus:border-amber-500/50"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Must not exceed total case count ({epiForm.caseCount})</p>
              </div>

              {/* Age Group Breakdown */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Age Group Breakdown (optional)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ key: 'children', label: 'Children (0-14)' }, { key: 'adults', label: 'Adults (15-59)' }, { key: 'elderly', label: 'Elderly (60+)' }].map(ag => (
                    <div key={ag.key}>
                      <label className="text-[10px] text-muted-foreground block mb-1">{ag.label}</label>
                      <input
                        type="number" min={0}
                        value={(epiForm.ageGroupBreakdown as any)[ag.key]}
                        onChange={e => setEpiForm(p => ({ ...p, ageGroupBreakdown: { ...p.ageGroupBreakdown, [ag.key]: Number(e.target.value) } }))}
                        className="w-full bg-card/50 border border-border/50 rounded-lg p-2.5 text-sm outline-none focus:border-amber-500/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Additional Notes (No PHI)</label>
                <textarea
                  rows={2}
                  value={epiForm.notes}
                  onChange={e => setEpiForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Cluster observed near river delta. No identifying information."
                  className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              <button
                type="submit" disabled={epiSubmitting || epiSuccess}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${epiSuccess ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'} disabled:opacity-70`}
              >
                {epiSuccess ? <><CheckCircle2 className="w-5 h-5" /> Report Submitted!</> :
                 epiSubmitting ? <><Activity className="w-5 h-5 animate-spin" /> Submitting...</> :
                 <><Save className="w-5 h-5" /> Submit to Public Health Analytics</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
