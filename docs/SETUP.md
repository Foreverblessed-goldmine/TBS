# TBS Project Management App - Setup Guide

## Prerequisites

- Node.js v18+ 
- npm v8+
- Git

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd "Danny's website"

# Install backend dependencies
cd backend
npm install

# Return to root
cd ..
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp env.example .env
```

Edit `.env` with your configuration:

```env
PORT=8080
JWT_ACCESS_SECRET=your_secure_access_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_secret_here
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
CORS_ORIGIN=http://localhost:3000
```

### 3. Deploy the Application

**Backend (Railway):**
- The backend is automatically deployed to Railway when you push to GitHub
- Backend API: https://tbs-production-9ec7.up.railway.app

**Frontend (Netlify):**
- The frontend is automatically deployed to Netlify when you push to GitHub
- Frontend: https://lucent-biscotti-9e0a64.netlify.app
- Portal: https://lucent-biscotti-9e0a64.netlify.app/portal/login.html

### 4. Access the Application

- **Live Application**: https://lucent-biscotti-9e0a64.netlify.app
- **Backend API**: https://tbs-production-9ec7.up.railway.app
- **Portal Login**: https://lucent-biscotti-9e0a64.netlify.app/portal/login.html

## Default Login Credentials

- **Email**: danny@tbs.local
- **Password**: password123

## Features Implemented

### ✅ Staff Management
- Create, read, update, delete staff members
- Role-based access control (admin, foreman, worker, contractor, labourer)
- Form validation and error handling

### ✅ Contractor Management
- Full CRUD operations for contractors
- Company information, contact details, ratings
- Insurance expiry tracking
- Trade categorization

### ✅ Project Details Modal
- Real project data display (no more "Unknown" placeholders)
- Tabbed interface: Overview, Tasks, Photos, Assignments
- Task management within projects
- Photo gallery with upload capability
- Assignment management

### ✅ Task Management System
- Complete task CRUD operations
- Priority levels (urgent, high, medium, low)
- Status tracking (todo, in_progress, blocked, done)
- Staff and contractor assignments
- Due date management

### ✅ Outstanding Tasks Panel
- Dashboard widget showing top 10 outstanding tasks
- Filtering by status and priority
- Quick actions (mark complete, view details)
- Real-time updates

### ✅ Calendar Integration
- Push tasks to calendar functionality
- Calendar events linked to tasks
- Full calendar view with FullCalendar.js
- Event management and updates

## Database Schema

The application uses SQLite with the following main tables:

- **Users**: Staff members with roles and authentication
- **Projects**: Construction projects with status tracking
- **Tasks**: Project tasks with assignments and due dates
- **Contractors**: External contractor information
- **CalendarEvents**: Calendar events linked to tasks
- **Assignments**: Task-to-user relationships
- **Photos**: Project photos with metadata

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/me` - Current user info

### Staff Management
- `GET /api/staff` - List staff members
- `POST /api/staff` - Create staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Contractor Management
- `GET /api/contractors` - List contractors
- `POST /api/contractors` - Create contractor
- `PUT /api/contractors/:id` - Update contractor
- `DELETE /api/contractors/:id` - Delete contractor

### Task Management
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/projects/:id/tasks` - Get project tasks

### Calendar Integration
- `GET /api/tasks/calendar/events` - Get calendar events
- `POST /api/tasks/calendar/events` - Create calendar event
- `POST /api/tasks/calendar/tasks/:id/push` - Push task to calendar

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if port 8080 is available
   - Verify Node.js version (v18+)
   - Check .env file exists and has valid values

2. **Frontend can't connect to backend**
   - Ensure backend is running on port 8080
   - Check CORS settings in backend
   - Verify API_BASE URL in frontend

3. **Database errors**
   - Delete `backend/tbs.sqlite` to reset database
   - Restart backend to recreate schema

4. **Authentication issues**
   - Clear browser localStorage
   - Check JWT secrets in .env file
   - Verify user exists in database

### Development Tips

- Use browser dev tools to debug API calls
- Check backend console for error logs
- Database is auto-created on first run
- Mock data is used when API is unavailable

## Production Deployment

For production deployment:

1. Set secure JWT secrets
2. Use a production database (PostgreSQL recommended)
3. Configure proper CORS origins
4. Set up SSL certificates
5. Use environment variables for all secrets
6. Enable proper logging and monitoring

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check browser console and backend logs
4. Verify all dependencies are installed correctly
