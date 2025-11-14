import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";
const ngrok_URL="https://eac7a3e03f52.ngrok-free.app"

export const privateApi = axios.create({
  baseURL: API_URL,
});

privateApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
