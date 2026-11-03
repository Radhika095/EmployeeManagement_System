# Headcount - Employee Management System (MERN)

Register, log in, and manage employee records with full create, read, update and delete.

## Features
1. Employee (admin) registration
2. Login with JWT authentication
3. Add employee
4. View employee list (with search)
5. Edit employee details
6. Delete employee (with confirmation)
7. MongoDB integration through Mongoose

## Tech stack
MongoDB, Express.js, React (Vite), Node.js, JWT, bcryptjs, Axios, React Router.

## Folder structure
```
employee-management-system/
├── backend/    config, controllers, middleware, models, routes, server.js
└── frontend/   src/{api, components, context, pages}
```

## Run it locally

Requirements: Node.js 18+ and MongoDB (local or Atlas).

### 1. Backend
```bash
cd backend
npm install
# edit .env (a default copy of .env.example is included)
npm run dev
```
The API starts on http://localhost:5000.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Requests to `/api` are proxied to the backend.

## Environment variables (`backend/.env`)
| Variable | Purpose |
|---|---|
| PORT | API port (default 5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Secret used to sign tokens - change it |
| JWT_EXPIRES_IN | Token lifetime, e.g. 7d |
| CLIENT_URL | Allowed frontend origin for CORS |

## API
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | /api/auth/register | Create account, returns token | No |
| POST | /api/auth/login | Log in, returns token | No |
| GET | /api/auth/me | Current user | Yes |
| POST | /api/employees | Add employee | Yes |
| GET | /api/employees?search= | List / search employees | Yes |
| GET | /api/employees/:id | Get one employee | Yes |
| PUT | /api/employees/:id | Update employee | Yes |
| DELETE | /api/employees/:id | Delete employee | Yes |

Send the token as `Authorization: Bearer <token>`.

## Data models
- **User**: name, email (unique), password (bcrypt hash)
- **Employee**: name, email (unique), phone, department, designation, salary, joiningDate, createdBy
