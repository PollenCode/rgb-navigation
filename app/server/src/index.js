const express = require("express");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res, next) => {
    res.end("hello world");
});

const port = 3000;
app.listen(port);
console.log(`Listening on port ${port}`);
