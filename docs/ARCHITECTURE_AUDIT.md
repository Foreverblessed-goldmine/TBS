# TBS Project Management App - Architecture Audit

## Executive Summary

The TBS Project Management App is a full-stack web application built for construction project management. The application features a modern frontend with a dark theme, comprehensive backend API, and SQLite database. All major functionality has been implemented and tested.

## Technology Stack

### Frontend
- **Framework**: Vanilla JavaScript (ES6+ modules)
- **UI Library**: Custom component system with modal.js
- **Calendar**: FullCalendar.js v6.1.15
- **Styling**: Custom CSS with dark theme
- **Build Tool**: None (served directly)
- **Server**: Node.js static file server

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js v4.18.2
- **Database**: SQLite3 with Knex.js ORM
- **Authentication**: JWT (jsonwebtoken v9.0.2)
- **Password Hashing**: bcryptjs v2.4.3
- **Validation**: Zod v3.22.4
- **Security**: Helmet v7.1.0, CORS v2.8.5
- **Logging**: Morgan v1.10.0
- **File Uploads**: Multer v1.4.5-lts.1

### Development Tools
- **Package Manager**: npm
- **Database Migrations**: Knex.js migrations
- **Environment**: dotenv v16.3.1

## Data Models

### Core Entities

#### Users (Staff)
```javascript
{
  id: integer (PK)
  name: string (required)
  email: string (unique, required)
  password: string (hashed, required)
  role: enum('admin', 'foreman', 'worker', 'contractor', 'labourer')
  created_at: timestamp
  updated_at: timestamp
}
```

#### Projects
```javascript
{
  id: integer (PK)
  ref: string (unique, required)
  name: string (required)
  address: string (required)
  client: string (required)
  phase: enum('planning', 'active', 'completed', 'on_hold')
  status: enum('on_track', 'delayed', 'at_risk')
  start_date: date
  end_date: date
  progress: integer (0-100)
  notes: text
  created_at: timestamp
  updated_at: timestamp
}
```

#### Tasks
```javascript
{
  id: integer (PK)
  project_id: integer (FK to Projects)
  title: string (required)
  description: text
  status: enum('todo', 'in_progress', 'blocked', 'done')
  priority: enum('low', 'medium', 'high', 'urgent')
  assignee_staff_id: integer (FK to Users, nullable)
  assignee_contractor_id: integer (FK to Contractors, nullable)
  due_date: datetime
  start_date: datetime
  end_date: datetime
  created_at: timestamp
  updated_at: timestamp
}
```

#### Contractors
```javascript
{
  id: integer (PK)
  company: string (required)
  trade: string (required)
  contact_name: string (required)
  phone: string (required)
  email: string (required)
  rating: decimal(2,1) (1-5, nullable)
  insurance_expiry: date (nullable)
  notes: text (nullable)
  status: enum('active', 'inactive')
  created_at: timestamp
}
```

#### CalendarEvents
```javascript
{
  id: integer (PK)
  task_id: integer (FK to Tasks)
  project_id: integer (FK to Projects)
  title: string (required)
  start: datetime (required)
  end: datetime
  description: text
  location: string
  event_type: enum('task', 'meeting', 'deadline', 'milestone')
  all_day: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

### Relationships
- Projects → Tasks (1:many)
- Users → Tasks (1:many, via assignee_staff_id)
- Contractors → Tasks (1:many, via assignee_contractor_id)
- Tasks → CalendarEvents (1:1)
- Projects → CalendarEvents (1:many)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/refresh` - Refresh JWT access token
- `GET /api/me` - Get current user information

### Staff Management
- `GET /api/staff` - List all staff members
- `POST /api/staff` - Create new staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member

### Contractor Management
- `GET /api/contractors` - List all contractors
- `POST /api/contractors` - Create new contractor
- `PUT /api/contractors/:id` - Update contractor
- `DELETE /api/contractors/:id` - Delete contractor

### Project Management
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:id` - Update project
- `GET /api/projects/:id` - Get project details

### Task Management
- `GET /api/tasks` - List tasks (with filters)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/projects/:id/tasks` - Get project tasks

### Calendar Integration
- `GET /api/tasks/calendar/events` - Get calendar events
- `POST /api/tasks/calendar/tasks/:id/push` - Push task to calendar

## Security Implementation

### Authentication
- JWT-based authentication with access and refresh tokens
- Access tokens expire in 15 minutes (configurable)
- Refresh tokens expire in 7 days (configurable)
- Passwords hashed with bcryptjs (10 rounds)

### Authorization
- Role-based access control (RBAC)
- Middleware: `bearer()` for authentication, `allow()` for authorization
- Roles: admin, foreman, worker, contractor, labourer
- Permission matrix implemented in `portal/lib/rbac.js`

### Security Headers
- Helmet.js for security headers
- CORS configured for specific origins
- Input validation with Zod schemas
- SQL injection protection via Knex.js parameterized queries

## Environment Configuration

### Required Environment Variables
```env
PORT=8080
JWT_ACCESS_SECRET=your_secure_access_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_secret_here
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
CORS_ORIGIN=http://localhost:3000
```

### Database Configuration
- SQLite3 database file: `backend/tbs.sqlite`
- Auto-created on first run
- Schema managed via Knex.js migrations
- Bootstrap script creates initial admin user

## Frontend Architecture

### Component System
- **Modal Component**: Reusable modal system (`portal/components/modal.js`)
- **Project Details**: Complex modal with tabs (`portal/components/projectDetails.js`)
- **API Helper**: Centralized API calls (`portal/lib/api.js`)
- **RBAC Helper**: Role-based access control (`portal/lib/rbac.js`)

### Page Structure
- **Dashboard**: Main overview with metrics and outstanding tasks
- **Staff**: Staff management with CRUD operations
- **Contractors**: Contractor management with ratings and insurance tracking
- **Projects**: Project listing with detailed modal views
- **Calendar**: Full calendar view with task integration
- **Finance**: Financial tracking (mock data)
- **Warehouse**: Inventory management (mock data)

### State Management
- Local storage for authentication tokens
- In-memory state for current user and permissions
- API-driven data fetching with error handling
- Optimistic UI updates with rollback on failure

## Database Schema Details

### Indexes
- Users.email (unique)
- Projects.ref (unique)
- Contractors.company + contact_name (unique composite)
- Tasks.project_id (foreign key)
- Tasks.assignee_staff_id (foreign key)
- Tasks.assignee_contractor_id (foreign key)
- CalendarEvents.task_id (foreign key)

### Constraints
- Foreign key constraints with CASCADE/SET NULL
- Unique constraints on email addresses and project references
- Check constraints on enum values
- Not null constraints on required fields

## Error Handling

### Backend Error Handling
- Centralized error middleware
- Consistent error response format: `{ ok: false, code, message, fieldErrors? }`
- HTTP status codes: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- Database constraint error handling
- JWT token validation errors

### Frontend Error Handling
- API response validation
- User-friendly error messages
- Form validation with inline feedback
- Network error handling with retry options
- Graceful degradation for missing data

## Performance Considerations

### Backend
- SQLite database with proper indexing
- Knex.js query optimization
- JWT token caching
- Morgan logging for request monitoring

### Frontend
- Lazy loading of modal components
- Efficient DOM updates
- Debounced search inputs
- Optimistic UI updates

## Testing Strategy

### Current Testing
- Manual testing of all CRUD operations
- API endpoint validation
- Form submission testing
- Error scenario testing

### Recommended Testing
- Unit tests for API handlers
- Integration tests for database operations
- Frontend component testing
- End-to-end testing for critical flows

## Deployment Architecture

### Development
- Backend: `npm run dev` (port 8080)
- Frontend: `node server.js` (port 3000)
- Database: SQLite file

### Production Recommendations
- Backend: PM2 or similar process manager
- Database: PostgreSQL for production
- Reverse proxy: Nginx
- SSL: Let's Encrypt certificates
- Monitoring: Application performance monitoring

## Known Issues and Limitations

### Current Limitations
1. SQLite database not suitable for high-concurrency production
2. No file upload validation for photos
3. Mock data used for finance and warehouse modules
4. No real-time updates (WebSocket implementation needed)
5. Limited error logging and monitoring

### Technical Debt
1. Some hardcoded values that should be configurable
2. Limited input sanitization beyond Zod validation
3. No rate limiting on API endpoints
4. No database backup strategy
5. Limited test coverage

## Future Enhancements

### Recommended Improvements
1. **Database Migration**: Move to PostgreSQL for production
2. **Real-time Updates**: Implement WebSocket for live updates
3. **File Storage**: Implement proper file upload with S3/cloud storage
4. **Testing**: Add comprehensive test suite
5. **Monitoring**: Implement application monitoring and logging
6. **Caching**: Add Redis for session and data caching
7. **API Versioning**: Implement API versioning strategy
8. **Documentation**: Add OpenAPI/Swagger documentation

### Feature Enhancements
1. **Notifications**: Email/SMS notifications for task assignments
2. **Reporting**: Advanced reporting and analytics
3. **Mobile App**: React Native or PWA implementation
4. **Integration**: Third-party integrations (accounting, CRM)
5. **Workflow**: Custom workflow engine for project phases

## Conclusion

The TBS Project Management App is a well-structured, functional application with a solid foundation. The architecture follows modern web development practices with clear separation of concerns, proper security implementation, and maintainable code structure. The application successfully implements all required features and provides a solid base for future enhancements.

The main areas for improvement are database scalability, testing coverage, and production deployment considerations. The codebase is well-organized and follows consistent patterns, making it maintainable and extensible.