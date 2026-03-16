import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "hsl(var(--background))" }}>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-2xl font-black text-center" style={{ color: "hsl(var(--secondary))" }}>
          Admin Login
        </h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg font-body text-sm border"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", backgroundColor: "hsl(var(--card))" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full font-display text-[11px] uppercase tracking-[0.08em] font-bold py-3.5 rounded-full hover:opacity-85 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;
