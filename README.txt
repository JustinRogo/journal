# Journal App

A personal **rich-text journal and sketchbook web app** built with **React, Vite, TailwindCSS, Tiptap, and Supabase**.

Users can create journal entries with formatted text, attach drawings, control entry visibility (public/private), and browse entries on a calendar.

The project is designed to feel like a **digital notebook / sketch journal** rather than a traditional blogging platform.

---

# Features

## Rich Text Journal Entries

The editor is powered by **Tiptap** and supports:

- Headings
- Numbered lists
- Bullet lists
- Blockquotes
- Links
- Undo / Redo
- Slash command formatting (`/`)

Each entry contains:

- Date & time
- Rich text content
- Optional drawing
- Public / private visibility

---

# Drawing Canvas

Entries may include an attached drawing created inside the app.

Supported features:

Brush presets:
- Pen
- Marker
- Paint
- Airbrush

Adjustable parameters:
- Color
- Opacity
- Softness
- Blend mode

Additional tools:

- Background color
- Eraser
- Canvas clearing
- Image export

Canvas size:

```
700 x 700 pixels
```

Drawings are stored as **PNG images in Supabase Storage**.

---

# Calendar View

The calendar displays:

- Monthly grid layout
- Number of entries per day
- Quick entry creation by clicking a date

Mobile automatically switches to a **card-based calendar layout**.

---

# Entry Menu

Each entry owned by the user contains an **ellipsis menu**:

```
⋯
Edit
Make Public / Make Private
Delete
```

Menu features:

- Click outside to close
- Escape key closes menu
- Mobile compatible

---

# Visibility Controls

Entries can be:

**Public**
- visible to all users

**Private**
- visible only to the author

Privacy is enforced through **Supabase Row Level Security (RLS)**.

---

# Authentication

Authentication is handled through **Supabase Auth**.

Users sign in using:

- Email
- Password

Session state is managed via the Supabase client.

---

# Technology Stack

## Frontend

- React
- Vite
- TailwindCSS
- Tiptap Rich Text Editor
- Lucide Icons

## Backend

Supabase provides:

- PostgreSQL database
- Authentication
- File storage
- Row Level Security

---

# Project Structure

```
journal-app
│
├─ src
│   ├─ App.jsx
│   ├─ main.jsx
│   └─ styles.css
│
├─ public
│
├─ package.json
└─ vite.config.js
```

Most application logic currently lives inside:

```
src/App.jsx
```

Major code sections include:

- authentication
- journal entry CRUD logic
- calendar rendering
- rich text editor configuration
- drawing canvas
- entry menu system

---

# Setup

## Clone the Repository

```
git clone <repository-url>
cd journal-app
```

---

## Install Dependencies

```
npm install
```

---

## Configure Environment Variables

Create a `.env` file in the project root.

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Start the Development Server

```
npm run dev
```

Open the app:

```
http://localhost:5173
```

---

# Supabase Setup

## Create the Database Table

```
create table public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  occurred_at timestamp not null,
  content text,
  image_path text,
  visibility text default 'public',
  created_at timestamp default now()
);
```

---

# Enable Row Level Security

```
alter table journal_entries enable row level security;
```

---

# Row Level Security Policies

## Read Policy

Users may read:

- public entries
- their own private entries

```
create policy "Read public or own private entries"
on journal_entries
for select
to anon, authenticated
using (
visibility = 'public'
or auth.uid() = user_id
);
```

---

## Insert Policy

```
create policy "Authenticated users can insert"
on journal_entries
for insert
to authenticated
with check (auth.uid() = user_id);
```

---

## Update Policy

```
create policy "Users update own entries"
on journal_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

## Delete Policy

```
create policy "Users delete own entries"
on journal_entries
for delete
to authenticated
using (auth.uid() = user_id);
```

---

# Storage Setup

Create a storage bucket:

```
journal-drawings
```

Images are stored with this structure:

```
{user_id}/{timestamp}.png
```

Example:

```
c293ad12-1f22/171234123123.png
```

When entries are edited or deleted, old drawing files are removed automatically.

---

# Entry Creation Flow

1. User clicks **+**
2. Entry modal opens
3. User enters:
   - date/time
   - journal text
   - optional drawing
   - visibility
4. User clicks **Post**

System actions:

```
Upload drawing → Supabase storage
Insert entry → database
Reload entries
```

---

# Entry Editing Flow

```
Open menu → Edit
Modify text/drawing
Save changes
Update database
Delete old drawing if replaced
```

---

# Entry Deletion Flow

```
Confirm deletion
Delete database row
Remove drawing from storage
Reload entries
```

---

# Mobile Layout

Mobile optimizations include:

- stacked layout
- scrollable drawing canvas
- simplified calendar
- larger tap targets

---

# Dark Mode

Dark mode is enabled by default.

Tailwind theme colors include:

```
stone-900
stone-800
stone-50
```

---

# Security

Security relies on:

- Supabase authentication
- Row Level Security
- Ownership validation

Private entries cannot be retrieved unless:

```
auth.uid() = user_id
```

---

# Future Improvements

Possible future features:

## UX

- entry permalinks
- search
- tagging system
- timeline view

## Editor

- markdown support
- inline images

## Drawing

- layers
- shape tools
- brush smoothing

## Performance

- pagination
- lazy loading
- virtualized entry lists

---

# Deployment

Recommended hosting platforms:

- Vercel
- Netlify
- Cloudflare Pages

Environment variables must be configured in the hosting environment.

---

# Summary

The Journal App combines:

- rich text journaling
- sketch drawing
- calendar organization
- privacy control

Using **React and Supabase**, it provides a serverless personal journaling platform with strong security and a polished writing experience.