
export type FreshnessStatus = 'Fresh' | 'Semi-fresh' | 'Rotten';
export type RipenessStage = 'Unripe' | 'Semi-ripe' | 'Ripe' | 'Overripe' | 'Rotten';

export interface Defect {
  type: string; // e.g. "Bruise", "Mold", "Discoloration"
  severity: 'Low' | 'Medium' | 'High';
  center_2d: [number, number]; // [y, x] relative to the bounding box (0-100)
}

export interface ExplainabilityMetrics {
  surface_discoloration_percent: number;
  defect_count: number;
  primary_visual_cue: string;
}

export interface ColorDistribution {
  green_ratio: number; // 0-1
  yellow_ratio: number; // 0-1
  brown_ratio: number; // 0-1
  dominant_color: string;
}

export interface TextureMetrics {
  roughness_score: number; // 0-100
  pattern_irregularity: number; // 0-100
  surface_type: 'Smooth' | 'Rough' | 'Pitted' | 'Wrinkled';
}

export interface TrainingExample {
  id: string;
  type: 'LABEL_CORRECTION' | 'SCORE_CORRECTION';
  originalLabel?: string;
  correctedLabel?: string;
  originalScore?: number;
  correctedScore?: number;
  visualContext: string; // Description of the item
  timestamp: number;
}

export interface UserFeedback {
  itemId: string;
  originalStatus: string;
  correctedStatus: string;
  originalScore: number;
  correctedScore: number;
  comments?: string;
  timestamp: number;
}

export interface ProduceItem {
  id: string;
  name: string;
  status: FreshnessStatus; // Overall commercial status
  ripeness_stage: RipenessStage; // Categorical Stage
  score: number; // 0-100 Freshness Lifecycle (100 = Unripe/Just Picked, 0 = Rotten)
  confidence: number; // 0-1
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
  reasoning: string; // Explanation for the score
  visual_features: string[]; // List of specific visual traits detected
  shelf_life_room?: string; // e.g. "3-5 days"
  shelf_life_fridge?: string; // e.g. "7-10 days"
  lighting_condition?: 'Good' | 'Low';
  action?: 'Sell' | 'Discount' | 'Discard' | 'Store'; // Store = for unripe items
  defects?: Defect[]; // For heatmap
  explainability?: ExplainabilityMetrics;
  
  // Advanced Features
  color_distribution?: ColorDistribution;
  texture_metrics?: TextureMetrics;
}

export interface FoodPlanItem extends ProduceItem {
  priority: 'DISCARD' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  consumptionAdvice: string; // Short summary
  fullAdvice?: string; // Full context for hover
  originalImageUrl?: string; // URL to the stored original image for Visual Recall
}

// NEW: Food Plan Container
export type UserRole = 'PERSONAL' | 'BUSINESS';
export type PlanType = 'CONSUMPTION' | 'SALES';

export interface FoodPlan {
  id: string;
  title: string;
  type: PlanType;
  createdAt: number;
  items: FoodPlanItem[];
}

export interface AnalysisResult {
  timestamp: number;
  items: ProduceItem[];
  imageUrl: string;
  overallScore: number;
}

// --- RECIPE SYSTEM TYPES ---

export interface RecipeIngredient {
  name: string;
  amount: string;
  fromPlan: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string; // Step by step text
  cookingTime: string;
  cuisine: string;
  source: 'generated' | 'manual';
  createdAt: number;
  tags?: string[];
}

export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  UPLOAD = 'UPLOAD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  RECIPES = 'RECIPES',      // My Recipes Tab
  CHEF_WIZARD = 'CHEF_WIZARD', // The Generator
  PLANS = 'PLANS' // NEW: Dedicated Plans Tab
}
