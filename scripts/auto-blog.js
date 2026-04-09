/**
 * auto-blog.js
 * Generates a daily blog post using the Gemini API and saves it to Firestore.
 * Runs on a schedule from server.js, or manually via: node scripts/auto-blog.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const slugify = require('slugify');
const { db } = require('../firebase-config');

// Topic pool — rotated randomly each day
const TOPICS = [
  'Flutter state management: Riverpod vs BLoC — a practical comparison',
  'Building a SaaS MVP in 30 days as a solo developer',
  'Firebase Firestore tips every developer should know',
  'How to monetize your mobile app effectively',
  'Dart async/await patterns that will level up your Flutter code',
  'Deploying a Node.js app to production on a budget',
  'AI tools that supercharge developer productivity in 2025',
  'Building offline-first Flutter apps with local databases',
  'From idea to App Store: the indie developer roadmap',
  'Writing clean REST APIs with Express.js and Firebase',
  'How to grow an audience as a developer-founder',
  'Flutter animations: bring your UI to life with minimal code',
  'The mental side of building products solo',
  'Designing for dark mode: tips from a developer-designer',
  'How I structure my Node.js projects for scale',
  'Shipping fast without breaking things: a developer checklist',
  'Revenue tracking for indie SaaS developers',
  'The real cost of overengineering your early-stage product',
  'Using Gemini AI in Flutter apps for smart features',
  'Building a blog engine with Firebase and Node.js',
];

const GEMINI_PROMPT = (topic) => `
You are Meesam Gardezi — a Flutter developer, full-stack engineer, and indie SaaS founder. Write a detailed, personal blog post about:

"${topic}"

FORMAT RULES (follow exactly):
1. First, output a JSON block wrapped in ---JSON and ---END:
---JSON
{
  "title": "Catchy, specific post title",
  "excerpt": "One engaging sentence summarising the post (max 160 chars)",
  "tags": ["tag1", "tag2", "tag3"]
}
---END

2. After the JSON block, output the blog body as clean semantic HTML — NO <html>, <head>, or <body> tags.

Use these elements freely:
- <h2> and <h3> for section headings
- <p> for paragraphs
- <ul> / <ol> / <li> for lists
- <blockquote> for key insights or quotes
- <pre><code class="language-dart"> (or js/bash) for code examples
- <strong> and <em> for emphasis
- <hr> for visual breaks between major sections

WRITING STYLE:
- First person, personal and conversational
- 900–1200 words of HTML content
- At least one blockquote with a standout insight
- At least one practical code snippet if relevant
- End with a concrete takeaway or call-to-action paragraph
- Avoid filler phrases like "In conclusion" or "In this article"
`.trim();

async function generateAndPublish() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[auto-blog] GEMINI_API_KEY is not set. Add it to your .env file.');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
  });

  // Pick a topic — rotate by day of year so it doesn't repeat for ~20 days
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const topic = TOPICS[dayOfYear % TOPICS.length];

  console.log(`[auto-blog] Generating post for topic: "${topic}"`);

  let text;
  try {
    const result = await model.generateContent(GEMINI_PROMPT(topic));
    text = result.response.text();
  } catch (err) {
    console.error('[auto-blog] Gemini API error:', err.message);
    return;
  }

  // ── Parse JSON metadata block ──
  const jsonMatch = text.match(/---JSON\s*([\s\S]*?)\s*---END/);
  if (!jsonMatch) {
    console.error('[auto-blog] Could not find ---JSON...---END block in Gemini response.');
    console.error('[auto-blog] Raw response (first 500 chars):', text.slice(0, 500));
    return;
  }

  let meta;
  try {
    meta = JSON.parse(jsonMatch[1]);
  } catch (err) {
    console.error('[auto-blog] Failed to parse JSON metadata:', err.message);
    return;
  }

  if (!meta.title || !meta.excerpt) {
    console.error('[auto-blog] JSON metadata is missing title or excerpt.');
    return;
  }

  // ── Extract HTML body (everything after ---END) ──
  const htmlBody = text.replace(/[\s\S]*?---END/, '').trim();

  if (!htmlBody || htmlBody.length < 100) {
    console.error('[auto-blog] Generated HTML body is too short or empty.');
    return;
  }

  const slug = slugify(meta.title, { lower: true, strict: true });

  // ── Check for duplicate slug ──
  const existing = await db.collection('posts').where('slug', '==', slug).get();
  if (!existing.empty) {
    console.log(`[auto-blog] Post with slug "${slug}" already exists — skipping.`);
    return;
  }

  // ── Save to Firestore ──
  const postData = {
    title: meta.title,
    slug,
    excerpt: meta.excerpt,
    content: htmlBody,
    contentType: 'html',
    coverImage: '',
    published: true,
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 6) : [],
    autoGenerated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const docRef = await db.collection('posts').add(postData);
    console.log(`[auto-blog] Published: "${meta.title}" — ID: ${docRef.id} — Slug: /blog/${slug}`);
  } catch (err) {
    console.error('[auto-blog] Firestore write error:', err.message);
  }
}

// Allow running directly: node scripts/auto-blog.js
if (require.main === module) {
  generateAndPublish()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[auto-blog] Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = { generateAndPublish };
