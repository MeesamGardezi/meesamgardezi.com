// Demo data used when Firebase is not configured
const demoProjects = [
  {
    id: 'buildersolve',
    title: 'BuilderSolve',
    slug: 'buildersolve',
    category: 'saas',
    status: 'live',
    tagline: 'AI-powered construction management SaaS',
    description:
      'A full-stack SaaS platform for construction companies. Real-time project tracking, automated RFI/submittal workflows, and AI-generated reports. Built with Flutter, Firebase, and Node.js.',
    stack: ['Flutter', 'Firebase', 'Node.js', 'OpenAI'],
    metrics: '300+ active users',
    imageUrl: null,
    featured: true,
    order: 1,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'urboxai',
    title: 'URBox.ai',
    slug: 'urboxai',
    category: 'saas',
    status: 'live',
    tagline: 'Subscription box discovery platform',
    description:
      'A discovery and comparison platform for subscription boxes. Scraped 500+ boxes, built smart recommendation engine, and launched a clean consumer-facing UI.',
    stack: ['Next.js', 'Firebase', 'Python', 'OpenAI'],
    metrics: '1,200+ monthly visits',
    imageUrl: null,
    featured: true,
    order: 2,
    createdAt: new Date('2024-03-01'),
  },
  {
    id: 'contract-ai',
    title: 'AI Contract Redlining Agent',
    slug: 'contract-ai',
    category: 'client',
    status: 'delivered',
    tagline: 'Automated legal contract review with LLMs',
    description:
      'Built an agentic pipeline using GPT-4 to review, flag, and suggest redlines on legal contracts. Integrated with client's internal document workflow.',
    stack: ['Python', 'LangChain', 'GPT-4', 'FastAPI'],
    metrics: '80% review time saved',
    imageUrl: null,
    featured: true,
    order: 3,
    createdAt: new Date('2024-06-01'),
  },
  {
    id: 'befoods',
    title: 'BeFoods',
    slug: 'befoods',
    category: 'past',
    status: 'acquired',
    tagline: 'Food delivery app for Karachi',
    description:
      'Built from zero to 1,000+ registered users in 3 months. Full Flutter app with real-time order tracking, multi-restaurant support, and a custom admin dashboard.',
    stack: ['Flutter', 'Firebase', 'Node.js'],
    metrics: '1,000+ users',
    imageUrl: null,
    featured: false,
    order: 4,
    createdAt: new Date('2022-01-01'),
  },
  {
    id: 'bizzko',
    title: 'Bizzko',
    slug: 'bizzko',
    category: 'past',
    status: 'sunset',
    tagline: 'B2B marketplace for Pakistani SMEs',
    description:
      'A B2B commerce platform connecting small manufacturers with retailers. Built with Flutter and Firebase, grew to ~500 users before sunsetting.',
    stack: ['Flutter', 'Firebase'],
    metrics: '~500 users',
    imageUrl: null,
    featured: false,
    order: 5,
    createdAt: new Date('2022-06-01'),
  },
];

const demoPosts = [
  {
    id: 'why-i-build',
    title: 'Why I Build',
    slug: 'why-i-build',
    excerpt:
      'I started building software at 14 because I wanted to make something real. This is what I learned.',
    content: `# Why I Build

I started writing code at 14. Not because someone told me to — because I wanted to make something *real*.

The first thing I ever shipped was a terrible Flutter app that crashed constantly. But it was **mine**. And that feeling of building something from nothing, of seeing an idea become a thing people could touch — that hooked me permanently.

## The honest truth

Most developers I know build for the craft. I respect that. But I build because I'm impatient with the world. I look at broken workflows, clunky software, and unsolved problems, and I can't stop myself from thinking: *I could fix that in a weekend.*

## What building taught me

Building taught me how to think. Not just about code — about systems, about users, about what actually matters vs. what's just fun to engineer.

I've shipped apps that failed. Apps that got acquired. Apps that served thousands of users. Every single one made me sharper.

## Where I'm going

I'm not done. BuilderSolve is growing. URBox.ai is getting smarter. And there are 3 more ideas in my notes app that keep me up at night.

If you're reading this and you're also a builder — let's talk.`,
    tags: ['building', 'philosophy', 'startups'],
    published: true,
    imageUrl: null,
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
  {
    id: 'flutter-firebase-prod',
    title: 'Taking Flutter + Firebase to Production: What They Don\'t Tell You',
    slug: 'flutter-firebase-prod',
    excerpt:
      'After shipping 5 Flutter/Firebase apps, here are the things I wish someone had warned me about before going to production.',
    content: `# Taking Flutter + Firebase to Production

After shipping 5 Flutter/Firebase apps to real users, I've collected enough scars to write this.

## The things nobody warns you about

### 1. Firestore costs will surprise you
Firestore pricing is per read/write/delete. Sounds fine until your app gets traction and you realize you're reading the same documents 100 times in a session.

**Fix:** Aggressive client-side caching with \`GetOptions.cacheFirst\`. Use streams wisely.

### 2. Firebase Auth tokens expire, and you will handle this badly
Your app will silently fail for logged-in users after an hour if you don't handle token refresh properly.

**Fix:** Listen to \`authStateChanges()\` everywhere you make authenticated requests.

### 3. Security Rules are an afterthought — until they're not
I've seen apps go live with \`allow read, write: if true;\`. One Reddit post later, someone's entire database is deleted.

**Fix:** Write security rules before you write business logic. Non-negotiable.

## What actually works great

- **Flutter Web** for admin dashboards — it's underrated
- **Firebase Functions** for heavy async tasks
- **Firestore offline persistence** — genuinely magic for mobile

## The bottom line

Flutter + Firebase is legitimately one of the best stacks for a solo developer who wants to move fast. Just go in with eyes open.`,
    tags: ['flutter', 'firebase', 'engineering', 'production'],
    published: true,
    imageUrl: null,
    createdAt: new Date('2024-08-15'),
    updatedAt: new Date('2024-08-15'),
  },
];

module.exports = { demoProjects, demoPosts };
