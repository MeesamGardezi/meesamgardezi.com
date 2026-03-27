function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

module.exports = { requireAdmin };
