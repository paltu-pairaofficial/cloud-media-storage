# Cloud Media Storage

A full-stack cloud media storage application for uploading, organizing, previewing, searching, sharing, and managing files through a modern web interface.

The application uses a React + Vite frontend, a Node.js + Express backend, Supabase PostgreSQL for application data, and Supabase Storage for actual file storage.

---

## Overview

Cloud Media Storage is designed as a practical cloud-drive-style application.

It provides:

- User registration and login
- JWT-based authentication
- Protected API routes
- File upload and download
- File preview and streaming
- Folder creation and navigation
- Nested folders
- File and folder rename
- File and folder movement
- Starred files and folders
- Recent files and activity
- Search
- Trash and restoration
- Permanent deletion
- User-to-user sharing
- Public share links
- Optional link expiration
- Download permissions for public links
- Storage statistics
- Supabase PostgreSQL database
- Supabase Storage

---

# Features

## Authentication

- Register a new account
- Login with email and password
- JWT authentication
- Protected API routes
- Retrieve the current authenticated user
- Update user profile
- Demo login support

## File Management

- Upload files
- Upload progress tracking
- List files
- File metadata
- Download files
- Stream files
- Read text-file content
- Rename files
- Move files between folders
- Star/unstar files
- Move files to trash

## Folder Management

- Create folders
- Nested folders
- Folder tree
- Folder details
- Breadcrumb navigation
- Rename folders
- Move folders
- Star/unstar folders
- Delete folders

## Search and Organization

- Search files and folders
- Recent files
- Starred items
- Activity history
- Storage statistics
- Folder-based organization

## Trash

- View deleted files and folders
- Restore deleted items
- Permanently delete individual items
- Empty the trash

## Sharing

### User Sharing

Files and folders can be shared with another registered user.

Supported roles:

- Viewer
- Editor

### Public Link Sharing

The application can generate public links for files and folders.

Public links support:

- Viewer/editor roles
- Download permission
- Optional expiration
- Public resource preview
- Public file download

---

# Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- React DOM
- Lucide React
- Motion
- Tailwind CSS
- `@tailwindcss/vite`

## Backend

- Node.js
- Express.js
- TypeScript
- `tsx`
- Multer
- JWT
- bcryptjs
- CORS
- dotenv

## Database and Storage

- Supabase
- PostgreSQL
- Supabase JavaScript client
- Supabase Storage

## Build Tools

- Vite
- TypeScript
- esbuild
- npm

---

# Architecture

The primary application combines the React frontend and Express backend.

```text
Browser
   │
   ▼
React + Vite Frontend
   │
   │ /api/*
   ▼
Express Backend
   │
   ├── Authentication
   ├── File Management
   ├── Folder Management
   ├── Sharing
   ├── Trash
   ├── Search
   ├── Recent Activity
   └── Storage Statistics
   │
   ├──────────────► Supabase PostgreSQL
   │                  │
   │                  └── Users
   │                  └── Folders
   │                  └── Files Metadata
   │                  └── Shares
   │                  └── Public Links
   │                  └── Activities
   │
   └──────────────► Supabase Storage
                      │
                      └── Actual uploaded files