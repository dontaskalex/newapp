# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**hafnr** is a personal portfolio of browser-based games, tools, and interactive experiments. The site serves as a collection of fun, lightweight web applications—ranging from simulations and productivity tools to casual mini-games. All projects are built with vanilla HTML, CSS, and JavaScript with no frameworks, emphasizing simplicity and instant playability directly in the browser.

## Development Commands

```bash
npm run dev    # Start live-server for local development
```

No build step required - all apps are static HTML files deployed directly to Vercel.

## Architecture

**hafnr** is a multi-game web application hub. Each game/tool is a self-contained HTML5 application with embedded CSS and JavaScript (no external frameworks).

### Project Structure

- `index.html` - Main hub/landing page linking to all games
- `ant-colony/` - Real-time ant colony simulation (most complex, ~350KB)
- `lobby/` - Social hub with chat and emotes (lobby.js contains logic)
- `dice/`, `hostile-takeover/`, `speed-reader/`, `pomodoro/`, `wheel/` - Standalone mini-games

### Key Patterns

- **Monolithic HTML files**: Each game is a single `index.html` with all CSS/JS embedded
- **No dependencies**: Games use vanilla JS, only external resources are Google Fonts
- **CSS variables for theming**: Each app defines its own `--bg`, `--text`, `--accent` etc.

## New Subpage Checklist (REQUIRED)

When creating a new subpage, ALL of the following must be included:

### 1. Google Analytics (in `<head>`, first thing after `<head>`)
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-D19M0488B7"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-D19M0488B7');</script>
```

### 2. Favicon (inlined data URI, in `<head>`)
```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%230f0f0f'/><text x='4' y='26' font-family='Arial' font-size='26' font-weight='bold' fill='%23fff'>h</text><circle cx='26' cy='24' r='3' fill='%23fff'/></svg>">
```

### 3. Header with back link (in `<body>`)
```html
<header>
    <a href="../" class="logo">PAGE NAME</a>
    <a href="../" class="back-link">← Back to Hub</a>
</header>
```

### 4. Add to main hub
After creating a new subpage, **always add a project card** to the main `index.html` so it appears in the hub overview.

### 5. Google Adsense (optional but recommended)
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7723236991764317"
    crossorigin="anonymous"></script>
```

## Supabase Database Rules (CRITICAL)

This project shares a Supabase instance with aftershow.io (production site).

**NEVER touch these tables** (they belong to aftershow.io):
`Artist`, `Album`, `Event`, `Song`, `Video`, `Playlist`, `EmailSubscriber`, `_prisma_migrations`, and others listed in SUPABASE_RULES.md

**All hafnr tables MUST be prefixed with `hafnr_`** (e.g., `hafnr_brackets`)

**NEVER delete tables or data without explicit permission.**

Read `SUPABASE_RULES.md` before any database work.

## Parallel Development

Use `/split` to divide large tasks across 3 parallel coding agents (coder1, coder2, coder3). Each coder works on different files to avoid conflicts. See `.claude/skills/split.md` for details.

## Active Development

The ant-colony game has an active feature roadmap in `ant-colony/FOOD_REWORK_PLAN.md` documenting the food system rework with leveling, zones, and harvest cycles.
