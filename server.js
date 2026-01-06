import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: "connect.sid",
        cookie: {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            maxAge: 1000 * 60 * 60 * 24, // 24 hours
            sameSite: "lax"
        }
    })
);

app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index");
});

app.use("/student", studentRoutes);
app.use("/admin", adminRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});