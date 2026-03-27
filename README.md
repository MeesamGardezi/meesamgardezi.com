# meesamgardezi.com

Personal portfolio, blog, and admin panel — built with Node.js, Express, EJS, and Firebase.

## Stack

- **Server:** Node.js + Express
- **Templates:** EJS
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication (admin session cookies)
- **Styling:** Custom CSS (claymorphism design system)
- **Blog:** Markdown content, rendered with `marked`
- **SEO:** Structured data (JSON-LD), Open Graph, Twitter Cards, sitemap, robots.txt

## Project Structure

```
├── server.js                 # Express app entry point
├── firebase-config.js        # Firebase Admin SDK setup
├── middleware/
│   └── auth.js               # Session cookie auth middleware
├── routes/
│   ├── index.js              # Homepage + contact form
│   ├── blog.js               # Blog listing + individual posts
│   └── admin.js              # Admin panel (CRUD, auth, messages)
├── views/
│   ├── index.ejs             # Homepage
│   ├── blog.ejs              # Blog listing
│   ├── blog-post.ejs         # Single blog post
│   ├── 404.ejs               # Error page
│   ├── sitemap.ejs           # XML sitemap
│   ├── partials/
│   │   ├── head.ejs          # <head> with SEO meta tags
│   │   ├── nav.ejs           # Public navigation
│   │   ├── footer.ejs        # Public footer
│   │   └── admin-nav.ejs     # Admin sidebar nav
│   └── admin/
│       ├── login.ejs         # Admin login page
│       ├── dashboard.ejs     # Dashboard with stats
│       ├── posts.ejs         # Blog posts management
│       ├── post-editor.ejs   # Create/edit blog post
│       └── messages.ejs      # Contact form messages
├── public/
│   ├── css/
│   │   ├── styles.css        # Main portfolio styles
│   │   ├── blog.css          # Blog page styles
│   │   └── admin.css         # Admin panel styles
│   ├── js/
│   │   └── script.js         # 3D background, particles, interactions
│   └── images/
├── package.json
├── .env.example
└── .gitignore
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Cloud Firestore**
4. Create an admin user in Firebase Auth
5. Generate a **Service Account Key** (Project Settings → Service Accounts → Generate Key)

### 3. Environment Variables

```bash
cp .env.example .env
```

Fill in your Firebase credentials in `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
ADMIN_EMAILS=your@email.com
```

### 4. Firestore Indexes

Create a composite index for the `posts` collection:
- Collection: `posts`
- Fields: `published` (Ascending), `createdAt` (Descending)

### 5. Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Visit `http://localhost:3000` for the site, `http://localhost:3000/admin` for the admin panel.

## Routes

| Route | Description |
|---|---|
| `/` | Homepage (portfolio) |
| `/blog` | Blog listing |
| `/blog/:slug` | Individual blog post |
| `/admin/login` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/posts` | Manage blog posts |
| `/admin/posts/new` | Create new post |
| `/admin/messages` | View contact messages |
| `/sitemap.xml` | XML Sitemap |
| `/robots.txt` | Robots file |

## License

MIT
