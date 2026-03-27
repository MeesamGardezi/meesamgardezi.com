const router = require('express').Router();

// ── Homepage ──
router.get('/', async (req, res) => {
  let dynamicProjects = [];
  try {
    const { db } = require('../firebase-config');
    const snap = await db.collection('projects').get();
    dynamicProjects = snap.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || '',
          category: d.category || 'saas',
          status: d.status || 'live',
          statusLabel: d.statusLabel || '● Live',
          description: d.description || '',
          projectType: d.projectType || '',
          stack: d.stack || [],
          imageUrl: d.imageUrl || '',
          liveLink: d.liveLink || '',
          githubLink: d.githubLink || '',
          metrics: d.metrics || [],
          order: d.order ?? 0,
          published: d.published !== false,
        };
      })
      .filter(p => p.published)
      .sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('Failed to load projects:', err);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Meesam Gardezi',
    url: res.locals.baseUrl,
    jobTitle: 'Flutter Developer & Full-Stack Engineer',
    description: 'Self-taught builder from Pakistan. Flutter Developer, Full-Stack Engineer, and SaaS Founder with 5+ years of experience.',
    knowsAbout: ['Flutter', 'Dart', 'Node.js', 'Firebase', 'Express.js', 'AI/LLM', 'SaaS'],
    sameAs: [
      'https://github.com/MeesamGardezi',
      'https://www.linkedin.com/in/meesamgardezi/',
    ],
  };

  res.render('index', {
    title: 'Meesam Gardezi — Flutter Developer • Full-Stack Engineer • SaaS Founder',
    description: 'I\'m Meesam — a 20-year-old self-taught builder from Pakistan. Flutter Developer, Full-Stack Engineer, and SaaS Founder. Many products launched, 2,500+ users.',
    structuredData,
    dynamicProjects,
  });
});

// ── Contact form submission ──
router.post('/contact', async (req, res) => {
  try {
    const { db } = require('../firebase-config');
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    await db.collection('messages').add({
      name,
      email,
      subject: subject || '',
      message,
      read: false,
      createdAt: new Date(),
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
