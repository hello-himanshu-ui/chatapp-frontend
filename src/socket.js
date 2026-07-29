import { io } from "socket.io-client";

const socket = io("https://chatapp-5paq.onrender.com");

export default socket;