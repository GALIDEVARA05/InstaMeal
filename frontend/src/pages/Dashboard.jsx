import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const nav = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (!role) {
      nav("/login");
    } else if (role === "student") {
      nav("/student");
    } else if (role === "manager") {
      nav("/manager");
    } else if (role === "cashier") {
      nav("/cashier");
    } else if (role === "admin") {
      nav("/manager");
    } else {
      nav("/login");
    }
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h2 className="text-3xl font-extrabold mb-4 text-indigo-700 animate-pulse">Redirecting...</h2>
        <p className="text-gray-600">
          If you are not redirected automatically, go back to{" "}
          <a href="/login" className="text-blue-500 underline font-semibold">Login</a>.
        </p>
      </div>
    </div>
  );
}
