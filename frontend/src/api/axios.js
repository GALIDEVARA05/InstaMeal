// src/api/axios.js
import axios from "axios";

const baseURL = process.env.REACT_APP_API_URL;

// 🔍 Debug log (shows in browser console)
console.log("🔗 Axios BaseURL:", baseURL);

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
