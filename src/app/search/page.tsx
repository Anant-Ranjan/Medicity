"use client";

import {
  Search, MapPin, Clock, ScanText, Navigation2, ShieldAlert, HeartPulse,
  Stethoscope, AlertOctagon, CheckCircle2, Biohazard, BarChart2,
  Brain, Eye, Baby, Zap, Filter, X
} from "lucide-react";
import { useState } from "react";

// ── Filter definitions ──────────────────────────────────────────────────────
const QUICK_FILTERS = [
  { id: 'icu',       icon: HeartPulse,  label: 'Emergency/ICU',    group: 'care',      payload: { needsICU: true } },
  { id: 'wait',      icon: Clock,       label: 'Lowest Wait Time', group: 'sort',      payload: { sortBy: 'wait' } },
  { id: 'nearest',   icon: MapPin,      label: 'Nearest First',    group: 'sort',      payload: { sortBy: 'distance' } },
  { id: 'mri',       icon: Zap,         label: 'MRI Available',    group: 'machinery', payload: { requiredMachinery: 'mri' } },
  { id: 'ct',        icon: Zap,         label: 'CT Scanner',       group: 'machinery', payload: { requiredMachinery: 'ctScanner' } },
  { id: 'dialysis',  icon: Zap,         label: 'Dialysis',         group: 'machinery', payload: { requiredMachinery: 'dialysis' } },
  { id: 'paed',      icon: Baby,        label: 'Paediatrician',    group: 'specialty', payload: { requiredSpecialty: 'Pediatrician' } },
  { id: 'neuro',     icon: Brain,       label: 'Neurologist',      group: 'specialty', payload: { requiredSpecialty: 'Neurologist' } },
  { id: 'ophthal',   icon: Eye,         label: 'Ophthalmologist',  group: 'specialty', payload: { requiredSpecialty: 'Ophthalmologist' } },
  { id: 'radius10',  icon: MapPin,      label: 'Within 10 km',     group: 'radius',    payload: { maxRadiusKm: 10 } },
  { id: 'radius25',  icon: MapPin,      label: 'Within 25 km',     group: 'radius',    payload: { maxRadiusKm: 25 } },
];

const GROUP_LABELS: Record<string, string> = {
  care: 'Care Type', sort: 'Sort By', machinery: 'Equipment', specialty: 'Specialist', radius: 'Distance'
};

const EXAMPLE_QUERIES = [
  'Open pediatric ER near me',
  'Hospitals with MRI available',
  'Number of dengue cases near me',
  'How many malaria patients reported',
  'Neurologist within 10 km',
  'CT scanner available urgent',
  'COVID-19 outbreak statistics',
];

export default function SearchPage() {
  const [query, setQuery]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [results, setResults]       = useState<any[]>([]);
  const [queryType, setQueryType]   = useState<'routing' | 'statistics' | null>(null);
  const [intent, setIntent]         = useState<any>(null);
  const [activeFilters, setActive]  = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc]                   = useState<[number,number]>([-74.006, 40.7128]);

  // Build filter payload from active filter ids
  const buildFilters = () => {
    const merged: any = {};
    for (const id of activeFilters) {
      const f = QUICK_FILTERS.find(f => f.id === id);
      if (f) Object.assign(merged, f.payload);
    }
    return merged;
  };

  const toggleFilter = (id: string) => {
    setActive(prev => {
      const next = new Set(prev);
      const f = QUICK_FILTERS.find(f => f.id === id)!;
      // Deactivate others in same group (radio behaviour within group)
      for (const other of QUICK_FILTERS) {
        if (other.group === f.group && other.id !== id) next.delete(other.id);
      }
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    if (overrideQuery) setQuery(overrideQuery);
    setIsLoading(true);
    setResults([]);
    setQueryType(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, userLocation: userLoc, filters: buildFilters() }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setQueryType(data.queryType);
        setIntent(data.extractedIntent);
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const groups = [...new Set(QUICK_FILTERS.map(f => f.group))];

  return (
    <div className="w-full flex-1 flex flex-col items-center pt-20 pb-12 px-4">

      {/* Hero */}
      <div className="max-w-4xl w-full text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ShieldAlert className="w-4 h-4" />
          AI-Powered Triage · Disease Stats · Hospital Routing
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Ask Anything. <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-blue-400">
            Get Answers Instantly.
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Search for hospitals, specialists, equipment — or ask about disease outbreaks and case statistics near you.
        </p>
      </div>

      {/* Search Box */}
      <div className="w-full max-w-3xl glass p-2 rounded-3xl shadow-2xl border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-700 mb-4">
        <div className="flex items-center bg-card/80 backdrop-blur-xl rounded-2xl p-2 border border-border/50">
          <div className="p-4 text-muted-foreground"><Search className="w-6 h-6" /></div>
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground"
            placeholder='Try: "dengue cases near me" or "MRI available"'
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <div className="flex items-center gap-2 pr-2">
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`p-3 rounded-xl transition-colors flex items-center gap-1.5 text-sm ${showFilters ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
              {activeFilters.size > 0 && <span className="w-4 h-4 bg-primary rounded-full text-[10px] text-white flex items-center justify-center font-bold">{activeFilters.size}</span>}
            </button>
            <button title="OCR Upload" className="p-3 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-primary">
              <ScanText className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleSearch()}
              disabled={isLoading}
              className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isLoading ? 'Analyzing…' : 'Search'}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-2 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {groups.map(group => (
              <div key={group}>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">{GROUP_LABELS[group]}</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.filter(f => f.group === group).map(f => (
                    <button
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        activeFilters.has(f.id)
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <f.icon className="w-3 h-3" />
                      {f.label}
                      {activeFilters.has(f.id) && <X className="w-3 h-3 ml-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {activeFilters.size > 0 && (
              <button onClick={() => setActive(new Set())} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Example queries */}
        {results.length === 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {EXAMPLE_QUERIES.map((eq, i) => (
              <button
                key={i}
                onClick={() => handleSearch(eq)}
                className="text-xs text-muted-foreground hover:text-primary bg-muted/30 hover:bg-primary/10 px-3 py-1.5 rounded-full border border-border/40 hover:border-primary/30 transition-all"
              >
                {eq}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Intent Pill */}
      {intent && (
        <div className="flex items-center gap-2 flex-wrap justify-center mb-8 animate-in fade-in duration-300">
          <span className="text-xs text-muted-foreground">Detected:</span>
          {intent.isStatQuery && <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">📊 Statistics Query</span>}
          {intent.needsICU   && <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">🚨 ICU Required</span>}
          {intent.requiredSpecialty  && <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">👨‍⚕️ {intent.requiredSpecialty}</span>}
          {intent.requiredMachinery  && <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">🔬 {intent.requiredMachinery.toUpperCase()}</span>}
          {intent.diseaseName        && <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20">🦠 {intent.diseaseName}</span>}
        </div>
      )}

      {/* ── Statistics Results ─────────────────────────────────────────── */}
      {queryType === 'statistics' && results.length > 0 && (
        <div className="w-full max-w-4xl space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold">Epidemiological Statistics</h2>
            <span className="text-xs text-muted-foreground">({results.length} disease{results.length !== 1 ? 's' : ''} found)</span>
          </div>
          {results.map((stat: any, i: number) => {
            const maxSev = Math.max(1, stat.severity.mild + stat.severity.moderate + stat.severity.severe + stat.severity.critical);
            return (
              <div key={i} className="glass p-6 rounded-2xl border-border/50 shadow-lg hover:border-amber-500/30 transition-colors">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2.5 rounded-xl"><Biohazard className="w-5 h-5 text-amber-400" /></div>
                    <div>
                      <h3 className="text-xl font-bold">{stat.diseaseName}</h3>
                      <span className="text-xs text-muted-foreground">{stat.category} · {stat.hospitals.length} hospital{stat.hospitals.length !== 1 ? 's' : ''} reporting</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-rose-400">{stat.totalCases}</div>
                    <div className="text-xs text-muted-foreground">total cases</div>
                  </div>
                </div>

                {/* Severity bar */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Severity Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {[
                      { key: 'mild',     color: 'bg-emerald-500' },
                      { key: 'moderate', color: 'bg-yellow-400' },
                      { key: 'severe',   color: 'bg-amber-500' },
                      { key: 'critical', color: 'bg-rose-500' },
                    ].map(({ key, color }) => (
                      <div
                        key={key}
                        className={`${color} transition-all`}
                        style={{ width: `${(stat.severity[key] / maxSev) * 100}%` }}
                        title={`${key}: ${stat.severity[key]}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    {['Mild','Moderate','Severe','Critical'].map((l, i) => <span key={i}>{l}</span>)}
                  </div>
                </div>

                {/* Age groups */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Children (0-14)', value: stat.ageGroup.children },
                    { label: 'Adults (15-59)',  value: stat.ageGroup.adults },
                    { label: 'Elderly (60+)',   value: stat.ageGroup.elderly },
                  ].map((ag, j) => (
                    <div key={j} className="bg-card/50 p-3 rounded-xl border border-border/40 text-center">
                      <div className="text-xl font-bold">{ag.value}</div>
                      <div className="text-[10px] text-muted-foreground">{ag.label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">Reported by: {stat.hospitals.join(' · ')}</p>
              </div>
            );
          })}
        </div>
      )}

      {queryType === 'statistics' && results.length === 0 && !isLoading && (
        <div className="glass p-10 rounded-2xl border-border/50 max-w-xl w-full text-center text-muted-foreground animate-in fade-in">
          <Biohazard className="w-10 h-10 opacity-20 mx-auto mb-3" />
          <p>No disease records found for your query. Hospital admins can log case data via their dashboard.</p>
        </div>
      )}

      {/* ── Routing Results ────────────────────────────────────────────── */}
      {queryType === 'routing' && results.length > 0 && (
        <div className="w-full max-w-4xl space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 mb-2">
            <Navigation2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Hospital Routing Results</h2>
            <span className="text-xs text-muted-foreground">({results.length} matched)</span>
          </div>
          {results.map((res: any, idx: number) => (
            <div key={res.hospital._id} className="glass p-6 rounded-2xl border-border/50 shadow-lg flex flex-col md:flex-row gap-6 relative overflow-hidden hover:border-primary/40 transition-colors">
              <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold ${idx === 0 ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {idx === 0 ? '⭐ Optimal Route' : `Alternative #${idx}`}
              </div>
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 flex-wrap">
                    {res.hospital.name}
                    {res.hospital.bedTelemetry.icu.occupied / res.hospital.bedTelemetry.icu.total > 0.9 && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
                        <AlertOctagon className="w-3 h-3" /> Near Capacity
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{res.hospital.address}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-card/50 p-3 rounded-xl border border-border/50">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Navigation2 className="w-3 h-3" />Distance</div>
                    <div className="font-semibold">{res.distanceKm.toFixed(1)} km</div>
                  </div>
                  <div className="bg-card/50 p-3 rounded-xl border border-border/50">
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />ER Wait</div>
                    <div className={`font-semibold ${res.hospital.currentERWaitTimeMinutes > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                      {res.hospital.currentERWaitTimeMinutes} min
                    </div>
                  </div>
                  <div className="bg-card/50 p-3 rounded-xl border border-border/50">
                    <div className="text-xs text-muted-foreground">ICU Available</div>
                    <div className="font-semibold text-emerald-400">
                      {res.hospital.bedTelemetry.icu.total - res.hospital.bedTelemetry.icu.occupied} beds
                    </div>
                  </div>
                  <div className="bg-card/50 p-3 rounded-xl border border-border/50">
                    <div className="text-xs text-muted-foreground">Route Score</div>
                    <div className="font-semibold text-primary">{Math.round(res.score)}</div>
                  </div>
                </div>
                {res.specialistAvailable && (
                  <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg w-fit border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" /> Required specialist currently ON-DUTY
                  </div>
                )}
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(res.hospital.address)}&travelmode=driving`}
                target="_blank" rel="noopener noreferrer"
                className={`w-full md:w-auto shrink-0 px-6 py-3 rounded-xl font-medium transition-all text-center self-end ${idx === 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
              >
                Navigate →
              </a>
            </div>
          ))}
        </div>
      )}

      {queryType === 'routing' && results.length === 0 && !isLoading && (
        <div className="glass p-10 rounded-2xl border-border/50 max-w-xl w-full text-center text-muted-foreground animate-in fade-in">
          <Stethoscope className="w-10 h-10 opacity-20 mx-auto mb-3" />
          <p>No hospitals found matching your criteria. Try adjusting your filters or expanding the search radius.</p>
        </div>
      )}

      {/* Feature cards shown when no results */}
      {!queryType && (
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-6xl mt-8">
          {[
            { title: 'Hospital Routing', desc: 'Find nearest hospitals with live ICU beds, specialist availability and ER wait times.', icon: Navigation2, color: 'text-primary', bg: 'bg-primary/10' },
            { title: 'Disease Statistics', desc: 'Ask "How many dengue cases near me?" for real-time anonymized epidemiological data.', icon: Biohazard, color: 'text-amber-400', bg: 'bg-amber-400/10' },
            { title: 'Smart Filters', desc: 'Filter by specialist type, equipment, distance radius or minimum wait time.', icon: Filter, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          ].map((feat, i) => (
            <div key={i} className="glass p-6 rounded-2xl border-white/5 hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${feat.bg} ${feat.color}`}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
