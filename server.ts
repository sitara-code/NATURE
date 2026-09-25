import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { isPointInPolygon, haversineDistanceMeters, haversineDistanceKm, createCirclePolygon } from './server/geo.js';
import {
  analyzeCluster,
  convertObservationsToMLCSV,
  randomForestModel,
} from './server/risk-engine.js';
import { sendEmergencySMS } from './server/sms.js';
import { realtimeManager } from './server/realtime.js';
import { Alert, User, ALLOWED_ANIMALS, ALLOWED_BEHAVIOURS } from './src/types.js';

const app = express();
const PORT = 3000;
const FASTAPI_PREDICT_URL = 'https://zoo-sentinel-server.onrender.com/predict';
const FASTAPI_EMAIL_URL = 'https://zoo-sentinel-server.onrender.com/sendEmail';
const OBSERVATION_HAZARD_PROBABILITY_DIR = path.join(
  process.cwd(),
  'data',
  'observation_hazard_probability'
);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(OBSERVATION_HAZARD_PROBABILITY_DIR)) {
  fs.mkdirSync(OBSERVATION_HAZARD_PROBABILITY_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for real file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `media-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp4|webm|mov/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid media type. Only JPG, PNG, WEBP, and MP4/WEBM videos are permitted.'));
  },
});

async function predictObservationWithFastAPI(observation: {
  id: string;
  species: string;
  behaviourCategory: string;
  intensity?: number;
  severity: number;
  abnormalityPercentage?: number;
  durationMinutes?: number;
}): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(FASTAPI_PREDICT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animal: observation.species,
        behaviour: observation.behaviourCategory,
        intensity: Number(observation.intensity),
        abnormality_percentage: Number(observation.abnormalityPercentage),
        duration_minutes: Number(observation.durationMinutes),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`FastAPI returned HTTP ${response.status}`);
    }

    const result = (await response.json()) as Record<string, unknown>;
    const hazardProbability = result.observationHazardProbability ?? result.hazard_probability;

    if (hazardProbability === undefined || hazardProbability === null) {
      throw new Error('FastAPI response did not contain observationHazardProbability or hazard_probability');
    }

    const outputPath = path.join(OBSERVATION_HAZARD_PROBABILITY_DIR, `${observation.id}.json`);
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log(`[FastAPI] Saved observation hazard probability to ${outputPath}`);
    return result;
  } catch (err: any) {
    console.error(`[FastAPI] Failed to predict observation ${observation.id}:`, err.message || err);
    return null;
  }
}

async function sendObservationEmailWithFastAPI(observationId: string): Promise<void> {
  try {
    const response = await fetch(FASTAPI_EMAIL_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`FastAPI email endpoint returned HTTP ${response.status}`);
    }

    const result = (await response.json()) as { status?: unknown };
    if (typeof result.status !== 'string' || result.status.length === 0) {
      throw new Error('FastAPI email response did not contain a valid status');
    }

    console.log(`[FastAPI] Email notification sent for observation ${observationId}: ${result.status}`);
  } catch (err: any) {
    console.error(`[FastAPI] Failed to send email for observation ${observationId}:`, err.message || err);
  }
}

// Simple secure token session store in memory
const sessions: Map<string, { userId: string; role: string; zooId?: string; expiresAt: number }> =
  new Map();

function generateToken(userId: string, role: string, zooId?: string): string {
  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, {
    userId,
    role,
    zooId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }

  const user = db.getUserById(session.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: 'User account not found.' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Zoo Sentinel Biological Early Warning API',
    time: new Date().toISOString(),
    version: '1.0.0',
  });
});

// SSE Real-time stream
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  realtimeManager.addClient(clientId, res);
});

// ------------------------------------------
// 1. AUTHENTICATION FLOWS
// ------------------------------------------

// A. Zoo / Institution Admin Login
app.post('/api/auth/zoo-admin/login', (req, res) => {
  try {
    const { zooId, identifier, email, password } = req.body;

    if ((!zooId && !identifier) || !email || !password) {
      return res.status(400).json({ error: 'Zoo Identifier, Email, and Password are required.' });
    }

    // Lookup Zoo
    const targetZoo = zooId
      ? db.getZooById(zooId)
      : db.getZooByIdentifier(identifier);

    if (!targetZoo) {
      db.logAudit('SECURITY', 'unauthenticated', 'Anonymous', 'FAILED_ZOO_ADMIN_LOGIN', `Attempt with invalid zoo identifier: ${identifier || zooId}`);
      return res.status(404).json({ error: 'Institution not registered in master database.' });
    }

    // Check verification status
    if (!targetZoo.verified) {
      db.logAudit('SECURITY', 'unauthenticated', 'Anonymous', 'UNVERIFIED_ZOO_LOGIN_BLOCKED', `Login blocked for unverified zoo: ${targetZoo.name}`);
      return res.status(400).json({ success: false, error: 'This institution has not been verified by the Master Authority.' });
    }

    // Verify user
    const user = db.getUserByEmail(email);
    if (!user || user.role !== 'ZOO_ADMIN' || user.zooId !== targetZoo.id) {
      return res.status(401).json({ error: 'Invalid credentials for this institution.' });
    }

    const passwordValid = db.verifyUserPassword(user.id, password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = generateToken(user.id, user.role, targetZoo.id);
    db.logAudit('ZOO_ADMIN', user.id, user.fullName, 'ZOO_ADMIN_LOGIN', `Successful login for ${targetZoo.name}`);

    res.json({
      token,
      user,
      zoo: targetZoo,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// B. Zookeeper Login
app.post('/api/auth/zookeeper/login', (req, res) => {
  try {
    const { zooId, zookeeperIdentifier, accessCode } = req.body;

    if (!zooId || !zookeeperIdentifier || !accessCode) {
      return res.status(400).json({
        error: 'Zoo / Institution, Zookeeper ID/Email, and Zoo Access Code are all required.',
      });
    }

    const verification = db.verifyZookeeperAccessCode(zooId, zookeeperIdentifier, accessCode);

    if (!verification.valid || !verification.zookeeper) {
      db.logAudit(
        'SECURITY',
        'unauthenticated',
        'Anonymous',
        'FAILED_ZOOKEEPER_LOGIN',
        `Failed zookeeper login attempt for zoo: ${zooId}, identifier: ${zookeeperIdentifier}. Reason: ${verification.reason}`
      );
      return res.status(401).json({ error: verification.reason || 'Invalid zookeeper credentials or access code.' });
    }

    const zk = verification.zookeeper;
    const zoo = db.getZooById(zooId);

    // Get or create user record for zookeeper
    let user = db.getUserById(zk.id);
    if (!user) {
      user = {
        id: zk.id,
        email: zk.email,
        fullName: zk.fullName,
        role: 'ZOOKEEPER',
        zooId: zk.zooId,
        createdAt: zk.createdAt,
      };
    }

    const token = generateToken(user.id, user.role, zooId);
    db.logAudit('ZOOKEEPER', zk.id, zk.fullName, 'ZOOKEEPER_LOGIN', `Zookeeper authenticated for ${zoo?.name}`);

    res.json({
      token,
      user,
      zoo,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// C. Citizen Registration
app.post('/api/auth/citizen/register', (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, latitude, longitude, registeredLocation, locationPermission } = req.body;

    if (!fullName || !email || !password || !phoneNumber) {
      return res.status(400).json({
        error: 'Full name, email, password, and emergency SMS phone number are required.',
      });
    }

    const existing = db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const citizenUser = db.createUser(
      {
        fullName,
        email,
        role: 'CITIZEN',
        phoneNumber,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
        registeredLocation: registeredLocation || 'General Public',
        locationPermission: Boolean(locationPermission),
      },
      password
    );

    const token = generateToken(citizenUser.id, citizenUser.role);
    db.logAudit('CITIZEN', citizenUser.id, citizenUser.fullName, 'CITIZEN_REGISTER', `Citizen registered with emergency phone: ${phoneNumber.slice(-4)}`);

    res.json({
      token,
      user: citizenUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Citizen Login
app.post('/api/auth/citizen/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.getUserByEmail(email);
    if (!user || user.role !== 'CITIZEN') {
      return res.status(401).json({ error: 'Citizen account not found.' });
    }

    const valid = db.verifyUserPassword(user.id, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user.id, user.role);
    db.logAudit('CITIZEN', user.id, user.fullName, 'CITIZEN_LOGIN', 'Citizen logged in');

    res.json({
      token,
      user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Master Admin Login
app.post('/api/auth/master-admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.getUserByEmail(email);
    if (!user || user.role !== 'MASTER_ADMIN') {
      return res.status(401).json({ error: 'Master Admin account not found.' });
    }

    const valid = db.verifyUserPassword(user.id, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid master authority credentials.' });
    }

    const token = generateToken(user.id, user.role);
    db.logAudit('MASTER_ADMIN', user.id, user.fullName, 'MASTER_ADMIN_LOGIN', 'Master authority authenticated');

    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Current User Session
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  let zoo = null;
  if (user.zooId) {
    zoo = db.getZooById(user.zooId);
  }
  res.json({ user, zoo });
});

// Update citizen location
app.post('/api/citizen/location', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const { latitude, longitude, permission } = req.body;

  if (latitude !== undefined && longitude !== undefined) {
    db.updateUserLocation(user.id, Number(latitude), Number(longitude), true);
    res.json({ status: 'ok', latitude, longitude, locationPermission: true });
  } else {
    res.status(400).json({ error: 'Coordinates required' });
  }
});

// Get emergency SMS messages sent to the citizen
app.get('/api/citizen/sms', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const list = db.getDispatchedSMS(user.phoneNumber);
  res.json(list);
});

// Trigger a test emergency SMS to the citizen's registered number
app.post('/api/citizen/test-sms', requireAuth, async (req, res) => {
  const user = (req as any).user as User;
  if (!user.phoneNumber) {
    return res.status(400).json({ error: 'No phone number registered for emergency SMS alerts.' });
  }

  const testMessage =
    `[ZOO SENTINEL TEST CIVIL ALERT]\n` +
    `Recipient: ${user.fullName} (${user.phoneNumber})\n` +
    `Perimeter: Lat ${user.latitude?.toFixed(4) || 'N/A'}, Lng ${user.longitude?.toFixed(4) || 'N/A'}\n` +
    `Emergency SMS channel is ACTIVE and ready for biological early warning dispatches.`;

  const result = await sendEmergencySMS(
    [{ phoneNumber: user.phoneNumber, fullName: user.fullName, citizenId: user.id }],
    testMessage,
    `TEST-${Date.now()}`
  );

  for (const sms of result.dispatchedMessages) {
    db.addDispatchedSMS(sms);
    realtimeManager.broadcast('sms_received', sms);
  }

  res.json({
    success: true,
    message: `Test SMS dispatched to ${user.phoneNumber}`,
    result,
  });
});

// ------------------------------------------
// 2. INSTITUTIONS & GEOFENCES
// ------------------------------------------

// Public list of verified institutions (never exposes credentials or access codes)
app.get('/api/zoos', (req, res) => {
  const zoos = db.getZoos().map((z) => ({
    id: z.id,
    identifier: z.identifier,
    name: z.name,
    country: z.country,
    city: z.city,
    latitude: z.latitude,
    longitude: z.longitude,
    geofenceRadiusMeters: z.geofenceRadiusMeters,
    geofencePolygon: z.geofencePolygon,
    verified: z.verified,
    truthRating: z.truthRating,
    totalReports: z.totalReports,
    confirmedCorrelations: z.confirmedCorrelations,
    falseAlarms: z.falseAlarms,
  }));
  res.json(zoos);
});

// Update zoo geofence (Zoo Admin or Master Admin)
app.put('/api/zoos/:id/geofence', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  const zooId = req.params.id;

  if (user.role !== 'MASTER_ADMIN' && (user.role !== 'ZOO_ADMIN' || user.zooId !== zooId)) {
    return res.status(401).json({ success: false, error: 'Unauthorized to modify this institution perimeter.' });
  }

  const { polygon, centerLat, centerLng, radiusMeters } = req.body;
  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'Valid polygon with at least 3 coordinate points required.' });
  }

  const updated = db.updateZooGeofence(zooId, polygon, centerLat, centerLng, radiusMeters);
  if (!updated) {
    return res.status(404).json({ error: 'Zoo not found' });
  }

  db.logAudit(
    user.role,
    user.id,
    user.fullName,
    'UPDATE_ZOO_GEOFENCE',
    `Updated geofence polygon (${polygon.length} vertices) for ${updated.name}`
  );

  realtimeManager.broadcast('zoo_updated', updated);
  res.json(updated);
});

// Master Admin: Add or verify zoo
app.post('/api/zoos', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'MASTER_ADMIN') {
    return res.status(401).json({ success: false, error: 'Master Admin authority required.' });
  }

  const { name, identifier, country, city, latitude, longitude, geofencePolygon, geofenceRadiusMeters, verified } = req.body;
  if (!name || !identifier || !latitude || !longitude) {
    return res.status(400).json({ success: false, error: 'Missing required institution fields' });
  }

  const newZoo = db.addZoo({
    name,
    identifier,
    country: country || '',
    city: city || '',
    latitude: Number(latitude),
    longitude: Number(longitude),
    geofenceRadiusMeters: Number(geofenceRadiusMeters) || 1500,
    geofencePolygon: geofencePolygon || [],
    verified: verified ?? true,
    truthRating: 85,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
  });

  db.logAudit('MASTER_ADMIN', user.id, user.fullName, 'ADD_ZOO', `Added institution ${name} (${identifier})`);
  res.json(newZoo);
});

// Master Admin: Toggle verification
app.put('/api/zoos/:id/verify', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'MASTER_ADMIN') {
    return res.status(401).json({ success: false, error: 'Master Admin authority required.' });
  }

  const { verified } = req.body;
  const updated = db.updateZooVerification(req.params.id, Boolean(verified));
  db.logAudit('MASTER_ADMIN', user.id, user.fullName, 'VERIFY_ZOO', `Set verification to ${verified} for ${updated?.name}`);
  res.json(updated);
});

// ------------------------------------------
// 3. ZOOKEEPER & ACCESS CODE MANAGEMENT
// ------------------------------------------

// List zookeepers for this zoo (Zoo Admin only)
app.get('/api/zookeepers', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'ZOO_ADMIN' || !user.zooId) {
    return res.status(401).json({ success: false, error: 'Zoo Admin authorization required.' });
  }

  const zookeepers = db.getZookeepersByZoo(user.zooId);
  res.json(zookeepers);
});

// Create zookeeper + generate one-time access code
app.post('/api/zookeepers', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'ZOO_ADMIN' || !user.zooId) {
    return res.status(401).json({ success: false, error: 'Zoo Admin authorization required.' });
  }

  const { fullName, badgeNumber, email } = req.body;
  if (!fullName || !badgeNumber || !email) {
    return res.status(400).json({ success: false, error: 'Full name, badge number, and registered email are required.' });
  }

  const result = db.createZookeeper(user.zooId, fullName, badgeNumber, email);
  db.logAudit(
    'ZOO_ADMIN',
    user.id,
    user.fullName,
    'CREATE_ZOOKEEPER',
    `Created zookeeper ${fullName} (${badgeNumber}) with generated access code.`
  );

  // Return raw access code ONCE so admin can give it to keeper. Plain code is NOT saved in plaintext.
  res.json({
    zookeeper: result.zookeeper,
    oneTimeAccessCode: result.rawAccessCode,
  });
});

// Regenerate access code
app.post('/api/zookeepers/:id/regenerate-code', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'ZOO_ADMIN' || !user.zooId) {
    return res.status(401).json({ success: false, error: 'Zoo Admin authorization required.' });
  }

  const zk = db.getZookeeperById(req.params.id);
  if (!zk || zk.zooId !== user.zooId) {
    return res.status(404).json({ success: false, error: 'Zookeeper not found at your institution.' });
  }

  const newCode = db.regenerateAccessCode(user.zooId, zk.id);
  db.logAudit(
    'ZOO_ADMIN',
    user.id,
    user.fullName,
    'REGENERATE_ACCESS_CODE',
    `Regenerated access code for ${zk.fullName} (${zk.badgeNumber})`
  );

  res.json({
    success: true,
    oneTimeAccessCode: newCode,
  });
});

// Revoke access
app.post('/api/zookeepers/:id/revoke', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'ZOO_ADMIN' || !user.zooId) {
    return res.status(401).json({ success: false, error: 'Zoo Admin authorization required.' });
  }

  const zk = db.getZookeeperById(req.params.id);
  if (!zk || zk.zooId !== user.zooId) {
    return res.status(404).json({ success: false, error: 'Zookeeper not found at your institution.' });
  }

  db.revokeAccessCode(zk.id);
  db.logAudit(
    'ZOO_ADMIN',
    user.id,
    user.fullName,
    'REVOKE_ZOOKEEPER_ACCESS',
    `Revoked credentials for ${zk.fullName} (${zk.badgeNumber})`
  );

  realtimeManager.broadcast('zookeeper_updated', { zookeeperId: zk.id, status: 'REVOKED' });

  res.json({ success: true, status: 'REVOKED', message: 'Access revoked' });
});

// ------------------------------------------
// 4. OBSERVATION SUBMISSION & PIPELINE
// ------------------------------------------

// Media file upload
app.post('/api/upload', requireAuth, upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No media file provided.' });
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const mediaUrl = `/uploads/${req.file.filename}`;

  res.json({
    success: true,
    url: mediaUrl,
    type: isVideo ? 'video' : 'image',
    size: req.file.size,
    filename: req.file.filename,
  });
});

// Submit observation
app.post('/api/observations', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user as User;

    if (user.role !== 'ZOOKEEPER' || !user.zooId) {
      return res.status(400).json({
        success: false,
        error: 'Only verified zookeepers can submit official observations.',
      });
    }

    const zoo = db.getZooById(user.zooId);
    if (!zoo || !zoo.verified) {
      return res.status(400).json({
        success: false,
        error: 'Your institution is not verified in the Sentinel network.',
      });
    }

    const {
      species,
      totalAnimals,
      animalsShowingBehaviour,
      durationMinutes,
      behaviourCategory,
      intensity,
      description,
      severity,
      mediaUrl,
      mediaType,
      latitude,
      longitude,
      gpsAccuracy,
      observedAt,
    } = req.body;

    // 1. Animal / species validation: must be Elephant, Crocodile, Hummingbird, or Giraffe
    if (!species || !ALLOWED_ANIMALS.includes(species as any)) {
      return res.status(400).json({
        success: false,
        error: `Animal must be one of: ${ALLOWED_ANIMALS.join(', ')}.`,
      });
    }

    // 2. Total animals validation: integer, min 1
    const totalAnimalsNum = Number(totalAnimals);
    if (!Number.isInteger(totalAnimalsNum) || totalAnimalsNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Total animals of this type in the zoo must be an integer of at least 1.',
      });
    }

    // 3. Animals showing behaviour validation: integer, min 0, <= totalAnimals
    const animalsShowingNum = Number(animalsShowingBehaviour);
    if (!Number.isInteger(animalsShowingNum) || animalsShowingNum < 0 || animalsShowingNum > totalAnimalsNum) {
      return res.status(400).json({
        success: false,
        error: `Animals showing this behaviour must be an integer between 0 and total animals (${totalAnimalsNum}).`,
      });
    }

    // 4. Abnormality Percentage calculation and validation
    const abnormalityPercentage = Number(((animalsShowingNum / totalAnimalsNum) * 100).toFixed(2));
    if (isNaN(abnormalityPercentage) || abnormalityPercentage < 0 || abnormalityPercentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Calculated abnormality percentage must be between 0% and 100%.',
      });
    }

    // 5. Duration for which the behaviour was shown (in minutes)
    const durationNum = Number(durationMinutes);
    if (isNaN(durationNum) || durationNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Duration for which the behaviour was shown must be a number of at least 1 minute.',
      });
    }

    const intensityNum = Number(intensity);
    if (!Number.isInteger(intensityNum) || intensityNum < 1 || intensityNum > 10) {
      return res.status(400).json({
        success: false,
        error: 'Observation intensity must be an integer between 1 and 10.',
      });
    }

    // 6. Behaviour category validation: must be one of the 7 precursor behaviours
    if (!behaviourCategory || !ALLOWED_BEHAVIOURS.includes(behaviourCategory as any)) {
      return res.status(400).json({
        success: false,
        error: `Behaviour category must be one of the 7 allowed behaviours: ${ALLOWED_BEHAVIOURS.join(', ')}.`,
      });
    }

    // GPS validation
    if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
      return res.status(400).json({
        success: false,
        error: 'Location permission is required to submit a verified observation.',
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GPS coordinates provided.',
      });
    }

    // Geofence Validation: Ray-casting Point-in-Polygon
    const isInsidePolygon = isPointInPolygon([latNum, lngNum], zoo.geofencePolygon);
    const distToZooCenterMeters = haversineDistanceMeters(latNum, lngNum, zoo.latitude, zoo.longitude);
    const isInsideRadius = distToZooCenterMeters <= zoo.geofenceRadiusMeters;

    const isInside = isInsidePolygon || isInsideRadius;

    if (!isInside) {
      db.logAudit(
        'ZOOKEEPER',
        user.id,
        user.fullName,
        'GEOFENCE_REJECTION',
        `Observation rejected: GPS coordinates [${latNum.toFixed(4)}, ${lngNum.toFixed(4)}] are ${Math.round(distToZooCenterMeters)}m from ${zoo.name} center (perimeter radius: ${zoo.geofenceRadiusMeters}m).`
      );

      return res.status(400).json({
        success: false,
        error: `Observation rejected: your current GPS position (${latNum.toFixed(4)}, ${lngNum.toFixed(4)}) is ${Math.round(distToZooCenterMeters)}m away from ${zoo.name}, outside the verified perimeter (${zoo.geofenceRadiusMeters}m).`,
        distanceMeters: Math.round(distToZooCenterMeters),
        allowedRadiusMeters: zoo.geofenceRadiusMeters,
      });
    }

    // Determine severity from abnormality percentage and duration if not provided
    const evaluatedSeverity = (Number(severity) as any) ||
      (abnormalityPercentage >= 80 ? 5 : abnormalityPercentage >= 60 ? 4 : abnormalityPercentage >= 40 ? 3 : 2);

    // Store verified observation with updated schema fields
    const observation = db.addObservation({
      zooId: zoo.id,
      zookeeperId: user.id,
      zookeeperName: user.fullName,
      zooName: zoo.name,
      species,
      totalAnimals: totalAnimalsNum,
      animalsShowingBehaviour: animalsShowingNum,
      durationMinutes: durationNum,
      abnormalityPercentage,
      behaviourCategory,
      intensity: intensityNum,
      description: description || '',
      severity: evaluatedSeverity,
      mediaUrl,
      mediaType,
      latitude: latNum,
      longitude: lngNum,
      gpsAccuracy: Number(gpsAccuracy) || 10,
      observedAt: observedAt || new Date().toISOString(),
      verificationStatus: 'VERIFIED_IN_GEOFENCE',
      geofenceDistanceMeters: Math.round(distToZooCenterMeters),
    });

    db.logAudit(
      'ZOOKEEPER',
      user.id,
      user.fullName,
      'SUBMIT_OBSERVATION',
      `Observation recorded: ${species} (${behaviourCategory}) at ${zoo.name}`
    );

    // Run Real-Time Analysis Pipeline immediately
    const allObs = db.getObservations(500);
    const analysis = analyzeCluster(allObs);

    let alertCreated: Alert | null = null;

    if (analysis) {
      db.saveRiskAnalysis(analysis);

      // Check if threshold crossed (Risk Score >= 60 and confidence Moderate or High)
      if (analysis.riskScore >= 60 && analysis.confidence !== 'Low') {
        const polygon = createCirclePolygon(
          analysis.centerLatitude,
          analysis.centerLongitude,
          analysis.estimatedRadiusKm
        );

        // Find citizens located inside the danger zone (distance to hazard center or polygon)
        const locatedCitizens = db.getCitizensWithLocation();
        const citizensInZone = locatedCitizens.filter((citizen) => {
          if (citizen.latitude === undefined || citizen.longitude === undefined) return false;
          const distKm = haversineDistanceKm(
            citizen.latitude,
            citizen.longitude,
            analysis.centerLatitude,
            analysis.centerLongitude
          );
          const inRadius = distKm <= analysis.estimatedRadiusKm * 1.05;
          const inPoly = isPointInPolygon([citizen.latitude, citizen.longitude], polygon);
          return inRadius || inPoly;
        });

        console.log(`[ALERT ENGINE] Triggered alert for ${analysis.eventType}. Center: [${analysis.centerLatitude}, ${analysis.centerLongitude}], Radius: ${analysis.estimatedRadiusKm}km. Total registered citizens: ${locatedCitizens.length}, Citizens inside threat zone: ${citizensInZone.length}`);

        const alertTitle = `BIOLOGICAL ANOMALY WARNING: ${analysis.eventType.toUpperCase()}`;
        const alertMessage =
          `CRITICAL BIOLOGICAL EARLY WARNING\n` +
          `Potential hazard: ${analysis.eventType}\n` +
          `Model-estimated risk: ${analysis.riskScore}%\n` +
          `Estimated area: ${analysis.estimatedRadiusKm} km radius\n` +
          `Estimated time window: ${analysis.estimatedTimeWindow}\n` +
          `Please follow official emergency instructions.\n` +
          `Model-generated early warning. Follow official emergency services and government alerts.`;

        // Prepare recipients for emergency SMS dispatch
        const alertId = `ALERT-${Date.now()}`;
        const recipients = citizensInZone
          .filter((c) => Boolean(c.phoneNumber))
          .map((c) => ({
            phoneNumber: c.phoneNumber!,
            fullName: c.fullName,
            citizenId: c.id,
          }));

        const smsResult = await sendEmergencySMS(recipients, alertMessage, alertId);

        // Store dispatched SMS records and broadcast to active citizen sessions
        for (const dispatched of smsResult.dispatchedMessages) {
          db.addDispatchedSMS(dispatched);
          realtimeManager.broadcast('sms_received', dispatched);
        }

        alertCreated = {
          id: alertId,
          riskAnalysisId: analysis.id,
          title: alertTitle,
          hazard: analysis.eventType,
          severity: analysis.riskScore >= 80 ? 'Critical' : 'Watch',
          riskScore: analysis.riskScore,
          centerLatitude: analysis.centerLatitude,
          centerLongitude: analysis.centerLongitude,
          radiusKm: analysis.estimatedRadiusKm,
          polygon,
          message: alertMessage,
          createdAt: new Date().toISOString(),
          targetedCitizensCount: citizensInZone.length,
          smsDispatchStatus:
            citizensInZone.length === 0
              ? 'NO_CITIZENS_IN_ZONE'
              : smsResult.status,
          smsProviderNote: smsResult.note,
        };

        db.addAlert(alertCreated);
        db.logAudit(
          'ALERT_ENGINE',
          'system-alert',
          'Sentinel Alert Engine',
          'ALERT_DISPATCHED',
          `Alert dispatched for ${analysis.eventType}. Targeted citizens: ${citizensInZone.length}. SMS status: ${smsResult.status}. Provider: ${smsResult.note}`
        );

        realtimeManager.broadcast('emergency_sms_dispatched', {
          alertId,
          hazard: analysis.eventType,
          recipientsCount: recipients.length,
          phoneNumbers: recipients.map((r) => r.phoneNumber),
        });
      }
    }

    // Broadcast Real-time Events via SSE to all connected dashboards
    realtimeManager.broadcast('new_observation', observation);
    if (analysis) {
      realtimeManager.broadcast('risk_updated', analysis);
    }
    if (alertCreated) {
      realtimeManager.broadcast('alert_dispatched', alertCreated);
      realtimeManager.broadcast('new_alert', alertCreated);
    }

    // Generate ML-ready CSV representation for this observation (pure numerical features)
    const observationMlCsv = convertObservationsToMLCSV([observation]);
    const rfResult = randomForestModel.predictFromCSV(observationMlCsv);

    const prediction = await predictObservationWithFastAPI(observation);
    await sendObservationEmailWithFastAPI(observation.id);

    res.json({
      success: true,
      message: 'Observation successfully recorded and analyzed by Random Forest ML pipeline.',
      observation,
      analysis,
      mlCsv: observationMlCsv,
      randomForestScore: rfResult.riskScore,
      alert: alertCreated,
      prediction,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Internal error processing observation' });
  }
});

// Export observations dataset in ML-ready CSV format
app.get('/api/observations/export-ml-csv', (req, res) => {
  const verifiedObs = db.getObservations(5000).filter((o) => o.verificationStatus === 'VERIFIED_IN_GEOFENCE');
  const csvContent = convertObservationsToMLCSV(verifiedObs);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="zoo_sentinel_ml_dataset.csv"');
  res.send(csvContent);
});

// List observations
app.get('/api/observations', (req, res) => {
  const { zooId, limit } = req.query;
  const lim = limit ? Number(limit) : 100;
  if (zooId && typeof zooId === 'string') {
    return res.json(db.getObservationsByZoo(zooId).slice(0, lim));
  }
  res.json(db.getObservations(lim));
});

// ------------------------------------------
// 5. RISK ANALYSIS & ALERTS
// ------------------------------------------

// Current Risk Analysis
app.get('/api/analysis/current', (req, res) => {
  const analysis = db.getLatestRiskAnalysis();
  if (!analysis) {
    return res.json({
      analysis: null,
      message: 'No sufficient live data for analysis.',
    });
  }
  res.json({ analysis });
});

// Alerts list
app.get('/api/alerts', (req, res) => {
  res.json(db.getAlerts());
});

// ------------------------------------------
// 6. TRUTH RATINGS & AUDIT LOGS
// ------------------------------------------

app.get('/api/truth-ratings', (req, res) => {
  res.json(db.getTruthRatings());
});

// Record Truth Rating Outcome (Master Admin or Zoo Admin calibration)
app.post('/api/truth-ratings/verify', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'MASTER_ADMIN' && user.role !== 'ZOO_ADMIN') {
    return res.status(401).json({ success: false, error: 'Unauthorized to verify truth ratings' });
  }

  const { zooId, outcome, notes, eventType } = req.body;
  if (!zooId || !outcome || !notes) {
    return res.status(400).json({ success: false, error: 'zooId, outcome, and verification notes are required.' });
  }

  db.recordTruthCorrelation(zooId, outcome, notes, eventType || 'General');
  db.logAudit(user.role, user.id, user.fullName, 'RECORD_TRUTH_OUTCOME', `Recorded outcome ${outcome} for zoo ${zooId}`);

  realtimeManager.broadcast('truth_ratings_updated', db.getTruthRatings());
  res.json({ success: true, ratings: db.getTruthRatings() });
});

app.get('/api/audit-logs', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role === 'CITIZEN') {
    return res.status(401).json({ success: false, error: 'Citizens cannot access institutional audit logs.' });
  }
  res.json(db.getAuditLogs());
});

// ------------------------------------------
// 7. SYSTEM STATUS DASHBOARD & DIAGNOSTICS
// ------------------------------------------

app.get('/api/system/status', (req, res) => {
  const observations = db.getObservations(500);
  const zookeepers = db.getAllZookeepers();
  const latestAnalysis = db.getLatestRiskAnalysis();
  const alerts = db.getAlerts();
  const twilioConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );

  res.json({
    databaseConnected: true,
    activeObservationsCount: observations.length,
    activeZookeepersCount: zookeepers.filter((z) => z.active).length,
    totalZookeepersCount: zookeepers.length,
    activeInstitutionsCount: db.getZoos().filter((z) => z.verified).length,
    smsServiceConfigured: twilioConfigured,
    smsSendMode: twilioConfigured ? 'LIVE' : 'SIMULATED',
    riskEngineState: observations.length >= 2 ? 'ACTIVE' : 'IDLE',
    activeClustersCount: latestAnalysis && latestAnalysis.observationCount >= 2 ? 1 : 0,
    lastCalculationTimestamp: latestAnalysis ? latestAnalysis.analysisTime : null,
    alertsDispatchedCount: alerts.length,
    geofenceValidationEnforced: true,
  });
});

// Master or Admin Reset Database to Pure Clean State
app.post('/api/admin/system/reset-clean', requireAuth, (req, res) => {
  const user = (req as any).user as User;
  if (user.role !== 'MASTER_ADMIN' && user.role !== 'ZOO_ADMIN') {
    return res.status(401).json({ success: false, error: 'Administrator authorization required.' });
  }

  db.resetCleanDatabase();
  db.logAudit(
    user.role,
    user.id,
    user.fullName,
    'SYSTEM_RESET_CLEAN',
    'Database state reset to pure zero records (0 zookeepers, 0 observations, 0 alerts, 0 fake risk).'
  );

  realtimeManager.broadcast('system_reset', { timestamp: new Date().toISOString() });
  realtimeManager.broadcast('risk_updated', null);

  res.json({
    success: true,
    message: 'System database state reset to clean zero records.',
  });
});

// Explicit catch-all for any unhandled /api/* routes to prevent falling through to Vite SPA fallback or index.html
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
  });
});

// Global Express error handler to guarantee JSON responses and prevent HTML error pages
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Server Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' && err.status !== 403 ? err.status : 400;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error occurred.',
  });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zoo Sentinel Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[Server Error]', err);
  process.exit(1);
});
