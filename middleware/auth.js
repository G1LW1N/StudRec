// Middleware to check if user is authenticated as student
export const requireStudentAuth = (req, res, next) => {
    if (!req.session || !req.session.studentId) {
        return res.redirect("/student/login");
    }
    // Prevent browser from caching protected pages
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
};

// Middleware to check if user is authenticated as admin
export const requireAdminAuth = (req, res, next) => {
    if (!req.session || !req.session.adminId) {
        return res.redirect("/admin/login");
    }
    // Prevent browser from caching protected pages
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
};

// Middleware to redirect if already logged in as student
export const redirectIfStudentAuth = (req, res, next) => {
    if (req.session && req.session.studentId) {
        return res.redirect("/student/dashboard");
    }
    next();
};

// Middleware to redirect if already logged in as admin
export const redirectIfAdminAuth = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return res.redirect("/admin/dashboard");
    }
    next();
};
