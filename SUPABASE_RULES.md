# Supabase Database Rules for hafnr

**READ THIS FILE BEFORE MAKING ANY DATABASE CHANGES**

## Project Information
- **Supabase Project**: gsolvasxknipjjervfyp (dontaskalex's Project)
- **Shared With**: aftershow.io (production website)

## CRITICAL RULES

### 1. NEVER touch aftershow.io tables
The following tables belong to aftershow.io and must NEVER be modified, queried, or deleted:
- `Artist`
- `Album`
- `Event`
- `EventSong`
- `EventPageView`
- `Video`
- `Song`
- `SongFile`
- `SongCollaborator`
- `SongStatusHistory`
- `Folder`
- `Playlist`
- `PlaylistSong`
- `EmailSubscriber`
- `EmailCampaign`
- `EmailDelivery`
- `EmailSuppression`
- `ScheduledEmail`
- `ReleaseJourney`
- `JourneyStep`
- `SubscriptionHistory`
- `SeenVideo`
- `DetectedTag`
- `AdminAuditLog`
- `IpUpload`
- `SongRecognitionUsage`
- `AnalyticsCache`
- `HydralinkView`
- `Spotlight`
- `_prisma_migrations`

### 2. hafnr Table Naming Convention
All hafnr tables MUST be prefixed with `hafnr_`:
- `hafnr_brackets` - Bracket Battle tournament data
- (future tables follow same pattern)

### 3. NEVER Delete Without Permission
- Do NOT drop tables without explicit user permission
- Do NOT delete data without explicit user permission
- Do NOT run destructive migrations without explicit user permission

### 4. Before Any Database Changes
1. Read this file
2. Confirm you are only touching `hafnr_` prefixed tables
3. Ask for permission if unsure

## Current hafnr Tables

| Table | Purpose | Created |
|-------|---------|---------|
| (none currently) | | |

## Supabase Credentials (for hafnr code)
```javascript
const SUPABASE_URL = 'https://gsolvasxknipjjervfyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdzb2x2YXN4a25pcGpqZXJ2ZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MDAyNzAsImV4cCI6MjA3ODk3NjI3MH0.x6z6VDUcnP4_Jz2N1zAELKgpA-V6eGsSwdgSTOViMXM';
```
