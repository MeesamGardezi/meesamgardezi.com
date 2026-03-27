const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const slugify = require('slugify');
const { getDb, getBucket, isInitialized } = require('../config/firebase');
const { requireAdmin } = require('../middleware/auth');
const { demoProjects, demoPosts } = require('../config/demo-data');

// Local upload storage (used when Firebase Storage not configured)
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(file.mimetype));
  },
});

// ─── Auth ────────────────────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('pages/admin/login', {
    title: 'Admin Login',
    description: 'Admin panel',
    canonical: `${res.locals.siteUrl}/admin/login`,
    error: null,
    page: 'admin',
  });
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    const returnTo = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    return res.redirect(returnTo);
  }
  res.render('pages/admin/login', {
    title: 'Admin Login',
    description: 'Admin panel',
    canonical: `${res.locals.siteUrl}/admin/login`,
    error: 'Wrong password, fam.',
    page: 'admin',
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// All routes below require admin
router.use(requireAdmin);

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  let projects = demoProjects;
  let posts = demoPosts;

  if (isInitialized()) {
    try {
      const db = getDb();
      const [projSnap, postSnap] = await Promise.all([
        db.collection('projects').orderBy('order').get(),
        db.collection('posts').orderBy('createdAt', 'desc').get(),
      ]);
      if (!projSnap.empty) projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!postSnap.empty) posts = postSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('Admin dashboard error:', e.message);
    }
  }

  res.render('pages/admin/dashboard', {
    title: 'Admin Dashboard',
    description: '',
    canonical: `${res.locals.siteUrl}/admin`,
    projects,
    posts,
    firebaseActive: isInitialized(),
    page: 'admin',
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

router.get('/projects/new', (req, res) => {
  res.render('pages/admin/project-form', {
    title: 'New Project',
    description: '',
    canonical: `${res.locals.siteUrl}/admin`,
    project: null,
    error: null,
    page: 'admin',
  });
});

router.post('/projects', upload.single('image'), async (req, res) => {
  const { title, tagline, description, category, status, stack, metrics, featured, order } =
    req.body;

  const slug = slugify(title, { lower: true, strict: true });
  let imageUrl = null;

  if (req.file) {
    if (isInitialized()) {
      // Upload to Firebase Storage
      try {
        const bucket = getBucket();
        const dest = `projects/${Date.now()}-${req.file.filename}`;
        await bucket.upload(req.file.path, {
          destination: dest,
          metadata: { contentType: req.file.mimetype },
        });
        const [url] = await bucket.file(dest).getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        imageUrl = url;
      } catch (e) {
        console.error('Storage upload error:', e.message);
        imageUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      imageUrl = `/uploads/${req.file.filename}`;
    }
  }

  const projectData = {
    title,
    slug,
    tagline,
    description,
    category,
    status,
    stack: stack ? stack.split(',').map((s) => s.trim()) : [],
    metrics,
    featured: featured === 'on',
    order: parseInt(order) || 99,
    imageUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isInitialized()) {
    try {
      await getDb().collection('projects').add(projectData);
    } catch (e) {
      console.error('Firestore write error:', e.message);
    }
  } else {
    demoProjects.push({ id: slug, ...projectData });
  }

  res.redirect('/admin?success=project-created');
});

router.get('/projects/:id/edit', async (req, res) => {
  let project = demoProjects.find((p) => p.id === req.params.id);

  if (isInitialized()) {
    try {
      const doc = await getDb().collection('projects').doc(req.params.id).get();
      if (doc.exists) project = { id: doc.id, ...doc.data() };
    } catch (e) {
      console.error(e.message);
    }
  }

  if (!project) return res.redirect('/admin');

  res.render('pages/admin/project-form', {
    title: `Edit: ${project.title}`,
    description: '',
    canonical: `${res.locals.siteUrl}/admin`,
    project,
    error: null,
    page: 'admin',
  });
});

router.post('/projects/:id', upload.single('image'), async (req, res) => {
  const { title, tagline, description, category, status, stack, metrics, featured, order } =
    req.body;
  const slug = slugify(title, { lower: true, strict: true });

  let imageUrl = req.body.existingImage || null;

  if (req.file) {
    if (isInitialized()) {
      try {
        const bucket = getBucket();
        const dest = `projects/${Date.now()}-${req.file.filename}`;
        await bucket.upload(req.file.path, { destination: dest, metadata: { contentType: req.file.mimetype } });
        const [url] = await bucket.file(dest).getSignedUrl({ action: 'read', expires: '03-09-2491' });
        imageUrl = url;
      } catch (e) {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      imageUrl = `/uploads/${req.file.filename}`;
    }
  }

  const updated = {
    title, slug, tagline, description, category, status,
    stack: stack ? stack.split(',').map((s) => s.trim()) : [],
    metrics, featured: featured === 'on',
    order: parseInt(order) || 99,
    imageUrl, updatedAt: new Date(),
  };

  if (isInitialized()) {
    try {
      await getDb().collection('projects').doc(req.params.id).update(updated);
    } catch (e) {
      console.error(e.message);
    }
  } else {
    const idx = demoProjects.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) demoProjects[idx] = { ...demoProjects[idx], ...updated };
  }

  res.redirect('/admin?success=project-updated');
});

router.post('/projects/:id/delete', async (req, res) => {
  if (isInitialized()) {
    try {
      await getDb().collection('projects').doc(req.params.id).delete();
    } catch (e) {
      console.error(e.message);
    }
  } else {
    const idx = demoProjects.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) demoProjects.splice(idx, 1);
  }
  res.redirect('/admin?success=project-deleted');
});

// ─── Blog Posts ───────────────────────────────────────────────────────────────

router.get('/posts/new', (req, res) => {
  res.render('pages/admin/post-form', {
    title: 'New Post',
    description: '',
    canonical: `${res.locals.siteUrl}/admin`,
    post: null,
    error: null,
    page: 'admin',
  });
});

router.post('/posts', upload.single('image'), async (req, res) => {
  const { title, excerpt, content, tags, published } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  let imageUrl = null;

  if (req.file) {
    if (isInitialized()) {
      try {
        const bucket = getBucket();
        const dest = `blog/${Date.now()}-${req.file.filename}`;
        await bucket.upload(req.file.path, { destination: dest, metadata: { contentType: req.file.mimetype } });
        const [url] = await bucket.file(dest).getSignedUrl({ action: 'read', expires: '03-09-2491' });
        imageUrl = url;
      } catch (e) {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      imageUrl = `/uploads/${req.file.filename}`;
    }
  }

  const postData = {
    title, slug, excerpt, content,
    tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    published: published === 'on',
    imageUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (isInitialized()) {
    try {
      await getDb().collection('posts').add(postData);
    } catch (e) {
      console.error(e.message);
    }
  } else {
    demoPosts.push({ id: slug, ...postData });
  }

  res.redirect('/admin?success=post-created');
});

router.get('/posts/:id/edit', async (req, res) => {
  let post = demoPosts.find((p) => p.id === req.params.id);

  if (isInitialized()) {
    try {
      const doc = await getDb().collection('posts').doc(req.params.id).get();
      if (doc.exists) post = { id: doc.id, ...doc.data() };
    } catch (e) {
      console.error(e.message);
    }
  }

  if (!post) return res.redirect('/admin');

  res.render('pages/admin/post-form', {
    title: `Edit: ${post.title}`,
    description: '',
    canonical: `${res.locals.siteUrl}/admin`,
    post,
    error: null,
    page: 'admin',
  });
});

router.post('/posts/:id', upload.single('image'), async (req, res) => {
  const { title, excerpt, content, tags, published } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  let imageUrl = req.body.existingImage || null;

  if (req.file) {
    if (isInitialized()) {
      try {
        const bucket = getBucket();
        const dest = `blog/${Date.now()}-${req.file.filename}`;
        await bucket.upload(req.file.path, { destination: dest, metadata: { contentType: req.file.mimetype } });
        const [url] = await bucket.file(dest).getSignedUrl({ action: 'read', expires: '03-09-2491' });
        imageUrl = url;
      } catch (e) {
        imageUrl = `/uploads/${req.file.filename}`;
      }
    } else {
      imageUrl = `/uploads/${req.file.filename}`;
    }
  }

  const updated = {
    title, slug, excerpt, content,
    tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    published: published === 'on',
    imageUrl, updatedAt: new Date(),
  };

  if (isInitialized()) {
    try {
      await getDb().collection('posts').doc(req.params.id).update(updated);
    } catch (e) {
      console.error(e.message);
    }
  } else {
    const idx = demoPosts.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) demoPosts[idx] = { ...demoPosts[idx], ...updated };
  }

  res.redirect('/admin?success=post-updated');
});

router.post('/posts/:id/delete', async (req, res) => {
  if (isInitialized()) {
    try {
      await getDb().collection('posts').doc(req.params.id).delete();
    } catch (e) {
      console.error(e.message);
    }
  } else {
    const idx = demoPosts.findIndex((p) => p.id === req.params.id);
    if (idx !== -1) demoPosts.splice(idx, 1);
  }
  res.redirect('/admin?success=post-deleted');
});

module.exports = router;
