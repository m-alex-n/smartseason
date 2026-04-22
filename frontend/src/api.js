import axios from "axios";

// Use relative path for Vercel, localhost for development
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}