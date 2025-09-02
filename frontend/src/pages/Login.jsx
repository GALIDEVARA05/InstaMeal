import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      // store rollNo for student, ObjectId for staff
      if (res.data.role === "student") {
        localStorage.setItem("rollNo", res.data.id);
        localStorage.removeItem("userId");
      } else {
        localStorage.setItem("userId", res.data.id);
        localStorage.removeItem("rollNo");
      }

      const role = res.data.role;
      toast.success(
        role === "student" ? "🎓 Student Logged in Successfully!"
        : role === "manager" ? "👨‍💼 Manager Logged in Successfully!"
        : role === "cashier" ? "💳 Cashier Logged in Successfully!"
        : role === "admin" ? "🛠️ Admin Logged in Successfully!"
        : "✅ Login Successful!",
        { theme: "colored" }
      );

      setTimeout(() => {
        if (role === "student") nav("/student");
        else if (role === "manager") nav("/manager");
        else if (role === "cashier") nav("/cashier");
        else if (role === "admin") nav("/manager");
        else nav("/");
      }, 1200);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message, { theme: "colored" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600">
      <form onSubmit={submit} className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-5">
        <h2 className="text-3xl font-extrabold mb-4 text-center text-indigo-700">🔑 Meal Card Login</h2>
        <input
          className="border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="bg-gradient-to-r from-blue-500 to-green-500 hover:scale-105 transform text-white font-semibold py-3 rounded-xl transition-all duration-300">
          Login
        </button>
      </form>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
