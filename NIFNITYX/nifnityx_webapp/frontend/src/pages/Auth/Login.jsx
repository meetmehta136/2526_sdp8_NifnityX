import React, { useState } from 'react';
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginButtonHandler = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // show the error message returned by backend
        setError(data.msg || "Login failed");
        return;
      }

      navigate("/dashboard");

    } catch (error) {
      console.log(error + "jjjjjjjjjj");
    }
  }
  return (
    <div className="w-full h-screen flex justify-center items-center sm:bg-[radial-gradient(circle,_rgba(0,0,0,0.7)_5%,_rgba(0,0,0,0.90)_80%)]">
      {/* Outer container changes behavior based on screen size */}
      <div className="bg-zinc-900 h-[60%] flex flex-col justify-center gap-5 items-center sm:rounded-lg sm:w-lg w-full">

        {/* Title */}
        <div className="text-4xl text-white font-medium m-10 w-auto flex justify-center items-center">
          Log in to NifnityX
        </div>

        {/* Email */}
        <div className="text-1xl text-white font-medium m-10 w-80 px-6">
          <label className="block mb-2">Email or username</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-[#7c7c7c]  rounded p-2"
          />
        </div>

        {/* Password */}
        <div className="text-1xl text-white font-medium m-10 w-80 px-6">
          <label className="block mb-2">Password</label>
          <input
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#7c7c7c]  rounded p-2"
          />
        </div>

        {/* Login Button */}
        <div className="text-1xl font-medium m-10 w-80 px-6 flex justify-center items-center ">
          <button onClick={loginButtonHandler} className="w-80 text-lg text-white border-2 border-solid border-[#9393939f] rounded-3xl hover:scale-103 duration-500 transition-transform bg-[#3744ba] active:bg-[#1b2fdc] active:scale-50">Log in</button>
        </div>

        {/* don't have an account */}
        <div className="text-1xl text-white font-medium m-10 w-auto flex justify-between items-center gap-1">
          <div className='text-[#b3b3a9]'>
            Don't have an account?
          </div>
          <div className='underline'>
            <a href='/signup'> Sign up here </a>
          </div>
        </div>
        {error && (
          <div className="text-red-500 font-semibold mb-4 w-80 px-6">
            {error}
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
