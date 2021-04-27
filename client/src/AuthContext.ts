import { createContext } from "react";
import { RGBClient } from "rgb-navigation-api";

export const AuthContext = createContext<RGBClient>(undefined as any);
