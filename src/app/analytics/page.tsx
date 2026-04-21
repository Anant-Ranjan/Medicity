"use client";

import { Map, AlertOctagon, BarChart3, ShieldCheck, Activity, Building2, Biohazard, FileDown, TrendingUp, Settings2, Plus, Pencil, Trash2, CheckCircle2, X, ChevronDown, ChevronUp, Bed, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, DonutChart, LineChart, StackedBar, HeatGrid } from "@/components/Charts";

const CATEGORY_COLORS: Record<string, string> = {
  'Vector-Borne': '#f59e0b', 'Respiratory': '#3b82f6',
  'Gastrointestinal': '#f97316', 'Cardiovascular': '#ef4444',
  'Neurological': '#a855f7', 'Other': '#64748b',
};

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState<'heatmap'|'diseases'|'hospitals'|'trends'|'manage'>('heatmap');
  const [generating, setGenerating] = useState(false);

  // Hospital management state
  const [hospitals, setHospitals]   = useState<any[]>([]);
  const [hospLoading, setHospLoading] = useState(false);
  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [hospError, setHospError]   = useState('');
  const [hospSuccess, setHospSuccess] = useState('');
  const [addForm, setAddForm] = useState({ name:'', address:'', contact:'', longitude:'', latitude:'', icuTotal:'', generalTotal:'', pediatricTotal:'', erWait:'' });
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => {
      if (!d.success) router.push('/'); else setData(d);
      setLoading(false);
    });
  }, [router]);

  const fetchHospitals = () => {
    setHospLoading(true);
    fetch('/api/admin/hospitals').then(r => r.json()).then(d => {
      if (d.success) setHospitals(d.hospitals);
      setHospLoading(false);
    });
  };

  useEffect(() => { if (tab === 'manage') fetchHospitals(); }, [tab]);

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault(); setHospError(''); setHospSuccess('');
    const res = await fetch('/api/admin/hospitals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
    const d = await res.json();
    if (d.success) { setHospSuccess('Hospital added!'); setAddOpen(false); setAddForm({ name:'', address:'', contact:'', longitude:'', latitude:'', icuTotal:'', generalTotal:'', pediatricTotal:'', erWait:'' }); fetchHospitals(); }
    else setHospError(d.error);
  };

  const handleEditSave = async () => {
    setHospError(''); setHospSuccess('');
    const res = await fetch('/api/admin/hospitals', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTarget._id, updates: editForm }) });
    const d = await res.json();
    if (d.success) { setHospSuccess('Updated!'); setEditTarget(null); fetchHospitals(); }
    else setHospError(d.error);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/hospitals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const d = await res.json();
    if (d.success) { setDeleteConfirm(null); fetchHospitals(); }
    else setHospError(d.error);
  };

  const startEdit = (h: any) => {
    setEditTarget(h);
    setEditForm({ name: h.name, address: h.address, contact: h.contact, isVerified: h.isVerified, currentERWaitTimeMinutes: h.currentERWaitTimeMinutes });
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    const { generateAnalyticsReport } = await import('@/lib/pdfReport');
    await generateAnalyticsReport(data.metrics, data.diseaseStats, data.hospitalStats, data.outbreaks);
    setGenerating(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Activity className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!data) return null;

  const { metrics, outbreaks, diseaseStats, hospitalStats } = data;
  const maxCases = diseaseStats[0]?.totalCases || 1;

  // Build heatmap cells from outbreaks with pseudo-positions
  const heatCells = outbreaks.map((ob: any, i: number) => ({
    x: 30 + ((i * 67 + 40) % 340),
    y: 20 + ((i * 43 + 30) % 160),
    intensity: ob.caseCount,
    label: `${ob.diseaseName} @ ${ob.tenantName || 'Unknown'}`,
  }));

  // Build trend data (group outbreaks by date)
  const trendMap: Record<string, number> = {};
  outbreaks.forEach((ob: any) => {
    const d = new Date(ob.reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    trendMap[d] = (trendMap[d] || 0) + ob.caseCount;
  });
  const trendData = Object.entries(trendMap).map(([label, value]) => ({ label, value: value as number }));

  // Category donut data
  const catMap: Record<string, number> = {};
  diseaseStats.forEach((d: any) => { catMap[d.category] = (catMap[d.category] || 0) + d.totalCases; });
  const donutData = Object.entries(catMap).map(([label, value]) => ({
    label, value: value as number, color: CATEGORY_COLORS[label] || '#64748b'
  }));

  const tabs = [
    { key: 'heatmap',  label: 'Heatmap',          icon: Map },
    { key: 'diseases', label: 'Disease Analysis',  icon: Biohazard },
    { key: 'hospitals',label: 'Hospital Burden',   icon: Building2 },
    { key: 'trends',   label: 'Trend Analysis',    icon: TrendingUp },
    { key: 'manage',   label: 'Manage Hospitals',  icon: Settings2 },
  ];

  return (
    <div className="flex-1 w-full p-6 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Public Health Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin · Disease Surveillance & Resource Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card/50 px-3 py-1.5 rounded-xl border border-border/50 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Anonymized Data Only
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/25 disabled:opacity-60"
          >
            {generating ? <Activity className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {generating ? 'Generating…' : 'Export PDF Report'}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Hospitals',  value: metrics.totalHospitals,                      color: 'from-primary/20 to-primary/5',  text: 'text-primary' },
          { label: 'Global ICU Load',   value: `${metrics.globalICURatio.toFixed(1)}%`,      color: metrics.globalICURatio > 80 ? 'from-rose-500/20 to-rose-500/5' : 'from-emerald-500/20 to-emerald-500/5', text: metrics.globalICURatio > 80 ? 'text-rose-400' : 'text-emerald-400' },
          { label: 'Disease Clusters',  value: diseaseStats.length,                          color: 'from-amber-500/20 to-amber-500/5',  text: 'text-amber-400' },
          { label: 'Cases Reported',    value: metrics.totalReportedCases,                   color: 'from-blue-500/20 to-blue-500/5',    text: 'text-blue-400' },
        ].map((k, i) => (
          <div key={i} className={`glass p-5 rounded-2xl bg-gradient-to-br ${k.color} border border-white/5`}>
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-3xl font-extrabold ${k.text}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card/50 p-1 rounded-xl border border-border/50 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── HEATMAP TAB ──────────────────────────────────────────────────────── */}
      {tab === 'heatmap' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced heatmap */}
            <section className="glass p-6 rounded-2xl border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><Map className="w-5 h-5 text-accent" />Geo-Epidemiological Heatmap</h2>
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Medium</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />High</span>
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-xl overflow-hidden border border-white/5">
                <HeatGrid cells={heatCells.length > 0 ? heatCells : [{ x: 200, y: 100, intensity: 0, label: 'No data' }]} />
              </div>
              {outbreaks.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mt-3">No outbreak data yet. Hospital admins log reports via their dashboard.</p>
              )}
            </section>

            {/* ICU Load bars */}
            <section className="glass p-6 rounded-2xl border-border/50">
              <h2 className="font-semibold flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-blue-400" />Regional ICU Capacity</h2>
              <div className="space-y-4">
                {metrics.sectors.map((zone: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{zone.name}</span>
                      <span className={zone.cap > 90 ? 'text-rose-400 font-bold' : zone.cap > 70 ? 'text-amber-400' : 'text-emerald-400'}>{zone.cap}%</span>
                    </div>
                    <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${zone.cap > 90 ? 'bg-rose-500 animate-pulse' : zone.cap > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${zone.cap}%` }}
                      />
                    </div>
                    {zone.cap > 90 && <p className="text-xs text-rose-400 mt-1 flex items-center gap-1"><AlertOctagon className="w-3 h-3" />Overflow routing active</p>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Category donut + top diseases */}
          <div className="space-y-6">
            <section className="glass p-6 rounded-2xl border-border/50">
              <h2 className="font-semibold mb-4">Category Distribution</h2>
              {donutData.length > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <DonutChart data={donutData} />
                  <div className="w-full space-y-1.5">
                    {donutData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                          <span className="text-muted-foreground">{d.label}</span>
                        </div>
                        <span className="font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">No data yet.</p>}
            </section>
            <section className="glass p-6 rounded-2xl border-border/50">
              <h2 className="font-semibold mb-4">Top Disease Alerts</h2>
              <div className="space-y-3">
                {diseaseStats.slice(0, 5).map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-card/50 rounded-lg border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.category}</p>
                    </div>
                    <span className="text-lg font-extrabold text-rose-400">{d.totalCases}</span>
                  </div>
                ))}
                {diseaseStats.length === 0 && <p className="text-xs text-muted-foreground">No disease reports yet.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ── DISEASE ANALYSIS TAB ─────────────────────────────────────────────── */}
      {tab === 'diseases' && (
        <div className="space-y-6">
          {/* Bar chart of top diseases */}
          {diseaseStats.length > 0 && (
            <section className="glass p-6 rounded-2xl border-border/50">
              <h2 className="font-semibold mb-4">Cases by Disease</h2>
              <BarChart data={diseaseStats.map((d: any) => ({ label: d.name, value: d.totalCases }))} color="#6366f1" />
            </section>
          )}

          {diseaseStats.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center text-muted-foreground">
              <Biohazard className="w-10 h-10 opacity-20 mx-auto mb-3" />
              No disease data. Hospital admins log reports via their dashboard.
            </div>
          ) : diseaseStats.map((d: any, i: number) => (
            <div key={i} className="glass p-6 rounded-2xl border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ background: `${CATEGORY_COLORS[d.category]}20` }}>
                    <Biohazard className="w-5 h-5" style={{ color: CATEGORY_COLORS[d.category] }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{d.name}</h3>
                    <p className="text-xs text-muted-foreground">{d.category} · {d.hospitals.length} hospital{d.hospitals.length !== 1 ? 's' : ''} reporting</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-rose-400">{d.totalCases}</div>
                  <div className="text-xs text-muted-foreground">total cases</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted h-1.5 rounded-full mb-5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(d.totalCases / maxCases) * 100}%` }} />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Severity Distribution</p>
                  <StackedBar items={[
                    { label: 'Mild',     value: d.severity.mild,     color: '#22c55e' },
                    { label: 'Moderate', value: d.severity.moderate, color: '#eab308' },
                    { label: 'Severe',   value: d.severity.severe,   color: '#f59e0b' },
                    { label: 'Critical', value: d.severity.critical, color: '#ef4444' },
                  ]} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-3">Age Group Breakdown</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: 'Children\n(0-14)', v: d.ageGroup.children, c: 'text-blue-400' },
                      { l: 'Adults\n(15-59)', v: d.ageGroup.adults,   c: 'text-emerald-400' },
                      { l: 'Elderly\n(60+)',  v: d.ageGroup.elderly,  c: 'text-amber-400' },
                    ].map((ag, j) => (
                      <div key={j} className="text-center bg-card/50 p-3 rounded-xl border border-border/30">
                        <div className={`text-xl font-extrabold ${ag.c}`}>{ag.v}</div>
                        <div className="text-[10px] text-muted-foreground whitespace-pre-line">{ag.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Reporting: {d.hospitals.join(' · ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── HOSPITAL BURDEN TAB ──────────────────────────────────────────────── */}
      {tab === 'hospitals' && (
        <div className="space-y-6">
          {hospitalStats.length > 0 && (
            <section className="glass p-6 rounded-2xl border-border/50">
              <h2 className="font-semibold mb-4">Case Burden by Hospital</h2>
              <BarChart
                data={hospitalStats.map((h: any) => ({ label: h.tenantName, value: h.totalCases }))}
                color="#f59e0b"
              />
            </section>
          )}

          {hospitalStats.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center text-muted-foreground">
              <Building2 className="w-10 h-10 opacity-20 mx-auto mb-3" />No hospital data yet.
            </div>
          ) : hospitalStats.map((h: any, i: number) => {
            const maxH = hospitalStats[0].totalCases;
            return (
              <div key={i} className="glass p-5 rounded-2xl border-border/50 hover:border-accent/30 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">#{i+1}</div>
                    <span className="font-semibold">{h.tenantName}</span>
                  </div>
                  <span className="text-2xl font-extrabold text-accent">{h.totalCases} <span className="text-sm font-normal text-muted-foreground">cases</span></span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-accent" style={{ width: `${(h.totalCases / maxH) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(h.diseases).sort(([,a],[,b]) => (b as number) - (a as number)).map(([disease, count]) => (
                    <span key={disease} className="text-xs px-2 py-1 bg-card/50 border border-border/40 rounded-md">
                      {disease}: <strong>{count as number}</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TREND ANALYSIS TAB ──────────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="grid md:grid-cols-2 gap-6">
          <section className="glass p-6 rounded-2xl border-border/50">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Case Count Over Time</h2>
            {trendData.length > 0 ? <LineChart data={trendData} color="#6366f1" height={140} /> : <p className="text-xs text-muted-foreground">No temporal data.</p>}
          </section>

          <section className="glass p-6 rounded-2xl border-border/50">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" />Cases per Disease</h2>
            {diseaseStats.length > 0 ? (
              <BarChart data={diseaseStats.slice(0,6).map((d: any) => ({ label: d.name, value: d.totalCases }))} color="#f59e0b" height={140} />
            ) : <p className="text-xs text-muted-foreground">No data.</p>}
          </section>

          <section className="glass p-6 rounded-2xl border-border/50">
            <h2 className="font-semibold mb-4">Global Severity Mix</h2>
            {diseaseStats.length > 0 ? (
              <StackedBar items={[
                { label: 'Mild',     value: diseaseStats.reduce((s: number, d: any) => s + d.severity.mild, 0),     color: '#22c55e' },
                { label: 'Moderate', value: diseaseStats.reduce((s: number, d: any) => s + d.severity.moderate, 0), color: '#eab308' },
                { label: 'Severe',   value: diseaseStats.reduce((s: number, d: any) => s + d.severity.severe, 0),   color: '#f59e0b' },
                { label: 'Critical', value: diseaseStats.reduce((s: number, d: any) => s + d.severity.critical, 0), color: '#ef4444' },
              ]} />
            ) : <p className="text-xs text-muted-foreground">No data.</p>}
          </section>

          <section className="glass p-6 rounded-2xl border-border/50">
            <h2 className="font-semibold mb-4">Global Age Distribution</h2>
            {diseaseStats.length > 0 ? (
              <BarChart
                data={[
                  { label: 'Children (0-14)', value: diseaseStats.reduce((s: number, d: any) => s + d.ageGroup.children, 0) },
                  { label: 'Adults (15-59)',  value: diseaseStats.reduce((s: number, d: any) => s + d.ageGroup.adults, 0) },
                  { label: 'Elderly (60+)',   value: diseaseStats.reduce((s: number, d: any) => s + d.ageGroup.elderly, 0) },
                ]}
                color="#a855f7"
                height={140}
              />
            ) : <p className="text-xs text-muted-foreground">No data.</p>}
          </section>
        </div>
      )}
      {/* ── MANAGE HOSPITALS TAB ─────────────────────────────────────────────── */}
      {tab === 'manage' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-lg">All Registered Hospitals</h2>
              <p className="text-xs text-muted-foreground">Click a hospital to expand full details. Super Admin full CRUD access.</p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Hospital
            </button>
          </div>

          {hospSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl text-sm">
              <CheckCircle2 className="w-4 h-4" /> {hospSuccess}
            </div>
          )}
          {hospError && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-sm">
              {hospError}
            </div>
          )}

          {hospLoading ? (
            <div className="flex items-center justify-center py-16"><Activity className="w-7 h-7 text-primary animate-spin" /></div>
          ) : hospitals.length === 0 ? (
            <div className="glass p-12 rounded-2xl text-center text-muted-foreground">
              <Building2 className="w-10 h-10 opacity-20 mx-auto mb-3" />
              No hospitals registered. Click "Add Hospital" to create one.
            </div>
          ) : hospitals.map((h: any) => {
            const isExpanded = expandedId === h._id;
            const icuRatio = h.bedTelemetry.icu.total > 0 ? h.bedTelemetry.icu.occupied / h.bedTelemetry.icu.total : 0;
            return (
              <div key={h._id} className={`glass rounded-2xl border transition-colors ${isExpanded ? 'border-primary/30' : 'border-border/50'} overflow-hidden`}>
                {/* Card header — always visible */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : h._id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.isVerified ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                      <Building2 className={`w-5 h-5 ${h.isVerified ? 'text-emerald-500' : 'text-amber-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{h.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${h.isVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {h.isVerified ? '✓ Verified' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{h.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Bed className="w-3 h-3" />ICU: {h.bedTelemetry.icu.total - h.bedTelemetry.icu.occupied}/{h.bedTelemetry.icu.total} free</span>
                      <span className={`flex items-center gap-1 ${h.currentERWaitTimeMinutes > 60 ? 'text-rose-400' : 'text-amber-400'}`}>ER: {h.currentERWaitTimeMinutes} min</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-5 space-y-5 animate-in fade-in duration-200">
                    {/* Action bar */}
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setHospSuccess(''); setHospError(''); startEdit(h); }} className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg border border-primary/20 transition-colors font-medium">
                        <Pencil className="w-3.5 h-3.5" /> Edit Info
                      </button>
                      <button onClick={() => setDeleteConfirm(h._id)} className="flex items-center gap-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors font-medium">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Hospital
                      </button>
                      {deleteConfirm === h._id && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-rose-400">Confirm delete?</span>
                          <button onClick={() => handleDelete(h._id)} className="bg-rose-600 text-white px-2.5 py-1 rounded-lg font-medium">Yes, Delete</button>
                          <button onClick={() => setDeleteConfirm(null)} className="bg-muted text-foreground px-2.5 py-1 rounded-lg">Cancel</button>
                        </div>
                      )}
                    </div>

                    {/* Info grid */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Beds */}
                      <div className="bg-card/50 p-4 rounded-xl border border-border/40 space-y-3">
                        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Bed className="w-3.5 h-3.5" /> Bed Telemetry</h4>
                        {[
                          { label: 'ICU', data: h.bedTelemetry.icu, color: 'bg-rose-500' },
                          { label: 'General', data: h.bedTelemetry.general, color: 'bg-emerald-500' },
                          { label: 'Pediatric', data: h.bedTelemetry.pediatric, color: 'bg-blue-500' },
                        ].map((bed, i) => {
                          const r = bed.data.total > 0 ? bed.data.occupied / bed.data.total : 0;
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">{bed.label}</span>
                                <span className={r > 0.9 ? 'text-rose-400 font-bold' : ''}>{bed.data.occupied}/{bed.data.total}</span>
                              </div>
                              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${r > 0.9 ? 'bg-rose-500 animate-pulse' : bed.color}`} style={{ width: `${r * 100}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Machinery */}
                      <div className="bg-card/50 p-4 rounded-xl border border-border/40">
                        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-3"><Zap className="w-3.5 h-3.5" /> Machinery</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'MRI', ...h.machinery.mri },
                            { name: 'CT Scanner', ...h.machinery.ctScanner },
                            { name: 'Dialysis', ...h.machinery.dialysis },
                            { name: 'ECMO', ...h.machinery.ecmo },
                          ].map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{m.name} ×{m.count}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.status === 'Operational' ? 'bg-emerald-500/10 text-emerald-400' : m.status === 'Maintenance' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {m.status}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-xs mt-1 pt-1 border-t border-border/30">
                            <span className="text-muted-foreground">Ventilators</span>
                            <span>{h.machinery.ventilators.available}/{h.machinery.ventilators.total} avail.</span>
                          </div>
                        </div>
                      </div>

                      {/* Contact / meta */}
                      <div className="bg-card/50 p-4 rounded-xl border border-border/40 space-y-3 text-xs">
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">Hospital Info</h4>
                        <div><span className="text-muted-foreground">Contact: </span>{h.contact || '—'}</div>
                        <div><span className="text-muted-foreground">ER Wait: </span><span className={h.currentERWaitTimeMinutes > 60 ? 'text-rose-400 font-bold' : 'text-amber-400'}>{h.currentERWaitTimeMinutes} min</span></div>
                        <div><span className="text-muted-foreground">Coordinates: </span>{h.location.coordinates[1].toFixed(4)}, {h.location.coordinates[0].toFixed(4)}</div>
                        <div><span className="text-muted-foreground">Last Updated: </span>{new Date(h.lastUpdated).toLocaleString()}</div>
                        <div><span className="text-muted-foreground">ID: </span><code className="text-[10px] opacity-50">{h._id}</code></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD HOSPITAL MODAL ────────────────────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-xl bg-[hsl(var(--card))] border border-primary/20 rounded-3xl shadow-2xl my-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/20 to-accent/10">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl"><Plus className="w-5 h-5 text-primary" /></div>
                <div><h2 className="font-bold">Register New Hospital</h2><p className="text-xs text-muted-foreground">All fields marked * are required</p></div>
              </div>
              <button onClick={() => setAddOpen(false)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <form onSubmit={handleAddHospital} className="p-6 space-y-4">
              {hospError && <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{hospError}</div>}

              {[
                { key: 'name', label: 'Hospital Name *', placeholder: 'City General Hospital' },
                { key: 'address', label: 'Full Address *', placeholder: '123 Main St, New York, NY' },
                { key: 'contact', label: 'Contact Number', placeholder: '+1-800-000-0000' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                  <input required={key !== 'contact'} placeholder={placeholder}
                    value={(addForm as any)[key]}
                    onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'longitude', label: 'Longitude *', placeholder: '-74.006' },
                  { key: 'latitude',  label: 'Latitude *',  placeholder: '40.712' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                    <input type="number" step="any" required placeholder={placeholder}
                      value={(addForm as any)[key]}
                      onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'icuTotal', label: 'ICU Beds' },
                  { key: 'generalTotal', label: 'General Beds' },
                  { key: 'pediatricTotal', label: 'Pediatric Beds' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                    <input type="number" min={0} placeholder="0"
                      value={(addForm as any)[key]}
                      onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Initial ER Wait (minutes)</label>
                <input type="number" min={0} placeholder="0"
                  value={addForm.erWait}
                  onChange={e => setAddForm(p => ({ ...p, erWait: e.target.value }))}
                  className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-primary/50"
                />
              </div>

              <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                Register Hospital
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT HOSPITAL MODAL ───────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-md bg-[hsl(var(--card))] border border-accent/20 rounded-3xl shadow-2xl my-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-gradient-to-r from-accent/20 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="bg-accent/20 p-2 rounded-xl"><Pencil className="w-5 h-5 text-accent" /></div>
                <div><h2 className="font-bold">Edit Hospital</h2><p className="text-xs text-muted-foreground">{editTarget.name}</p></div>
              </div>
              <button onClick={() => setEditTarget(null)}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
            </div>
            <div className="p-6 space-y-4">
              {hospError && <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">{hospError}</div>}
              {[
                { key: 'name', label: 'Hospital Name' },
                { key: 'address', label: 'Address' },
                { key: 'contact', label: 'Contact' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
                  <input value={editForm[key] || ''}
                    onChange={e => setEditForm((p: any) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-accent/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">ER Wait (minutes)</label>
                <input type="number" min={0} value={editForm.currentERWaitTimeMinutes || 0}
                  onChange={e => setEditForm((p: any) => ({ ...p, currentERWaitTimeMinutes: Number(e.target.value) }))}
                  className="w-full bg-card/50 border border-border/50 rounded-xl p-3 text-sm outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Verified Status</label>
                <button
                  onClick={() => setEditForm((p: any) => ({ ...p, isVerified: !p.isVerified }))}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${editForm.isVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground border border-border/50'}`}
                >
                  {editForm.isVerified ? '✓ Verified' : 'Unverified'}
                </button>
              </div>
              <button onClick={handleEditSave} className="w-full bg-accent text-black py-3 rounded-xl font-semibold hover:bg-accent/90 transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
