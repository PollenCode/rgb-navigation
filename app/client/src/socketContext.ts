import { createContext } from "react";
import { Socket } from "socket.io-client";

export const SocketContext = createContext<{ socket: Socket }>({ socket: undefined as any });
