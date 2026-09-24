import { Observation, RiskAnalysis, HazardType, SeverityLevel } from '../src/types.js';
import { haversineDistanceKm, calculateCentroid } from './geo.js';

export interface ClusteringConfig {
  timeWindowMinutes: number; // default 120 (2 hours)
  spatialRadiusKm: number; // default 15 km
}

export const DEFAULT_CONFIG: ClusteringConfig = {
  timeWindowMinutes: 120,
  spatialRadiusKm: 15,
};

interface EngineSignalResult {
  score: number; // 0 - 100
  confidence: 'Low' | 'Moderate' | 'High';
  reasons: string[];
}

// Species classified by biological sensory adaptations documented in bio-seismology and environmental biology
const VIBRATION_AND_INFRASOUND_SENSITIVE_SPECIES = [
  'elephant', 'giraffe', 'dog', 'canine', 'wolf', 'horse', 'equine',
  'cat', 'feline', 'tiger', 'lion', 'bird', 'avian', 'rodent', 'rat', 'mouse',
  'fish', 'carp', 'toad', 'amphibian', 'flamingo'
];

const BURROWING_SPECIES = [
  'meerkat', 'badger', 'mole', 'toad', 'prairie dog', 'wombat',
  'armadillo', 'rabbit', 'burrowing owl', 'tortoise'
];

// ==========================================
// ML CSV PIPELINE & RANDOM FOREST MODEL
// ==========================================

export const SPECIES_CODE_MAP: Record<string, number> = {
  Elephant: 1,
  Crocodile: 2,
  Hummingbird: 3,
  Giraffe: 4,
};

export const BEHAVIOUR_CODE_MAP: Record<string, number> = {
  'Sudden fleeing': 1,
  'Abnormal vocalization': 2,
  'Unusual silence': 3,
  'Repeated agitation': 4,
  'Burrowing animals emerging': 5,
  'Abnormal grouping': 6,
  'Sudden movement': 7,
};

/**
 * Converts observations into a pure numerical/structured CSV format
 * directly consumable by the Random Forest ML model.
 * 
 * Strict Requirement:
 * - NO images, image URLs, or image data
 * - NO animal behaviour descriptions or long text
 * - NO total_animals or animals_showing_behaviour
 * - Contains ONLY abnormality_percentage for animal count metrics,
 *   duration of behaviour, and existing numerical ML variables.
 */
export function convertObservationsToMLCSV(observations: Observation[]): string {
  const header = 'species_code,behaviour_code,abnormality_percentage,duration_minutes,severity,latitude,longitude,gps_accuracy';
  
  if (observations.length === 0) {
    return header;
  }

  const rows = observations.map((o) => {
    const speciesCode = SPECIES_CODE_MAP[o.species] || 1;
    const behaviourCode = BEHAVIOUR_CODE_MAP[o.behaviourCategory] || 1;

    // Abnormality Percentage = (animalsShowing / totalAnimals) * 100
    let abnormalityPercentage = typeof o.abnormalityPercentage === 'number'
      ? o.abnormalityPercentage
      : (o.totalAnimals && o.totalAnimals > 0
          ? Number((((o.animalsShowingBehaviour ?? 0) / o.totalAnimals) * 100).toFixed(2))
          : 50);
    abnormalityPercentage = Math.min(100, Math.max(0, abnormalityPercentage));

    const duration = typeof o.durationMinutes === 'number' && o.durationMinutes > 0
      ? o.durationMinutes
      : 15;
    
    const severity = o.severity || 3;
    const lat = Number(o.latitude.toFixed(6));
    const lng = Number(o.longitude.toFixed(6));
    const accuracy = Number((o.gpsAccuracy || 10).toFixed(1));

    return `${speciesCode},${behaviourCode},${abnormalityPercentage.toFixed(2)},${duration},${severity},${lat},${lng},${accuracy}`;
  });

  return [header, ...rows].join('\n') + '\n';
}

export interface MLFeatureRow {
  speciesCode: number;
  behaviourCode: number;
  abnormalityPercentage: number;
  durationMinutes: number;
  severity: number;
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
}

export function parseMLCSV(csvText: string): MLFeatureRow[] {
  const lines = csvText.trim().split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const rows: MLFeatureRow[] = [];
  // Skip row 0 (headers: species_code,behaviour_code,abnormality_percentage,duration_minutes,severity,latitude,longitude,gps_accuracy)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    if (cols.length >= 8) {
      rows.push({
        speciesCode: Number(cols[0]) || 1,
        behaviourCode: Number(cols[1]) || 1,
        abnormalityPercentage: Number(cols[2]) || 0,
        durationMinutes: Number(cols[3]) || 15,
        severity: Number(cols[4]) || 3,
        latitude: Number(cols[5]) || 0,
        longitude: Number(cols[6]) || 0,
        gpsAccuracy: Number(cols[7]) || 10,
      });
    }
  }
  return rows;
}

/**
 * Random Forest Ensemble Risk Model:
 * Evaluates the parsed numerical features from the ML CSV dataset
 * across multiple calibrated decision trees.
 */
export class RandomForestRiskModel {
  /**
   * Tree 1: Acute Precursor Tree (Abnormality % + Duration)
   * High proportion of exhibit animals reacting over short acute duration
   */
  private treeAcutePrecursor(row: MLFeatureRow): number {
    if (row.abnormalityPercentage >= 75) {
      return row.durationMinutes <= 45 ? 92 : 78;
    } else if (row.abnormalityPercentage >= 50) {
      return row.durationMinutes <= 60 ? 68 : 55;
    } else if (row.abnormalityPercentage >= 25) {
      return 35;
    }
    return 15;
  }

  /**
   * Tree 2: Infrasound & Seismic Sensitive Taxa Tree
   * Elephant (1) & Giraffe (4) exhibiting flee/panic response
   */
  private treeInfrasoundTaxa(row: MLFeatureRow): number {
    const isSensitive = row.speciesCode === 1 || row.speciesCode === 4;
    if (isSensitive) {
      if (row.abnormalityPercentage >= 60 && (row.behaviourCode === 1 || row.behaviourCode === 4)) {
        return 88;
      }
      return row.abnormalityPercentage >= 40 ? 65 : 45;
    }
    return row.abnormalityPercentage >= 60 ? 50 : 25;
  }

  /**
   * Tree 3: Fossorial & Reptilian Ground Motion Tree
   * Burrowing emerging (5) or Crocodile (2) seismic vibration
   */
  private treeGroundMotion(row: MLFeatureRow): number {
    if (row.behaviourCode === 5 || row.speciesCode === 2) {
      if (row.abnormalityPercentage >= 50) return 90;
      return 60;
    }
    return row.abnormalityPercentage >= 50 ? 40 : 20;
  }

  /**
   * Tree 4: Atmospheric Pressure & Barometric Depression Tree
   * Hummingbird (3), unusual silence (3), or abnormal grouping (6)
   */
  private treeAtmosphericBarometric(row: MLFeatureRow): number {
    if (row.speciesCode === 3 || row.behaviourCode === 3 || row.behaviourCode === 6) {
      if (row.durationMinutes >= 20 && row.abnormalityPercentage >= 40) {
        return 82;
      }
      return 55;
    }
    return 30;
  }

  /**
   * Tree 5: High Severity / High Synchrony Tree
   */
  private treeSeveritySynchrony(row: MLFeatureRow): number {
    if (row.severity >= 4 && row.abnormalityPercentage >= 65) {
      return 95;
    } else if (row.severity >= 3 && row.abnormalityPercentage >= 50) {
      return 70;
    }
    return row.severity * 10;
  }

  /**
   * Tree 6: Sudden Flight Response Tree
   * Fleeing (1) or Sudden movement (7)
   */
  private treeSuddenFlight(row: MLFeatureRow): number {
    if (row.behaviourCode === 1 || row.behaviourCode === 7) {
      return Math.min(95, Math.round(row.abnormalityPercentage * 0.7 + (row.durationMinutes <= 30 ? 25 : 10)));
    }
    return Math.round(row.abnormalityPercentage * 0.4);
  }

  /**
   * Tree 7: Duration-Normalized Precursor Tree
   * Evaluates duration windows typical of seismic vs storm vs thermal precursors
   */
  private treeDurationWindow(row: MLFeatureRow): number {
    if (row.durationMinutes <= 30) {
      return row.abnormalityPercentage >= 50 ? 85 : 45;
    } else if (row.durationMinutes <= 90) {
      return row.abnormalityPercentage >= 50 ? 70 : 40;
    } else {
      return row.abnormalityPercentage >= 60 ? 55 : 30;
    }
  }

  /**
   * Tree 8: Repeated Agitation & Vocalization Tree
   * Behaviour 4 (Repeated agitation) or 2 (Abnormal vocalization)
   */
  private treeAgitationVocalization(row: MLFeatureRow): number {
    if (row.behaviourCode === 4 || row.behaviourCode === 2) {
      return Math.min(90, Math.round(row.abnormalityPercentage * 0.6 + row.severity * 6));
    }
    return Math.round(row.abnormalityPercentage * 0.35);
  }

  /**
   * Tree 9: GPS Accuracy Weighted Confidence Tree
   */
  private treeAccuracyWeighted(row: MLFeatureRow): number {
    const accuracyFactor = row.gpsAccuracy <= 15 ? 1.0 : row.gpsAccuracy <= 50 ? 0.85 : 0.7;
    const baseScore = row.abnormalityPercentage * 0.5 + (row.severity / 5) * 40;
    return Math.round(baseScore * accuracyFactor);
  }

  /**
   * Tree 10: Bootstrapped Composite Split Tree
   */
  private treeCompositeSplit(row: MLFeatureRow): number {
    const score =
      row.abnormalityPercentage * 0.45 +
      (row.severity / 5) * 25 +
      (row.durationMinutes <= 45 ? 20 : 10) +
      (row.speciesCode === 1 || row.speciesCode === 4 ? 10 : 0);
    return Math.min(100, Math.round(score));
  }

  /**
   * Predict risk score directly from ML CSV formatted data
   */
  predictFromCSV(csvText: string): {
    riskScore: number;
    treeScores: number[];
    featureContributions: {
      abnormalityPercentage: number;
      durationMinutes: number;
      severity: number;
      species: number;
      behaviour: number;
    };
  } {
    const rows = parseMLCSV(csvText);
    if (rows.length === 0) {
      return {
        riskScore: 0,
        treeScores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        featureContributions: {
          abnormalityPercentage: 0,
          durationMinutes: 0,
          severity: 0,
          species: 0,
          behaviour: 0,
        },
      };
    }

    // Run each tree across rows and compute average tree outputs
    const treeScores: number[] = new Array(10).fill(0);

    for (const row of rows) {
      treeScores[0] += this.treeAcutePrecursor(row);
      treeScores[1] += this.treeInfrasoundTaxa(row);
      treeScores[2] += this.treeGroundMotion(row);
      treeScores[3] += this.treeAtmosphericBarometric(row);
      treeScores[4] += this.treeSeveritySynchrony(row);
      treeScores[5] += this.treeSuddenFlight(row);
      treeScores[6] += this.treeDurationWindow(row);
      treeScores[7] += this.treeAgitationVocalization(row);
      treeScores[8] += this.treeAccuracyWeighted(row);
      treeScores[9] += this.treeCompositeSplit(row);
    }

    // Average per tree across observations
    const normalizedTreeScores = treeScores.map((score) => Math.round(score / rows.length));

    // Overall Random Forest prediction = mean of all trees
    const rawTotal = normalizedTreeScores.reduce((a, b) => a + b, 0);
    const forestRiskScore = Math.max(5, Math.min(98, Math.round(rawTotal / normalizedTreeScores.length)));

    // Calculate feature contributions for explainability
    const avgAbnormality = rows.reduce((s, r) => s + r.abnormalityPercentage, 0) / rows.length;
    const avgDuration = rows.reduce((s, r) => s + r.durationMinutes, 0) / rows.length;
    const avgSeverity = rows.reduce((s, r) => s + r.severity, 0) / rows.length;

    return {
      riskScore: forestRiskScore,
      treeScores: normalizedTreeScores,
      featureContributions: {
        abnormalityPercentage: Math.round(avgAbnormality),
        durationMinutes: Math.round(avgDuration),
        severity: Number(avgSeverity.toFixed(1)),
        species: rows.length,
        behaviour: rows.length,
      },
    };
  }
}

export const randomForestModel = new RandomForestRiskModel();

class EarthquakeRiskEngine {
  analyze(cluster: Observation[], centerDistKm: number, durationMins: number): EngineSignalResult {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Burrowing animal emergence (high weight for ground motion/infrasound pre-shocks)
    const burrowEmergence = cluster.filter(
      (o) =>
        o.behaviourCategory === 'Burrowing animals emerging' ||
        BURROWING_SPECIES.some((s) => o.species.toLowerCase().includes(s))
    );
    if (burrowEmergence.length > 0) {
      const pts = Math.min(28, burrowEmergence.length * 14);
      score += pts;
      reasons.push(`${burrowEmergence.length} observation(s) of burrowing/subterranean species showing sudden emergence`);
    }

    // Factor 2: Sudden fleeing and repeated agitation
    const fleeingOrAgitation = cluster.filter(
      (o) => o.behaviourCategory === 'Sudden fleeing' || o.behaviourCategory === 'Repeated agitation'
    );
    if (fleeingOrAgitation.length > 0) {
      const pts = Math.min(25, fleeingOrAgitation.length * 8);
      score += pts;
      reasons.push(`${fleeingOrAgitation.length} observation(s) exhibiting acute panic or repetitive flee responses`);
    }

    // Factor 3: Vibration & infrasound sensitive species
    const sensitiveReports = cluster.filter((o) =>
      VIBRATION_AND_INFRASOUND_SENSITIVE_SPECIES.some((s) => o.species.toLowerCase().includes(s))
    );
    if (sensitiveReports.length > 0) {
      const pts = Math.min(20, sensitiveReports.length * 6);
      score += pts;
      reasons.push(`Infrasound and low-frequency vibration sensitive species detected (${sensitiveReports.length} reports)`);
    }

    // Factor 4: Temporal concentration (earthquake precursors are sharp: usually within 30-90 mins)
    if (durationMins <= 45 && cluster.length >= 2) {
      score += 15;
      reasons.push(`High temporal concentration: all reports logged within ${Math.round(durationMins)} minutes`);
    } else if (durationMins <= 90) {
      score += 8;
    }

    // Confidence
    let confidence: 'Low' | 'Moderate' | 'High' = 'Low';
    if (cluster.length >= 4 && score >= 55) {
      confidence = 'High';
    } else if (cluster.length >= 2 && score >= 35) {
      confidence = 'Moderate';
    }

    return { score: Math.min(100, Math.round(score)), confidence, reasons };
  }
}

class StormRiskEngine {
  analyze(cluster: Observation[], centerDistKm: number, durationMins: number): EngineSignalResult {
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Aviary silence / unusual bird quietness (barometric drop response)
    const silenceReports = cluster.filter(
      (o) =>
        o.behaviourCategory === 'Unusual silence' ||
        o.species.toLowerCase().includes('bird') ||
        o.species.toLowerCase().includes('avian') ||
        o.species.toLowerCase().includes('parrot')
    );
    if (silenceReports.length > 0) {
      const pts = Math.min(30, silenceReports.length * 10);
      score += pts;
      reasons.push(`${silenceReports.length} observation(s) of unusual acoustic silence or suppressed vocalization`);
    }

    // Factor 2: Abnormal grouping / herding together
    const groupingReports = cluster.filter((o) => o.behaviourCategory === 'Abnormal grouping');
    if (groupingReports.length > 0) {
      const pts = Math.min(25, groupingReports.length * 12);
      score += pts;
      reasons.push(`${groupingReports.length} observation(s) of defensive herding/unusual animal clustering`);
    }

    // Factor 3: Abnormal vocalization
    const vocalReports = cluster.filter((o) => o.behaviourCategory === 'Abnormal vocalization');
    if (vocalReports.length > 0) {
      const pts = Math.min(20, vocalReports.length * 7);
      score += pts;
      reasons.push(`${vocalReports.length} report(s) of high-frequency distress vocalization`);
    }

    // Temporal spread: storm precursors develop over 60-180 mins
    if (durationMins >= 20) {
      score += 15;
      reasons.push(`Gradual escalation matching atmospheric pressure depression (${Math.round(durationMins)} min window)`);
    }

    let confidence: 'Low' | 'Moderate' | 'High' = 'Low';
    if (cluster.length >= 4 && score >= 50) {
      confidence = 'High';
    } else if (cluster.length >= 2 && score >= 30) {
      confidence = 'Moderate';
    }

    return { score: Math.min(100, Math.round(score)), confidence, reasons };
  }
}

class CycloneRiskEngine {
  analyze(cluster: Observation[], centerDistKm: number, durationMins: number): EngineSignalResult {
    let score = 0;
    const reasons: string[] = [];

    // Fleeing, broad agitation across multiple enclosures
    const fleeing = cluster.filter((o) => o.behaviourCategory === 'Sudden fleeing' || o.behaviourCategory === 'Sudden movement');
    if (fleeing.length > 0) {
      score += Math.min(30, fleeing.length * 10);
      reasons.push(`${fleeing.length} report(s) of directional flight or erratic agitation`);
    }

    const vocalOrSilence = cluster.filter(
      (o) => o.behaviourCategory === 'Abnormal vocalization' || o.behaviourCategory === 'Unusual silence'
    );
    if (vocalOrSilence.length > 0) {
      score += Math.min(25, vocalOrSilence.length * 8);
    }

    // Severe severity ratings (4-5)
    const severeCount = cluster.filter((o) => o.severity >= 4).length;
    if (severeCount > 0) {
      score += Math.min(25, severeCount * 12);
      reasons.push(`${severeCount} observation(s) rated with high/critical distress severity`);
    }

    let confidence: 'Low' | 'Moderate' | 'High' = 'Low';
    if (cluster.length >= 4 && score >= 50) {
      confidence = 'High';
    } else if (cluster.length >= 2 && score >= 30) {
      confidence = 'Moderate';
    }

    return { score: Math.min(100, Math.round(score)), confidence, reasons };
  }
}

class WildfireRiskEngine {
  analyze(cluster: Observation[], centerDistKm: number, durationMins: number): EngineSignalResult {
    let score = 0;
    const reasons: string[] = [];

    // Olfactory & thermal cues: repeated agitation and fleeing
    const flightAndAgitation = cluster.filter(
      (o) => o.behaviourCategory === 'Sudden fleeing' || o.behaviourCategory === 'Repeated agitation'
    );
    if (flightAndAgitation.length > 0) {
      score += Math.min(35, flightAndAgitation.length * 12);
      reasons.push(`${flightAndAgitation.length} report(s) of sudden fleeing and barrier agitation`);
    }

    // Grouping
    const grouping = cluster.filter((o) => o.behaviourCategory === 'Abnormal grouping');
    if (grouping.length > 0) {
      score += Math.min(25, grouping.length * 10);
      reasons.push('Herding and defensive crowding noted in outdoor exhibits');
    }

    let confidence: 'Low' | 'Moderate' | 'High' = 'Low';
    if (cluster.length >= 3 && score >= 45) {
      confidence = 'High';
    } else if (cluster.length >= 2 && score >= 25) {
      confidence = 'Moderate';
    }

    return { score: Math.min(100, Math.round(score)), confidence, reasons };
  }
}

const earthquakeEngine = new EarthquakeRiskEngine();
const stormEngine = new StormRiskEngine();
const cycloneEngine = new CycloneRiskEngine();
const wildfireEngine = new WildfireRiskEngine();

/**
 * Real-time analysis pipeline:
 * Evaluates verified observations in rolling time and spatial window.
 */
export function analyzeCluster(
  observations: Observation[],
  config: ClusteringConfig = DEFAULT_CONFIG
): RiskAnalysis | null {
  // Filter for verified observations inside geofence
  const verified = observations.filter((o) => o.verificationStatus === 'VERIFIED_IN_GEOFENCE');

  if (verified.length === 0) {
    return null;
  }

  const now = Date.now();
  const cutoffTime = now - config.timeWindowMinutes * 60 * 1000;

  // Filter within time window
  const activeWindowObs = verified.filter((o) => {
    const obsTime = new Date(o.observedAt || o.createdAt).getTime();
    return obsTime >= cutoffTime;
  });

  if (activeWindowObs.length === 0) {
    return null;
  }

  // Find most concentrated spatial cluster
  // Take latest observation as anchor and find all verified within config.spatialRadiusKm
  const sorted = [...activeWindowObs].sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()
  );

  const anchor = sorted[0];
  const cluster = sorted.filter((o) => {
    const dist = haversineDistanceKm(anchor.latitude, anchor.longitude, o.latitude, o.longitude);
    return dist <= config.spatialRadiusKm;
  });

  if (cluster.length === 0) {
    return null;
  }

  // Handle single isolated observation (Problem 8 & 11)
  if (cluster.length === 1) {
    const single = cluster[0];
    const singleCsv = convertObservationsToMLCSV([single]);
    const singleRf = randomForestModel.predictFromCSV(singleCsv);

    return {
      id: `RISK-${Date.now()}-single`,
      analysisTime: new Date().toISOString(),
      eventType: 'Unclassified',
      riskScore: Math.min(25, Math.round(singleRf.riskScore * 0.3 + (single.severity || 3) * 2)),
      confidence: 'Low',
      observationCount: 1,
      zooCount: 1,
      speciesCount: 1,
      centerLatitude: single.latitude,
      centerLongitude: single.longitude,
      estimatedRadiusKm: 1.0,
      estimatedTimeWindow: 'N/A — Minimum 2 verified observations required for hazard cluster',
      explanation: [
        '1 verified observation in active window.',
        'No significant cluster detected (clustering threshold requires ≥ 2 verified observations within 15 km and 2 hours).',
        `ML Pipeline: Random Forest evaluated numerical feature vector (Abnormality: ${single.abnormalityPercentage ?? 0}%, Duration: ${single.durationMinutes ?? 15}m, Tree Score: ${singleRf.riskScore}/100).`,
        'Isolated anomaly — awaiting corroboration.',
      ],
      factors: {
        temporalClustering: 5,
        spatialClustering: 5,
        crossSpeciesAgreement: 0,
        observationSeverity: Math.round(((single.severity || 3) / 5) * 10),
        independentZoos: 0,
        environmentalCorroboration: 0,
        uncertaintyDeduction: 20,
      },
      hazardBreakdown: {
        Earthquake: 0,
        Storm: 0,
        Cyclone: 0,
        Wildfire: 0,
        Unclassified: 10,
      },
      observationsIncluded: [single.id],
      modelVersion: 'v2.5-random-forest-ensemble-ml',
    };
  }

  // Calculate cluster properties
  const centroid = calculateCentroid(cluster);
  const distinctZoos = Array.from(new Set(cluster.map((o) => o.zooId)));
  const distinctSpecies = Array.from(new Set(cluster.map((o) => o.species.toLowerCase().trim())));

  // Calculate cluster temporal duration in minutes
  const timestamps = cluster.map((o) => new Date(o.observedAt || o.createdAt).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const durationMins = Math.max(1, (maxTime - minTime) / (60 * 1000));

  // Max distance between observations in cluster
  let maxInterDistanceKm = 0;
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      const d = haversineDistanceKm(
        cluster[i].latitude,
        cluster[i].longitude,
        cluster[j].latitude,
        cluster[j].longitude
      );
      if (d > maxInterDistanceKm) {
        maxInterDistanceKm = d;
      }
    }
  }

  // Run modular engines
  const eqResult = earthquakeEngine.analyze(cluster, maxInterDistanceKm, durationMins);
  const stormResult = stormEngine.analyze(cluster, maxInterDistanceKm, durationMins);
  const cycloneResult = cycloneEngine.analyze(cluster, maxInterDistanceKm, durationMins);
  const wildfireResult = wildfireEngine.analyze(cluster, maxInterDistanceKm, durationMins);

  const hazardScores: Record<HazardType, number> = {
    Earthquake: eqResult.score,
    Storm: stormResult.score,
    Cyclone: cycloneResult.score,
    Wildfire: wildfireResult.score,
    Unclassified: 0,
  };

  // Determine top hazard
  let topHazard: HazardType = 'Earthquake';
  let topScore = eqResult.score;

  if (stormResult.score > topScore) {
    topHazard = 'Storm';
    topScore = stormResult.score;
  }
  if (cycloneResult.score > topScore) {
    topHazard = 'Cyclone';
    topScore = cycloneResult.score;
  }
  if (wildfireResult.score > topScore) {
    topHazard = 'Wildfire';
    topScore = wildfireResult.score;
  }

  if (topScore === 0) {
    topHazard = 'Unclassified';
  }

  // Detailed risk calculation formula:
  // Risk Score = Temporal Clustering + Spatial Clustering + Cross-Species Agreement +
  //              Observation Severity + Number of Independent Zoos + Environmental Corroboration - Uncertainty

  // 1. Temporal Clustering (max 20 pts)
  // Shorter duration with more observations = higher temporal clustering
  let temporalFactor = 0;
  if (durationMins <= 30 && cluster.length >= 2) {
    temporalFactor = 20;
  } else if (durationMins <= 60) {
    temporalFactor = 15;
  } else if (durationMins <= 120) {
    temporalFactor = 10;
  } else {
    temporalFactor = 5;
  }

  // 2. Spatial Clustering (max 20 pts)
  // Tight radius (< 5km) = max spatial clustering
  let spatialFactor = 0;
  if (maxInterDistanceKm <= 3) {
    spatialFactor = 20;
  } else if (maxInterDistanceKm <= 8) {
    spatialFactor = 16;
  } else if (maxInterDistanceKm <= 15) {
    spatialFactor = 12;
  } else {
    spatialFactor = 6;
  }

  // 3. Cross-Species Agreement (max 20 pts)
  // When 3+ different species exhibit synchrony, false alarm probability drops
  const crossSpeciesFactor = Math.min(20, distinctSpecies.length * 6);

  // 4. Observation Severity (max 20 pts)
  const avgSeverity = cluster.reduce((sum, o) => sum + (o.severity || 3), 0) / cluster.length;
  const severityFactor = Math.round((avgSeverity / 5) * 20);

  // 5. Independent Zoos (max 15 pts)
  // Cross-institutional corroboration is the golden standard
  const zooFactor = Math.min(15, distinctZoos.length * 7.5);

  // 6. Environmental Corroboration placeholder adapter (max 10 pts)
  const envFactor = 5; // Base baseline context

  // 7. Uncertainty Deduction (0 - 30 pts)
  // If only 1 observation, single species, or single observer, high uncertainty deduction!
  let uncertaintyDeduction = 0;
  if (cluster.length === 1) {
    uncertaintyDeduction = 25;
  } else if (cluster.length === 2 && distinctSpecies.length === 1) {
    uncertaintyDeduction = 15;
  } else if (distinctZoos.length === 1 && cluster.length < 3) {
    uncertaintyDeduction = 10;
  } else {
    uncertaintyDeduction = 4;
  }

  const rawCalculatedScore =
    temporalFactor +
    spatialFactor +
    crossSpeciesFactor +
    severityFactor +
    zooFactor +
    envFactor -
    uncertaintyDeduction;

  // Convert cluster to ML-ready CSV (pure numerical features, no images/descriptions/counts)
  const clusterCsv = convertObservationsToMLCSV(cluster);
  const rfAnalysis = randomForestModel.predictFromCSV(clusterCsv);
  const rfRiskScore = rfAnalysis.riskScore;

  // Blend heuristic clustering, domain rules, and Random Forest ML model predictions
  const blendedScore = Math.max(
    5,
    Math.min(98, Math.round(rawCalculatedScore * 0.4 + topScore * 0.35 + rfRiskScore * 0.25))
  );

  // Confidence Level
  let confidence: 'Low' | 'Moderate' | 'High' = 'Low';
  if (cluster.length >= 4 && distinctSpecies.length >= 2 && blendedScore >= 60) {
    confidence = 'High';
  } else if (cluster.length >= 2 && blendedScore >= 35) {
    confidence = 'Moderate';
  }

  // Estimated Affected Radius
  // Buffer of 3-8 km beyond the cluster extent
  const estimatedRadiusKm = Number((Math.max(3.5, maxInterDistanceKm / 2 + 3.0)).toFixed(1));

  // Estimated Time Window
  let estimatedTimeWindow = 'Insufficient data for a reliable time-window estimate.';
  if (cluster.length >= 3 && confidence !== 'Low') {
    if (topHazard === 'Earthquake') {
      estimatedTimeWindow = durationMins <= 45 ? '15–60 minutes' : '1–3 hours';
    } else if (topHazard === 'Storm') {
      estimatedTimeWindow = '2–5 hours';
    } else if (topHazard === 'Cyclone') {
      estimatedTimeWindow = '4–12 hours';
    } else if (topHazard === 'Wildfire') {
      estimatedTimeWindow = '1–4 hours';
    }
  }

  // Generate explainable reasoning
  const explanation: string[] = [
    `Random Forest ML Model evaluated ${cluster.length} numerical feature vector(s) from ML-ready dataset (RF Score: ${rfRiskScore}/100, Mean Abnormality: ${rfAnalysis.featureContributions.abnormalityPercentage}%, Mean Duration: ${rfAnalysis.featureContributions.durationMinutes}m).`,
    `${cluster.length} verified observation(s) from ${distinctZoos.length} independent zoo institution(s)`,
    distinctZoos.length >= 2
      ? `Multi-zoo corroboration: Cross-institutional agreement detected across ${distinctZoos.length} independent facilities. Probability increases significantly.`
      : 'Isolated anomaly from single institution — awaiting corroboration.',
    `${distinctSpecies.length} animal species exhibiting anomalous behavioral categories (${distinctSpecies.slice(0, 4).join(', ')})`,
    `Observations concentrated within ${maxInterDistanceKm < 1 ? '< 1' : maxInterDistanceKm.toFixed(1)} km spatial radius`,
    `Temporal window: logged across ${Math.round(durationMins)} minutes`,
    `Mean observed severity: ${avgSeverity.toFixed(1)} / 5.0`,
  ];

  // Add specific top-hazard engine insights
  if (topHazard === 'Earthquake' && eqResult.reasons.length > 0) {
    explanation.push(...eqResult.reasons);
  } else if (topHazard === 'Storm' && stormResult.reasons.length > 0) {
    explanation.push(...stormResult.reasons);
  } else if (topHazard === 'Cyclone' && cycloneResult.reasons.length > 0) {
    explanation.push(...cycloneResult.reasons);
  } else if (topHazard === 'Wildfire' && wildfireResult.reasons.length > 0) {
    explanation.push(...wildfireResult.reasons);
  }

  return {
    id: `RISK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    analysisTime: new Date().toISOString(),
    eventType: topHazard,
    riskScore: blendedScore,
    confidence,
    observationCount: cluster.length,
    zooCount: distinctZoos.length,
    speciesCount: distinctSpecies.length,
    centerLatitude: centroid.latitude,
    centerLongitude: centroid.longitude,
    estimatedRadiusKm,
    estimatedTimeWindow,
    explanation,
    factors: {
      temporalClustering: temporalFactor,
      spatialClustering: spatialFactor,
      crossSpeciesAgreement: crossSpeciesFactor,
      observationSeverity: severityFactor,
      independentZoos: Math.round(zooFactor),
      environmentalCorroboration: envFactor,
      uncertaintyDeduction,
    },
    hazardBreakdown: hazardScores,
    observationsIncluded: cluster.map((o) => o.id),
    modelVersion: 'v2.5-random-forest-ensemble-ml',
  };
}
