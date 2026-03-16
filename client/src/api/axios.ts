import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config) => {
  const geminiKey = localStorage.getItem("gemini_api_key");
  if (geminiKey) {
    config.headers["X-Gemini-Api-Key"] = geminiKey;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const errorMsg: string = data?.detail || data?.error || "";

      if (
        status === 401 ||
        status === 403 ||
        errorMsg.toLowerCase().includes("api_key") ||
        errorMsg.toLowerCase().includes("api key")
      ) {
        window.dispatchEvent(
          new CustomEvent("gemini-api-key-error", { detail: errorMsg })
        );
      }
    }
    return Promise.reject(error);
  }
);
