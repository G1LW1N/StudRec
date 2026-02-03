-- StudRec Database Schema
-- Run this SQL in your Render PostgreSQL database after creation

-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS student_info CASCADE;
DROP TABLE IF EXISTS student_login CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS admin CASCADE;

-- Create admin table
CREATE TABLE admin (
    admin_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create courses table
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    total_sections INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create student_login table
CREATE TABLE student_login (
    student_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create student_info table
CREATE TABLE student_info (
    student_id INTEGER PRIMARY KEY REFERENCES student_login(student_id) ON DELETE CASCADE,
    firstname VARCHAR(100) NOT NULL,
    middlename VARCHAR(100),
    lastname VARCHAR(100) NOT NULL,
    dateofbirth DATE NOT NULL,
    gender VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    course_id INTEGER REFERENCES courses(course_id),
    academicyear VARCHAR(20) NOT NULL,
    section VARCHAR(10) NOT NULL,
    cor_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_student_course ON student_info(course_id);
CREATE INDEX idx_student_email ON student_login(email);
CREATE INDEX idx_admin_email ON admin(email);

-- Insert sample courses
INSERT INTO courses (course_name, total_sections) VALUES 
('Bachelor of Science in Computer Science', 4),
('Bachelor of Science in Information Technology', 4),
('Bachelor of Science in Business Administration', 4),
('Bachelor of Arts in Communication', 3),
('Bachelor of Science in Accountancy', 4);

-- Note: You'll need to create an admin account through your application or manually insert with hashed password
-- Example (you need to hash the password first using bcrypt):
-- INSERT INTO admin (email, password) VALUES ('admin@studrec.com', '$2b$10$...');
