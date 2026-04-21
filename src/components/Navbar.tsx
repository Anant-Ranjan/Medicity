"use client";

import { Activity, LogOut, Siren, Navigation2, Clock, MapPin, X, AlertOctagon, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const AUTH_PAGES = ["/", "/register"];

// Role → nav links mapping
const NAV_LINKS: Record<string, { label: string; href: string }[]> = {
  general_user: [
    { label: "Find Care", href: "/search" },
  ],
  hospital_admin: [
    { label: "Find Care", href: "/search" },
    { label: "Hospital Dashboard", href: "/admin" },
  ],
  super_admin: [
    { label: "Find Care", href: "/search" },
    { label: "Public Health", href: "/analytics" },
  ],
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyResults, setEmergencyResults] = useState<any[]>([]);
  const [emergencyStatus, setEmergencyStatus] = useState("");

  const fetchUser = useCallback(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.success ? d.user : null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => { fetchUser(); }, [pathname, fetchUser]);

  // Don't render nav on auth pages
  if (AUTH_PAGES.includes(pathname)) return null;

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  const handleEmergencyRoute = async () => {
    setEmergencyOpen(true);
    setEmergencyLoading(true);
    setEmergencyResults([]);
    setEmergencyStatus("Detecting your location...");

    let coords = { lat: 40.7128, lon: -74.006 }; // default NYC fallback

    try {
      await new Promise<void>((resolve) => {
        if (!navigator.geolocation) { resolve(); return; }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            resolve();
          },
          () => resolve(),
          { timeout: 4000 }
        );
      });

      setEmergencyStatus("Scanning nearest hospitals with open ICU beds...");

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "emergency ICU critical care",
          userLocation: [coords.lon, coords.lat],
          emergency: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmergencyResults(data.results.slice(0, 3));
        setEmergencyStatus("Optimal emergency routes found");
      } else {
        setEmergencyStatus("Could not retrieve hospital data.");
      }
    } catch {
      setEmergencyStatus("Error retrieving routes. Please call emergency services.");
    } finally {
      setEmergencyLoading(false);
    }
  };

  const navLinks = user ? (NAV_LINKS[user.role] ?? NAV_LINKS.general_user) : [];

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/search" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              MediCity
            </span>
          </Link>

          {/* Role-specific nav */}
          {navLinks.length > 0 && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hover:text-primary transition-colors ${pathname === link.href ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden md:block text-xs text-muted-foreground bg-card/50 px-3 py-1 rounded-full border border-border/50 capitalize">
                  {user.role.replace("_", " ")} · {user.firstName}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium hover:text-rose-500 transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
                Sign In
              </Link>
            )}

            {/* Emergency Route Button */}
            <button
              onClick={handleEmergencyRoute}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-rose-600/30 animate-pulse hover:animate-none"
            >
              <Siren className="w-4 h-4" />
              Emergency Route
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Route Modal */}
      {emergencyOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[hsl(var(--card))] border border-rose-500/30 rounded-3xl shadow-2xl shadow-rose-900/40 overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-900/80 to-rose-700/40 px-6 py-5 flex items-center justify-between border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="bg-rose-500/20 p-2 rounded-xl">
                  <Siren className="w-6 h-6 text-rose-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Emergency Routing Engine</h2>
                  <p className="text-xs text-rose-300">{emergencyStatus}</p>
                </div>
              </div>
              <button onClick={() => setEmergencyOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {emergencyLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
                  <p className="text-muted-foreground text-sm">{emergencyStatus}</p>
                </div>
              ) : emergencyResults.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Showing <span className="text-rose-400 font-semibold">{emergencyResults.length}</span> nearest hospitals ranked by ICU availability and ER wait time:
                  </p>
                  {emergencyResults.map((res: any, idx: number) => (
                    <div key={res.hospital._id} className={`p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start ${idx === 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-card/50 border-border/50"}`}>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="text-xs font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full">BEST MATCH</span>
                          )}
                          <h3 className="font-bold text-sm">{res.hospital.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">{res.hospital.address}</p>
                        <div className="flex flex-wrap gap-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 text-primary" />
                            {res.distanceKm.toFixed(1)} km away
                          </div>
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <Clock className="w-3 h-3" />
                            {res.hospital.currentERWaitTimeMinutes} min ER wait
                          </div>
                          <div className="flex items-center gap-1 text-xs text-blue-400">
                            <Navigation2 className="w-3 h-3" />
                            ~{res.estimatedTotalTimeMins} mins total
                          </div>
                          {res.hospital.bedTelemetry.icu.occupied / res.hospital.bedTelemetry.icu.total > 0.9 && (
                            <div className="flex items-center gap-1 text-xs text-rose-400">
                              <AlertOctagon className="w-3 h-3" /> Near ICU capacity
                            </div>
                          )}
                          {res.specialistAvailable && (
                            <div className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Specialist on duty
                            </div>
                          )}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(res.hospital.address)}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${idx === 0 ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30" : "bg-muted hover:bg-muted/80 text-foreground"}`}
                      >
                        Navigate →
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {emergencyStatus}
                </div>
              )}

              <p className="mt-5 text-center text-xs text-muted-foreground border-t border-border/50 pt-4">
                ⚠️ Always call <strong className="text-foreground">112 / 102</strong> for life-threatening emergencies. This tool is for routing assistance only.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
