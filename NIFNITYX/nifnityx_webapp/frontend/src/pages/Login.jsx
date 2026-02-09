import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";
import AuthBackground from "@/components/ui/AuthBackground";
import api from "@/lib/api";

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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

      // 2. Refresh the App state BEFORE navigating
      if (onLoginSuccess) {
        await onLoginSuccess(); 
      }
      
      // 3. Navigate only after state is updated
      navigate("/dashboard"); 

    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Link
            to="/"
            className="flex flex-col items-center gap-2 font-medium text-white mb-2"
          >
            <Logo className="h-10 w-10" color="white" />
            <span className="sr-only">NifnityX</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-zinc-400 text-sm">
            Enter your email below to access your dashboard
          </p>
        </div>

        {/* Removed Card container */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white [&:-webkit-autofill]:shadow-[0_0_0px_1000px_transparent_inset] [&:-webkit-autofill]:border-zinc-700"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password" className="text-white">Password</Label>
              <a
                href="#"
                className="ml-auto text-xs underline-offset-4 hover:underline text-zinc-400"
              >
                Forgot your password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              required
              className="bg-zinc-900/50 border-zinc-700 text-white focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white [&:-webkit-autofill]:shadow-[0_0_0px_1000px_transparent_inset] [&:-webkit-autofill]:border-zinc-700"
              value={formData.password}
              onChange={handleChange}
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
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-white underline underline-offset-4 hover:text-zinc-300">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </AuthBackground>
  );
}