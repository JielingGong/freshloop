import React, { useState } from 'react';
import { ProduceItem, RipenessStage, UserRole } from '../types';
import { ScanEye, Sun, Snowflake, Tag, Trash2, ShoppingBag, SunDim, Eye, Grid3X3, Archive, Activity, ArrowLeft, Wand2, ThumbsDown, Battery, BatteryCharging, BatteryWarning, AlertTriangle, ChevronUp, ChevronDown, Info, Gauge, CheckCircle2, Clock } from 'lucide-react';

interface AnalysisOverlayProps {
  imageUrl: string;
  items: ProduceItem[];
  containerClassName?: string;
  onCorrectPrediction?: (itemId: string, correctionType: 'LABEL' | 'SCORE', value: string | number) => void;
  userRole: UserRole;
}

// 1. FRESHNESS/QUALITY COLORS - Updated for Aurora Gradients
const getQualityColor = (score: number) => {
  if (score < 25) return 'text-red-700 bg-red-50 border-red-200';
  if (score < 45) return 'text-orange-700 bg-orange-50 border-orange-200';
  if (score < 70) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  if (score < 90) return 'text-lime-700 bg-lime-50 border-lime-200';
  return 'text-green-700 bg-green-50 border-green-200';
};

const getProgressBarGradient = (score: number) => {
  if (score < 25) return 'bg-gradient-to-r from-gray-500 to-gray-600'; // Rotten (Dead)
  if (score < 45) return 'bg-gradient-to-r from-red-500 to-red-600'; // Overripe (Urgent)
  if (score < 70) return 'bg-gradient-to-r from-orange-400 to-orange-500'; // Ripe (High)
  if (score < 90) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'; // Semi-ripe (Medium)
  return 'bg-gradient-to-r from-green-500 to-emerald-500'; // Fresh (Low)
};

// 2. RIPENESS BADGES
const getRipenessBadge = (stage: RipenessStage) => {
  switch (stage) {
    case 'Unripe': return 'bg-green-100 text-green-700 border-green-200';
    case 'Semi-ripe': return 'bg-lime-100 text-lime-700 border-lime-200';
    case 'Ripe': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Overripe': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Rotten': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// 3. CATEGORY COLORS
const MANUAL_COLOR_MAP: Record<string, any> = {
  'Apple': { name: 'rose', hex: '#e11d48', tailwind: 'bg-rose-600' }, 
  'Banana': { name: 'yellow', hex: '#eab308', tailwind: 'bg-yellow-500' }, 
  'Pear': { name: 'lime', hex: '#65a30d', tailwind: 'bg-lime-600' },
  'Orange': { name: 'orange', hex: '#ea580c', tailwind: 'bg-orange-600' },
  'Lemon': { name: 'amber', hex: '#d97706', tailwind: 'bg-amber-600' },
  'Tomato': { name: 'red', hex: '#dc2626', tailwind: 'bg-red-600' },
  'Guava': { name: 'emerald', hex: '#059669', tailwind: 'bg-emerald-600' },
  'Grape': { name: 'purple', hex: '#9333ea', tailwind: 'bg-purple-600' },
  'Cucumber': { name: 'green', hex: '#16a34a', tailwind: 'bg-green-600' },
};

const FALLBACK_PALETTE = [
  { name: 'cyan', hex: '#0891b2', tailwind: 'bg-cyan-600' },
  { name: 'fuchsia', hex: '#c026d3', tailwind: 'bg-fuchsia-600' },
];

const getCategoryStyle = (name: string) => {
  for (const key of Object.keys(MANUAL_COLOR_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return MANUAL_COLOR_MAP[key];
    }
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
};

// 5-TIER ACTION BADGES BASED ON SCORE
const getActionBadge = (score: number, userRole: UserRole) => {
  if (userRole === 'PERSONAL') {
    if (score < 25) return <span className="flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Trash2 size={10} /> DISCARD</span>;
    if (score < 45) return <span className="flex items-center gap-1 bg-gradient-to-r from-red-100 to-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Clock size={10} /> USE ASAP</span>;
    if (score < 70) return <span className="flex items-center gap-1 bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><CheckCircle2 size={10} /> EAT NOW</span>;
    if (score < 90) return <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Archive size={10} /> PLAN AHEAD</span>;
    return <span className="flex items-center gap-1 bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Archive size={10} /> STORE</span>;
  }

  // BUSINESS MODE
  if (score < 25) return <span className="flex items-center gap-1 bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Trash2 size={10} /> WRITE-OFF</span>;
  if (score < 45) return <span className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Tag size={10} /> CLEARANCE</span>;
  if (score < 70) return <span className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Tag size={10} /> PRIME</span>;
  if (score < 90) return <span className="flex items-center gap-1 bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase"><ShoppingBag size={10} /> STOCK</span>;
  return <span className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase"><Archive size={10} /> WAREHOUSE</span>;
};

export const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ imageUrl, items, containerClassName, onCorrectPrediction, userRole }) => {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [showAttentionGrid, setShowAttentionGrid] = useState(false);
  const [showCriteria, setShowCriteria] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Feedback Modes
  const [feedbackMode, setFeedbackMode] = useState<false | 'LABEL' | 'SCORE'>(false);
  const [manualScore, setManualScore] = useState<number>(50);

  const isLowLight = items.some(i => i.lighting_condition === 'Low');
  
  const toggleCalibrate = () => {
    setIsCalibrated(!isCalibrated);
    if (!isCalibrated) {
      setBrightness(110);
      setContrast(115); 
    } else {
      setBrightness(100);
      setContrast(100);
    }
  };

  const toggleEnhance = () => setBrightness(prev => prev === 100 ? 150 : 100);

  const lowScoreItems = items.filter(i => i.score < 45);
  const avgScore = items.length > 0 ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;
  const displayedItems = selectedItemId ? items.filter(i => i.id === selectedItemId) : items;

  const handleManualLabelCorrection = (id: string, correctedName: string) => {
    if (onCorrectPrediction) {
      onCorrectPrediction(id, 'LABEL', correctedName);
      setFeedbackMode(false);
    }
  };

  const handleManualScoreCorrection = (id: string, newScore: number) => {
    if (onCorrectPrediction) {
      onCorrectPrediction(id, 'SCORE', newScore);
      setFeedbackMode(false);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col lg:flex-row gap-6 ${containerClassName}`}>
      
      {/* Image View Wrapper */}
      <div 
        onClick={() => setSelectedItemId(null)}
        className="flex-grow bg-gray-950 rounded-3xl shadow-2xl min-h-[300px] flex items-center justify-center relative group p-8 cursor-pointer overflow-hidden border border-gray-800 select-none"
      >
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 items-end">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAttentionGrid(!showAttentionGrid); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit
              ${showAttentionGrid 
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                : 'bg-black/50 text-white hover:bg-black/70 backdrop-blur'}`}
          >
            <Grid3X3 size={14} />
            <span>ViT GRID</span>
          </button>
          
           <button 
            onClick={(e) => { e.stopPropagation(); toggleCalibrate(); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit
              ${isCalibrated 
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                : 'bg-black/50 text-white hover:bg-black/70 backdrop-blur'}`}
          >
            <Wand2 size={14} />
            <span>AUTO CALIB</span>
          </button>
        </div>

        {isLowLight && brightness === 100 && !isCalibrated && (
          <div className="absolute top-4 left-4 z-40 bg-black/70 backdrop-blur-sm text-yellow-400 px-3 py-2 rounded-lg text-xs font-medium border border-yellow-500/30 flex items-center gap-2 shadow-lg">
            <SunDim size={14} />
            <span>Low Light</span>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleEnhance(); }} 
              className="ml-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-bold"
            >
              ENHANCE
            </button>
          </div>
        )}
        
        {/* Image Container */}
        <div className="relative inline-block w-fit h-fit mx-auto shadow-2xl rounded-xl" style={{ fontSize: 0, lineHeight: 0 }}>
          <img 
            src={imageUrl} 
            alt="Analysis Target" 
            onLoad={() => setImageLoaded(true)}
            className="max-w-full max-h-[600px] block w-auto h-auto rounded-xl transition-all duration-300"
            style={{ 
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${selectedItemId ? 'grayscale(30%)' : ''}` 
            }}
          />

          {showAttentionGrid && imageLoaded && (
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-40 rounded-xl overflow-hidden">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className={`border-[0.5px] border-white/10 ${Math.random() > 0.85 ? 'bg-purple-500/40 animate-pulse' : ''}`} />
              ))}
            </div>
          )}
          
          {imageLoaded && items.map((item) => {
            if (!item.box_2d) return null;
            const [ymin, xmin, ymax, xmax] = item.box_2d;
            
            const catStyle = getCategoryStyle(item.name);
            const isHovered = hoveredItemId === item.id;
            const isSelected = selectedItemId === item.id;
            const isDimmed = selectedItemId && !isSelected;
            
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemId(item.id === selectedItemId ? null : item.id);
                  setFeedbackMode(false);
                }}
                className={`absolute transition-all duration-300 cursor-pointer z-20
                  ${isDimmed ? 'opacity-20 blur-[1px]' : 'opacity-100'}
                  ${isSelected ? 'z-50' : ''}
                `}
                style={{
                  top: `${ymin/10}%`,
                  left: `${xmin/10}%`,
                  width: `${(xmax-xmin)/10}%`,
                  height: `${(ymax-ymin)/10}%`,
                }}
              >
                 {/* 1. SOLID BOUNDING BOX (Reference Style) */}
                 <div 
                   className={`absolute inset-0 border-[3px] transition-all duration-300 ${isSelected ? 'shadow-lg' : ''}`}
                   style={{ borderColor: catStyle.hex }}
                 ></div>

                 {/* 2. SPLIT LABEL (Reference Style: Colored Name | White Score) */}
                 <div 
                   className={`absolute -top-8 left-0 flex shadow-md rounded-md overflow-hidden transform transition-transform duration-200 origin-bottom-left
                     ${isSelected ? 'scale-110' : 'scale-100'}
                   `}
                 >
                   {/* Left: Name (Colored) */}
                   <div 
                     className="px-3 py-1 text-xs font-bold text-white flex items-center justify-center whitespace-nowrap"
                     style={{ backgroundColor: catStyle.hex }}
                   >
                     {item.name}
                   </div>
                   {/* Right: Score (White) */}
                   <div className="px-3 py-1 bg-white text-xs font-bold text-gray-900 flex items-center justify-center border-t border-b border-r border-gray-200 whitespace-nowrap">
                     {item.score}
                   </div>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Panel */}
      <div className="w-full lg:w-96 flex-shrink-0 bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-white/50 overflow-hidden flex flex-col max-h-[600px]">
        
        <div className="p-3 border-b border-gray-100 bg-white/50 flex justify-between items-center z-10 shadow-sm">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
              Detection Results
            </h3>
             <span className="text-[10px] text-gray-400 font-medium">
               {items.length} detected
             </span>
          </div>
          <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">ViT-L/16</span>
        </div>

        {/* Scoring Criteria Accordion */}
        <div className="border-b border-gray-100 bg-blue-50/30">
           <button 
             onClick={() => setShowCriteria(!showCriteria)}
             className="w-full flex items-center justify-between p-3 text-xs font-bold text-blue-800 uppercase tracking-wide hover:bg-blue-50 transition-colors"
           >
             <div className="flex items-center gap-2">
               <Info size={14} />
               <span>Freshness Scoring Guide</span>
             </div>
             {showCriteria ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
           </button>
           
           {showCriteria && (
             <div className="p-3 space-y-3 bg-white/50 text-[10px] text-gray-600 border-t border-blue-100">
                <div className="bg-white p-2 rounded border border-blue-100 shadow-sm">
                  <p className="font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">Freshness Lifecycle (0-100)</p>
                  
                  {/* EXPLANATION BLOCK WITH BATTERY ANALOGY */}
                  <div className="mb-3 p-2 bg-blue-50 text-blue-900 rounded border border-blue-100 text-[10px] leading-relaxed">
                     <p className="mb-2"><strong>Concept:</strong> The score tracks the <span className="underline decoration-blue-300">biological life energy</span>.</p>
                     
                     <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="flex flex-col items-center">
                            <BatteryCharging size={16} className="text-green-600 mb-1" />
                            <span className="font-bold text-green-700">100% Life</span>
                            <span className="text-[9px] text-green-800 opacity-80 leading-tight">Unripe<br/>(Max Shelf-life)</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-r border-blue-200">
                            <Battery size={16} className="text-yellow-600 mb-1" />
                             <span className="font-bold text-yellow-700">~50% Life</span>
                             <span className="text-[9px] text-yellow-800 opacity-80 leading-tight">Peak Ripe<br/>(Eat Now)</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <BatteryWarning size={16} className="text-red-600 mb-1" />
                             <span className="font-bold text-red-700">0% Life</span>
                             <span className="text-[9px] text-red-800 opacity-80 leading-tight">Rotten<br/>(Dead)</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center bg-green-50 p-1 rounded px-2">
                      <span className="text-green-700 font-bold flex items-center gap-1"><BatteryCharging size={10} className="fill-green-600" /> Unripe / Fresh</span>
                      <span className="font-mono font-bold text-green-700">90-100</span>
                    </div>
                    <div className="flex justify-between items-center px-2">
                      <span className="text-lime-600 font-bold">Semi-ripe</span>
                      <span className="font-mono">70-90</span>
                    </div>
                    <div className="flex justify-between items-center bg-yellow-50 p-1 rounded px-2">
                      <span className="text-yellow-600 font-bold flex items-center gap-1"><Battery size={10} className="fill-yellow-500" /> Ripe (Peak)</span>
                      <span className="font-mono font-bold text-yellow-600">45-70</span>
                    </div>
                     <div className="flex justify-between items-center px-2">
                      <span className="text-orange-600 font-bold">Overripe</span>
                      <span className="font-mono">25-45</span>
                    </div>
                     <div className="flex justify-between items-center bg-red-50 p-1 rounded px-2">
                      <span className="text-red-600 font-bold flex items-center gap-1"><BatteryWarning size={10} className="text-red-600" /> Rotten</span>
                      <span className="font-mono font-bold text-red-600">0-25</span>
                    </div>
                  </div>
                </div>
             </div>
           )}
        </div>
        
        {/* BATCH SUMMARY CARD */}
        {!selectedItemId && items.length > 0 && (
          <div className="p-4 bg-gray-50/50 border-b border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Batch Summary</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <span className="block text-lg font-bold text-gray-800">{items.length}</span>
                <span className="text-[10px] text-gray-400">Total Items</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <span className={`block text-lg font-bold ${avgScore > 70 ? 'text-green-600' : 'text-yellow-600'}`}>{avgScore}</span>
                <span className="text-[10px] text-gray-400">Avg Freshness</span>
              </div>
              <div 
                className={`p-2 rounded-lg border shadow-sm cursor-pointer transition-colors ${lowScoreItems.length > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100' : 'bg-white border-gray-200'}`}
                onClick={() => {
                  if(lowScoreItems.length > 0) {
                     setSelectedItemId(lowScoreItems[0].id);
                  }
                }}
              >
                <span className={`block text-lg font-bold ${lowScoreItems.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{lowScoreItems.length}</span>
                <span className="text-[10px] text-gray-500">Expired</span>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-4 space-y-3 flex-grow">
          {selectedItemId && (
              <div className="mb-2">
               <button 
                 onClick={() => { setSelectedItemId(null); setFeedbackMode(false); }}
                 className="text-xs text-blue-600 flex items-center gap-1 hover:underline font-medium"
               >
                 <ArrowLeft size={10} /> Back to detected list
               </button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-12 flex flex-col items-center">
              <ScanEye size={32} className="mb-2 opacity-50" />
              <p>No objects detected.</p>
            </div>
          ) : (
            displayedItems.map((item) => {
              const catStyle = getCategoryStyle(item.name);
              const qualityStyle = getQualityColor(item.score);
              const ripenessBadgeClass = getRipenessBadge(item.ripeness_stage);
              const isSelected = selectedItemId === item.id;
              
              return (
                <div 
                  key={item.id} 
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  onClick={() => {
                     if (!isSelected) {
                        setSelectedItemId(item.id);
                        setFeedbackMode(false);
                     }
                  }}
                  className={`relative flex flex-col p-3 bg-white rounded-xl border transition-all duration-200 cursor-pointer group
                    ${(hoveredItemId === item.id || isSelected) ? `border-${catStyle.name}-400 shadow-md ring-1 ring-${catStyle.name}-200 bg-blue-50/10` : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {(hoveredItemId === item.id || isSelected) && (
                     <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: catStyle.hex }}></div>
                  )}

                  <div className="flex-1 w-full pl-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-2 h-2 rounded-full`} style={{ backgroundColor: catStyle.hex }}></span>
                          <span className="font-bold text-gray-900">{item.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${qualityStyle}`}>
                            Freshness: {item.score}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${ripenessBadgeClass}`}>
                            {item.ripeness_stage}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        {getActionBadge(item.score, userRole)}
                        <span className="text-[10px] text-gray-400 font-mono">CONF: {Math.round(item.confidence * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getProgressBarGradient(item.score)}`} 
                        style={{ width: `${item.score}%` }}
                      ></div>
                    </div>

                    {/* Feedback Loop (Active Learning) */}
                    {isSelected && (
                      <div className="mb-3 space-y-2">
                         {!feedbackMode && (
                           <div className="flex gap-2">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setFeedbackMode('LABEL'); }}
                                  className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                              >
                                  <Tag size={10} /> Wrong Label?
                              </button>
                              <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setManualScore(item.score); // Initialize slider
                                    setFeedbackMode('SCORE'); 
                                  }}
                                  className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
                              >
                                  <Gauge size={10} /> Disagree with Score?
                              </button>
                           </div>
                         )}
                         
                         {/* LABEL CORRECTION UI */}
                         {feedbackMode === 'LABEL' && (
                           <div className="bg-red-50 p-2 rounded border border-red-100 animate-in fade-in zoom-in-95">
                             <div className="flex items-center gap-1.5 mb-2 text-red-800">
                               <AlertTriangle size={12} />
                               <span className="text-[10px] font-bold uppercase">Correction: Wrong Object</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2 mb-2">
                                <button onClick={(e) => { e.stopPropagation(); handleManualLabelCorrection(item.id, 'Pear'); }} className="bg-white border border-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-red-50 hover:text-red-700 transition font-medium">Pear</button>
                                <button onClick={(e) => { e.stopPropagation(); handleManualLabelCorrection(item.id, 'Apple'); }} className="bg-white border border-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-red-50 hover:text-red-700 transition font-medium">Apple</button>
                                <button onClick={(e) => { e.stopPropagation(); handleManualLabelCorrection(item.id, 'Guava'); }} className="bg-white border border-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-red-50 hover:text-red-700 transition font-medium">Guava</button>
                                <button onClick={(e) => { e.stopPropagation(); handleManualLabelCorrection(item.id, 'Orange'); }} className="bg-white border border-gray-200 text-gray-700 text-xs py-1.5 rounded hover:bg-red-50 hover:text-red-700 transition font-medium">Orange</button>
                             </div>
                             <button onClick={(e) => { e.stopPropagation(); setFeedbackMode(false); }} className="text-[10px] text-gray-400 underline w-full text-center">Cancel</button>
                           </div>
                         )}

                         {/* SCORE CORRECTION UI */}
                         {feedbackMode === 'SCORE' && (
                            <div className="bg-yellow-50 p-3 rounded border border-yellow-100 animate-in fade-in zoom-in-95">
                              <div className="flex items-center gap-1.5 mb-3 text-yellow-800">
                                 <Gauge size={12} />
                                 <span className="text-[10px] font-bold uppercase">Calibration: Adjust Freshness</span>
                              </div>
                              <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-bold text-gray-500">0</span>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  value={manualScore} 
                                  onChange={(e) => setManualScore(Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                                />
                                <span className="text-xs font-bold text-gray-500">100</span>
                              </div>
                              <div className="text-center mb-3">
                                <span className="text-2xl font-bold text-yellow-700">{manualScore}</span>
                                <span className="text-xs text-yellow-600 ml-1">/ 100</span>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setFeedbackMode(false); }} className="flex-1 bg-white border border-gray-300 text-gray-600 text-xs py-1.5 rounded hover:bg-gray-50">Cancel</button>
                                <button onClick={(e) => { e.stopPropagation(); handleManualScoreCorrection(item.id, manualScore); }} className="flex-1 bg-yellow-600 text-white text-xs py-1.5 rounded font-bold hover:bg-yellow-700 shadow-sm">Confirm</button>
                              </div>
                            </div>
                         )}
                      </div>
                    )}

                    {(isSelected || displayedItems.length === 1) && (
                      <div className="mb-3 bg-purple-50 rounded border border-purple-100 p-2 animate-in fade-in slide-in-from-top-2">
                         <div className="flex items-center gap-1.5 mb-2 text-purple-800 font-bold text-xs uppercase tracking-wider">
                           <Activity size={12} /> Deep Diagnosis
                         </div>
                         
                         {item.color_distribution && (
                           <div className="mb-3">
                              <p className="text-[9px] text-gray-500 font-bold mb-1">COLOR SPECTRUM (HSV)</p>
                              <div className="flex h-2 rounded-full overflow-hidden w-full">
                                <div className="bg-green-500 h-full" style={{ width: `${item.color_distribution.green_ratio * 100}%` }}></div>
                                <div className="bg-yellow-400 h-full" style={{ width: `${item.color_distribution.yellow_ratio * 100}%` }}></div>
                                <div className="bg-amber-800 h-full" style={{ width: `${item.color_distribution.brown_ratio * 100}%` }}></div>
                              </div>
                           </div>
                         )}

                         <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-white p-1.5 rounded text-center shadow-sm">
                              <span className="block text-xl font-bold text-gray-800">{item.explainability?.defect_count || 0}</span>
                              <span className="text-[9px] text-gray-500 uppercase">Defects</span>
                            </div>
                            <div className="bg-white p-1.5 rounded text-center shadow-sm">
                              <span className="block text-xl font-bold text-gray-800">{item.explainability?.surface_discoloration_percent || 0}%</span>
                              <span className="text-[9px] text-gray-500 uppercase">Discoloration</span>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mb-3 bg-gray-50 p-2 rounded border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Sun size={14} className="text-orange-400 flex-shrink-0" />
                        <div className="flex flex-col leading-none">
                          <span className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Room</span>
                          <span className="text-xs font-semibold text-gray-700">{item.shelf_life_room}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
                        <Snowflake size={14} className="text-blue-400 flex-shrink-0" />
                         <div className="flex flex-col leading-none">
                          <span className="text-[9px] text-gray-400 uppercase font-bold mb-0.5">Fridge</span>
                          <span className="text-xs font-semibold text-gray-700">{item.shelf_life_fridge}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded leading-relaxed border border-dashed border-gray-200 font-mono">
                      <span className="font-semibold text-purple-700 block mb-1 flex items-center gap-1">
                        <ScanEye size={10} /> ATTENTION MAP REASONING:
                      </span>
                      {item.reasoning}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}