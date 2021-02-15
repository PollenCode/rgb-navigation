require("dotenv").config(); // Load .env file
const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (!process.env.NODE_ENV || !process.env.PORT) {
    console.error("Please create a .env file and restart the server. (You should copy the .env.example file)");
    process.exit(1);
}

if (process.env.NODE_ENV === "development") {
    // Otherwise browsers block requests
    console.log("In development mode");
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        next();
    });
}

app.get("/", (req, res, next) => {
    res.end("this is the server");
});

// Example request with slowdown to show how react works
app.post("/message", (req, res, next) => {
    setTimeout(() => {
        res.json({
            message: "This is a message from the server",
        });
    }, 500);
});

const port = parseInt(process.env.PORT);
app.listen(port);
console.log(`Server started on port ${port}`);
