const express = require('express');
const router = express.Router();
const { getDb, isInitialized } = require('../config/firebase');
const { demoProjects, demoPosts } = require('../config/demo-data');

router.get('/', async (req, res) => {
  let featuredProjects = demoProjects.filter((p) => p.featured).slice(0, 3);
  let recentPosts = demoPosts.filter((p) => p.published).slice(0, 2);

  if (isInitialized()) {
    try {
      const db = getDb();
      const projSnap = await db
        .collection('projects')
        .where('featured', '==', true)
        .orderBy('order')
        .limit(3)
        .get();
      if (!projSnap.empty) {
        featuredProjects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      const blogSnap = await db
        .collection('posts')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(2)
        .get();
      if (!blogSnap.empty) {
        recentPosts = blogSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.error('Firestore error on home:', e.message);
    }
  }

  res.render('pages/home', {
    title: 'Meesam Gardezi — Full-Stack Builder & AI Tinkerer',
    description:
      'I build fast, ship faster. Flutter, Firebase, Node.js, AI/LLM apps. 5+ years, 1500+ users, 2 live SaaS products. Open for work worldwide.',
    canonical: res.locals.siteUrl,
    ogImage: `${res.locals.siteUrl}/images/og-home.png`,
    featuredProjects,
    recentPosts,
    page: 'home',
  });
});

module.exports = router;
