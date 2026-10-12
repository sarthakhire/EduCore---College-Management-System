import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import authRoutes from './server/routes/auth.ts';
import academicRoutes from './server/routes/academic.ts';
import aiTutorRoutes from './server/routes/aiTutor.ts';
import { User } from './server/models/User.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);

  // Auto-initialize admin if not exists
  mongoose.connection.on('connected', async () => {
    try {
      console.log('🔄 Checking database for initial users...');
      const adminExists = await User.findOne({ email: 'admin@edu.com' });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = new User({
          email: 'admin@edu.com',
          password: hashedPassword,
          displayName: 'Super Admin',
          role: 'admin'
        });
        await admin.save();
        console.log('✅ Default admin created: admin@edu.com / admin123');
      } else {
        console.log('ℹ️ Admin user already exists');
      }

      // Seed explicit users
      const devUsers = [
        { email: 'hires9269@gmail.com', displayName: 'Sarthak (Admin)', role: 'admin' },
        { email: 'itzcrazy0222@gmail.com', displayName: 'Dev Admin 1', role: 'admin' },
        { email: 'itscrazy0222@gmail.com', displayName: 'Dev Admin 2', role: 'admin' },
        { email: 'jamdhade@edu.com', displayName: 'Jamdhade', role: 'teacher', password: 'password123' },
        { email: 'hiresarthak07@gmail.com', displayName: 'Sarthak Hire', role: 'admin', password: 'password123' }
      ];

      for (const devUser of devUsers) {
        const specificUser = await User.findOne({ email: devUser.email });
        if (!specificUser) {
          const defaultPassword = devUser.password || 'admin123';
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);
          await new User({
            email: devUser.email,
            password: hashedPassword,
            displayName: devUser.displayName,
            role: devUser.role || 'admin'
          }).save();
          console.log(`✅ Seeded user: ${devUser.email} / ${defaultPassword}`);
        }
      }

      // Seed default teacher
      const teacherExists = await User.findOne({ email: 'teacher@edu.com' });
      if (!teacherExists) {
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        const teacher = new User({
          email: 'teacher@edu.com',
          password: hashedPassword,
          displayName: 'John Professor',
          role: 'teacher'
        });
        await teacher.save();
        console.log('✅ Default teacher created: teacher@edu.com / teacher123');
      }

      // Seed default student
      const studentExists = await User.findOne({ email: 'student@edu.com' });
      if (!studentExists) {
        const hashedPassword = await bcrypt.hash('student123', 10);
        const student = new User({
          email: 'student@edu.com',
          password: hashedPassword,
          displayName: 'Jane Student',
          role: 'student',
          semester: 1
        });
        await student.save();
        console.log('✅ Default student created: student@edu.com / student123');
      }

      // Seed default courses
      const { Course } = await import('./server/models/Course.ts');
      const coursesToSeed = [
        { name: 'Computer Engineering', branch: 'CE', duration: 4 },
        { name: 'Information Technology', branch: 'IT', duration: 4 },
      ];

      for (const courseData of coursesToSeed) {
        const exists = await Course.findOne({ branch: courseData.branch });
        let courseId;
        if (!exists) {
          const course = new Course(courseData);
          const savedCourse = await course.save();
          courseId = savedCourse._id;
        } else {
          courseId = exists._id;
        }

        const { Subject } = await import('./server/models/Subject.ts');
        const subjectsConfig = [
          { name: 'Mathematics I', code: `MTH-${courseData.branch}-101`, semester: 1 },
          { name: 'Physics', code: `PHY-${courseData.branch}-101`, semester: 1 },
        ];
        for (const sub of subjectsConfig) {
          const subExists = await Subject.findOne({ code: sub.code });
          if (!subExists) {
            await new Subject({ ...sub, courseId }).save();
          }
        }
      }

    } catch (err) {
      console.error('Auto-init failed:', err);
    }
  });

  // MongoDB Connection (Non-blocking for server startup)
  let MONGODB_URI = process.env.MONGODB_URI;
  
  // Set up connection logic but don't await it at the top level to prevent startup blocking
  const connectDB = async () => {
    let connected = false;
    
    if (MONGODB_URI) {
      try {
        console.log(`🔄 Attempting to connect to external MongoDB...`);
        // Remove brackets if user accidentally left them in the password string
        const cleanedUri = MONGODB_URI.replace(/<|>/g, '');
        
        await mongoose.connect(cleanedUri, {
          serverSelectionTimeoutMS: 5000, // Fail fast if no connection
        });
        console.log('✅ Connected to external MongoDB');
        connected = true;
      } catch (error) {
        console.error('❌ External MongoDB connection failed (possibly IP restricted):', (error as Error).message);
      }
    }

    if (!connected) {
      try {
        console.log('🔄 Spinning up in-memory MongoDB as fallback...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000, 
        });
        console.log('✅ Connected to fallback in-memory MongoDB');
      } catch (error) {
        console.error('❌ Fallback MongoDB connection error:', error);
      }
    }
  };
  
  // Trigger connection
  connectDB();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/academic', academicRoutes);
  app.use('/api/ai-tutor', aiTutorRoutes);

  // Debug route to check users (Dev only)
  app.get('/api/debug/users', async (req, res) => {
    try {
      const count = await User.countDocuments();
      const users = await User.find().select('email role displayName');
      res.json({ count, users, mongodb: mongoose.connection.readyState });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Developer seed route
  app.get('/api/init', async (req, res) => {
    try {
      const adminExists = await User.findOne({ role: 'admin' });
      if (adminExists) return res.json({ message: 'Admin already exists' });

      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = new User({
        email: 'admin@edu.com',
        password: hashedPassword,
        displayName: 'Super Admin',
        role: 'admin'
      });
      
      await admin.save();
      res.json({ message: 'Admin user created', email: 'admin@edu.com', password: 'admin123' });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString() 
    });
  });

  // Serve uploaded files statically
  const uploadDir = path.join(os.tmpdir(), 'educore_uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filepath) => {
      // Force download for all files in uploads dir, fixes mobile browser bugs
      const filename = path.basename(filepath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }
  }));
  app.use('/uploads', (req, res) => {
    res.status(404).send('File not found or has expired. Temporary local storage resets periodically. Please use a Cloudinary API key for permanent storage.');
  });

  // Catch-all for API routes to prevent Vite from returning HTML for 404
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
  });

  // Global Error Handler for APIs to prevent HTML stack traces on 500
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
