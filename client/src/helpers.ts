export const isDevelopment = process.env.NODE_ENV === "development";

export const serverPath = isDevelopment ? "http://localhost:3001" : "";
