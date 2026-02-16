import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { testConnection, closePool } from './config/database';
import { authRoutes, applicationRoutes, adminRoutes, fileRoutes, dashboardRoutes, cvRoutes, cvAnalysisRoutes, coverLetterRoutes } from './routes';
import applicationAnalysisRoutes from './routes/applicationAnalysis.routes';
import { errorHandler } from './middleware';
import { reminderJob } from './jobs/reminderJob';
import { startWorkers, stopWorkers } from './workers';
import { isQueueConfigured } from './config/queue';
import { emailService } from './services';

dotenv.config();

// Initialize email service
emailService;

const app: Application = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Railway/container platforms need 0.0.0.0

// Middleware - CORS (preflight OPTIONS ve tüm origins için)
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://jobtrackr-jjfi.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    if (origin.startsWith('chrome-extension://') || origin.startsWith('file://')) {
      return callback(null, true);
    }
    
    // Tüm Vercel deployment'ları (production + preview)
    // Matches: jobtrackr-jjfi.vercel.app, jobtrackr-jjfi-52waz2not-edanurbinicis-projects.vercel.app
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS'));
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (Google OAuth için gerekli)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'jobtrackr-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 saat
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/cv-analysis', cvAnalysisRoutes);
app.use('/api/cover-letter', coverLetterRoutes);
app.use('/api/ai', applicationAnalysisRoutes);
app.use('/api', fileRoutes);

// Global error handler (must be registered after all routes)
app.use(errorHandler);

// Start server only if not in test environment
async function startServer() {
  try {
    console.log('Starting server...');
    
    // Test database connection
    await testConnection();

    app.listen(Number(PORT), HOST, async () => {
      console.log(`✅ Server is running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Start reminder job (check every 60 minutes)
      reminderJob.start(60);
      console.log('Reminder job started');

      // Start background workers if queue is configured (don't crash if Redis fails)
      if (isQueueConfigured()) {
        try {
          await startWorkers();
          console.log('✅ Background workers started');
        } catch (workerError) {
          console.error('⚠️ Workers failed to start (app will continue):', workerError);
        }
      } else {
        console.log('⚠️  Queue system not configured - background jobs will run synchronously');
        console.log('   Set REDIS_URL to enable background processing');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  reminderJob.stop();
  
  if (isQueueConfigured()) {
    await stopWorkers();
  }
  
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  reminderJob.stop();
  
  if (isQueueConfigured()) {
    await stopWorkers();
  }
  
  await closePool();
  process.exit(0);
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
