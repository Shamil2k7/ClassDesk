# ClassDesk - Multi-Tenant School & Tuition SaaS Platform

A multi-tenant SaaS web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL with Row Level Security)**, specifically optimized for schools and tuition centers in India.

---

## 🚀 Key Architectural Features

1. **Strict Multi-Tenancy with Row Level Security (RLS)**:
   - Every table contains an `institute_id` foreign key.
   - 18 database tables with complete PostgreSQL Row Level Security policies ensuring strict tenant data isolation.
   - Non-recursive `SECURITY DEFINER` helper functions (`current_user_institute_id()`, `current_user_phone()`, `get_parent_student_ids()`).
2. **Indian Phone OTP & Multi-Child Switcher**:
   - Single mobile number login for parents.
   - Automatic parent-student linking (`parent_phone`).
   - 1-tap **Child Switcher** in the top navigation allowing parents to toggle between multiple enrolled children across different classes or institutes.
3. **1-Tap Daily Attendance Matrix**:
   - Teachers mark the entire class on one screen with "Mark All Present" default.
   - Segmented 1-tap toggles (`P` / `A` / `L`).
   - Automated absent alerts dispatched to parents.
   - Monthly attendance percentage tracking.
4. **School Fee Engine & Server-Verified Razorpay Webhooks**:
   - Support for cash/manual payments with instant sequential receipt numbering.
   - Downloadable official PDF fee receipts.
   - Razorpay online payment integration confirmed **exclusively through cryptographic HMAC-SHA256 server webhooks** (`/api/webhooks/razorpay`) with idempotency.
5. **Examinations, Automatic Grading & Report Card PDFs**:
   - Rapid marks entry grid with automatic calculation of total marks, percentages, grades (CBSE/State Board), and class ranks.
   - 1-click printable PDF Report Cards featuring institute branding and signature lines.
6. **Mobile-First PWA & Firebase Cloud Messaging (FCM)**:
   - Installable Progressive Web App (`manifest.json`, `sw.js`).
   - Push notifications for absent alerts, fee dues, announcements, and notes with user-level opt-in/opt-out preferences.
   - Lightweight bundle (~103 kB First Load JS) tailored for budget Android smartphones.
7. **Internationalization (i18n)**:
   - Ready for multilingual adoption with complete dictionary files:
     - 🇬🇧 English (`src/messages/en.json`)
     - 🇮🇳 Malayalam - മലയാളം (`src/messages/ml.json`)
     - 🇮🇳 Hindi - हिन्दी (`src/messages/hi.json`)

---

## 📂 Project Structure

```
classdesk/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Custom service worker
│   └── firebase-messaging-sw.js   # FCM background worker
├── src/
│   ├── app/
│   │   ├── (api)/webhooks/razorpay/ # Server-only Razorpay HMAC webhook
│   │   ├── attendance/            # 1-Tap Attendance roll call
│   │   ├── fees/                  # Fee dues, cash entry & Razorpay pay
│   │   ├── exams/                 # Exams, marks & PDF report cards
│   │   ├── notes/                 # Study material & PDF manager
│   │   ├── announcements/         # Targeted broadcasts
│   │   ├── timetable/             # Weekly period schedules
│   │   ├── classes/               # Classes & batch management
│   │   ├── students/              # Student roster & parent linking
│   │   ├── teachers/              # Teacher roster
│   │   ├── settings/              # Granular notification toggles & i18n
│   │   ├── institutes/            # Super Admin tenant management
│   │   ├── login/                 # Phone OTP & role quick demo
│   │   ├── dashboard/             # Role-adaptive dashboard
│   │   └── layout.tsx             # Root layout with TopBar & BottomNav
│   ├── components/
│   │   ├── common/
│   │   │   ├── top-bar.tsx        # Tenant branding & Child Switcher
│   │   │   ├── bottom-nav.tsx     # Mobile thumb-zone bottom navigation
│   │   │   ├── desktop-sidebar.tsx# Desktop navigation sidebar
│   │   │   └── child-switcher.tsx # Instant multi-child switcher
│   │   └── pwa/
│   │       └── pwa-install-prompt.tsx
│   ├── lib/
│   │   ├── auth-context.tsx       # Auth session & demo role switching
│   │   ├── i18n/context.tsx       # Multilingual context & hook
│   │   ├── pdf-generator.ts       # jsPDF Fee receipts & Report cards
│   │   ├── razorpay/server.ts     # HMAC-SHA256 signature verification
│   │   ├── fcm/server.ts          # FCM notification dispatcher
│   │   ├── mock-data.ts           # Realistic Indian school dataset
│   │   └── supabase/              # Browser, server, admin Supabase clients
│   └── messages/                  # en.json, ml.json, hi.json
├── supabase/
│   ├── schema.sql                 # Production SQL DDL with RLS policies
│   └── seed.sql                   # Realistic sample seed data
├── DESIGN.md                      # UI/UX design specifications
└── .env.example                   # Environment configuration template
```

---

## 🛠️ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Setup Database (Supabase)
Run `supabase/schema.sql` in the Supabase SQL Editor, followed by `supabase/seed.sql`.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎭 Interactive Demo Profiles

You can immediately test all 4 user roles using the **Role Switcher** pill in the top header:
1. **Parent (2 Children Linked)**: Demonstrates the **Child Switcher** between *Rahul Sharma* (Class 10) and *Ananya Sharma* (Class 8), online fee payment via Razorpay, and downloadable receipts and report cards.
2. **Teacher (Maths)**: Demonstrates the 1-Tap Attendance sheet, timetable, note uploads, and marks entry.
3. **School Principal / Admin**: Demonstrates institute-level fee collection, class roster, student directory, and manual cash receipt generation.
4. **Super Admin**: Demonstrates multi-institute management across Kerala and other states.
