"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Activity } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "general_user",
    tenantId: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { tenantId, ...restOfData } = formData;
      const payload = formData.role === "hospital_admin" ? { ...formData } : restOfData;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (data.user.role === "super_admin") router.push("/analytics");
        else if (data.user.role === "hospital_admin") router.push("/admin");
        else router.push("/search");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent/10 p-3 rounded-2xl mb-4">
            <UserPlus className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-center">Join MediCity</h1>
          <p className="text-muted-foreground text-sm text-center mt-2">Create your account</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-500 p-3 rounded-xl text-sm mb-6 border border-rose-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground ml-1">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground ml-1">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground ml-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
              placeholder="jane@example.com"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground ml-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground ml-1">Account Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
            >
              <option value="general_user">General User (Public)</option>
              <option value="hospital_admin">Hospital Admin (Tenant)</option>
              <option value="super_admin">System Super Admin</option>
            </select>
          </div>

          {formData.role === "hospital_admin" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-muted-foreground ml-1">Tenant ID (Hospital ID)</label>
              <input
                type="text"
                required={formData.role === "hospital_admin"}
                value={formData.tenantId}
                onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-accent/50 text-foreground mt-1 transition-colors"
                placeholder="Enter 24-char MongoDB ID"
              />
              <p className="text-xs text-muted-foreground ml-1 mt-1">Super admins approve tenant IDs.</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white py-3 rounded-xl font-semibold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 mt-6 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/" className="text-accent font-medium hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
