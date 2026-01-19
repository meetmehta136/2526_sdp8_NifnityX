import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const signupButtonHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, username, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "Signup failed");
        return;
      }

      // Redirect after signup success
      navigate("/dashboard");
    } catch (error) {
      console.log(error);
      setError("Something went wrong");
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center sm:bg-[radial-gradient(circle,_rgba(0,0,0,0.7)_5%,_rgba(0,0,0,0.90)_80%)]">
      <div className="bg-zinc-900 h-[70%] flex flex-col justify-center gap-5 items-center sm:rounded-lg sm:w-lg w-full">

        {/* Title */}
        <div className="text-4xl text-white font-medium m-10">
          Sign up for NifnityX
        </div>

        {/* Email */}
        <div className="text-white font-medium m-5 w-80 px-6">
          <label className="block mb-2">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-[#7c7c7c] rounded p-2"
          />
        </div>

        {/* Username */}
        <div className="text-white font-medium m-5 w-80 px-6">
          <label className="block mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border border-[#7c7c7c] rounded p-2"
          />
        </div>

        {/* Password */}
        <div className="text-white font-medium m-5 w-80 px-6">
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-[#7c7c7c] rounded p-2"
          />
        </div>

        {/* Signup Button */}
        <div className="font-medium m-5 w-80 px-6 flex justify-center">
          <button
            onClick={signupButtonHandler}
            className="w-80 text-lg text-white border-2 border-[#9393939f] rounded-3xl hover:scale-103 duration-500 transition-transform bg-[#3744ba] active:bg-[#1b2fdc] active:scale-100"
          >
            Sign up
          </button>
        </div>

        {/* Login Redirect */}
        <div className="text-white font-medium m-5 flex gap-1">
          <span className="text-[#b3b3a9]">Already have an account?</span>
          <a href="/login" className="underline">Log in here</a>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 font-semibold mb-4 w-80 px-6">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default Signup;
