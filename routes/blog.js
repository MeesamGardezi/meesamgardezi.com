const router = require('express').Router();
const { marked } = require('marked');

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Helper: format Firestore post document for templates
 */
function formatPost(doc) {
  const data = doc.data();
  const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date();
  
  return {
    id: doc.id,
    title: data.title || 'Untitled',
    slug: data.slug,
    excerpt: data.excerpt || '',
    content: data.content || '',
    contentHtml: marked.parse(data.content || ''),
    coverImage: data.coverImage || null,
    tags: data.tags || [],
    published: data.published || false,
    readTime: Math.max(1, Math.ceil((data.content || '').split(/\s+/).length / 200)),
    dateFormatted: createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    dateISO: createdAt.toISOString(),
    createdAt,
  };
}

// ── Blog listing page ──
router.get('/', async (req, res) => {
  try {
    const { db } = require('../firebase-config');

    const postsSnap = await db.collection('posts')
      .where('published', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const posts = postsSnap.docs.map(formatPost);

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Meesam Gardezi Blog',
      description: 'Writing about Flutter, full-stack development, SaaS building, AI, and shipping products solo.',
      url: `${res.locals.baseUrl}/blog`,
      author: {
        '@type': 'Person',
        name: 'Meesam Gardezi',
      },
      blogPost: posts.map(p => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${res.locals.baseUrl}/blog/${p.slug}`,
        datePublished: p.dateISO,
      })),
    };

    res.render('blog', {
      title: 'Blog — Meesam Gardezi',
      description: 'Thoughts on Flutter, full-stack development, SaaS, AI, and building products solo.',
      ogType: 'blog',
      structuredData,
      posts,
    });
  } catch (error) {
    console.error('Blog listing error:', error);
    res.render('blog', {
      title: 'Blog — Meesam Gardezi',
      description: 'Thoughts on Flutter, full-stack development, SaaS, AI, and building products solo.',
      posts: [],
    });
  }
});

// ── Single blog post ──
router.get('/:slug', async (req, res) => {
  try {
    const { db } = require('../firebase-config');

    const postsSnap = await db.collection('posts')
      .where('slug', '==', req.params.slug)
      .where('published', '==', true)
      .limit(1)
      .get();

    if (postsSnap.empty) {
      return res.status(404).render('404', {
        title: '404 — Post Not Found | Meesam Gardezi',
        description: 'The blog post you are looking for does not exist.',
      });
    }

    const post = formatPost(postsSnap.docs[0]);

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${res.locals.baseUrl}/blog/${post.slug}`,
      datePublished: post.dateISO,
      dateModified: post.dateISO,
      author: {
        '@type': 'Person',
        name: 'Meesam Gardezi',
        url: res.locals.baseUrl,
      },
      publisher: {
        '@type': 'Person',
        name: 'Meesam Gardezi',
      },
      ...(post.coverImage && { image: post.coverImage }),
      keywords: post.tags.join(', '),
    };

    res.render('blog-post', {
      title: `${post.title} — Meesam Gardezi`,
      description: post.excerpt || `Read "${post.title}" by Meesam Gardezi`,
      ogType: 'article',
      ogImage: post.coverImage,
      structuredData,
      post,
    });
  } catch (error) {
    console.error('Blog post error:', error);
    res.status(500).render('404', {
      title: 'Error | Meesam Gardezi',
      description: 'Something went wrong loading this post.',
    });
  }
});

module.exports = router;
