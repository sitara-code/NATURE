export type Role = 'ZOO_ADMIN' | 'ZOOKEEPER' | 'CITIZEN' | 'MASTER_ADMIN';

export type AnimalSpecies = 'Elephant' | 'Crocodile' | 'Hummingbird' | 'Giraffe';

export const ALLOWED_ANIMALS: AnimalSpecies[] = [
  'Elephant',
  'Crocodile',
  'Hummingbird',
  'Giraffe',
];

export type BehaviourCategory =
  | 'Sudden fleeing'
  | 'Abnormal vocalization'
  | 'Unusual silence'
  | 'Repeated agitation'
  | 'Burrowing animals emerging'
  | 'Abnormal grouping'
  | 'Sudden movement';

export const ALLOWED_BEHAVIOURS: BehaviourCategory[] = [
  'Sudden fleeing',
  'Abnormal vocalization',
  'Unusual silence',
  'Repeated agitation',
  'Burrowing animals emerging',
  'Abnormal grouping',
  'Sudden movement',
];

export type HazardType = 'Earthquake' | 'Storm' | 'Cyclone' | 'Wildfire' | 'Unclassified';

export type SeverityLevel = 1 | 2 | 3 | 4 | 5; // 1: Mild, 5: Extreme panic/agitation

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  badgeNumber?: string;
  zooId?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  locationPermission?: boolean;
  registeredLocation?: string;
  createdAt: string;
}

export interface Zoo {
  id: string;
  name: string;
  identifier: string; // Institution ID e.g. ZOO-SD-001
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number; // For circular display or fallback
  geofencePolygon: [number, number][]; // [[lat, lng], [lat, lng], ...]
  verified: boolean;
  truthRating: number; // 0 - 100
  totalReports: number;
  confirmedCorrelations: number;
  falseAlarms: number;
  createdAt: string;
  contactEmail?: string;
}

export interface Zookeeper {
  id: string;
  zooId: string;
  fullName: string;
  badgeNumber: string;
  email: string;
  active: boolean;
  createdAt: string;
  lastActiveAt?: string;
  hasActiveAccessCode: boolean;
}

export interface Observation {
  id: string;
  zooId: string;
  zookeeperId: string;
  zookeeperName: string;
  zooName: string;
  species: AnimalSpecies | string;
  totalAnimals?: number; // Integer, min 1
  animalsShowingBehaviour?: number; // Integer, min 0, <= totalAnimals
  durationMinutes?: number; // Duration for which behaviour was shown (in minutes)
  abnormalityPercentage?: number; // Calculated: (animalsShowingBehaviour / totalAnimals) * 100
  behaviourCategory: BehaviourCategory; // ML Variable X1
  intensity?: number; // Optional legacy field
  description: string;
  severity: SeverityLevel;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  latitude: number;
  longitude: number;
  gpsAccuracy: number; // in meters
  observedAt: string; // ISO string
  createdAt: string; // server timestamp
  verificationStatus: 'VERIFIED_IN_GEOFENCE' | 'REJECTED_OUT_OF_GEOFENCE';
  geofenceDistanceMeters?: number;
}

export interface RiskAnalysis {
  id: string;
  analysisTime: string;
  eventType: HazardType;
  riskScore: number; // 0 - 100
  confidence: 'Low' | 'Moderate' | 'High';
  observationCount: number;
  zooCount: number;
  speciesCount: number;
  centerLatitude: number;
  centerLongitude: number;
  estimatedRadiusKm: number;
  estimatedTimeWindow: string; // e.g., "1–3 hours" or "Insufficient data for a reliable time-window estimate."
  explanation: string[];
  factors: {
    temporalClustering: number;
    spatialClustering: number;
    crossSpeciesAgreement: number;
    observationSeverity: number;
    independentZoos: number;
    environmentalCorroboration: number;
    uncertaintyDeduction: number;
  };
  hazardBreakdown: Record<HazardType, number>;
  observationsIncluded: string[];
  modelVersion: string;
}

export interface Alert {
  id: string;
  riskAnalysisId: string;
  title: string;
  hazard: HazardType;
  severity: 'Advisory' | 'Watch' | 'Critical';
  riskScore: number;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  polygon: [number, number][];
  message: string;
  createdAt: string;
  targetedCitizensCount: number;
  smsDispatchStatus: 'SENT' | 'PROVIDER_NOT_CONFIGURED' | 'FAILED' | 'NO_CITIZENS_IN_ZONE';
  smsProviderNote: string;
}

export interface DispatchedSMS {
  id: string;
  alertId?: string;
  phoneNumber: string;
  normalizedPhone: string;
  recipientName?: string;
  message: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  carrierGateway: string;
  dispatchedAt: string;
  details?: string;
}

export interface Citizen {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  latitude?: number;
  longitude?: number;
  locationPermission: boolean;
  registeredCity?: string;
  createdAt: string;
}

export interface TruthRatingData {
  zooId: string;
  zooName: string;
  truthRating: number;
  totalReports: number;
  confirmedCorrelations: number;
  falseAlarmRate: number;
  hasEnoughHistory: boolean;
  history: Array<{
    id: string;
    date: string;
    eventType: string;
    outcome: 'CORRELATED' | 'UNVERIFIED' | 'FALSE_ALARM';
    notes: string;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorRole: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface AuthState {
  user: User | null;
  zoo?: Zoo | null;
  token?: string | null;
}

export interface SystemStatus {
  databaseConnected: boolean;
  activeObservationsCount: number;
  activeZookeepersCount: number;
  totalZookeepersCount: number;
  activeInstitutionsCount: number;
  smsServiceConfigured: boolean;
  smsSendMode: 'LIVE' | 'SIMULATED';
  riskEngineState: 'IDLE' | 'ACTIVE';
  activeClustersCount: number;
  lastCalculationTimestamp: string | null;
  alertsDispatchedCount: number;
  geofenceValidationEnforced: boolean;
}
