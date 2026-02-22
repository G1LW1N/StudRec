import { db } from "./db/db.js";
import bcrypt from "bcrypt";

async function createAdmin() {
    try {
        const email = "admin@studrec.com";
        const password = "studRECadmin01";
        
        // Check if admin already exists
        const existing = await db.query(
            "SELECT * FROM admin WHERE email = $1",
            [email]
        );
        
        if (existing.rows.length > 0) {
            console.log("❌ Admin account already exists!");
            console.log("  Email:", email);
            process.exit(0);
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert admin account
        await db.query(
            "INSERT INTO admin (email, password) VALUES ($1, $2)",
            [email, hashedPassword]
        );
        
        console.log("✓ Admin account created successfully!");
        console.log("  Email:", email);
        console.log("  Password:", password);
        
        process.exit(0);
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
}

createAdmin();
