const express = require('express');
const router = express.Router();
const { marked } = require('marked');
const { getDb, isInitialized } = require('../config/firebase');
const { demoPosts } = require('../config/demo-data');

// Configure marked
marked.setOptions({ gfm: true, breaks: true });

router.get('/', async (req, res) => {
  let posts = demoPosts.filter((p) => p.published);

  if (isInitialized()) {
    try {
      const db = getDb();
      const snap = await db
        .collection('posts')
        .where('published', '==', true)
        .orderBy('createdAt', 'desc')
        .get();
      if (!snap.empty) {
        posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.error('Firestore error on blog list:', e.message);
    }
  }

  res.render('pages/blog', {
    title: 'Blog — Meesam Gardezi',
    description:
      'Thoughts on building software, shipping products, AI, Flutter, and the grind of being an indie developer.',
    canonical: `${res.locals.siteUrl}/blog`,
    ogImage: `${res.locals.siteUrl}/images/og-blog.png`,
    posts,
    page: 'blog',
  });
});

router.get('/:slug', async (req, res, next) => {
  const { slug } = req.params;
  let post = demoPosts.find((p) => p.slug === slug && p.published);

  if (isInitialized()) {
    try {
      const db = getDb();
      const snap = await db
        .collection('posts')
        .where('slug', '==', slug)
        .where('published', '==', true)
        .limit(1)
        .get();
      if (!snap.empty) post = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      console.error('Firestore error on blog post:', e.message);
    }
  }

  if (!post) return next();

  const htmlContent = marked(post.content || '');

  res.render('pages/blog-post', {
    title: `${post.title} — Meesam Gardezi`,
    description: post.excerpt,
    canonical: `${res.locals.siteUrl}/blog/${post.slug}`,
    ogImage: post.imageUrl || `${res.locals.siteUrl}/images/og-blog.png`,
    post,
    htmlContent,
    page: 'blog',
  });
});

module.exports = router;
