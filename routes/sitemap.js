const express = require('express');
const router = express.Router();
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const { getDb, isInitialized } = require('../config/firebase');
const { demoProjects, demoPosts } = require('../config/demo-data');

router.get('/', async (req, res) => {
  const siteUrl = process.env.SITE_URL || 'https://meesamgardezi.com';

  const links = [
    { url: '/', changefreq: 'weekly', priority: 1.0 },
    { url: '/projects', changefreq: 'weekly', priority: 0.9 },
    { url: '/blog', changefreq: 'daily', priority: 0.9 },
  ];

  let projects = demoProjects;
  let posts = demoPosts.filter((p) => p.published);

  if (isInitialized()) {
    try {
      const db = getDb();
      const [ps, bs] = await Promise.all([
        db.collection('projects').get(),
        db.collection('posts').where('published', '==', true).get(),
      ]);
      if (!ps.empty) projects = ps.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!bs.empty) posts = bs.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Sitemap error:', e.message);
    }
  }

  projects.forEach((p) => {
    links.push({ url: `/projects/${p.slug}`, changefreq: 'monthly', priority: 0.7 });
  });
  posts.forEach((p) => {
    links.push({ url: `/blog/${p.slug}`, changefreq: 'monthly', priority: 0.7 });
  });

  const stream = new SitemapStream({ hostname: siteUrl });
  res.header('Content-Type', 'application/xml');
  const data = await streamToPromise(Readable.from(links).pipe(stream));
  res.send(data.toString());
});

module.exports = router;
