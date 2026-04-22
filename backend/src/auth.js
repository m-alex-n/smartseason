const jwt = require("jsonwebtoken");

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const secret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);
    req.auth = { userId: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function requireRole(roles) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Unauthorized" });
    if (!allow.includes(req.auth.role)) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

module.exports = { signToken, requireAuth, requireRole };

