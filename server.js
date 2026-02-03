import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { initializeDatabase } from "./db/initDatabase.js";

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
            secure: process.env.NODE_ENV === "production", // Enable secure cookies in production
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

const PORT = process.env.PORT || 3000;

// Initialize database and start server
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Failed to initialize database:", error);
        process.exit(1);
    });