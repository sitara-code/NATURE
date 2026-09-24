import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Compass,
  Clock,
  CheckCircle2,
  AlertCircle,
  TreePine,
  Waves,
  CloudRain,
  Wind,
  Flame,
  Zap,
  Radio,
  Eye,
  Info,
  ChevronRight,
  ShieldCheck,
  Binary,
  MapPin,
  Cpu,
  Sparkles,
  ArrowRight,
  Filter,
  BarChart3,
  Calendar,
  Building2,
} from 'lucide-react';
import { RiskAnalysis, HazardType, Observation, Zoo } from '../types';

// Real photographic assets representing core bio-sentinel taxa and pristine nature baseline
import elephantHeroImg from '../assets/images/sentinel_elephant_nature_1790183810041.jpg';
import crocodileImg from '../assets/images/sentinel_crocodile_1790183823463.jpg';
import snakeImg from '../assets/images/sentinel_snake_1790183836800.jpg';
import hummingbirdImg from '../assets/images/sentinel_hummingbird_1790183849606.jpg';
import sereneCanopyImg from '../assets/images/nature_canopy_serene_1790183864097.jpg';

interface RiskAnalysisViewProps {
  riskAnalysis: RiskAnalysis | null;
  observations?: Observation[];
  zoos?: Zoo[];
}

interface HazardCategoryCard {
  id: HazardType | 'Flood';
  name: string;
  subtitle: string;
  image: string;
  icon: React.ReactNode;
  accentBadge: string;
  evaluates: string;
  biologicalSignals: string[];
  keySentinelSpecies: string[];
}

interface SentinelAnimalProfile {
  name: string;
  scientificRole: string;
  sensoryOrgan: string;
  precursorDetected: string;
  image: string;
  badge: string;
  details: string;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({
  riskAnalysis,
  observations = [],
  zoos = [],
}) => {
  const [activeHazardTab, setActiveHazardTab] = useState<string>('all');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Real empirical verification: Model requires >= 2 verified observations to form an empirical cluster
  const hasSufficientData =
    Boolean(riskAnalysis) &&
    (riskAnalysis?.observationCount ?? 0) >= 2 &&
    (riskAnalysis?.riskScore ?? 0) > 0;

  // Real backend riskScore only — no synthetic or invented percentages
  const eventLikelihood = hasSufficientData
    ? Math.min(100, Math.max(0, Math.round(riskAnalysis!.riskScore)))
    : 0;

  // Large SVG Donut geometry
  const radius = 100;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius; // ~628.3
  const strokeDashoffset = hasSufficientData
    ? circumference - (eventLikelihood / 100) * circumference
    : circumference;

  // Visual severity palette for Event Likelihood
  const getLikelihoodTheme = (score: number) => {
    if (!hasSufficientData) {
      return {
        text: 'text-violet-950 dark:text-slate-300',
        stroke: '#78716C',
        badgeBg: 'bg-sky-100 text-blue-950 border-teal-300',
        cardGlow: 'border-teal-200',
        statusLabel: 'Awaiting Sufficient Evidence',
        statusDescription: 'Baseline observation threshold not yet reached for cluster modeling.',
      };
    }
    if (score >= 60) {
      return {
        text: 'text-rose-700 dark:text-rose-400',
        stroke: '#BE123C', // rose-700
        badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
        cardGlow: 'border-rose-300 shadow-rose-900/5',
        statusLabel: 'Elevated Precursor Signal',
        statusDescription: 'Synchronized faunal anomalies detected across monitored facility perimeters.',
      };
    }
    if (score >= 35) {
      return {
        text: 'text-amber-800 dark:text-amber-300',
        stroke: '#D97706', // amber-600
        badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
        cardGlow: 'border-amber-300 shadow-amber-900/5',
        statusLabel: 'Moderate Environmental Variance',
        statusDescription: 'Elevated behavioral variance detected above typical circadian baselines.',
      };
    }
    return {
      text: 'text-teal-800 dark:text-cyan-300',
      stroke: '#0d9488', // teal-600
      badgeBg: 'bg-teal-100 text-blue-950 border-teal-300',
      cardGlow: 'border-teal-300 shadow-teal-900/5',
      statusLabel: 'Low Baseline Variance',
      statusDescription: 'Faunal activity aligns closely with expected diurnal baselines.',
    };
  };

  const theme = getLikelihoodTheme(eventLikelihood);

  // Core sentinel animals relevant to the system
  const sentinelAnimals: SentinelAnimalProfile[] = [
    {
      name: 'Asian Elephant 🐘',
      scientificRole: 'Earthquake & Ground Vibration Watcher',
      sensoryOrgan: 'Sensitive nerve sensors in footpads & trunk',
      precursorDetected: 'Deep underground rumbles and earthquake tremors',
      image: elephantHeroImg,
      badge: 'Earthquake Alert',
      details:
        'Can feel underground rock stress and micro-tremors hours before humans can sense anything.',
    },
    {
      name: 'Crocodile & Water Animals 🐊',
      scientificRole: 'Storm & Water Pressure Watcher',
      sensoryOrgan: 'Sensitive pressure spots along jaw skin',
      precursorDetected: 'Air pressure drops and sudden water vibrations',
      image: crocodileImg,
      badge: 'Water & Storm Alert',
      details:
        'Feels tiny ripples and deep underwater waves when major storm systems approach.',
    },
    {
      name: 'Snakes & Burrowing Animals 🐍',
      scientificRole: 'Soil Tremor & Underground Watcher',
      sensoryOrgan: 'Belly scale vibration sensors & heat sensors',
      precursorDetected: 'Underground fault friction and soil temperature changes',
      image: snakeImg,
      badge: 'Underground Tremor',
      details:
        'Living underground means they feel rock pressure early and rush out into the open daylight.',
    },
    {
      name: 'Birds & Hummingbirds 🦅',
      scientificRole: 'Storm & Air Pressure Watcher',
      sensoryOrgan: 'Internal ear air-pressure sensors',
      precursorDetected: 'Sudden air pressure drops and wind shifts before storms',
      image: hummingbirdImg,
      badge: 'Storm Warning',
      details:
        'Stop singing, gather into tight flocks, and quickly fly down to seek dense bush cover.',
    },
  ];

  // 5 Real Hazard Categories evaluated by the biological warning system
  const hazardCategories: HazardCategoryCard[] = [
    {
      id: 'Earthquake',
      name: 'Earthquake ⚡',
      subtitle: 'Underground Tremors & Ground Waves',
      image: elephantHeroImg,
      icon: <Zap className="w-4 h-4 text-amber-600" />,
      accentBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      evaluates:
        'System monitors mass agitation, unusual loud trumpet calls, and frantic pacing in elephants, giraffes, and deer caused by deep underground rock vibrations.',
      biologicalSignals: [
        'Sudden pacing & loud warning trumpet calls in elephants',
        'Snakes and burrowing animals quickly leaving underground dens',
        'Herds gathering into tight groups in open fields away from buildings',
      ],
      keySentinelSpecies: ['Asian Elephants', 'Burrowing Snakes', 'Giraffes & Deer'],
    },
    {
      id: 'Storm',
      name: 'Severe Storm 🌧️',
      subtitle: 'Sudden Air Pressure Drop & Wind Shifts',
      image: hummingbirdImg,
      icon: <CloudRain className="w-4 h-4 text-teal-600" />,
      accentBadge: 'bg-teal-50 text-teal-800 border-teal-200',
      evaluates:
        'System checks for sudden quiet in bird exhibits, birds leaving high tree canopies, and animals rushing into shelters as air pressure drops before big storms.',
      biologicalSignals: [
        'Sudden total silence in bird exhibits (birds stop singing)',
        'Animals eating rapidly and then running into shelters',
        'Extreme nervousness in monkeys and parrots in tall trees',
      ],
      keySentinelSpecies: ['Hummingbirds & Songbirds', 'Aviary Flocks', 'Monkeys'],
    },
    {
      id: 'Cyclone',
      name: 'Cyclone & Strong Winds 🌀',
      subtitle: 'Deep Oceanic Pressure Waves & Coastal Gusts',
      image: crocodileImg,
      icon: <Wind className="w-4 h-4 text-sky-600" />,
      accentBadge: 'bg-sky-50 text-sky-800 border-sky-200',
      evaluates:
        'System tracks animals moving away from coastal waters, refusal to enter outdoor lagoons, and restless pacing among water birds sensing ocean storms.',
      biologicalSignals: [
        'Crocodiles and water birds refusing to stay in open water lagoons',
        'Water birds gathering into tight groups facing away from the wind',
        'Water animals swimming restlessly or crawling onto high banks',
      ],
      keySentinelSpecies: ['Crocodiles', 'Flamingos', 'Shorebirds'],
    },
    {
      id: 'Flood',
      name: 'Flash Flood & Heavy Rain 🌊',
      subtitle: 'Ground Water Rising & Overflow',
      image: crocodileImg,
      icon: <Waves className="w-4 h-4 text-blue-600" />,
      accentBadge: 'bg-blue-50 text-blue-800 border-blue-200',
      evaluates:
        'System monitors animals climbing into high trees and small animals evacuating underground tunnels before surface water rises and causes flash flooding.',
      biologicalSignals: [
        'Rabbits, snakes, and rodents leaving underground burrows',
        'Animals climbing onto high boulders and tree branches',
        'Frogs and toads quickly hopping away from river banks',
      ],
      keySentinelSpecies: ['Burrowing Animals', 'Tree Climbers', 'Frogs & Toads'],
    },
    {
      id: 'Wildfire',
      name: 'Wildfire & Smoke 🔥',
      subtitle: 'Faint Smoke Smell & Hot Air Currents',
      image: snakeImg,
      icon: <Flame className="w-4 h-4 text-orange-600" />,
      accentBadge: 'bg-orange-50 text-orange-800 border-orange-200',
      evaluates:
        'System tracks tigers, wolves, and big cats pacing along fences and sniffing the wind as their sensitive noses detect microscopic smoke miles away.',
      biologicalSignals: [
        'Animals pacing along the fence facing against the wind',
        'Sniffing air repeatedly and refusing to go into indoor cages',
        'Warning barks and loud growls from big cats and wolves',
      ],
      keySentinelSpecies: ['Tigers & Big Cats', 'Wolves & Dogs', 'Birds of Prey'],
    },
  ];

  // Behavioural Evidence from real observations
  const verifiedObservations = observations.filter(
    (o) => o.verificationStatus === 'VERIFIED_IN_GEOFENCE'
  );
  const totalVerifiedCount = verifiedObservations.length;

  // Real species breakdown from existing data
  const speciesMap: { [key: string]: { count: number; maxSeverity: number; behaviour: string } } = {};
  verifiedObservations.forEach((obs) => {
    const key = obs.species;
    if (!speciesMap[key]) {
      speciesMap[key] = { count: 0, maxSeverity: obs.severity, behaviour: obs.behaviourCategory };
    }
    speciesMap[key].count += 1;
    if (obs.severity > speciesMap[key].maxSeverity) {
      speciesMap[key].maxSeverity = obs.severity;
      speciesMap[key].behaviour = obs.behaviourCategory;
    }
  });

  const speciesList = Object.entries(speciesMap)
    .map(([species, data]) => ({ species, ...data }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="min-h-screen bg-transparent text-blue-950 dark:text-slate-100 font-sans antialiased pb-16 space-y-10">
      
      {/* 1. HERO SECTION: NATURE GIVES THE SIGNAL. AI HELPS US UNDERSTAND IT. */}
      <section className="bg-white/95 dark:bg-[#0c1a14]/90 border-b border-teal-200 dark:border-emerald-950/80 shadow-2xs backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-6 py-10 sm:px-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Typography & Concept Core */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-emerald-400 animate-pulse" />
                <span>Biological Early Warning System</span>
                <span className="text-teal-400 dark:text-emerald-700">|</span>
                <span className="text-violet-950 dark:text-emerald-300 font-bold">Empirical Precursor Modeling</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-blue-950 dark:text-white tracking-tight leading-[1.15]">
                  Nature gives the signal.
                  <span className="block text-teal-700 dark:text-emerald-400 font-bold italic font-serif">
                    AI helps us understand it.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-blue-950 dark:text-slate-200 leading-relaxed max-w-2xl pt-2 font-medium">
                  Animal behaviour is treated as a biological signal. AI analyses behavioural patterns
                  to estimate whether an unusual environmental event may be occurring or approaching.
                </p>
              </div>

              {/* Scientific Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <TreePine className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400" />
                    <span>Bio-Telemetry</span>
                  </div>
                  <p className="text-xs text-violet-950 dark:text-slate-300 mt-1 font-medium">
                    Accredited zoos act as calibrated biological seismographs and barometers.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-blue-950 dark:text-teal-300 font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>Random Forest AI</span>
                  </div>
                  <p className="text-xs text-violet-950 dark:text-slate-300 mt-1 font-medium">
                    Removes feeding & human noise; correlates multi-species time clusters.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-blue-950 dark:text-sky-300 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 dark:text-sky-400" />
                    <span>Civil Readiness</span>
                  </div>
                  <p className="text-xs text-violet-950 dark:text-slate-300 mt-1 font-medium">
                    Early situational awareness for emergency teams and civil defense.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Realistic Nature Photography Combined with Subtle AI / Data Telemetry */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden border border-teal-200 dark:border-emerald-950/40 shadow-md bg-stone-900 group">
                <img
                  src={elephantHeroImg}
                  alt="Elephant in tranquil rainforest sensing natural environmental signals"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-102 transition-transform duration-700"
                />
                
                {/* Clean Nature + AI Gradient Veil */}
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
                
                {/* Subtle AI Telemetry Overlays */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 font-mono text-[11px] font-bold">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>BIO-SIGNAL FREQUENCY: 1–20 Hz</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-bold">
                    RF-ENSEMBLE v2.5
                  </span>
                </div>

                {/* Bottom Card Annotation */}
                <div className="absolute bottom-4 left-4 right-4 text-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-wide text-white">
                      Biological Telemetry Layer
                    </span>
                    <span className="text-xs text-cyan-300 font-mono font-bold">
                      Animals: Elephants · Birds · Reptiles
                    </span>
                  </div>
                  <p className="text-xs text-white leading-snug font-medium">
                    Natural sensory organs detect subterranean microseisms, humidity electrostatics, and barometric drops hours ahead of conventional civil sensors.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-10">
        
        {/* 2. THE NATURE → AI VISUAL FLOW (Connected Cards & Arrows) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-emerald-950/60 text-blue-950 dark:text-emerald-300">
                <Activity className="w-4 h-4 text-teal-700" />
              </span>
              <div>
                <h2 className="text-base font-bold text-blue-950 dark:text-white font-serif">
                  The Biological Early Warning Pipeline
                </h2>
                <p className="text-xs text-violet-950 dark:text-slate-300 font-bold">
                  How biological sensory telemetry transitions from nature into calibrated model outputs
                </p>
              </div>
            </div>
            <span className="hidden md:inline-flex text-xs font-mono font-bold text-blue-950 dark:text-emerald-300 bg-sky-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-teal-300 dark:border-emerald-800">
              Live Algorithmic Architecture
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Step 1: Nature */}
            <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs relative flex flex-col justify-between hover:border-teal-400 dark:hover:border-emerald-500 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="nature">🌿</span>
                  <span className="text-[10px] font-mono font-black text-violet-950 dark:text-slate-400">STAGE 01</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">NATURE</h3>
                  <div className="text-[11px] font-bold text-teal-800 dark:text-emerald-400">Physical Origin</div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Tectonic strain, barometric depression, microseisms, infrasound waves.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                <span>Environmental Shift</span>
                <ArrowRight className="w-3 h-3 text-teal-600 dark:text-emerald-700 hidden lg:block" />
              </div>
            </div>

            {/* Step 2: Biological Signal */}
            <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs relative flex flex-col justify-between hover:border-teal-400 dark:hover:border-emerald-500 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="animal">🐘</span>
                  <span className="text-[10px] font-mono font-black text-violet-950 dark:text-slate-400">STAGE 02</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">BIOLOGICAL SIGNAL</h3>
                  <div className="text-[11px] font-bold text-teal-800 dark:text-teal-400">Animal Behaviour</div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Sudden silence, intense pacing, fleeing shelters, burrow emergence.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                <span>Sensor Network</span>
                <ArrowRight className="w-3 h-3 text-teal-600 dark:text-emerald-700 hidden lg:block" />
              </div>
            </div>

            {/* Step 3: AI Analysis */}
            <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs relative flex flex-col justify-between hover:border-teal-400 dark:hover:border-emerald-500 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="ai">🧠</span>
                  <span className="text-[10px] font-mono font-black text-violet-950 dark:text-slate-400">STAGE 03</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">AI ANALYSIS</h3>
                  <div className="text-[11px] font-bold text-blue-950 dark:text-sky-400">Interprets Patterns</div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Random Forest ensemble filters noise, verifies spatiotemporal clustering.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                <span>Machine Learning</span>
                <ArrowRight className="w-3 h-3 text-teal-600 dark:text-emerald-700 hidden lg:block" />
              </div>
            </div>

            {/* Step 4: Event Likelihood (Primary Focus) */}
            <div className="bg-sky-100/70 dark:bg-emerald-950/30 rounded-2xl border-2 border-teal-500 dark:border-emerald-500 p-4 shadow-xs relative flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="likelihood">◉</span>
                  <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-teal-100 dark:bg-emerald-900 text-blue-950 dark:text-emerald-200">
                    CORE METRIC
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">EVENT LIKELIHOOD</h3>
                  <div className="text-[11px] font-bold text-teal-800 dark:text-emerald-300 font-mono">
                    {hasSufficientData ? `${eventLikelihood}% Overall` : 'Awaiting Data'}
                  </div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Statistical estimate of an unusual environmental event occurring.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-300 dark:border-emerald-850 flex items-center justify-between text-[11px] text-blue-950 dark:text-emerald-300 font-mono font-bold">
                <span>Model Output</span>
                <ArrowRight className="w-3 h-3 text-teal-700 dark:text-emerald-400 hidden lg:block" />
              </div>
            </div>

            {/* Step 5: Possible Hazards */}
            <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs relative flex flex-col justify-between hover:border-teal-400 dark:hover:border-emerald-500 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="earth">🌍</span>
                  <span className="text-[10px] font-mono font-black text-violet-950 dark:text-slate-400">STAGE 05</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">POSSIBLE HAZARDS</h3>
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400">Diagnostic Classes</div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Earthquake, Storm, Cyclone, Flood, or Wildfire profiles mapped.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                <span>Hazard Models</span>
                <ArrowRight className="w-3 h-3 text-teal-600 dark:text-emerald-700 hidden lg:block" />
              </div>
            </div>

            {/* Step 6: Human Awareness */}
            <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs relative flex flex-col justify-between hover:border-teal-400 dark:hover:border-emerald-500 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label="shield">🛡</span>
                  <span className="text-[10px] font-mono font-black text-violet-950 dark:text-slate-400">STAGE 06</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 dark:text-white">HUMAN AWARENESS</h3>
                  <div className="text-[11px] font-bold text-blue-950 dark:text-slate-300">Civil Readiness</div>
                </div>
                <p className="text-xs text-blue-950 dark:text-slate-300 leading-snug font-medium">
                  Precautionary warnings, geo-targeted alerts, emergency coordination.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">
                <span>Civil Defense</span>
                <span className="text-teal-700 dark:text-emerald-400 font-bold">Ready</span>
              </div>
            </div>

          </div>
        </section>

        {/* 3. CORE INSTRUMENT: EVENT LIKELIHOOD CARD (LARGE LIVE DONUT CHART) */}
        <section>
          <div className="bg-white dark:bg-[#0c1a14] rounded-3xl border border-teal-200 dark:border-emerald-950 shadow-sm p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Left Column: Live Gauge & Primary Focus */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center text-center">
                <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                  
                  {/* High Precision Live SVG Donut */}
                  <svg
                    className="w-full h-full -rotate-90 transform"
                    viewBox="0 0 240 240"
                    aria-label={`Event likelihood chart: ${hasSufficientData ? `${eventLikelihood}%` : 'Awaiting sufficient evidence'}`}
                  >
                    <defs>
                      <linearGradient id="liveGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#047857" /> {/* emerald-700 */}
                        <stop offset="60%" stopColor="#0F766E" /> {/* teal-700 */}
                        <stop offset="100%" stopColor={theme.stroke} />
                      </linearGradient>
                    </defs>

                    {/* Outer tick marks calibration ring */}
                    <circle
                      cx="120"
                      cy="120"
                      r="114"
                      fill="none"
                      stroke="#99f6e4"
                      strokeWidth="1.5"
                      strokeDasharray="2 6"
                    />

                    {/* Gauge Track */}
                    <circle
                      cx="120"
                      cy="120"
                      r={radius}
                      fill="none"
                      stroke="#e0f2fe"
                      strokeWidth={strokeWidth}
                    />

                    {/* Gauge Dynamic Fill Arc */}
                    {hasSufficientData ? (
                      <circle
                        cx="120"
                        cy="120"
                        r={radius}
                        fill="none"
                        stroke="url(#liveGaugeGradient)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000 ease-out"
                      />
                    ) : (
                      <circle
                        cx="120"
                        cy="120"
                        r={radius}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={strokeWidth - 6}
                        strokeDasharray="4 8"
                        className="animate-spin-slow opacity-60"
                      />
                    )}
                  </svg>

                  {/* Inside Center Readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-[11px] font-bold font-mono tracking-widest text-violet-950 dark:text-slate-300 uppercase">
                      EVENT LIKELIHOOD
                    </span>

                    {hasSufficientData ? (
                      <>
                        <div className="my-1 flex items-baseline justify-center">
                          <span className="text-6xl sm:text-7xl font-mono font-black text-blue-950 dark:text-white tracking-tight tabular-nums">
                            {eventLikelihood}
                          </span>
                          <span className="text-3xl font-mono font-black text-teal-800 dark:text-cyan-400 ml-1">%</span>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme.badgeBg}`}>
                          {theme.statusLabel}
                        </span>
                      </>
                    ) : (
                      <div className="my-3 space-y-1.5 max-w-[200px]">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-mono uppercase font-bold bg-sky-100 text-blue-950 border border-teal-300">
                          Standby Calibration
                        </span>
                        <div className="text-sm font-bold text-blue-950 dark:text-white leading-tight">
                          Awaiting sufficient behavioural evidence
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-blue-950 dark:text-slate-300 mt-2 max-w-[170px] leading-tight font-medium">
                      AI-estimated likelihood of an unusual environmental event
                    </p>
                  </div>
                </div>

                {/* Live Model Metadata Badges */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-blue-950 dark:text-slate-200">
                  <span className="px-2.5 py-0.5 rounded-md bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 text-blue-950 dark:text-slate-200 font-bold">
                    Confidence: <strong>{riskAnalysis?.confidence || 'Standby'}</strong>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 text-blue-950 dark:text-slate-200 font-bold">
                    Observations: <strong>{riskAnalysis?.observationCount ?? totalVerifiedCount}</strong>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-sky-100/70 dark:bg-[#060e0a] border border-teal-300 dark:border-emerald-950 text-blue-950 dark:text-slate-200 font-bold">
                    Radius: <strong>{riskAnalysis?.estimatedRadiusKm ? `${riskAnalysis.estimatedRadiusKm} km` : '15 km default'}</strong>
                  </span>
                </div>
              </div>

              {/* Right Column: Scientific Explanation & Anti-Misinterpretation Shield */}
              <div className="lg:col-span-7 space-y-6 lg:border-l lg:border-teal-200 dark:lg:border-emerald-950/80 lg:pl-10">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-400 font-bold">
                    <Sparkles className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                    <span>Scientific Model Principle</span>
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-blue-950 dark:text-white">
                    What does this percentage mean?
                  </h3>

                  <p className="text-sm sm:text-base text-blue-950 dark:text-slate-200 leading-relaxed font-medium">
                    This percentage indicates that our machine-learning model has detected coordinated
                    behavioural patterns that may indicate that some unusual environmental event could be
                    occurring or approaching. <strong className="text-blue-950 dark:text-white font-black">It is NOT a guaranteed disaster prediction</strong>,
                    nor does it claim to predict the exact type, epicenter, or magnitude of a catastrophe.
                  </p>
                </div>

                {/* 4 Distinct Facets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
                    <div className="flex items-center gap-2 text-teal-900 dark:text-emerald-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-emerald-400" />
                      <span>ANIMAL BEHAVIOUR</span>
                    </div>
                    <div className="text-[11px] font-mono text-teal-800 dark:text-emerald-400 font-bold uppercase">
                      = Biological Signal
                    </div>
                    <p className="text-xs text-blue-950 dark:text-slate-300 leading-normal pt-1 font-medium">
                      Raw sensory reactions documented by authenticated zookeepers inside monitored facility grounds.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
                    <div className="flex items-center gap-2 text-blue-950 dark:text-teal-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" />
                      <span>ARTIFICIAL INTELLIGENCE</span>
                    </div>
                    <div className="text-[11px] font-mono text-teal-800 dark:text-teal-400 font-bold uppercase">
                      = Interprets Patterns
                    </div>
                    <p className="text-xs text-blue-950 dark:text-slate-300 leading-normal pt-1 font-medium">
                      Ensemble machine learning weeds out feeding distractions, individual mood, and single-zoo noise.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
                    <div className="flex items-center gap-2 text-blue-950 dark:text-sky-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-sky-400" />
                      <span>EVENT LIKELIHOOD</span>
                    </div>
                    <div className="text-[11px] font-mono text-teal-800 dark:text-sky-400 font-bold uppercase">
                      = Overall Model Estimate
                    </div>
                    <p className="text-xs text-blue-950 dark:text-slate-300 leading-normal pt-1 font-medium">
                      Overall probability (0–100%) that anomalous environmental activity is under way.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                      <span>EARTHQUAKE / STORM / CYCLONE</span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-800 dark:text-amber-400 font-bold uppercase">
                      = Possible Hazard Categories
                    </div>
                    <p className="text-xs text-blue-950 dark:text-slate-300 leading-normal pt-1 font-medium">
                      Diagnostic categories analyzed for civil defense readiness, not individual probability claims.
                    </p>
                  </div>
                </div>

                {/* Spatial and Cluster Details */}
                {hasSufficientData && (
                  <div className="p-4 rounded-2xl bg-teal-50 dark:bg-emerald-950/40 border border-teal-300 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-blue-950 dark:text-emerald-200 font-bold">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-700" />
                      <span>Cluster Center: <strong>{riskAnalysis!.centerLatitude.toFixed(3)}°, {riskAnalysis!.centerLongitude.toFixed(3)}°</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-700" />
                      <span>Estimated Window: <strong>{riskAnalysis!.estimatedTimeWindow}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-700" />
                      <span>Contributing Zoos: <strong>{riskAnalysis!.zooCount}</strong></span>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </section>

        {/* 4. BIOLOGICAL SENTINELS: REALISTIC NATURE / ANIMAL GALLERY */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-teal-200 dark:border-emerald-950 pb-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-400 font-bold">
                <TreePine className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Calibrated Biological Sensors</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-blue-950 dark:text-white mt-1">
                Animals as Nature's Earliest Warning Network
              </h2>
              <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-bold">
                Each species monitors distinct physical wavelengths before human instruments detect variance.
              </p>
            </div>
            <span className="text-xs text-violet-950 dark:text-slate-300 font-mono font-bold">
              Sensory Telemetry Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sentinelAnimals.map((animal) => (
              <div
                key={animal.name}
                className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 overflow-hidden shadow-2xs hover:border-teal-400 dark:hover:border-emerald-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-sky-100 dark:bg-stone-900">
                    <img
                      src={animal.image}
                      alt={animal.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/95 dark:bg-[#060e0a]/90 text-blue-950 dark:text-emerald-300 shadow-xs backdrop-blur-xs border border-teal-200 dark:border-emerald-900">
                        {animal.badge}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-sm text-blue-950 dark:text-white">{animal.name}</h3>
                      <div className="text-[11px] text-teal-800 dark:text-teal-400 font-bold">{animal.scientificRole}</div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-mono text-violet-950 dark:text-slate-300 uppercase font-bold block">
                        Sensory Mechanism:
                      </span>
                      <p className="text-[11px] text-blue-950 dark:text-slate-300 leading-tight font-medium">
                        {animal.sensoryOrgan}
                      </p>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-mono text-violet-950 dark:text-slate-300 uppercase font-bold block">
                        Precursor Detected:
                      </span>
                      <p className="text-[11px] text-blue-950 dark:text-slate-200 leading-tight font-bold">
                        {animal.precursorDetected}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <p className="text-[10px] text-blue-950 dark:text-slate-300 italic bg-sky-100/60 dark:bg-[#060e0a] p-2 rounded-lg border border-teal-200 dark:border-emerald-950 leading-snug font-medium">
                    {animal.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. POSSIBLE HAZARDS: HAZARD CATEGORIES THE SYSTEM CAN EVALUATE */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-teal-200 dark:border-emerald-950 pb-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-400 font-bold">
                <Layers className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Hazard Classification Framework</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-blue-950 dark:text-white mt-1">
                Possible Hazard Categories Evaluated
              </h2>
              <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-bold">
                These represent the five physical hazard profiles the biological warning platform evaluates. No individual fake probabilities are assigned.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-sky-100/70 dark:bg-[#060e0a] rounded-xl text-xs border border-teal-200 dark:border-emerald-950">
              <button
                onClick={() => setActiveHazardTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                  activeHazardTab === 'all'
                    ? 'bg-white dark:bg-emerald-900/60 text-blue-950 dark:text-emerald-200 shadow-xs'
                    : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                All 5 Categories
              </button>
              <button
                onClick={() => setActiveHazardTab('seismic')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                  activeHazardTab === 'seismic'
                    ? 'bg-white dark:bg-emerald-900/60 text-blue-950 dark:text-emerald-200 shadow-xs'
                    : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                Earthquake & Ground
              </button>
              <button
                onClick={() => setActiveHazardTab('atmospheric')}
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${
                  activeHazardTab === 'atmospheric'
                    ? 'bg-white dark:bg-emerald-900/60 text-blue-950 dark:text-emerald-200 shadow-xs'
                    : 'text-violet-950 dark:text-slate-300 hover:text-blue-950 dark:hover:text-white'
                }`}
              >
                Storms & Wind
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hazardCategories
              .filter((h) => {
                if (activeHazardTab === 'all') return true;
                if (activeHazardTab === 'seismic') return h.id === 'Earthquake' || h.id === 'Flood';
                if (activeHazardTab === 'atmospheric') return h.id === 'Storm' || h.id === 'Cyclone' || h.id === 'Wildfire';
                return true;
              })
              .map((hazard) => (
                <div
                  key={hazard.id}
                  className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-5 shadow-2xs hover:border-teal-400 dark:hover:border-emerald-600 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header with photo thumbnail & badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-teal-200 dark:border-emerald-950 bg-sky-100 dark:bg-stone-900">
                          <img
                            src={hazard.image}
                            alt={hazard.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-blue-950 dark:text-white flex items-center gap-1.5">
                            {hazard.icon}
                            <span>{hazard.name}</span>
                          </h3>
                          <span className="text-[11px] text-violet-950 dark:text-slate-300 block font-bold">{hazard.subtitle}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${hazard.accentBadge}`}>
                        Category
                      </span>
                    </div>

                    {/* What the system evaluates */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[11px] font-bold text-blue-950 dark:text-emerald-300 uppercase tracking-wide font-mono block">
                        What System Evaluates:
                      </span>
                      <p className="text-xs text-blue-950 dark:text-slate-300 leading-relaxed bg-sky-100/60 dark:bg-[#060e0a] p-3 rounded-xl border border-teal-200 dark:border-emerald-950 font-medium">
                        {hazard.evaluates}
                      </p>
                    </div>

                    {/* Biological Precursor Signals */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[11px] font-bold text-blue-950 dark:text-emerald-300 uppercase tracking-wide font-mono block">
                        Observed Precursors:
                      </span>
                      <ul className="space-y-1 text-xs text-blue-950 dark:text-slate-300 font-medium">
                        {hazard.biologicalSignals.map((signal, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Sensitive Species Footer */}
                  <div className="pt-4 mt-4 border-t border-teal-200 dark:border-emerald-950/60 flex items-center justify-between text-xs text-violet-950 dark:text-slate-300 font-mono font-bold">
                    <span>Key Sentinels:</span>
                    <span className="font-bold text-blue-950 dark:text-emerald-300">
                      {hazard.keySentinelSpecies.slice(0, 2).join(', ')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* 6. BEHAVIOURAL EVIDENCE: REAL BACKEND DATA SECTION */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-teal-200 dark:border-emerald-950 pb-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-400 font-bold">
                <BarChart3 className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Empirical Zoological Telemetry</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-blue-950 dark:text-white mt-1">
                Behavioural Evidence & Cluster Telemetry
              </h2>
              <p className="text-xs text-violet-950 dark:text-slate-300 mt-0.5 font-bold">
                Aggregated real-time observations recorded by accredited zookeepers driving the current analysis.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-violet-950 dark:text-slate-300 font-mono font-bold">
              <span>Time Window: <strong className="text-blue-950 dark:text-slate-200">{riskAnalysis?.estimatedTimeWindow || 'Rolling 120 Minutes'}</strong></span>
            </div>
          </div>

          {totalVerifiedCount > 0 ? (
            <div className="space-y-4">
              
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-violet-950 dark:text-slate-300 font-bold">
                    Total Verified Reports
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-950 dark:text-white mt-1">
                    {totalVerifiedCount}
                  </div>
                  <div className="text-[11px] text-teal-800 dark:text-emerald-400 mt-0.5 font-bold">Accredited observations</div>
                </div>

                <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-violet-950 dark:text-slate-300 font-bold">
                    Species Reacting
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-950 dark:text-white mt-1">
                    {speciesList.length}
                  </div>
                  <div className="text-[11px] text-teal-800 dark:text-teal-400 mt-0.5 font-bold">Distinct species monitored</div>
                </div>

                <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-violet-950 dark:text-slate-300 font-bold">
                    Geographic Cluster
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-950 dark:text-white mt-1">
                    {riskAnalysis?.estimatedRadiusKm ? `${riskAnalysis.estimatedRadiusKm} km` : '15 km'}
                  </div>
                  <div className="text-[11px] text-cyan-800 dark:text-sky-400 mt-0.5 font-bold">Perimeter concentration</div>
                </div>

                <div className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-violet-950 dark:text-slate-300 font-bold">
                    Contributing Zoos
                  </div>
                  <div className="text-2xl font-bold font-mono text-blue-950 dark:text-white mt-1">
                    {riskAnalysis?.zooCount ?? Math.max(1, new Set(verifiedObservations.map(o => o.zooId)).size)}
                  </div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5 font-bold">Independent facilities</div>
                </div>
              </div>

              {/* Observed Species Telemetry Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {verifiedObservations.slice(0, 6).map((obs) => (
                  <div
                    key={obs.id}
                    className="bg-white dark:bg-[#0c1a14] rounded-2xl border border-teal-200 dark:border-emerald-950 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-blue-950 dark:text-white">{obs.species}</h4>
                        <div className="text-[11px] text-violet-950 dark:text-slate-300 font-mono font-bold">{obs.zooName}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        obs.severity >= 4
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-300'
                          : obs.severity >= 3
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300'
                          : 'bg-teal-100 dark:bg-emerald-950/80 text-blue-950 dark:text-emerald-300'
                      }`}>
                        Severity {obs.severity}/5
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs text-blue-950 dark:text-slate-300 space-y-1">
                      <div className="font-bold text-teal-900 dark:text-emerald-300 text-[11px]">
                        {obs.behaviourCategory}
                      </div>
                      <p className="text-[11px] text-blue-950 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                        {obs.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-violet-950 dark:text-slate-300 pt-1 border-t border-teal-200 dark:border-emerald-950/60 font-bold">
                      <span>Affected: {obs.animalsShowingBehaviour ?? 1}/{obs.totalAnimals ?? 1}</span>
                      <span>{new Date(obs.observedAt || obs.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            /* 7. BEAUTIFUL NATURE-THEMED EMPTY STATE */
            <div className="bg-white dark:bg-[#0c1a14] rounded-3xl border border-teal-200 dark:border-emerald-950 p-8 sm:p-12 text-center shadow-2xs space-y-6">
              <div className="relative max-w-xl mx-auto h-48 sm:h-60 rounded-2xl overflow-hidden border border-teal-200 dark:border-emerald-950 shadow-xs">
                <img
                  src={sereneCanopyImg}
                  alt="Untouched tranquil forest canopy awaiting signals from nature"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/10 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white text-xs flex items-center justify-between font-mono font-bold">
                  <span className="flex items-center gap-1.5">
                    <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                    Baseline State of Nature
                  </span>
                  <span>Quorum: 2 verified reports</span>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-serif font-bold text-blue-950 dark:text-white">
                  Awaiting sufficient behavioural evidence
                </h3>
                <p className="text-xs sm:text-sm text-blue-950 dark:text-slate-300 leading-relaxed font-medium">
                  Our machine-learning ensemble requires at least 2 verified, cross-facility observations
                  within a 15 km radius and 120 minutes before calculating event likelihood. This prevents
                  false alarms from localized zoo stimuli or feeding schedules.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800 text-blue-950 dark:text-emerald-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Zero Synthetic Data Guaranteed · Waiting for Verified Field Observations</span>
              </div>
            </div>
          )}
        </section>

        {/* 8. FACTOR ANALYSIS & MODEL EXPLAINABILITY */}
        <section className="bg-white dark:bg-[#0c1a14] rounded-3xl border border-teal-200 dark:border-emerald-950 p-6 sm:p-8 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-200 dark:border-emerald-950 pb-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-800 dark:text-emerald-400 font-bold">
                <Binary className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Empirical Random Forest Weights</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-blue-950 dark:text-white mt-0.5">
                Model Factors & Algorithmic Scoring
              </h3>
            </div>

            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-bold text-blue-950 dark:text-emerald-300 hover:text-teal-700 dark:hover:text-emerald-200 transition-colors flex items-center gap-1 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-emerald-950/60 border border-teal-300 dark:border-emerald-800"
            >
              <span>{showTechnicalDetails ? 'Collapse Diagnostics' : 'Inspect Mathematical Breakdown'}</span>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${showTechnicalDetails ? 'rotate-90' : ''}`}
              />
            </button>
          </div>

          {/* Model Factor Breakdown Cards */}
          {riskAnalysis?.factors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FactorProgressItem
                label="Temporal Clustering"
                value={riskAnalysis.factors.temporalClustering}
                max={20}
                unit="pts"
                description="Observation density within a rolling sub-2 hour time window."
              />
              <FactorProgressItem
                label="Spatial Density"
                value={riskAnalysis.factors.spatialClustering}
                max={20}
                unit="pts"
                description="Geospatial proximity across verified facility boundaries."
              />
              <FactorProgressItem
                label="Cross-Species Agreement"
                value={riskAnalysis.factors.crossSpeciesAgreement}
                max={20}
                unit="pts"
                description="Synchronization across independent biological orders (elephants + birds)."
              />
              <FactorProgressItem
                label="Observation Severity"
                value={riskAnalysis.factors.observationSeverity}
                max={20}
                unit="pts"
                description="Normalized severity assessment assessed by authenticated zookeepers."
              />
              <FactorProgressItem
                label="Institutional Independence"
                value={riskAnalysis.factors.independentZoos}
                max={15}
                unit="pts"
                description="Independent agreement across geographically distinct registered facilities."
              />
              <FactorProgressItem
                label="Uncertainty Deduction"
                value={riskAnalysis.factors.uncertaintyDeduction}
                max={25}
                unit="pts"
                isDeduction
                description="Confidence deduction applied for single species or low sample size."
              />
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-center text-xs text-violet-950 dark:text-slate-300 font-bold">
              Awaiting active observation clusters to generate mathematical factor weights.
            </div>
          )}

          {/* Technical Deep Dive Panel */}
          {showTechnicalDetails && (
            <div className="mt-4 p-5 rounded-2xl bg-sky-100/60 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 text-xs space-y-3 font-mono text-blue-950 dark:text-slate-300">
              <div className="font-bold text-blue-950 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-700 dark:text-emerald-400" />
                <span>Numerical Random Forest & Spatial Clustering Engine</span>
              </div>
              <p className="text-xs leading-relaxed text-blue-950 dark:text-slate-300 font-sans font-medium">
                Observations undergo numerical feature vectorization: species codes, behaviour indices, abnormality
                percentages ((animalsShowing / totalAnimals) * 100), duration in minutes, and GPS accuracy. No raw
                images or subjective descriptive strings enter the ML tensor, eliminating bias and hallucination risks.
              </p>
              <div className="flex flex-wrap gap-4 pt-3 border-t border-teal-200 dark:border-emerald-950/60 text-xs font-mono text-violet-950 dark:text-slate-300 font-bold">
                <span>Model: {riskAnalysis?.modelVersion || 'Random Forest Ensemble v2.5'}</span>
                <span>Time Window: 120 min</span>
                <span>Spatial Limit: 15 km</span>
                <span>Minimum Quorum: 2 Verified Reports</span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

// Factor Progress Bar Component
const FactorProgressItem: React.FC<{
  label: string;
  value: number;
  max: number;
  unit: string;
  description: string;
  isDeduction?: boolean;
}> = ({ label, value, max, unit, description, isDeduction }) => {
  const percentage = Math.min(100, Math.round((Math.abs(value) / max) * 100));

  return (
    <div className="p-4 rounded-2xl bg-sky-100/50 dark:bg-[#060e0a] border border-teal-200 dark:border-emerald-950 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-blue-950 dark:text-white">{label}</span>
        <span
          className={`font-mono font-bold ${
            isDeduction ? 'text-rose-700 dark:text-rose-400' : 'text-teal-700 dark:text-emerald-400'
          }`}
        >
          {isDeduction ? `-${value}` : `+${value}`} / {max} {unit}
        </span>
      </div>

      <div className="w-full bg-teal-100 dark:bg-emerald-950/80 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isDeduction ? 'bg-rose-500' : 'bg-teal-600 dark:bg-emerald-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-[11px] text-blue-950 dark:text-slate-300 leading-relaxed font-medium">{description}</p>
    </div>
  );
};
