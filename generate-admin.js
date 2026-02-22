import bcrypt from "bcrypt";

// Change these values to create your admin account
const adminEmail = "admin@studrec.com";
const adminPassword = "studRECadmin01";

async function generateAdminSQL() {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    console.log("\n=== Copy and run this SQL in your Render database ===\n");
    console.log(`INSERT INTO admin (email, password) VALUES ('${adminEmail}', '${hashedPassword}');`);
    console.log("\n=== Admin Credentials ===");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("\n=================================\n");
}

generateAdminSQL();
