import express from "express";
import bcrypt from "bcrypt";
import { db } from "../db/db.js";
import { render } from "ejs";
import { requireAdminAuth, redirectIfAdminAuth } from "../middleware/auth.js";

const router = express.Router();

// Session check endpoint
router.get("/check-session", (req, res) => {
    if (req.session && req.session.adminId) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

// Admin login page
router.get("/login", redirectIfAdminAuth, (req, res) => {
    res.render("admin-login");
});

// Admin login POST
router.post("/login", redirectIfAdminAuth, async (req, res) => {
    try {
        const { email, password } = req.body;


        const result = await db.query(
            "SELECT * FROM admin WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.send("Invalid email or password. Credentials didn't exist in DB");
        }

        const admin = result.rows[0];

        // Compare entered password with hashed password
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.send("Invalid email or password. NOT MATCH");
        }

        // Store admin session
        req.session.adminId = admin.admin_id;
        req.session.adminEmail = admin.email;

        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.send("Login failed. Please try again.");
            }
            res.redirect("/admin/dashboard");
        });

    } catch (err) {
        console.error(err);
        res.send("Login failed. Please try again.");
    }
});

// Admin Dashboard
router.get("/dashboard", requireAdminAuth, async (req, res) => {
    try {
        // Total counts
        const studentCountResult = await db.query("SELECT COUNT(*) FROM student_info");
        const courseCountResult = await db.query("SELECT COUNT(*) FROM courses");
        const maleCountResult = await db.query("SELECT COUNT(*) FROM student_info WHERE gender = 'Male'");
        const femaleCountResult = await db.query("SELECT COUNT(*) FROM student_info WHERE gender = 'Female'");

        // Students per course
        const studentsPerCourse = await db.query(`
            SELECT c.course_name, COUNT(si.student_id) as student_count
            FROM courses c
            LEFT JOIN student_info si ON c.course_id = si.course_id
            GROUP BY c.course_id, c.course_name
            ORDER BY student_count DESC
        `);

        // Students per academic year
        const studentsPerYear = await db.query(`
            SELECT academicyear, COUNT(*) as count
            FROM student_info
            GROUP BY academicyear
            ORDER BY academicyear DESC
        `);

        // Recent students (last 5)
        const recentStudents = await db.query(`
            SELECT si.student_id, si.firstname, si.lastname, si.dateofbirth, c.course_name
            FROM student_info si
            JOIN courses c ON si.course_id = c.course_id
            ORDER BY si.student_id DESC
            LIMIT 5
        `);

        const totalStudents = studentCountResult.rows[0].count;
        const totalCourses = courseCountResult.rows[0].count;
        const maleCount = maleCountResult.rows[0].count;
        const femaleCount = femaleCountResult.rows[0].count;

        res.render("admin-dashboard", {
            studentCount: totalStudents,
            courseCount: totalCourses,
            maleCount: maleCount,
            femaleCount: femaleCount,
            studentsPerCourse: studentsPerCourse.rows,
            studentsPerYear: studentsPerYear.rows,
            recentStudents: recentStudents.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.send("Error loading admin dashboard.");
    }
});

router.get("/students-personal", requireAdminAuth, async (req, res) => {
    try {
        const students = await db.query(`
            SELECT si.student_id, si.firstname, si.middlename, si.lastname, TO_CHAR(si.dateofbirth, 'Mon DD, YYYY') AS dateofbirth, TO_CHAR(si.dateofbirth, 'YYYY-MM-DD') AS dateofbirth_raw, si.gender, si.phone, si.address, si.course_id, si.academicyear, si.section
            FROM student_info as si
            JOIN courses AS c ON c.course_id = si.course_id
            JOIN student_login AS sl ON sl.student_id = si.student_id;
        `);

        const courses = await db.query(`
            SELECT course_id, TRIM(course_name) AS course_name 
            FROM courses;
        `);

        res.render("admin-students-personal", {
            students: students.rows,
            courses: courses.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.send("Error loading admin dashboard.");
    }

});

router.get("/students-academic", requireAdminAuth, async (req, res) => {
    try {
        const students = await db.query(`
            SELECT si.student_id, si.firstname, si.lastname, c.course_name, si.course_id, si.academicyear, si.section, si.cor_file
            FROM student_info as si
            JOIN courses AS c ON c.course_id = si.course_id
            JOIN student_login AS sl ON sl.student_id = si.student_id;
        `);

        const courses = await db.query(`
            SELECT course_id, TRIM(course_name) AS course_name 
            FROM courses;
        `);

        res.render("admin-students-academic", {
            students: students.rows,
            courses: courses.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.send("Error loading admin dashboard.");
    }

});

router.get("/students-accounts", requireAdminAuth, async (req, res) => {
    try {
        const students = await db.query(`
            SELECT si.student_id, si.firstname, si.lastname, sl.email
            FROM student_info as si
            JOIN student_login AS sl ON sl.student_id = si.student_id;
        `);

        res.render("admin-students-accounts", {
            students: students.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.send("Error loading admin dashboard.");
    }

});

router.get("/courses", requireAdminAuth, async (req, res) => {
    try {
        const courses = await db.query(`
            SELECT course_id, course_name, total_sections
            FROM courses
        `);

        res.render("admin-courses", {
            courses: courses.rows
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.send("Error loading admin dashboard.");
    }
});

// Add course POST
router.post("/courses/add", requireAdminAuth, async (req, res) => {
    try {
        const { course_name, total_sections } = req.body;

        await db.query(`
            INSERT INTO courses (course_name, total_sections)
            VALUES ($1, $2)
        `, [course_name, total_sections]);

        res.redirect("/admin/courses");
    } catch (error) {
        console.error("Add Course Error:", error);
        res.send("Error adding course.");
    }
});

// Edit course POST
router.post("/courses/:id/edit", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { course_name, total_sections } = req.body;

        await db.query(`
            UPDATE courses
            SET course_name = $1, total_sections = $2
            WHERE course_id = $3
        `, [course_name, total_sections, id]);

        res.redirect("/admin/courses");
    } catch (error) {
        console.error("Edit Course Error:", error);
        res.send("Error editing course.");
    }
});

// Delete course POST
router.post("/courses/:id/delete", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(`DELETE FROM courses WHERE course_id = $1`, [id]);

        res.redirect("/admin/courses");
    } catch (error) {
        console.error("Delete Course Error:", error);
        res.send("Error deleting course.");
    }
});

// Edit student page
router.get("/students/:id/edit", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const studentResult = await db.query(`
            SELECT si.student_id, si.firstname, si.middlename, si.lastname, si.dateofbirth, si.gender, si.phone, si.address, si.course_id, si.academicyear, si.section
            FROM student_info AS si
            WHERE si.student_id = $1
        `, [id]);

        if (studentResult.rows.length === 0) {
            return res.send("Student not found.");
        }

        const courses = await db.query(`
            SELECT course_id, TRIM(course_name) AS course_name 
            FROM courses
        `);

        res.render("admin-students-personal", {
            student: studentResult.rows[0],
            courses: courses.rows
        });

    } catch (error) {
        console.error("Edit Error:", error);
        res.send("Error loading edit page.");
    }
});

// Update student POST
router.post("/students/:id/edit", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { firstname, middlename, lastname, dateofbirth, gender, phone, address } = req.body;

        await db.query(`
            UPDATE student_info
            SET firstname = $1, middlename = $2, lastname = $3, dateofbirth = $4, gender = $5, phone = $6, address = $7
            WHERE student_id = $8
        `, [firstname, middlename, lastname, dateofbirth, gender, phone, address, id]);

        res.redirect("/admin/students-personal?success=updated");

    } catch (error) {
        console.error("Update Error:", error);
        res.send("Error updating student.");
    }
});

// Delete student POST
router.post("/students/:id/delete", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Delete from student_login first (foreign key constraint)
        await db.query("DELETE FROM student_login WHERE student_id = $1", [id]);

        // Delete from student_info
        await db.query("DELETE FROM student_info WHERE student_id = $1", [id]);

        res.redirect("/admin/students-personal");

    } catch (error) {
        console.error("Delete Error:", error);
        res.send("Error deleting student.");
    }
});

// Update academic information POST
router.post("/students/:id/edit-academic", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { course_id, academicyear, section } = req.body;

        await db.query(`
            UPDATE student_info
            SET course_id = $1, academicyear = $2, section = $3
            WHERE student_id = $4
        `, [course_id, academicyear, section, id]);

        res.redirect("/admin/students-academic?success=updated");

    } catch (error) {
        console.error("Update Error:", error);
        res.send("Error updating student.");
    }
});

// Update account information POST
router.post("/students/:id/edit-account", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        await db.query(`
            UPDATE student_login
            SET email = $1
            WHERE student_id = $2
        `, [email, id]);

        res.redirect("/admin/students-accounts?success=updated");

    } catch (error) {
        console.error("Update Error:", error);
        res.send("Error updating student.");
    }
});

// Add new student page GET
router.get("/add-student", requireAdminAuth, async (req, res) => {
    try {
        const courses = await db.query(`
            SELECT course_id, course_name 
            FROM courses
        `);

        res.render("admin-add-student", {
            courses: courses.rows
        });

    } catch (error) {
        console.error("Error loading add student page:", error);
        res.send("Error loading add student page.");
    }
});

// Add new student POST
router.post("/add-student", requireAdminAuth, async (req, res) => {
    try {
        const { email, password, firstname, middlename, lastname, dateofbirth, gender, phonenumber, address, course, academicyear, section } = req.body;

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into student_login
        const loginResult = await db.query(`
            INSERT INTO student_login (email, password)
            VALUES ($1, $2)
            RETURNING student_id
        `, [email, hashedPassword]);

        const studentId = loginResult.rows[0].student_id;

        // Insert into student_info
        await db.query(`
            INSERT INTO student_info (student_id, firstname, middlename, lastname, dateofbirth, gender, phone, address, course_id, academicyear, section)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [studentId, firstname, middlename, lastname, dateofbirth, gender, phonenumber, address, course, academicyear, section]);

        res.redirect("/admin/students-personal?success=added");

    } catch (error) {
        console.error("Add Student Error:", error);
        res.send("Error adding student. Email might already exist.");
    }
});

// Admin Logout
router.get("/logout", (req, res) => {
    // Prevent caching of logout page
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    // Save the session object before destroying
    const sessionID = req.session;
    
    // Clear the session cookie first
    res.clearCookie("connect.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax"
    });
    
    // Destroy session
    if (sessionID) {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
            }
            // Force redirect after session is destroyed
            return res.redirect("/admin/login");
        });
    } else {
        return res.redirect("/admin/login");
    }
});

export default router;