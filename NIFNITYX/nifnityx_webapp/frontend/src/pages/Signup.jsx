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

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        email: formData.email,
        password: formData.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-zinc-400 text-sm">
            Enter your details below to create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                required
                className="bg-zinc-900/50 border-zinc-700 text-white focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                className="bg-zinc-900/50 border-zinc-700 text-white focus:border-white focus:ring-0 [&:-webkit-autofill]:transition-all [&:-webkit-autofill]:duration-[9999s] [&:-webkit-autofill]:-webkit-text-fill-color-white"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <p className="text-xs text-zinc-500">
             Use 8 or more characters with a mix of letters, numbers & symbols
          </p>

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
            {loading ? "Creating account..." : "Sign Up"}
          </Button>

          <div className="text-center text-sm text-zinc-400 mt-2">
            Already have an account?{" "}
            <Link to="/login" className="text-white underline underline-offset-4 hover:text-zinc-300">
              Log in
            </Link>
          </div>
        </form>

        <div className="text-balance text-center text-xs text-zinc-500 mt-4 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-zinc-400">
          By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </AuthBackground>
  );
}