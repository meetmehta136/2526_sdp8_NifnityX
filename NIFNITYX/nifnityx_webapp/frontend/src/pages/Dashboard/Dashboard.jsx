import React from 'react';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const logoutButtonHandler = async (e) => {
    e.preventDefault();

    try {
      await fetch(
        `${import.meta.env.VITE_SERVER_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include", // IMPORTANT for cookies
        }
      );

      // redirect to login after logout
      navigate("/login");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="w-full h-screen flex justify-center flex-col gap-5 items-center bg-neutral-900">
      <h1 className="text-4xl mb-5 text-white">Dashboard - NifnityX</h1>

      <button
        onClick={logoutButtonHandler}
        className="w-60 text-lg text-white border-2 border-[#9393939f] rounded-3xl hover:scale-103 duration-500 transition-transform bg-[#3744ba] active:bg-[#1b2fdc] active:scale-100"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
