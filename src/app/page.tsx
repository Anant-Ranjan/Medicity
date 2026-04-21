"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        // Redirect based on role
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
    <div className="flex-1 w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-center">Welcome back to MediCity</h1>
          <p className="text-muted-foreground text-sm text-center mt-2">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 text-rose-500 p-3 rounded-xl text-sm mb-6 border border-rose-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-primary/50 text-foreground mt-1 transition-colors"
              placeholder="admin@medicity.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-card/50 border border-border/50 rounded-xl p-3 outline-none focus:border-primary/50 text-foreground mt-1 transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 mt-4 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Activity className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account? <Link href="/register" className="text-primary font-medium hover:underline">Register here</Link>
        </div>
      </div>
    </div>
  );
}
