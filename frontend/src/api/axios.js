// src/api/axios.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

console.log("🔗 Axios BaseURL:", baseURL);

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
