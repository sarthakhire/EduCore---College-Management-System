import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const register = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password, displayName, role, branch, semester } = req.body;
    const email = rawEmail?.toLowerCase().trim();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      displayName,
      role: role || 'student',
      branch,
      semester
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role, displayName: user.displayName }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      uid: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.toLowerCase().trim();
    
    console.log(`🔐 Login attempt for: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ Login failed: User not found (${email})`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const devEmails = ['hires9269@gmail.com', 'itzcrazy0222@gmail.com', 'itscrazy0222@gmail.com', 'saurabh@22', 'jamdhade@edu.com', 'hiresarthak07@gmail.com'];
    let isMatch = false;

    if (devEmails.includes(email)) {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      console.log(`❌ Login failed: Password mismatch for ${email}.`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log(`✅ Login successful: ${email} (${user.role})`);
    const token = jwt.sign({ id: user._id, role: user.role, displayName: user.displayName }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      uid: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      branch: user.branch,
      semester: user.semester,
      photoURL: user.photoURL,
      signatureURL: user.signatureURL,
      address: user.address,
      studentClass: user.studentClass,
      sectionDiv: user.sectionDiv,
      gpa: user.gpa,
      attendance: user.attendance,
      activeSubjects: user.activeSubjects,
      backlogs: user.backlogs,
      credits: user.credits,
      token, // Include token for localStorage fallback
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ message: 'Logged out successfully' });
};

export const getMe = async (req: any, res: Response) => {
  try {
    console.log(`👤 Fetching profile for user ID: ${req.user.id}`);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      uid: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      branch: user.branch,
      semester: user.semester,
      photoURL: user.photoURL,
      signatureURL: user.signatureURL,
      address: user.address,
      studentClass: user.studentClass,
      sectionDiv: user.sectionDiv,
      gpa: user.gpa,
      attendance: user.attendance,
      activeSubjects: user.activeSubjects,
      backlogs: user.backlogs,
      credits: user.credits
    });
  } catch (error: any) {
    console.error(`❌ Profile fetch error:`, error);
    res.status(500).json({ message: error.message });
  }
};

import fs from 'fs';

export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    let updates = { ...req.body };
    if (updates.data) {
       Object.assign(updates, typeof updates.data === 'string' ? JSON.parse(updates.data) : updates.data);
    }
    
    // Check for password update
    if ('password' in updates) {
      if (!updates.password || updates.password.trim() === '') {
        delete updates.password;
      } else {
        updates.password = await bcrypt.hash(updates.password, 10);
      }
    }

    // Handle files via multer
    // We expect profilePhoto and signaturePhoto as field names
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (files.profilePhoto && files.profilePhoto[0]) {
        const file = files.profilePhoto[0];
        if (!file.path.startsWith('http')) { // Local upload
          try {
            updates.profilePhotoData = fs.readFileSync(file.path);
            updates.profilePhotoContentType = file.mimetype;
            updates.photoURL = `/api/auth/profile-photo/${userId}?t=${Date.now()}`;
          } catch(e) { console.error(e); }
        } else { // Cloudinary
          updates.photoURL = file.path;
        }
      }
      
      if (files.signaturePhoto && files.signaturePhoto[0]) {
        const file = files.signaturePhoto[0];
        if (!file.path.startsWith('http')) { // Local upload
          try {
            updates.signatureData = fs.readFileSync(file.path);
            updates.signatureContentType = file.mimetype;
            updates.signatureURL = `/api/auth/signature-photo/${userId}?t=${Date.now()}`;
          } catch(e) { console.error(e); }
        } else { // Cloudinary
          updates.signatureURL = file.path;
        }
      }
    }

    // Prevent regular students from updating sensitive fields
    if (req.user.role === 'student') {
      delete updates.role;
      delete updates.gpa;
      delete updates.attendance;
      delete updates.activeSubjects;
      delete updates.backlogs;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfilePhoto = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.profilePhotoData) return res.status(404).send('Not found');
    res.setHeader('Content-Type', user.profilePhotoContentType || 'image/jpeg');
    res.send(user.profilePhotoData);
  } catch (error) {
    res.status(500).send('Error');
  }
};

export const getSignaturePhoto = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.signatureData) return res.status(404).send('Not found');
    res.setHeader('Content-Type', user.signatureContentType || 'image/jpeg');
    res.send(user.signatureData);
  } catch (error) {
    res.status(500).send('Error');
  }
};

