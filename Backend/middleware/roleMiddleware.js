export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
};

export const adminOnly = requireRole("admin");
export const doctorOnly = requireRole("doctor");
export const patientOnly = requireRole("patient");
