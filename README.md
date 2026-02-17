# 🎯 JobTrackr

Modern, AI-powered job application tracking system built with React, Node.js, and PostgreSQL.

![JobTrackr](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue.svg)

---

## ✨ Features

- 📝 **Application Tracking**: Track all your job applications in one place
- 🤖 **AI-Powered Analysis**: CV analysis and cover letter generation using Groq AI
- 📧 **Smart Email Parsing**: Automatically parse job-related emails
- 🔔 **Reminder System**: Never miss an interview or follow-up
- 📊 **Analytics Dashboard**: Visualize your job search progress
- 🌐 **Chrome Extension**: Save jobs from LinkedIn, Kariyer.net, Indeed, and Secretcv
- 🎨 **Dark/Light Theme**: Comfortable viewing in any environment
- 📱 **PWA Support**: Install as a mobile app on any device
- 🔐 **Secure Authentication**: JWT-based auth with Google OAuth support

---

## 🚀 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing fast builds
- **TailwindCSS** for styling
- **React Router** for navigation
- **Theme Support** for dark/light mode
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** for database
- **Redis** (Upstash) for queue management
- **BullMQ** for background jobs
- **JWT** for authentication
- **Groq AI** for CV analysis and cover letter generation
- **Resend** for email notifications

### Infrastructure
- **Vercel** for frontend hosting
- **Railway** for backend hosting
- **Neon** for PostgreSQL database
- **Upstash** for Redis
- **AWS S3** for file storage (optional)

---

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (or Upstash account)
- npm or yarn

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/EdaNurBinici/job_trackr.git
cd job_trackr
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run database migrations**
```bash
npm run migrate:up
```

6. **Start development servers**

Backend:
```bash
npm run dev
```

Frontend (in another terminal):
```bash
cd client
npm run dev
```

7. **Open your browser**
```
Frontend: http://localhost:5173
Backend: http://localhost:3000
```

---

## 🌐 Deployment

### Quick Deployment Steps

1. **Database**: Create Neon PostgreSQL database
2. **Redis**: Create Upstash Redis database
3. **Backend**: Deploy to Railway
4. **Frontend**: Deploy to Vercel

---

## 📚 Documentation

Full documentation available in the repository.

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your-session-secret

# Redis
REDIS_URL=redis://...

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI
GROQ_API_KEY=your-groq-api-key
```

#### Frontend (client/.env)
```bash
VITE_API_URL=http://localhost:3000
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## 📊 Project Structure

```
jobtrackr/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React context
│   │   ├── i18n/          # Internationalization
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── src/                   # Backend Node.js application
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── workers/          # Background workers
│   ├── jobs/             # Cron jobs
│   └── utils/            # Utility functions
├── migrations/           # Database migrations
├── scripts/              # Utility scripts
└── tests/                # Test files
```

---

## 🎨 Features in Detail

### Application Tracking
- Create, update, and delete job applications
- Track application status (Applied, Interview, Offer, Rejected)
- Add notes and reminders
- Upload and manage CVs
- Generate cover letters

### AI-Powered Features
- **CV Analysis**: Get detailed feedback on your CV
- **Fit Score**: See how well your CV matches a job description
- **Cover Letter Generation**: Generate personalized cover letters
- **Email Parsing**: Automatically extract job details from emails

### Dashboard & Analytics
- Application statistics
- Status distribution charts
- Recent activity timeline
- Upcoming interviews and reminders

### Email Integration
- Parse job-related emails
- Automatic status updates
- Interview reminders
- Follow-up notifications

---

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- SQL injection prevention
- XSS protection
- Rate limiting (coming soon)

---



## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the ISC License.

---

## 👨‍💻 Author

Eda Nur Binici - [GitHub Profile](https://github.com/EdaNurBinici)

---

## 🙏 Acknowledgments

- [Groq](https://groq.com) for AI capabilities
- [Neon](https://neon.tech) for PostgreSQL hosting
- [Railway](https://railway.app) for backend hosting
- [Vercel](https://vercel.com) for frontend hosting
- [Upstash](https://upstash.com) for Redis hosting

---

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

## 🗺️ Roadmap

- [x] Chrome extension for LinkedIn, Kariyer.net, Indeed, and Secretcv
- [ ] Mobile app (React Native)
- [ ] Gmail API integration
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] Interview preparation tools

---

**Made with ❤️ for job seekers everywhere**
