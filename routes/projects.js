const express = require('express');
const router = express.Router();
const { getDb, isInitialized } = require('../config/firebase');
const { demoProjects } = require('../config/demo-data');

router.get('/', async (req, res) => {
  let projects = demoProjects;
  const { category } = req.query;

  if (isInitialized()) {
    try {
      const db = getDb();
      let query = db.collection('projects').orderBy('order');
      const snap = await query.get();
      if (!snap.empty) {
        projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.error('Firestore error on projects:', e.message);
    }
  }

  const categories = ['all', ...new Set(projects.map((p) => p.category))];
  const filtered = category && category !== 'all'
    ? projects.filter((p) => p.category === category)
    : projects;

  res.render('pages/projects', {
    title: 'Projects — Meesam Gardezi',
    description:
      'SaaS apps, client builds, AI agents, and past ventures. Every project is a story — here are mine.',
    canonical: `${res.locals.siteUrl}/projects`,
    ogImage: `${res.locals.siteUrl}/images/og-projects.png`,
    projects: filtered,
    categories,
    activeCategory: category || 'all',
    page: 'projects',
  });
});

router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  let project = demoProjects.find((p) => p.slug === slug);

  if (isInitialized()) {
    try {
      const db = getDb();
      const snap = await db.collection('projects').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) project = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      console.error('Firestore error on project detail:', e.message);
    }
  }

  if (!project) return next();

  res.render('pages/project-detail', {
    title: `${project.title} — Meesam Gardezi`,
    description: project.tagline,
    canonical: `${res.locals.siteUrl}/projects/${project.slug}`,
    ogImage: project.imageUrl || `${res.locals.siteUrl}/images/og-projects.png`,
    project,
    page: 'projects',
  });
});

module.exports = router;
