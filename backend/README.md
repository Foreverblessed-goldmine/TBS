# TBS Backend

Node.js + Express + SQLite backend for Tighe Building Services team portal.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp env.example .env
```

3. Start development server:
```bash
npm run dev
```

The server will start on http://localhost:8080

## Default Users

The system creates these test users on first run:

- **Admin**: danny@tbs.local / password123
- **Foreman**: pat@tbs.local / password123  
- **Foreman**: adam@tbs.local / password123
- **Worker**: lee@tbs.local / password123
- **Contractor**: kai@tbs.local / password123

## API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/me` - Get current user
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project (admin only)
- `PATCH /api/projects/:id` - Update project (admin/foreman)

## Database

SQLite database file: `tbs.sqlite`

Tables:
- Users (admin, foreman, worker, contractor roles)
- RefreshTokens
- Projects
- Tasks
- Assignments
- Photos



