// src/api/axios.js
import axios from "axios";

const baseURL =   "http://localhost:5000/api";
//import.meta.env.VITE_API_URL ||
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
