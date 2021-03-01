// Returns localhost address when testing local
export const SERVER = process.env.NODE_ENV === "development" ? "http://localhost:3001" : "https://rgb-navigation.be";
