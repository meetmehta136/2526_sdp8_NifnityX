import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:5000";

export const socket = io(SERVER_URL, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});