import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";
import { Zap, ShieldCheck, Cpu, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Logo from "@/components/ui/Logo";
import api from "@/lib/api";
import AuthHeroSide from '../components/AuthHeroSide';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginButtonHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/login", { email, password });

      if (onLoginSuccess) {
        await onLoginSuccess();
      }

      navigate("/dashboard");

    } catch (error) {
      console.log(error);
      setError(error.response?.data?.msg || error.response?.data?.message || "Login failed - Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full h-screen bg-black overflow-hidden font-sans">
      {/* Left Partition (60%) - Hero & Terminal Animation */}
      <AuthHeroSide title="ENCRYPTED_AUTH: INITIALIZING..." scrambleChars="01$X_#" />

      {/* Right Partition (40%) - Login Form (Consistent with Signup Inspiration Styling) */}
      <div className="w-full lg:w-[40%] h-full flex items-center justify-center bg-zinc-950 p-8 sm:p-12 relative overflow-y-auto select-none">
        <div className="flex flex-col gap-6 w-full max-w-sm mx-auto animate-fade-in-up">
          <div className="flex flex-col items-center gap-2 mb-4">
            <Link to="/" className="flex flex-col items-center gap-2 font-medium text-white mb-2">
              <Logo className="h-10 w-10 text-white" color="white" />
              <span className="sr-only">NifnityX</span>
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight font-['JetBrains_Mono']">Welcome back</h1>
            <p className="text-zinc-400 text-sm text-center">
              Login to access your trading dashboard
            </p>
          </div>

          <form onSubmit={loginButtonHandler} className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white">Email or username</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                required
                className="bg-zinc-900/50 border-zinc-700 text-white focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-900 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 font-semibold" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>

            <div className="text-center text-sm text-zinc-400 mt-2">
              Don't have an account?{" "}
              <Link to="/signup" className="text-white underline underline-offset-4 hover:text-zinc-300">
                Sign up here
              </Link>
            </div>
          </form>

          <div className="text-balance text-center text-xs text-zinc-500 mt-8 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-zinc-400">
            By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
            and <a href="#">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;