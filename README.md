# CampusConnect – Smart College Event Management and Student Engagement System

An advanced, modern, web-based event coordination and engagement portal built for final-year engineering evaluations (**TAE-I**). CampusConnect automates student registrations, event logistics, feedback ratings, and provides administrative statistics.

---

## 🌟 Key Features

### 👨‍🎓 Student Features
- **Profile Management**: Maintain academic records (course, year, department, contact info).
- **Interactive Event Discovery**: Search by name, venue, or filter by categories and date.
- **Transactional Registrations**: Double-booking locks, registration deadlines, and seat limits.
- **Active Cancellation**: Cancel registrations to instantly release seats for other students.
- **Feedback & Moderated Reviews**: Give star ratings (1-5) and write reviews for registered events.

### 👩‍💼 Administrator Features
- **Live Stats Dashboard**: Instant overview of total students, events, active vs cancelled registrations, and feedback aggregates.
- **Event CRUD Operations**: Create, update, or cancel fests, workshops, hackathons, and sports meets.
- **Student Moderation**: Edit profile fields or remove student records.
- **Registration Control**: Cancel user slots or mark student attendance on-site.
- **Visual Analytics**: Interactive category distributions and capacity utilization charts via Chart.js.
- **Review Moderation**: Remove inappropriate reviews.

---

## 🛠️ Technology Stack
- **Frontend**: HTML5, CSS3 (Custom gradients + Glassmorphism), Bootstrap 5, Chart.js, Bootstrap Icons
- **Backend**: Node.js, Express.js (Modular router/controller MVC structure)
- **Database**: Simulated file-locked JSON database (no external SQL/NoSQL setup required)
- **Authentication**: Stateless JSON Web Tokens (JWT) stored in HTTPOnly cookies
- **Security**: Password hashing via Bcryptjs, route guards, input validation

---

## 📁 System Architecture & Directory Tree
```
campusconnect/
├── public/                 # Static assets folder
│   ├── css/
│   │   └── main.css        # Global custom theme rules
│   ├── js/
│   │   └── main.js         # Fetch wrappers & toast notifications
│   └── images/             # Branding logs & pictures
├── data/                   # JSON database files
│   ├── students.json
│   ├── admins.json
│   ├── events.json
│   ├── registrations.json
│   └── feedback.json
├── server/                 # Backend source
│   ├── server.js           # Server bootstrap
│   ├── controllers/        # Express request controllers
│   ├── middleware/         # Security guards & JWT cookies
│   ├── routes/             # REST route configurations
│   └── utils/
│       └── db.js           # Reusable CRUD JSON file helpers
├── frontend/               # Pre-rendered HTML page layouts
│   ├── pages/
│   │   ├── index.html      # Home
│   │   ├── login.html      # Login
│   │   ├── admin-login.html# Admin login
│   │   ├── student-dashboard.html
│   │   ├── admin-dashboard.html
│   │   └── 404.html        # Error fallback
│   ├── css/
│   │   └── dashboard.css   # Panel CSS styles
│   └── js/
│       └── pages.js        # Dynamic scripts
├── .env                    # System variables
├── package.json
└── render.yaml             # Render infrastructure template
```

---

## 🚀 Installation & Running Locally

### 1. Prerequisites
- Install **Node.js** (v18.0.0 or higher recommended).

### 2. Setup
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Environment Config
Create a `.env` file in the root directory:
```env
PORT=5000
JWT_SECRET=your_super_secret_evaluation_key_2026
```

### 4. Run Application
Run the local dev server using `nodemon`:
```bash
npm run dev
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 📜 API Documentation

### Authentication Routes
- `POST /api/auth/student/register` - Create student account.
- `POST /api/auth/student/login` - Student login session cookie.
- `POST /api/auth/admin/login` - Admin login session cookie.
- `POST /api/auth/logout` - Clear session cookies.

### Event Routes
- `GET /api/events` - Query events (supports search, category, status filters).
- `GET /api/events/:id` - Fetch single event details.
- `POST /api/events` - Admin create event.
- `PUT /api/events/:id` - Admin update event.
- `DELETE /api/events/:id` - Admin delete event.

### Registration Routes
- `POST /api/registrations` - Student register for event (performs capacity checks).
- `PUT /api/registrations/:id` - Admin update registration status.
- `DELETE /api/registrations/:id` - Cancel registration (student or admin).

---

## ☁️ Render Deployment
This repository is configured for one-click deployment to **Render**.

1. Create a Web Service on Render.
2. Select your repository.
3. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Set Environment Variables in Render:
   - `JWT_SECRET` = your_secret_key
   - `PORT` = 5000

Alternatively, the project provides a `render.yaml` configuration for blueprint deployments.
