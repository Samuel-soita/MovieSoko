# CineHub — Movie Aggregator Platform

A **Netflix-style movie discovery platform** with a **holographic UI**, aggregating data from TMDB, OMDb, and Utelly. Automatically syncs new movies every 6 hours.

## Features

- Trending, Popular, New Releases, Upcoming movie rows
- Genre categories (Action, Comedy, Drama, Horror, Sci-Fi, Thriller)
- Holographic hover cards with iridescent borders + 3D tilt
- Hero banner with featured movie
- Movie detail page with trailer + "Where to Watch" links
- Search (database + live TMDB fallback)
- Watchlist (localStorage)
- Auto-sync via cron (every 6 hours)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| APIs | TMDB, OMDb, Utelly (RapidAPI) |
| Scheduler | node-cron |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI

### 2. Get API Keys

| API | Sign Up | Purpose |
|-----|---------|---------|
| **TMDB** (required) | https://www.themoviedb.org/settings/api | Movies, posters, trailers, genres |
| **OMDb** (optional) | http://www.omdbapi.com/apikey.aspx | IMDb ratings, awards |
| **Utelly** (optional) | https://rapidapi.com/utelly/api/utelly-tv-shows-and-movies-availability | Where to watch links |

### 3. Install and Configure

```bash
cd "C:\MY WORK\MOVIE WEBSITE"
npm install
copy .env.example .env
```

Edit `.env` and add your keys.

### 4. Run

```bash
npm start
```

Open http://localhost:3000

Manual sync:

```bash
npm run sync
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/movies/home` | All rows + featured movie |
| GET | `/api/movies/trending` | Trending movies |
| GET | `/api/movies/popular` | Popular movies |
| GET | `/api/movies/new` | New releases |
| GET | `/api/movies/upcoming` | Upcoming movies |
| GET | `/api/movies/genre/:genre` | Movies by genre |
| GET | `/api/movies/search?q=batman` | Search movies |
| GET | `/api/movies/:id` | Movie details + watch providers |

## Legal Notice

This platform does not host or stream movies. It aggregates publicly available metadata and links users to official streaming platforms.
