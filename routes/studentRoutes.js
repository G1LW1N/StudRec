import express from "express";
import bcrypt from "bcrypt";
import { db } from "../db/db.js";
import { uploadCOR } from "../middleware/upload.js";
import { requireStudentAuth, redirectIfStudentAuth } from "../middleware/auth.js";

const router = express.Router();

// Session check endpoint
router.get("/check-session", (req, res) => {
    if (req.session && req.session.studentId) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

router.get("/sections/:courseID", async (req, res) => {
    const courseID = req.params.courseID;

    try {
        const result = await db.query(
            "SELECT total_sections FROM courses WHERE course_id = $1",
            [courseID]
        );

        if (result.rows.length === 0) return res.json([]);

        const total = result.rows[0].total_sections;
        const sections = Array.from({ length: total }, (_, i) => i + 1);

        res.json(sections);
    } catch (err) {
        console.error(err);
        res.json([]);
    }
});

router.get("/login", redirectIfStudentAuth, (req, res) => {
    res.render("student-login");
});

router.get("/register", redirectIfStudentAuth, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM courses");
        const courses = result.rows;
        res.render("student-register", { courses });
    } catch (err) {
        console.error(err);
        res.send("Error loading courses");
    }
});

router.post("/register", redirectIfStudentAuth, uploadCOR.single("corfile"), async (req, res) => {
    try {
        const {
            email, password, firstname, middlename, lastname, dateofbirth, gender,
            phonenumber, address, course, academicyear, section,
        } = req.body;

        const corFile = req.file ? req.file.filename : null;
        if (!corFile) return res.send("COR upload is required.");

        const existing = await db.query(
            "SELECT * FROM student_login WHERE email = $1",
            [email]
        );
        if (existing.rows.length > 0) return res.send("Email already registered.");

        const hashedPassword = await bcrypt.hash(password, 10);

        const loginResult = await db.query(
            "INSERT INTO student_login (email, password) VALUES ($1, $2) RETURNING student_id",
            [email, hashedPassword]
        );
        const studentID = loginResult.rows[0].student_id;

        await db.query(
            `INSERT INTO student_info
            (student_id, firstname, middlename, lastname, dateofbirth, gender, phone, address,
            course_id, academicyear, section, cor_file)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            [
                studentID, firstname, middlename, lastname, dateofbirth, gender,
                phonenumber, address, course, academicyear, section, corFile
            ]
        );

        res.redirect("/student/login");

    } catch (err) {
        console.error(err);
        res.send("Registration failed. Please try again.");
    }
});

router.post("/login", redirectIfStudentAuth, async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await db.query(
            "SELECT * FROM student_login WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) return res.send("Invalid email or password.");

        const student = result.rows[0];
        const match = await bcrypt.compare(password, student.password);

        if (!match) return res.send("Invalid email or password.");

        req.session.studentId = student.student_id;
        
        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.send("Login failed. Please try again.");
            }
            res.redirect("/student/dashboard");
        });

    } catch (err) {
        console.error(err);
        res.send("Login failed. Please try again.");
    }
});

router.get("/dashboard", requireStudentAuth, async (req, res) => {
    try {
        // Double-check session exists
        if (!req.session || !req.session.studentId) {
            return res.redirect("/student/login");
        }
        
        const studentId = req.session.studentId;

        const result = await db.query(
            `SELECT si.student_id, si.firstname, si.middlename, si.lastname, si.dateofbirth, si.gender,
                    si.phone, si.address, si.course_id, si.academicyear, si.section, si.cor_file,
                    sl.email, c.course_name
             FROM student_info AS si
             JOIN student_login AS sl ON sl.student_id = si.student_id
             JOIN courses AS c ON c.course_id = si.course_id
             WHERE si.student_id = $1`,
            [studentId]
        );

        if (result.rows.length === 0) {
            req.session.destroy(() => res.redirect("/student/login"));
            return;
        }

        const student = result.rows[0];
        const fullName = [student.firstname, student.middlename, student.lastname]
            .filter(Boolean)
            .join(" ");

        const dob = student.dateofbirth instanceof Date
            ? student.dateofbirth.toISOString().split("T")[0]
            : student.dateofbirth;

        res.render("student-dashboard", {
            student: {
                id: student.student_id,
                fullName,
                firstname: student.firstname,
                lastname: student.lastname,
                courseName: student.course_name?.trim?.() || student.course_name,
                courseId: student.course_id,
                academicYear: student.academicyear,
                section: student.section,
                gender: student.gender,
                dob,
                phone: student.phone,
                address: student.address,
                email: student.email,
                corFile: student.cor_file,
                corUrl: student.cor_file ? `/uploads/cor/${student.cor_file}` : null
            }
        });

    } catch (err) {
        console.error(err);
        res.send("Unable to load dashboard. Please try again.");
    }
});

router.get("/logout", (req, res) => {
    // Prevent caching of logout page
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "-1");
    
    // Clear the session cookie first
    res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax"
    });
    
    // Destroy session
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
            }
            // Don't use cache for redirect
            res.setHeader("Location", "/student/login");
            res.status(302).end();
        });
    } else {
        res.setHeader("Location", "/student/login");
        res.status(302).end();
    }
});

export default router;
