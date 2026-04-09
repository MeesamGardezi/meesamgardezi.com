require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & Performance ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/admin', limiter);

// ── Static files ──
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
}));

// ── View engine ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Global template variables ──
app.use((req, res, next) => {
  res.locals.currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.currentYear = new Date().getFullYear();
  res.locals.siteName = 'Meesam Gardezi';
  res.locals.siteDescription = 'Flutter Developer, Full-Stack Engineer & SaaS Founder — Portfolio & Blog';
  next();
});

// ── Routes ──
const indexRoutes = require('./routes/index');
const blogRoutes = require('./routes/blog');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/blog', blogRoutes);
app.use('/admin', adminRoutes);

// ── SEO: robots.txt ──
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /admin/
Sitemap: ${res.locals.baseUrl || 'https://meesamgardezi.com'}/sitemap.xml`);
});

// ── SEO: Sitemap ──
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { db } = require('./firebase-config');
    const postsSnap = await db.collection('posts')
      .where('published', '==', true)
      .get();

    const posts = postsSnap.docs
      .map(doc => ({
        slug: doc.data().slug,
        updatedAt: doc.data().updatedAt?.toDate() || doc.data().createdAt?.toDate() || new Date(),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    res.set('Content-Type', 'application/xml');
    res.render('sitemap', {
      baseUrl: `${req.protocol}://${req.get('host')}`,
      posts,
    });
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 — Page Not Found | Meesam Gardezi',
    description: 'The page you are looking for does not exist.',
  });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('404', {
    title: 'Server Error | Meesam Gardezi',
    description: 'Something went wrong. Please try again later.',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ── Daily auto-blog (runs every day at 08:00 server time) ──
if (process.env.GEMINI_API_KEY) {
  const { generateAndPublish } = require('./scripts/auto-blog');
  // Schedule: minute=0, hour=8, every day
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running daily auto-blog generation...');
    try {
      await generateAndPublish();
    } catch (err) {
      console.error('[cron] Auto-blog failed:', err.message);
    }
  });
  console.log('[cron] Daily auto-blog scheduled at 08:00.');
} else {
  console.warn('[cron] GEMINI_API_KEY not set — auto-blog scheduler disabled.');
}

module.exports = app;
