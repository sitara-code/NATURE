import elephantImg from '../assets/images/sentinel_elephant_nature_1790183810041.jpg';
import giraffeImg from '../assets/images/sentinel_giraffe_1790245992801.jpg';
import crocodileImg from '../assets/images/sentinel_crocodile_1790183823463.jpg';
import hummingbirdImg from '../assets/images/sentinel_hummingbird_1790183849606.jpg';
import tigerImg from '../assets/images/sentinel_tiger_1790246008805.jpg';
import snakeImg from '../assets/images/sentinel_snake_1790183836800.jpg';

export interface SpeciesManualEntry {
  name: string;
  simpleName: string;
  icon: string;
  animalGroup: string;
  image: string;
  howTheySenseDanger: string;
  normalDailyRoutine: string;
  warningSigns: string;
  whatZookeeperShouldDo: string;
  color: string;
  typicalShare: number;
}

export const SPECIES_CATALOG: Record<string, SpeciesManualEntry> = {
  Elephant: {
    name: 'Elephants',
    simpleName: 'Asian & African Elephants',
    icon: '🐘',
    animalGroup: 'Elephants',
    image: elephantImg,
    howTheySenseDanger: 'Feel deep ground shaking and rumbling through the sensitive pads of their feet',
    normalDailyRoutine: 'Peacefully eating grass and leaves, slowly flapping ears to stay cool, gentle rumbles',
    warningSigns: 'Sudden freeze in place, loud trumpet screams, gathering tightly together, refusing to go into indoor barns',
    whatZookeeperShouldDo: 'Check if they are stomping their feet, notice which way the herd leader is facing, check fence perimeter',
    color: '#0284c7', // sky-600
    typicalShare: 35,
  },
  Giraffe: {
    name: 'Giraffes',
    simpleName: 'Tall Giraffes',
    icon: '🦒',
    animalGroup: 'Giraffes & Tall Grazers',
    image: giraffeImg,
    howTheySenseDanger: 'Sense sudden air pressure drops and strong wind shifts high up in the air',
    normalDailyRoutine: 'Chewing leaves from high branches, walking calmly with slow strides, spread out in the savanna field',
    warningSigns: 'Rushing into a tight group, stretching necks high and staring fixedly in one direction, avoiding trees',
    whatZookeeperShouldDo: 'Look at the direction all giraffes are staring, note if they refuse food, verify no visitors scared them',
    color: '#d97706', // amber-600
    typicalShare: 25,
  },
  Crocodile: {
    name: 'Crocodiles',
    simpleName: 'Nile & Saltwater Crocodiles',
    icon: '🐊',
    animalGroup: 'Crocodiles & Water Animals',
    image: crocodileImg,
    howTheySenseDanger: 'Feel tiny water ripples and underground gas bubbles with tiny dots on their jaw skin',
    normalDailyRoutine: 'Laying motionless in the sun on muddy banks, or resting quietly underwater',
    warningSigns: 'Thrashing water suddenly, quickly crawling out of deep pools onto dry land, loud hissing and bellowing',
    whatZookeeperShouldDo: 'Check the water pool temperature, note how long they stay out of the water, ensure gates are latched',
    color: '#059669', // emerald-600
    typicalShare: 20,
  },
  Hummingbird: {
    name: 'Birds & Hummingbirds',
    simpleName: 'Hummingbirds & Songbirds',
    icon: '🦅',
    animalGroup: 'Birds & Flocks',
    image: hummingbirdImg,
    howTheySenseDanger: 'Feel barometric air pressure drop and natural magnetic shifts before storms or tremors',
    normalDailyRoutine: 'Hovering around flowers and feeders, singing regularly, flying between familiar branches',
    warningSigns: 'Sudden total silence (no singing), flying in frantic low circles near the ground, abandoning nests',
    whatZookeeperShouldDo: 'Listen to aviary sound levels, check if entire flocks fly together erratically, look for storm clouds',
    color: '#8b5cf6', // purple-500
    typicalShare: 20,
  },
  Tiger: {
    name: 'Tigers & Big Cats',
    simpleName: 'Bengal Tigers & Lions',
    icon: '🐅',
    animalGroup: 'Big Cats',
    image: tigerImg,
    howTheySenseDanger: 'Extremely sharp hearing tuned to deep rock cracking noises beneath the earth',
    normalDailyRoutine: 'Sleeping in the shade during daytime, stretching lazily, calmly marking territory trees',
    warningSigns: 'Relentless pacing along the fence line, continuous low growls, refusing to enter night dens',
    whatZookeeperShouldDo: 'Count how many minutes they spend pacing, check if other cats nearby show the same stress',
    color: '#ea580c', // orange-600
    typicalShare: 25,
  },
  Snake: {
    name: 'Snakes & Reptiles',
    simpleName: 'Pythons & Burrowing Reptiles',
    icon: '🐍',
    animalGroup: 'Snakes & Reptiles',
    image: snakeImg,
    howTheySenseDanger: 'Feel ground vibrations directly through their belly scales and heat changes in the soil',
    normalDailyRoutine: 'Curled up quietly in warm hollows or under heat lamps, resting between meals',
    warningSigns: 'Crawling out of underground holes in broad daylight, climbing glass walls rapidly, striking into empty air',
    whatZookeeperShouldDo: 'Inspect burrow temperatures, confirm heat lamps are working normally, log the exact emergence time',
    color: '#10b981', // emerald-500
    typicalShare: 15,
  },
};

/**
 * Helper to get representative image for any species string
 */
export function getSpeciesImage(speciesName?: string): string {
  if (!speciesName) return elephantImg;
  const lower = speciesName.toLowerCase();
  for (const [key, entry] of Object.entries(SPECIES_CATALOG)) {
    if (lower.includes(key.toLowerCase()) || lower.includes(entry.name.toLowerCase())) {
      return entry.image;
    }
  }
  return elephantImg;
}

/**
 * Helper to get simple animal icon emoji
 */
export function getSpeciesIcon(speciesName?: string): string {
  if (!speciesName) return '🐾';
  const lower = speciesName.toLowerCase();
  for (const [key, entry] of Object.entries(SPECIES_CATALOG)) {
    if (lower.includes(key.toLowerCase()) || lower.includes(entry.name.toLowerCase())) {
      return entry.icon;
    }
  }
  return '🐾';
}

/**
 * Standard baseline distribution for animal types (easy, everyday terms)
 */
export const BASELINE_TAXONOMIC_DISTRIBUTION = [
  { label: 'Elephants', value: 35, color: '#0284c7', subtext: 'Feel vibrations through feet' },
  { label: 'Giraffes & Grazers', value: 25, color: '#d97706', subtext: 'Sense air & wind changes' },
  { label: 'Crocodiles & Water Animals', value: 20, color: '#059669', subtext: 'Sense water ripples & gas' },
  { label: 'Birds & Flocks', value: 20, color: '#8b5cf6', subtext: 'Sense storm pressure drops' },
];

/**
 * Standard baseline distribution for unusual behaviors (easy, everyday terms)
 */
export const BASELINE_BEHAVIOUR_DISTRIBUTION = [
  { label: 'Sudden running or fleeing', value: 32, color: '#ef4444', subtext: 'Animals quickly scatter or stampede' },
  { label: 'Loud unusual calling or screaming', value: 26, color: '#f59e0b', subtext: 'Distress calls and loud vocal alarm' },
  { label: 'Nervous pacing back and forth', value: 20, color: '#3b82f6', subtext: 'Restless continuous movement' },
  { label: 'Sudden total silence', value: 12, color: '#8b5cf6', subtext: 'Birds or herds stop making any sound' },
  { label: 'Coming out of underground holes', value: 10, color: '#10b981', subtext: 'Snakes leaving dens in daylight' },
];
