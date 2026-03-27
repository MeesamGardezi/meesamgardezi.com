require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const { initFirebase } = require('./config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

// Init Firebase
initFirebase();

// Security & perf
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  })
);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global locals for all views
app.use((req, res, next) => {
  res.locals.siteUrl = process.env.SITE_URL || 'https://meesamgardezi.com';
  res.locals.siteName = 'Meesam Gardezi';
  res.locals.isAdmin = req.session.isAdmin || false;
  next();
});

// Routes
app.use('/', require('./routes/home'));
app.use('/projects', require('./routes/projects'));
app.use('/blog', require('./routes/blog'));
app.use('/admin', require('./routes/admin'));
app.use('/sitemap.xml', require('./routes/sitemap'));

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 — Lost in the void',
    description: "This page doesn't exist.",
    canonical: res.locals.siteUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/500', {
    title: '500 — Something exploded',
    description: 'Internal server error.',
    canonical: res.locals.siteUrl,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 meesamgardezi.com running at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});
