import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import AuthBackground from "@/components/ui/AuthBackground";
import api from "@/lib/api";

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      if (onLoginSuccess) {
        await onLoginSuccess();
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="animate-fade-in-up">
        {/* Mobile logo (hidden on lg+) */}
        <div className="flex flex-col items-center gap-2 mb-8 lg:hidden">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-white tracking-tight">NifnityX</span>
        </div>

        {/* Glassmorphism form card */}
        <div className="glass-card rounded-2xl p-8 animate-fade-in-scale" style={{ animationDelay: "100ms" }}>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-zinc-500 text-sm mt-1">Sign in to your trading dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="trader@nifnityx.com"
                required
                className="h-11 bg-zinc-900/60 border-zinc-700/50 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-lg transition-all [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white [&:-webkit-autofill]:shadow-[0_0_0px_1000px_transparent_inset] [&:-webkit-autofill]:border-zinc-700"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 text-xs font-medium uppercase tracking-wider">
                  Password
                </Label>
                <a href="#" className="text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="h-11 bg-zinc-900/60 border-zinc-700/50 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 rounded-lg transition-all [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white [&:-webkit-autofill]:shadow-[0_0_0px_1000px_transparent_inset] [&:-webkit-autofill]:border-zinc-700"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-950/30 border-red-900/50 text-red-300 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 group"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Launch Dashboard
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/60" />
            </div>
          </div>

          <p className="text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>

        {/* Bottom tag */}
        <p className="text-center text-[10px] text-zinc-700 mt-6 tracking-wider uppercase font-medium">
          Secured • Encrypted • Real-Time
        </p>
      </div>
    </AuthBackground>
  );
}