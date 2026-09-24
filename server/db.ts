import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Zoo,
  Zookeeper,
  Observation,
  RiskAnalysis,
  Alert,
  AuditLog,
  TruthRatingData,
} from '../src/types.js';
import { createGeofenceBox } from './geo.js';
import { DispatchedSMS } from './sms.js';

export interface StoredAccessCode {
  id: string;
  zooId: string;
  zookeeperId: string;
  codeHash: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

export interface DatabaseSchema {
  users: User[];
  zoos: Zoo[];
  zookeepers: Zookeeper[];
  accessCodes: StoredAccessCode[];
  observations: Observation[];
  riskAnalyses: RiskAnalysis[];
  alerts: Alert[];
  auditLogs: AuditLog[];
  truthRatings: TruthRatingData[];
  credentials: Record<string, { passwordHash: string; salt: string }>; // userId or zooId -> hash
  dispatchedSMS?: DispatchedSMS[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'sentinel_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

// Initial verified institutions (Master institution database)
const INITIAL_ZOOS: Zoo[] = [
  {
    id: 'zoo-sd-01',
    identifier: 'ZOO-SD-001',
    name: 'San Diego Wildlife Alliance & Zoo',
    country: 'United States',
    city: 'San Diego, CA',
    latitude: 32.7353,
    longitude: -117.149,
    geofenceRadiusMeters: 1500,
    geofencePolygon: createGeofenceBox(32.7353, -117.149, 1500),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-01-10T00:00:00.000Z',
    contactEmail: 'admin@sandiegozoo.org',
  },
  {
    id: 'zoo-sg-02',
    identifier: 'ZOO-SG-002',
    name: 'Mandai Wildlife Reserve / Singapore Zoo',
    country: 'Singapore',
    city: 'Mandai',
    latitude: 1.4043,
    longitude: 103.793,
    geofenceRadiusMeters: 1800,
    geofencePolygon: createGeofenceBox(1.4043, 103.793, 1800),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-01-12T00:00:00.000Z',
    contactEmail: 'admin@mandai.sg',
  },
  {
    id: 'zoo-berlin-03',
    identifier: 'ZOO-BER-003',
    name: 'Zoologischer Garten Berlin',
    country: 'Germany',
    city: 'Berlin',
    latitude: 52.5079,
    longitude: 13.3378,
    geofenceRadiusMeters: 1200,
    geofencePolygon: createGeofenceBox(52.5079, 13.3378, 1200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-01-15T00:00:00.000Z',
    contactEmail: 'admin@zoo-berlin.de',
  },
  {
    id: 'zoo-tokyo-04',
    identifier: 'ZOO-TKO-004',
    name: 'Tokyo Ueno Zoological Gardens',
    country: 'Japan',
    city: 'Tokyo',
    latitude: 35.7165,
    longitude: 139.7712,
    geofenceRadiusMeters: 1400,
    geofencePolygon: createGeofenceBox(35.7165, 139.7712, 1400),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-01-20T00:00:00.000Z',
    contactEmail: 'admin@ueno-zoo.jp',
  },
  {
    id: 'zoo-syd-05',
    identifier: 'ZOO-SYD-005',
    name: 'Taronga Conservation Society Australia',
    country: 'Australia',
    city: 'Sydney',
    latitude: -33.8433,
    longitude: 151.2413,
    geofenceRadiusMeters: 1600,
    geofencePolygon: createGeofenceBox(-33.8433, 151.2413, 1600),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-01-22T00:00:00.000Z',
    contactEmail: 'admin@taronga.org.au',
  },
  // --- PREMIER ZOOS OF INDIA (18 Major Institutions) ---
  {
    id: 'zoo-ind-delhi-01',
    identifier: 'ZOO-IND-001',
    name: 'National Zoological Park (Delhi Zoo)',
    country: 'India',
    city: 'New Delhi, Delhi',
    latitude: 28.6042,
    longitude: 77.2435,
    geofenceRadiusMeters: 1500,
    geofencePolygon: createGeofenceBox(28.6042, 77.2435, 1500),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    contactEmail: 'admin@delhizoo.gov.in',
  },
  {
    id: 'zoo-ind-mysuru-02',
    identifier: 'ZOO-IND-002',
    name: 'Sri Chamarajendra Zoological Gardens (Mysuru Zoo)',
    country: 'India',
    city: 'Mysuru, Karnataka',
    latitude: 12.3021,
    longitude: 76.6664,
    geofenceRadiusMeters: 1400,
    geofencePolygon: createGeofenceBox(12.3021, 76.6664, 1400),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-01T00:00:00.000Z',
    contactEmail: 'admin@mysuruzoo.info',
  },
  {
    id: 'zoo-ind-chennai-03',
    identifier: 'ZOO-IND-003',
    name: 'Arignar Anna Zoological Park (Vandalur Zoo)',
    country: 'India',
    city: 'Chennai, Tamil Nadu',
    latitude: 12.8797,
    longitude: 80.0818,
    geofenceRadiusMeters: 2000,
    geofencePolygon: createGeofenceBox(12.8797, 80.0818, 2000),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-02T00:00:00.000Z',
    contactEmail: 'director@aazp.in',
  },
  {
    id: 'zoo-ind-bhubaneswar-04',
    identifier: 'ZOO-IND-004',
    name: 'Nandankanan Zoological Park',
    country: 'India',
    city: 'Bhubaneswar, Odisha',
    latitude: 20.3956,
    longitude: 85.8247,
    geofenceRadiusMeters: 1800,
    geofencePolygon: createGeofenceBox(20.3956, 85.8247, 1800),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-02T00:00:00.000Z',
    contactEmail: 'director@nandankanan.org',
  },
  {
    id: 'zoo-ind-hyderabad-05',
    identifier: 'ZOO-IND-005',
    name: 'Nehru Zoological Park',
    country: 'India',
    city: 'Hyderabad, Telangana',
    latitude: 17.3508,
    longitude: 78.4516,
    geofenceRadiusMeters: 1800,
    geofencePolygon: createGeofenceBox(17.3508, 78.4516, 1800),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-03T00:00:00.000Z',
    contactEmail: 'curator@hyderabadzoo.in',
  },
  {
    id: 'zoo-ind-kolkata-06',
    identifier: 'ZOO-IND-006',
    name: 'Alipore Zoological Gardens (Kolkata Zoo)',
    country: 'India',
    city: 'Kolkata, West Bengal',
    latitude: 22.5358,
    longitude: 88.3317,
    geofenceRadiusMeters: 1300,
    geofencePolygon: createGeofenceBox(22.5358, 88.3317, 1300),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-03T00:00:00.000Z',
    contactEmail: 'director@kolkatazoo.in',
  },
  {
    id: 'zoo-ind-darjeeling-07',
    identifier: 'ZOO-IND-007',
    name: 'Padmaja Naidu Himalayan Zoological Park',
    country: 'India',
    city: 'Darjeeling, West Bengal',
    latitude: 27.0583,
    longitude: 88.2562,
    geofenceRadiusMeters: 1200,
    geofencePolygon: createGeofenceBox(27.0583, 88.2562, 1200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-04T00:00:00.000Z',
    contactEmail: 'director@pnhzp.gov.in',
  },
  {
    id: 'zoo-ind-bengaluru-08',
    identifier: 'ZOO-IND-008',
    name: 'Bannerghatta Biological Park',
    country: 'India',
    city: 'Bengaluru, Karnataka',
    latitude: 12.8009,
    longitude: 77.5777,
    geofenceRadiusMeters: 2200,
    geofencePolygon: createGeofenceBox(12.8009, 77.5777, 2200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-04T00:00:00.000Z',
    contactEmail: 'ed@bannerghattabiologicalpark.org',
  },
  {
    id: 'zoo-ind-mumbai-09',
    identifier: 'ZOO-IND-009',
    name: 'Veermata Jijabai Bhosale Botanical Udyan & Zoo (Byculla Zoo)',
    country: 'India',
    city: 'Mumbai, Maharashtra',
    latitude: 18.9785,
    longitude: 72.8335,
    geofenceRadiusMeters: 1200,
    geofencePolygon: createGeofenceBox(18.9785, 72.8335, 1200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-05T00:00:00.000Z',
    contactEmail: 'director@mumbaizoo.gov.in',
  },
  {
    id: 'zoo-ind-vizag-10',
    identifier: 'ZOO-IND-010',
    name: 'Indira Gandhi Zoological Park',
    country: 'India',
    city: 'Visakhapatnam, Andhra Pradesh',
    latitude: 17.7686,
    longitude: 83.3444,
    geofenceRadiusMeters: 1800,
    geofencePolygon: createGeofenceBox(17.7686, 83.3444, 1800),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-05T00:00:00.000Z',
    contactEmail: 'curator@igzp.ap.gov.in',
  },
  {
    id: 'zoo-ind-guwahati-11',
    identifier: 'ZOO-IND-011',
    name: 'Assam State Zoo cum Botanical Garden',
    country: 'India',
    city: 'Guwahati, Assam',
    latitude: 26.1627,
    longitude: 91.7915,
    geofenceRadiusMeters: 1600,
    geofencePolygon: createGeofenceBox(26.1627, 91.7915, 1600),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-06T00:00:00.000Z',
    contactEmail: 'dfowildlife@assamstatezoo.in',
  },
  {
    id: 'zoo-ind-pune-12',
    identifier: 'ZOO-IND-012',
    name: 'Rajiv Gandhi Zoological Park (Katraj Zoo)',
    country: 'India',
    city: 'Pune, Maharashtra',
    latitude: 18.4552,
    longitude: 73.8587,
    geofenceRadiusMeters: 1500,
    geofencePolygon: createGeofenceBox(18.4552, 73.8587, 1500),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-06T00:00:00.000Z',
    contactEmail: 'director@punezoopark.in',
  },
  {
    id: 'zoo-ind-ahmedabad-13',
    identifier: 'ZOO-IND-013',
    name: 'Kamla Nehru Zoological Garden (Kankaria Zoo)',
    country: 'India',
    city: 'Ahmedabad, Gujarat',
    latitude: 23.0063,
    longitude: 72.5997,
    geofenceRadiusMeters: 1300,
    geofencePolygon: createGeofenceBox(23.0063, 72.5997, 1300),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-07T00:00:00.000Z',
    contactEmail: 'zoo@ahmedabadcity.gov.in',
  },
  {
    id: 'zoo-ind-patna-14',
    identifier: 'ZOO-IND-014',
    name: 'Sanjay Gandhi Jaivik Udyan (Patna Zoo)',
    country: 'India',
    city: 'Patna, Bihar',
    latitude: 25.5976,
    longitude: 85.0991,
    geofenceRadiusMeters: 1500,
    geofencePolygon: createGeofenceBox(25.5976, 85.0991, 1500),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-07T00:00:00.000Z',
    contactEmail: 'director@patnazoo.in',
  },
  {
    id: 'zoo-ind-udaipur-15',
    identifier: 'ZOO-IND-015',
    name: 'Gulab Bagh and Zoo',
    country: 'India',
    city: 'Udaipur, Rajasthan',
    latitude: 24.5739,
    longitude: 73.6934,
    geofenceRadiusMeters: 1200,
    geofencePolygon: createGeofenceBox(24.5739, 73.6934, 1200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-08T00:00:00.000Z',
    contactEmail: 'curator@udaipurzoo.raj.gov.in',
  },
  {
    id: 'zoo-ind-kanpur-16',
    identifier: 'ZOO-IND-016',
    name: 'Kanpur Zoological Park (Allen Forest Zoo)',
    country: 'India',
    city: 'Kanpur, Uttar Pradesh',
    latitude: 26.4952,
    longitude: 80.3015,
    geofenceRadiusMeters: 1700,
    geofencePolygon: createGeofenceBox(26.4952, 80.3015, 1700),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-08T00:00:00.000Z',
    contactEmail: 'director@allenforestzoo.up.gov.in',
  },
  {
    id: 'zoo-ind-chandigarh-17',
    identifier: 'ZOO-IND-017',
    name: 'Chhatbir Zoo (Mahendra Chaudhary Zoological Park)',
    country: 'India',
    city: 'Zirakpur / Chandigarh, Punjab',
    latitude: 30.5982,
    longitude: 76.7909,
    geofenceRadiusMeters: 1800,
    geofencePolygon: createGeofenceBox(30.5982, 76.7909, 1800),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-09T00:00:00.000Z',
    contactEmail: 'fielddirector@chhatbirzoo.gov.in',
  },
  {
    id: 'zoo-ind-trivandrum-18',
    identifier: 'ZOO-IND-018',
    name: 'Thiruvananthapuram Zoo (Trivandrum Zoo)',
    country: 'India',
    city: 'Thiruvananthapuram, Kerala',
    latitude: 8.5085,
    longitude: 76.9567,
    geofenceRadiusMeters: 1200,
    geofencePolygon: createGeofenceBox(8.5085, 76.9567, 1200),
    verified: true,
    truthRating: 0,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarms: 0,
    createdAt: '2026-02-09T00:00:00.000Z',
    contactEmail: 'director@museumzoo.kerala.gov.in',
  },
];

function getInitialDatabase(): DatabaseSchema {
  const salt = 'sentinel-fixed-salt-2026';

  // Seed default institutional admin and master authority accounts
  const adminUser: User = {
    id: 'user-admin-sd',
    email: 'admin@sandiegozoo.org',
    role: 'ZOO_ADMIN',
    fullName: 'Dr. Evelyn Martinez (Director)',
    zooId: 'zoo-sd-01',
    createdAt: '2026-01-10T00:00:00.000Z',
  };

  const adminDelhi: User = {
    id: 'user-admin-delhi',
    email: 'admin@delhizoo.gov.in',
    role: 'ZOO_ADMIN',
    fullName: 'Dr. Ramesh Kumar (Director, Delhi Zoo)',
    zooId: 'zoo-ind-delhi-01',
    createdAt: '2026-02-01T00:00:00.000Z',
  };

  const adminMysuru: User = {
    id: 'user-admin-mysuru',
    email: 'admin@mysuruzoo.info',
    role: 'ZOO_ADMIN',
    fullName: 'Smt. Rajeshwari S. (Executive Director, Mysuru Zoo)',
    zooId: 'zoo-ind-mysuru-02',
    createdAt: '2026-02-01T00:00:00.000Z',
  };

  const masterAdmin: User = {
    id: 'user-master-01',
    email: 'authority@zoosentinel.int',
    role: 'MASTER_ADMIN',
    fullName: 'Global Sentinel Master Controller',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const credentials: Record<string, { passwordHash: string; salt: string }> = {
    'user-admin-sd': {
      passwordHash: hashPassword('SentinelAdmin2026!', salt),
      salt,
    },
    'user-admin-delhi': {
      passwordHash: hashPassword('SentinelAdmin2026!', salt),
      salt,
    },
    'user-admin-mysuru': {
      passwordHash: hashPassword('SentinelAdmin2026!', salt),
      salt,
    },
    'user-master-01': {
      passwordHash: hashPassword('MasterSentinel2026!', salt),
      salt,
    },
  };

  const truthRatings: TruthRatingData[] = INITIAL_ZOOS.map((zoo) => ({
    zooId: zoo.id,
    zooName: zoo.name,
    truthRating: zoo.truthRating,
    totalReports: 0,
    confirmedCorrelations: 0,
    falseAlarmRate: 0,
    hasEnoughHistory: false,
    history: [],
  }));

  return {
    users: [adminUser, adminDelhi, adminMysuru, masterAdmin],
    zoos: INITIAL_ZOOS,
    zookeepers: [],
    accessCodes: [],
    observations: [],
    riskAnalyses: [],
    alerts: [],
    auditLogs: [
      {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorRole: 'SYSTEM',
        actorId: 'system-init',
        actorName: 'Zoo Sentinel Engine',
        action: 'SYSTEM_BOOT',
        details: 'Zoo Sentinel Production Database initialized with 23 verified institutional registries (including 18 premier Indian zoological parks).',
      },
    ],
    truthRatings,
    credentials,
    dispatchedSMS: [],
  };
}

class DatabaseService {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        let updated = false;

        if (!parsed.dispatchedSMS) {
          parsed.dispatchedSMS = [];
          updated = true;
        }

        // Auto-merge missing zoos from INITIAL_ZOOS
        for (const initialZoo of INITIAL_ZOOS) {
          const exists = parsed.zoos.some((z) => z.id === initialZoo.id || z.identifier === initialZoo.identifier);
          if (!exists) {
            parsed.zoos.push(initialZoo);
            updated = true;
          }
        }

        // Auto-merge admin users for Delhi & Mysuru if missing
        const salt = 'sentinel-fixed-salt-2026';
        const defaultAdmins: { user: User; pass: string }[] = [
          {
            user: {
              id: 'user-admin-delhi',
              email: 'admin@delhizoo.gov.in',
              role: 'ZOO_ADMIN',
              fullName: 'Dr. Ramesh Kumar (Director, Delhi Zoo)',
              zooId: 'zoo-ind-delhi-01',
              createdAt: '2026-02-01T00:00:00.000Z',
            },
            pass: 'SentinelAdmin2026!',
          },
          {
            user: {
              id: 'user-admin-mysuru',
              email: 'admin@mysuruzoo.info',
              role: 'ZOO_ADMIN',
              fullName: 'Smt. Rajeshwari S. (Executive Director, Mysuru Zoo)',
              zooId: 'zoo-ind-mysuru-02',
              createdAt: '2026-02-01T00:00:00.000Z',
            },
            pass: 'SentinelAdmin2026!',
          },
        ];

        for (const item of defaultAdmins) {
          if (!parsed.users.some((u) => u.id === item.user.id || u.email.toLowerCase() === item.user.email.toLowerCase())) {
            parsed.users.push(item.user);
            if (!parsed.credentials) parsed.credentials = {};
            parsed.credentials[item.user.id] = {
              passwordHash: hashPassword(item.pass, salt),
              salt,
            };
            updated = true;
          }
        }

        // Auto-merge truth ratings
        if (!parsed.truthRatings) parsed.truthRatings = [];
        for (const zoo of parsed.zoos) {
          if (!parsed.truthRatings.some((tr) => tr.zooId === zoo.id)) {
            parsed.truthRatings.push({
              zooId: zoo.id,
              zooName: zoo.name,
              truthRating: zoo.truthRating || 0,
              totalReports: zoo.totalReports || 0,
              confirmedCorrelations: 0,
              falseAlarmRate: 0,
              hasEnoughHistory: false,
              history: [],
            });
            updated = true;
          }
        }

        if (updated) {
          this.save(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('[DB] Failed to load DB file, reinitializing default:', err);
    }
    const initial = getInitialDatabase();
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to write database file:', err);
    }
  }

  // --- Auth & Users ---
  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  verifyUserPassword(userId: string, passwordAttempt: string): boolean {
    const cred = this.data.credentials[userId];
    if (!cred) return false;
    const attemptHash = hashPassword(passwordAttempt, cred.salt);
    return attemptHash === cred.passwordHash;
  }

  createUser(
    user: Omit<User, 'id' | 'createdAt'>,
    password?: string
  ): User {
    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);

    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      this.data.credentials[id] = {
        passwordHash: hashPassword(password, salt),
        salt,
      };
    }

    this.save();
    return newUser;
  }

  updateUserLocation(userId: string, lat: number, lng: number, permission = true) {
    const user = this.data.users.find((u) => u.id === userId);
    if (user) {
      user.latitude = lat;
      user.longitude = lng;
      user.locationPermission = true; // Always active when location coordinates are registered
      this.save();
    }
  }

  // --- Zoos & Institutional Verification ---
  getZoos(): Zoo[] {
    return this.data.zoos;
  }

  getZooById(id: string): Zoo | undefined {
    return this.data.zoos.find((z) => z.id === id);
  }

  getZooByIdentifier(identifier: string): Zoo | undefined {
    return this.data.zoos.find(
      (z) => z.identifier.toLowerCase() === identifier.trim().toLowerCase()
    );
  }

  addZoo(zoo: Omit<Zoo, 'id' | 'createdAt'>): Zoo {
    const id = `zoo-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newZoo: Zoo = {
      ...zoo,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.zoos.push(newZoo);
    this.save();
    return newZoo;
  }

  updateZooGeofence(
    zooId: string,
    polygon: [number, number][],
    centerLat?: number,
    centerLng?: number,
    radiusMeters?: number
  ): Zoo | undefined {
    const zoo = this.data.zoos.find((z) => z.id === zooId);
    if (!zoo) return undefined;

    zoo.geofencePolygon = polygon;
    if (centerLat !== undefined && centerLng !== undefined) {
      zoo.latitude = centerLat;
      zoo.longitude = centerLng;
    }
    if (radiusMeters !== undefined) {
      zoo.geofenceRadiusMeters = radiusMeters;
    }
    this.save();
    return zoo;
  }

  updateZooVerification(zooId: string, verified: boolean): Zoo | undefined {
    const zoo = this.data.zoos.find((z) => z.id === zooId);
    if (zoo) {
      zoo.verified = verified;
      this.save();
    }
    return zoo;
  }

  // --- Zookeepers & Access Codes ---
  getAllZookeepers(): Zookeeper[] {
    return this.data.zookeepers || [];
  }

  getZookeepersByZoo(zooId: string): Zookeeper[] {
    return this.data.zookeepers.filter((zk) => zk.zooId === zooId);
  }

  getZookeeperById(id: string): Zookeeper | undefined {
    return this.data.zookeepers.find((zk) => zk.id === id);
  }

  getZookeeperByBadgeOrEmail(zooId: string, identifier: string): Zookeeper | undefined {
    const term = identifier.trim().toLowerCase();
    return this.data.zookeepers.find(
      (zk) =>
        zk.zooId === zooId &&
        (zk.badgeNumber.toLowerCase() === term || zk.email.toLowerCase() === term)
    );
  }

  createZookeeper(
    zooId: string,
    fullName: string,
    badgeNumber: string,
    email: string
  ): { zookeeper: Zookeeper; rawAccessCode: string } {
    const zookeeperId = `zk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const rawAccessCode = `ZS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const codeHash = hashCode(rawAccessCode);

    const newZk: Zookeeper = {
      id: zookeeperId,
      zooId,
      fullName,
      badgeNumber,
      email,
      active: true,
      createdAt: new Date().toISOString(),
      hasActiveAccessCode: true,
    };

    const newCode: StoredAccessCode = {
      id: `code-${Date.now()}`,
      zooId,
      zookeeperId,
      codeHash,
      active: true,
      createdAt: new Date().toISOString(),
    };

    this.data.zookeepers.push(newk(newZk));
    this.data.accessCodes.push(newCode);

    // Also register user entry for zookeeper so auth recognizes them
    this.data.users.push({
      id: zookeeperId,
      email,
      role: 'ZOOKEEPER',
      fullName,
      zooId,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return { zookeeper: newZk, rawAccessCode };
  }

  revokeAccessCode(zookeeperId: string): boolean {
    const code = this.data.accessCodes.find((c) => c.zookeeperId === zookeeperId && c.active);
    const zk = this.data.zookeepers.find((z) => z.id === zookeeperId);
    if (code) {
      code.active = false;
      code.revokedAt = new Date().toISOString();
    }
    if (zk) {
      zk.hasActiveAccessCode = false;
      zk.active = false;
    }
    this.save();
    return true;
  }

  regenerateAccessCode(zooId: string, zookeeperId: string): string {
    // Revoke existing
    for (const c of this.data.accessCodes) {
      if (c.zookeeperId === zookeeperId && c.active) {
        c.active = false;
        c.revokedAt = new Date().toISOString();
      }
    }

    const rawAccessCode = `ZS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const codeHash = hashCode(rawAccessCode);

    this.data.accessCodes.push({
      id: `code-${Date.now()}`,
      zooId,
      zookeeperId,
      codeHash,
      active: true,
      createdAt: new Date().toISOString(),
    });

    const zk = this.data.zookeepers.find((z) => z.id === zookeeperId);
    if (zk) {
      zk.active = true;
      zk.hasActiveAccessCode = true;
    }

    this.save();
    return rawAccessCode;
  }

  verifyZookeeperAccessCode(
    zooId: string,
    zookeeperIdentifier: string,
    rawCodeAttempt: string
  ): { valid: boolean; zookeeper?: Zookeeper; reason?: string } {
    const zoo = this.getZooById(zooId);
    if (!zoo || !zoo.verified) {
      return { valid: false, reason: 'Institution does not exist or is not verified.' };
    }

    const zk = this.getZookeeperByBadgeOrEmail(zooId, zookeeperIdentifier);
    if (!zk) {
      return { valid: false, reason: 'Zookeeper identity not found for this institution.' };
    }

    if (!zk.active) {
      return { valid: false, reason: 'Zookeeper account is currently deactivated.' };
    }

    const attemptHash = hashCode(rawCodeAttempt);
    const codeRecord = this.data.accessCodes.find(
      (c) => c.zookeeperId === zk.id && c.zooId === zooId && c.active && c.codeHash === attemptHash
    );

    if (!codeRecord) {
      return { valid: false, reason: 'Invalid or revoked Zoo Access Code.' };
    }

    // Check expiration if any
    if (codeRecord.expiresAt && new Date(codeRecord.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: 'Zoo Access Code has expired.' };
    }

    zk.lastActiveAt = new Date().toISOString();
    this.save();

    return { valid: true, zookeeper: zk };
  }

  // --- Observations ---
  getObservations(limit = 100): Observation[] {
    return [...this.data.observations]
      .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
      .slice(0, limit);
  }

  getObservationsByZoo(zooId: string): Observation[] {
    return this.data.observations.filter((o) => o.zooId === zooId);
  }

  addObservation(obs: Omit<Observation, 'id' | 'createdAt'>): Observation {
    const id = `obs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newObs: Observation = {
      ...obs,
      id,
      createdAt: new Date().toISOString(),
    };

    this.data.observations.unshift(newObs);

    // Update zoo report count
    const zoo = this.data.zoos.find((z) => z.id === obs.zooId);
    if (zoo && obs.verificationStatus === 'VERIFIED_IN_GEOFENCE') {
      zoo.totalReports += 1;
    }

    this.save();
    return newObs;
  }

  // --- Risk Analyses & Alerts ---
  getLatestRiskAnalysis(): RiskAnalysis | null {
    if (this.data.riskAnalyses.length === 0) return null;
    return this.data.riskAnalyses[0];
  }

  saveRiskAnalysis(analysis: RiskAnalysis) {
    this.data.riskAnalyses.unshift(analysis);
    if (this.data.riskAnalyses.length > 50) {
      this.data.riskAnalyses.pop();
    }
    this.save();
  }

  getAlerts(limit = 50): Alert[] {
    return this.data.alerts.slice(0, limit);
  }

  addAlert(alert: Alert) {
    this.data.alerts.unshift(alert);
    if (this.data.alerts.length > 50) {
      this.data.alerts.pop();
    }
    this.save();
  }

  // --- Citizens & Geo Query ---
  getCitizensWithLocation(): User[] {
    return this.data.users.filter(
      (u) =>
        u.role === 'CITIZEN' &&
        u.latitude !== undefined &&
        u.longitude !== undefined &&
        !isNaN(Number(u.latitude)) &&
        !isNaN(Number(u.longitude)) &&
        Boolean(u.phoneNumber)
    );
  }

  // --- Dispatched SMS Queue & History ---
  getDispatchedSMS(phoneNumber?: string): DispatchedSMS[] {
    if (!this.data.dispatchedSMS) {
      this.data.dispatchedSMS = [];
    }
    if (phoneNumber) {
      const digitsTarget = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
      return this.data.dispatchedSMS.filter((sms) => {
        const digitsSms = sms.phoneNumber.replace(/[^0-9]/g, '').slice(-10);
        return digitsSms === digitsTarget;
      });
    }
    return this.data.dispatchedSMS;
  }

  addDispatchedSMS(sms: DispatchedSMS) {
    if (!this.data.dispatchedSMS) {
      this.data.dispatchedSMS = [];
    }
    this.data.dispatchedSMS.unshift(sms);
    if (this.data.dispatchedSMS.length > 200) {
      this.data.dispatchedSMS.pop();
    }
    this.save();
  }

  // --- Truth Ratings ---
  getTruthRatings(): TruthRatingData[] {
    return this.data.truthRatings;
  }

  recordTruthCorrelation(
    zooId: string,
    outcome: 'CORRELATED' | 'UNVERIFIED' | 'FALSE_ALARM',
    notes: string,
    eventType: string
  ) {
    let tr = this.data.truthRatings.find((t) => t.zooId === zooId);
    const zoo = this.data.zoos.find((z) => z.id === zooId);
    if (!tr && zoo) {
      tr = {
        zooId: zoo.id,
        zooName: zoo.name,
        truthRating: 85,
        totalReports: zoo.totalReports,
        confirmedCorrelations: 0,
        falseAlarmRate: 0,
        hasEnoughHistory: false,
        history: [],
      };
      this.data.truthRatings.push(tr);
    }

    if (tr && zoo) {
      tr.history.unshift({
        id: `trh-${Date.now()}`,
        date: new Date().toISOString(),
        eventType,
        outcome,
        notes,
      });

      if (outcome === 'CORRELATED') {
        tr.confirmedCorrelations += 1;
        zoo.confirmedCorrelations += 1;
      } else if (outcome === 'FALSE_ALARM') {
        zoo.falseAlarms += 1;
      }

      tr.hasEnoughHistory = tr.history.length >= 3;
      // Formula: base truth rating calibrated by accuracy
      if (tr.history.length > 0) {
        const falseAlarms = tr.history.filter((h) => h.outcome === 'FALSE_ALARM').length;
        tr.falseAlarmRate = Math.round((falseAlarms / tr.history.length) * 100);
        const correlationRate = (tr.confirmedCorrelations / tr.history.length) * 100;
        tr.truthRating = Math.max(50, Math.min(99, Math.round(70 + correlationRate * 0.3 - tr.falseAlarmRate * 0.2)));
        zoo.truthRating = tr.truthRating;
      }

      this.save();
    }
  }

  // --- Audit Logs ---
  getAuditLogs(limit = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  logAudit(
    actorRole: string,
    actorId: string,
    actorName: string,
    action: string,
    details: string,
    ipAddress?: string
  ) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorRole,
      actorId,
      actorName,
      action,
      details,
      ipAddress,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 300) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  resetCleanDatabase(): DatabaseSchema {
    const clean = getInitialDatabase();
    this.data = clean;
    this.save(clean);
    return clean;
  }
}

function newk(z: Zookeeper): Zookeeper {
  return { ...z };
}

export const db = new DatabaseService();
