const crypto = require('crypto');

function getSessionToken() {
  const secret = process.env.SESSION_SECRET || 'fallback-secret';
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex');
}

/**
 * Middleware to verify admin session cookie.
 * Redirects to /admin/login if not authenticated.
 */
function requireAuth(req, res, next) {
  const sessionCookie = req.cookies?.session;
  if (sessionCookie === getSessionToken()) {
    return next();
  }
  res.clearCookie('session');
  return res.redirect('/admin/login');
}

/**
 * Middleware to redirect already-authenticated users away from login.
 */
function redirectIfAuth(req, res, next) {
  const sessionCookie = req.cookies?.session;
  if (sessionCookie === getSessionToken()) {
    return res.redirect('/admin/dashboard');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuth, getSessionToken };

