# ClassDesk Design System & Screen Specifications (DESIGN.md)

## 1. Core Principles
1. **10-Minute Learnability**: A tuition center owner with no computer skills must understand any screen within 10 seconds.
2. **Mobile-First / Cheap Android Optimization**:
   - Primary viewport: 360px - 412px wide.
   - Touch targets must be at least **48px x 48px**.
   - No complex nested dropdowns or tiny tables. Use responsive card lists with high contrast.
   - Core actions must remain in the bottom "Thumb Zone" on mobile screens.
3. **High Contrast & Readability**:
   - Crisp text, `#0f172a` for primary headings, `#334155` for body text.
   - Backgrounds: `#f8fafc` (slate-50) or pure `#ffffff` for cards to ensure sharp visibility under sunlight.
4. **Instant Visual Feedback**:
   - Loading skeletons and spinners on all async actions (attendance submission, fee payment).
   - Clear status indicators with standard color semantics:
     - **Emerald / Green (`#059669`)**: Present, Paid, Passed, Published, Active.
     - **Rose / Red (`#e11d48`)**: Absent, Overdue / Unpaid, Failed.
     - **Amber / Orange (`#d97706`)**: Late, Partial Payment, Pending Approval.
     - **Indigo (`#4f46e5`)**: Primary actions, Brand navigation, Selected tabs.

---

## 2. Global Layout & Navigation

### Mobile (Default)
- **Top Bar (Sticky, 56px)**:
  - Left: Institute Logo (thumbnail) + Institute Name (truncated with ellipsis).
  - Center/Right: Multi-Child Switcher (for parents) OR Quick Notification Bell.
  - Right: Profile Avatar / Role Badge.
- **Bottom Navigation Bar (Sticky, 64px, z-50)**:
  - 4 to 5 icons with clear labels:
    - **Admin**: Dashboard, Classes, Fees, Attendance, More.
    - **Teacher**: Today, Attendance, Timetable, Notes, Announcements.
    - **Parent**: Home, Fees, Attendance, Notes, Exams.
- **Floating Action Button (FAB) or Primary Fixed Bottom Action**:
  - Prominent primary action button (e.g., "Take Attendance", "Record Fee", "Create Exam") anchored to the bottom right or full-width bottom bar.

### Desktop / Tablet ($\ge 1024px$)
- Left Sidebar (250px) with logo, active tenant indicator, navigation items, and user profile card.
- Main content centered with `max-w-6xl` padding.

---

## 3. Screen-by-Screen Specifications

### 3.1 Authentication Screen (`/login` & `/verify`)
- Single clean card: ClassDesk Logo + Friendly Greeting.
- **Step 1**: Phone number input with fixed `+91` prefix, numeric keypad (`inputMode="numeric"`).
- **Step 2**: 6-digit OTP boxes with auto-focus and 30-second resend timer.
- Demo Quick-Login chips (for testing/previewing Admin, Teacher, and Parent roles in 1 tap).

### 3.2 Dashboard (`/dashboard`)
- **Admin**: Quick stat cards (Total Students, Today's Attendance %, Pending Fees ₹, Active Teachers), "Quick Actions" row (Take Attendance, Collect Fee, Send Notice).
- **Teacher**: "Today's Schedule" card with current period badge, "Pending Attendance" reminder, quick student lookup.
- **Parent**: Selected Child banner with class and roll number, Today's attendance status pill, Next fee due countdown card with "Pay Now ₹" button, latest announcement highlight.

### 3.3 1-Tap Attendance Screen (`/attendance`)
- Header: Date picker (default today) + Class selector.
- Summary bar: `Present (X)` / `Absent (Y)` / `Late (Z)`.
- Quick action button: "Mark All Present" (1-tap).
- Student list items:
  - Large row with student photo/avatar, Roll No, Full Name.
  - Segmented toggle control: **P** (Green), **A** (Red), **L** (Yellow) with clear haptic-style visual active state.
- Save button: Large bottom bar "Save & Notify Parents" (triggers absent alert to parents).

### 3.4 Fee Management Screen (`/fees`)
- **Admin / Staff**:
  - Total Collected this month vs. Total Pending.
  - "Collect Cash / UPI" button opening quick receipt modal.
  - Pending Students list with search by name/roll and "Remind via WhatsApp/Push" button.
  - Receipt list with "Download Receipt PDF" action.
- **Parent**:
  - Current Due Card: Big ₹ amount, Due Date, Breakdown (Tuition ₹X, Exam ₹Y).
  - Primary button: "Pay Online ₹X" triggering Razorpay checkout.
  - Payment History accordion with instant downloadable PDF receipts.

### 3.5 Notes & Study Material (`/notes`)
- Subject tabs (Maths, Science, English, etc.).
- Resource cards: File type icon (PDF / Image / Video), Title, Upload Date, File size, Teacher name.
- Single tap to view inline or download.
- Floating "Upload Note" modal for teachers with file picker or link paste.

### 3.6 Announcements (`/announcements`)
- Broadcast card feed in reverse chronological order.
- Tags: `[All School]`, `[Class 10-A]`, or `[Exam Notice]`.
- Date timestamp in friendly relative time (e.g., "2 hours ago").
- Admin composer: Title, Message body, Target audience radio (All, Class), optional attachment.

### 3.7 Exams & Report Cards (`/exams`)
- Exam cards: Exam Name, Class, Dates, Status (Draft / Published).
- Marks Entry Matrix: Student rows, auto-total calculation as marks are typed.
- Report Card modal: Clean A4 preview with Institute Logo, student photo, subject table, Grade, Percentage, Rank, and "Print / Save PDF" button.

### 3.8 Settings & Notification Preferences (`/settings`)
- Active profile details and role badge.
- **Multi-Child Linkage** view for parents.
- **Notification Toggles**:
  - Absent alerts (Instant push).
  - Fee due & payment receipts.
  - New homework / notes.
  - Exam timetable & report cards.
- **Language Switcher**: English (Default), മലയാളം (Malayalam), हिन्दी (Hindi).
- Logout button with confirmation.
