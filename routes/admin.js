const router = require('express').Router();
const { requireAuth, redirectIfAuth, getSessionToken } = require('../middleware/auth');
const slugify = require('slugify');

// ── Login page ──
router.get('/login', redirectIfAuth, (req, res) => {
  res.render('admin/login', { error: null });
});

// ── Handle login form POST ──
router.post('/login', redirectIfAuth, (req, res) => {
  const { username, password } = req.body;
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'changeme';

  if (username === validUsername && password === validPassword) {
    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
    res.cookie('session', getSessionToken(), {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return res.redirect('/admin/dashboard');
  }

  res.render('admin/login', { error: 'Invalid username or password.' });
});

// ── Logout ──
router.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/admin/login');
});

// ── Dashboard ──
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');

    const [postsSnap, messagesSnap, projectsSnap] = await Promise.all([
      db.collection('posts').orderBy('createdAt', 'desc').get(),
      db.collection('messages').orderBy('createdAt', 'desc').get(),
      db.collection('projects').get(),
    ]);

    const allPosts = postsSnap.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        slug: data.slug,
        published: data.published || false,
        dateFormatted: createdAt.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        }),
      };
    });

    const stats = {
      totalPosts: allPosts.length,
      publishedPosts: allPosts.filter(p => p.published).length,
      draftPosts: allPosts.filter(p => !p.published).length,
      totalMessages: messagesSnap.size,
      totalProjects: projectsSnap.size,
    };

    res.render('admin/dashboard', {
      stats,
      recentPosts: allPosts.slice(0, 5),
      user: { email: process.env.ADMIN_USERNAME || 'admin' },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('admin/dashboard', {
      stats: { totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalMessages: 0, totalProjects: 0 },
      recentPosts: [],
      user: { email: process.env.ADMIN_USERNAME || 'admin' },
    });
  }
});

// ── Posts list ──
router.get('/posts', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');

    const postsSnap = await db.collection('posts').orderBy('createdAt', 'desc').get();

    const posts = postsSnap.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        slug: data.slug,
        published: data.published || false,
        dateFormatted: createdAt.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        }),
      };
    });

    res.render('admin/posts', { posts });
  } catch (error) {
    console.error('Posts list error:', error);
    res.render('admin/posts', { posts: [] });
  }
});

// ── New post form ──
router.get('/posts/new', requireAuth, (req, res) => {
  res.render('admin/post-editor', { post: null });
});

// ── Edit post form ──
router.get('/posts/:id/edit', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const doc = await db.collection('posts').doc(req.params.id).get();

    if (!doc.exists) {
      return res.redirect('/admin/posts');
    }

    const data = doc.data();
    res.render('admin/post-editor', {
      post: {
        id: doc.id,
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        coverImage: data.coverImage || '',
        tags: data.tags || [],
        published: data.published || false,
      },
    });
  } catch (error) {
    console.error('Edit post error:', error);
    res.redirect('/admin/posts');
  }
});

// ── Create post (API) ──
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const { title, slug, excerpt, content, coverImage, published, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const finalSlug = slug || slugify(title, { lower: true, strict: true });

    // Check for duplicate slug
    const existing = await db.collection('posts').where('slug', '==', finalSlug).get();
    if (!existing.empty) {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }

    const postData = {
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      content,
      coverImage: coverImage || '',
      published: published || false,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('posts').add(postData);

    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ── Update post (API) ──
router.put('/posts/:id', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const { title, slug, excerpt, content, coverImage, published, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const finalSlug = slug || slugify(title, { lower: true, strict: true });

    // Check for duplicate slug (excluding current post)
    const existing = await db.collection('posts').where('slug', '==', finalSlug).get();
    const duplicateExists = existing.docs.some(doc => doc.id !== req.params.id);
    if (duplicateExists) {
      return res.status(400).json({ error: 'A post with this slug already exists' });
    }

    await db.collection('posts').doc(req.params.id).update({
      title,
      slug: finalSlug,
      excerpt: excerpt || '',
      content,
      coverImage: coverImage || '',
      published: published || false,
      tags: tags || [],
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// ── Delete post (API) ──
router.delete('/posts/:id', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    await db.collection('posts').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ── Projects list ──
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const snap = await db.collection('projects').orderBy('order', 'asc').get();
    const projects = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled',
        category: data.category || 'other',
        status: data.status || 'live',
        statusLabel: data.statusLabel || 'Live',
        published: data.published !== false,
      };
    });
    res.render('admin/projects', { projects });
  } catch (error) {
    console.error('Projects list error:', error);
    res.render('admin/projects', { projects: [] });
  }
});

// ── New project form ──
router.get('/projects/new', requireAuth, (req, res) => {
  res.render('admin/project-editor', { project: null });
});

// ── Edit project form ──
router.get('/projects/:id/edit', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const doc = await db.collection('projects').doc(req.params.id).get();
    if (!doc.exists) return res.redirect('/admin/projects');
    const data = doc.data();
    res.render('admin/project-editor', {
      project: {
        id: doc.id,
        title: data.title || '',
        category: data.category || 'saas',
        status: data.status || 'live',
        statusLabel: data.statusLabel || '● Live',
        description: data.description || '',
        projectType: data.projectType || '',
        stack: (data.stack || []).join(', '),
        imageUrl: data.imageUrl || '',
        liveLink: data.liveLink || '',
        githubLink: data.githubLink || '',
        metrics: data.metrics || [],
        order: data.order || 0,
        published: data.published !== false,
      },
    });
  } catch (error) {
    console.error('Edit project error:', error);
    res.redirect('/admin/projects');
  }
});

// ── Create project (API) ──
router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const { title, category, status, statusLabel, description, projectType, stack, imageUrl, liveLink, githubLink, metricsValues, metricsLabels, order, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const stackArr = stack ? stack.split(',').map(s => s.trim()).filter(Boolean) : [];
    const metricsArr = [];
    if (metricsValues) {
      const vals = Array.isArray(metricsValues) ? metricsValues : [metricsValues];
      const lbls = Array.isArray(metricsLabels) ? metricsLabels : [metricsLabels];
      vals.forEach((v, i) => { if (v) metricsArr.push({ value: v, label: lbls[i] || '' }); });
    }

    await db.collection('projects').add({
      title,
      category: category || 'saas',
      status: status || 'live',
      statusLabel: statusLabel || '● Live',
      description: description || '',
      projectType: projectType || '',
      stack: stackArr,
      imageUrl: imageUrl || '',
      liveLink: liveLink || '',
      githubLink: githubLink || '',
      metrics: metricsArr,
      order: parseInt(order) || 0,
      published: published === 'true' || published === true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ── Update project (API) ──
router.put('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const { title, category, status, statusLabel, description, projectType, stack, imageUrl, liveLink, githubLink, metricsValues, metricsLabels, order, published } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const stackArr = stack ? stack.split(',').map(s => s.trim()).filter(Boolean) : [];
    const metricsArr = [];
    if (metricsValues) {
      const vals = Array.isArray(metricsValues) ? metricsValues : [metricsValues];
      const lbls = Array.isArray(metricsLabels) ? metricsLabels : [metricsLabels];
      vals.forEach((v, i) => { if (v) metricsArr.push({ value: v, label: lbls[i] || '' }); });
    }

    await db.collection('projects').doc(req.params.id).update({
      title,
      category: category || 'saas',
      status: status || 'live',
      statusLabel: statusLabel || '● Live',
      description: description || '',
      projectType: projectType || '',
      stack: stackArr,
      imageUrl: imageUrl || '',
      liveLink: liveLink || '',
      githubLink: githubLink || '',
      metrics: metricsArr,
      order: parseInt(order) || 0,
      published: published === 'true' || published === true,
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// ── Delete project (API) ──
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    await db.collection('projects').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ── Messages list ──
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const messagesSnap = await db.collection('messages').orderBy('createdAt', 'desc').get();

    const messages = messagesSnap.docs.map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      return {
        id: doc.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        subject: data.subject || '',
        message: data.message || '',
        read: data.read || false,
        dateFormatted: createdAt.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
      };
    });

    res.render('admin/messages', { messages });
  } catch (error) {
    console.error('Messages list error:', error);
    res.render('admin/messages', { messages: [] });
  }
});

// ── Mark message as read (API) ──
router.put('/messages/:id/read', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    await db.collection('messages').doc(req.params.id).update({ read: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// ── Delete message (API) ──
router.delete('/messages/:id', requireAuth, async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    await db.collection('messages').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
