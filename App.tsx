
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, LayoutDashboard, Leaf, AlertCircle, CheckCircle2, X, Settings, BookOpen, Lightbulb, ArrowRight, Utensils, CalendarClock, Trash2, Check, ArrowUp, ArrowDown, Save, Skull, Info, Edit2, Hourglass, Star, ChefHat, Store, ShoppingCart, Percent, Archive, Briefcase, User, Factory, ScanLine, Layers, TrendingUp, PackageSearch, ScanBarcode, BarChart4, BrainCircuit, LogOut, Loader2, Lock, ArrowRightCircle, MousePointer2, Sparkles, Zap, ChevronDown, Share2, Sun, Snowflake } from 'lucide-react';
import { analyzeProduceImage } from './services/geminiService';
import { AnalysisOverlay } from './components/AnalysisOverlay';
import { TechSpecsModal } from './components/TechSpecsModal';
import { ClearanceChef } from './components/ClearanceChef';
import { RecipeBook } from './components/RecipeBook';
import { AppMode, AnalysisResult, TrainingExample, FoodPlanItem, FoodPlan, UserRole, PlanType } from './types';
// FIREBASE IMPORTS
import { auth, signUpUser, signInUser, logOutUser, saveUserData, loadUserData, uploadImageToStorage, deleteImageFromStorage } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

function App() {
  // --- AUTH & USER STATE ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Initial check
  const [isCloudSynced, setIsCloudSynced] = useState(false); // CRITICAL: Prevents overwriting cloud data with empty local state

  // --- APP STATE ---
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [previousMode, setPreviousMode] = useState<AppMode>(AppMode.DASHBOARD); // Track where user came from for Wizard return
  const [userRole, setUserRole] = useState<UserRole>('PERSONAL');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Initializing analysis..."); // Playful loading
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [selectedModel, setSelectedModel] = useState('flash');
  
  // UI Helper State
  const [showScanMenu, setShowScanMenu] = useState(false);
  
  // --- DATA STATE ---
  const [learningHistory, setLearningHistory] = useState<TrainingExample[]>([]);
  const [foodPlans, setFoodPlans] = useState<FoodPlan[]>([]);
  
  // --- UI STATE ---
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingItems, setPendingItems] = useState<FoodPlanItem[]>([]);
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // TOAST STATE
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // DELETE STATE
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Editing State
  const [editingPlanTitleId, setEditingPlanTitleId] = useState<string | null>(null);
  const [editingItemNameId, setEditingItemNameId] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState('');

  // Tooltip State
  type TooltipType = {
    x: number;
    y: number;
    type: 'TEXT' | 'VISUAL';
    content?: string;
    shelfLife?: { room?: string; fridge?: string };
    visualData?: {
      url: string;
      box: number[];
      score: number;
      name: string;
    };
  };
  const [tooltipData, setTooltipData] = useState<TooltipType | null>(null);

  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const brightnessInterval = useRef<number | null>(null);
  const [isTooDark, setIsTooDark] = useState(false);

  // --- AUTH FORM STATE (For Login Screen) ---
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authFormError, setAuthFormError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Loading Messages Rotation
  const loadingMessages = [
    "Peeking into the pixels...",
    "Checking freshness levels...",
    "Calculating crunch factor...",
    "Consulting the flavor matrix...",
    "Segmenting touching items...",
    "Applying shadow valley logic..."
  ];

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setLoadingMsg(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  // ------------------------------------------------------------------
  // 1. CRITICAL: AUTH & DATA SYNC LOGIC
  // ------------------------------------------------------------------
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      
      if (user) {
        console.log("User logged in:", user.uid);
        setCurrentUser(user);
        
        try {
          // DOWNLOAD DATA BEFORE ALLOWING SAVES
          const data = await loadUserData(user.uid);
          
          if (data) {
            console.log("Cloud data found, syncing...");
            if (data.plans) setFoodPlans(data.plans);
            if (data.learningHistory) setLearningHistory(data.learningHistory);
          } else {
            console.log("No cloud data (New User), initializing empty state.");
            setFoodPlans([]);
            setLearningHistory([]);
          }
          
          // UNLOCK SAVING mechanism
          setIsCloudSynced(true);
        } catch (e) {
          console.error("Sync failed", e);
          setError("Failed to sync data. Please refresh.");
        }
      } else {
        console.log("User logged out");
        setCurrentUser(null);
        setIsCloudSynced(false); // Lock saving
        setFoodPlans([]); // Clear sensitive data
        setLearningHistory([]);
        // FIX: Reset Auth Form State so login button doesn't spin
        setIsSubmittingAuth(false);
        setAuthFormError(null);
      }
      
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ------------------------------------------------------------------
  // 2. CRITICAL: AUTO-SAVE LOGIC (GUARDED)
  // ------------------------------------------------------------------
  useEffect(() => {
    // GUARD 1: Must be logged in
    if (!currentUser) return;
    
    // GUARD 2: Must have finished initial sync
    if (!isCloudSynced) return;

    if (authLoading) return;
    if (isSavingPlan || isDeleting) return; // Don't auto-save if we are in the middle of a manual operation

    const saveData = async () => {
      try {
        await saveUserData(currentUser.uid, foodPlans, learningHistory);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    };

    // Debounce save slightly to prevent thrashing
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);

  }, [foodPlans, learningHistory, currentUser, isCloudSynced, authLoading, isSavingPlan, isDeleting]);


  // ------------------------------------------------------------------
  // AUTH HANDLER
  // ------------------------------------------------------------------
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormError(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'LOGIN') {
        await signInUser(email, password);
      } else {
        await signUpUser(email, password);
      }
      // Success is handled by onAuthStateChanged
    } catch (err: any) {
      setAuthFormError(err.message.replace('Firebase:', '').trim());
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOutUser();
    } catch (error) {
      console.error("Logout failed", error);
    }
  };


  // ------------------------------------------------------------------
  // CAMERA & ANALYSIS LOGIC
  // ------------------------------------------------------------------
  const checkBrightness = () => {
    if (!videoRef.current || videoRef.current.readyState !== 4) return;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 64, 64);
    const imageData = ctx.getImageData(0, 0, 64, 64);
    const data = imageData.data;
    let colorSum = 0;
    for (let x = 0, len = data.length; x < len; x += 4) {
        colorSum += Math.floor((data[x] + data[x+1] + data[x+2]) / 3);
    }
    const brightness = Math.floor(colorSum / (64 * 64));
    setIsTooDark(brightness < 30);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (brightnessInterval.current) {
      window.clearInterval(brightnessInterval.current);
      brightnessInterval.current = null;
    }
    setIsTooDark(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      brightnessInterval.current = window.setInterval(checkBrightness, 500);
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === AppMode.CAMERA) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  const handleAnalysis = async (imgBase64: string) => {
    setIsAnalyzing(true);
    setLoadingMsg("Analyzing image..."); // Initial msg
    setError(null);
    try {
      const items = await analyzeProduceImage(imgBase64, selectedModel, learningHistory);
      const overallScore = items.length > 0 ? Math.round(items.reduce((acc, item) => acc + item.score, 0) / items.length) : 0;
      const result: AnalysisResult = { timestamp: Date.now(), items, imageUrl: imgBase64, overallScore };
      setCurrentResult(result);
      setHistory(prev => [result, ...prev]);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg');
        setCurrentImage(imgData);
        handleAnalysis(imgData);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCurrentImage(result);
        setMode(AppMode.UPLOAD);
        handleAnalysis(result);
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerNewUpload = () => {
    // FIX: Removed console.log that was causing Circular Structure error
    fileInputRef.current?.click();
  };

  const resetAnalysis = () => {
    setCurrentImage(null);
    setCurrentResult(null);
    setError(null);
    if (mode === AppMode.CAMERA) startCamera();
  };

  const onUserCorrection = (itemId: string, correctionType: 'LABEL' | 'SCORE', value: string | number) => {
    if (!currentResult) return;
    // Logic for active learning updates...
    const item = currentResult.items.find(i => i.id === itemId);
    if (!item) return;

    if (correctionType === 'LABEL') {
      const newExample: TrainingExample = {
        id: Date.now().toString(), type: 'LABEL_CORRECTION', originalLabel: item.name, correctedLabel: value as string,
        visualContext: `Confidence: ${item.confidence}`, timestamp: Date.now()
      };
      setLearningHistory(prev => [...prev, newExample]);
      setCurrentResult(prev => prev ? ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, name: value as string } : i) }) : null);
      showToast(`Feedback Received: Label corrected to ${value}.`, 'success');
    } else if (correctionType === 'SCORE') {
      const newExample: TrainingExample = {
        id: Date.now().toString(), type: 'SCORE_CORRECTION', originalScore: item.score, correctedScore: value as number,
        visualContext: `Confidence: ${item.confidence}`, timestamp: Date.now()
      };
      setLearningHistory(prev => [...prev, newExample]);
      setCurrentResult(prev => prev ? ({ ...prev, items: prev.items.map(i => i.id === itemId ? { ...i, score: value as number } : i) }) : null);
      showToast(`Feedback Received: Score calibrated to ${value}.`, 'success');
    }
  };

  // --- FOOD PLAN HELPERS ---
  const prepareFoodPlanSave = () => {
    if (!currentResult) return;
    const items: FoodPlanItem[] = currentResult.items.map(item => {
      let priority: 'DISCARD' | 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
      let consumptionAdvice = '';
      
      if (userRole === 'PERSONAL') {
        if (item.score < 25) { priority = 'DISCARD'; consumptionAdvice = 'Rotten • Discard immediately'; }
        else if (item.score < 45) { priority = 'URGENT'; consumptionAdvice = 'Overripe • Use today'; }
        else if (item.score < 70) { priority = 'HIGH'; consumptionAdvice = 'Peak Quality • Enjoy raw now'; }
        else if (item.score < 90) { priority = 'MEDIUM'; consumptionAdvice = 'Semi-ripe • Ready in 2-3 days'; }
        else { priority = 'LOW'; consumptionAdvice = 'Unripe • Store (Good shelf life)'; }
      } else {
        if (item.score < 25) { priority = 'DISCARD'; consumptionAdvice = 'Write-off / Compost'; }
        else if (item.score < 45) { priority = 'URGENT'; consumptionAdvice = 'Markdown 50% (Flash Sale)'; }
        else if (item.score < 70) { priority = 'HIGH'; consumptionAdvice = 'Premium Display (Best Price)'; }
        else if (item.score < 90) { priority = 'MEDIUM'; consumptionAdvice = 'Stock on Shelves'; }
        else { priority = 'LOW'; consumptionAdvice = 'Backroom Inventory (Hold)'; }
      }
      return { 
        ...item, 
        priority, 
        consumptionAdvice, 
        fullAdvice: item.reasoning,
        shelf_life_room: item.shelf_life_room,
        shelf_life_fridge: item.shelf_life_fridge
      };
    });
    setPendingItems(items);
    setNewPlanName(userRole === 'PERSONAL' ? `Fridge Scan ${new Date().toLocaleDateString()}` : `Warehouse Audit ${new Date().toLocaleDateString()}`);
    const relevantPlans = foodPlans.filter(p => p.type === (userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES'));
    setSelectedPlanId(relevantPlans.length > 0 ? relevantPlans[0].id : 'new');
    setShowSaveDialog(true);
  };

  const confirmSavePlan = async () => {
    if (!currentUser) return;
    setIsSavingPlan(true);

    try {
      // 1. Upload Image to Storage (if new)
      let imageUrl = '';
      if (currentImage) {
        // We reuse the same image URL for all items in this batch to save space/bandwidth
        imageUrl = await uploadImageToStorage(currentUser.uid, currentImage);
      }

      // 2. Attach URL to items
      const finalItems = pendingItems.map(item => ({
        ...item,
        originalImageUrl: imageUrl // Attach the cloud URL
      }));

      const currentPlanType: PlanType = userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES';
      
      let updatedPlans: FoodPlan[];
      
      if (selectedPlanId === 'new') {
        const newPlan: FoodPlan = { 
          id: Date.now().toString(), 
          title: newPlanName || 'Untitled', 
          type: currentPlanType, 
          createdAt: Date.now(), 
          items: finalItems.sort((a, b) => a.score - b.score) 
        };
        updatedPlans = [newPlan, ...foodPlans];
      } else {
        updatedPlans = foodPlans.map(p => 
          p.id === selectedPlanId 
            ? { ...p, items: [...finalItems, ...p.items].sort((a, b) => a.score - b.score) } 
            : p
        );
      }
      
      // Update Local State
      setFoodPlans(updatedPlans);

      // FORCE SYNC TO CLOUD IMMEDIATELY
      // This prevents the "image URL missing on other browsers" issue by ensuring strict write
      await saveUserData(currentUser.uid, updatedPlans, learningHistory);
      
      setShowSaveDialog(false);
      setMode(AppMode.DASHBOARD);
      showToast("Plan saved successfully!", 'success');
    } catch (error) {
      console.error("Failed to save plan:", error);
      showToast("Failed to save plan.", 'error');
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Plan Management Helpers
  const handleDeleteClick = (id: string) => {
    setPlanToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete || !currentUser) return;
    setIsDeleting(true);

    try {
       const plan = foodPlans.find(p => p.id === planToDelete);
       if (plan) {
         // 1. Deep Clean: Delete associated images from storage
         // Collect unique image URLs to avoid duplicate deletion attempts
         const imageUrls = new Set<string>();
         plan.items.forEach(item => {
           if (item.originalImageUrl) imageUrls.add(item.originalImageUrl);
         });

         // Delete images in parallel
         await Promise.all(Array.from(imageUrls).map(url => deleteImageFromStorage(url)));
       }

       // 2. Remove from local state
       const updatedPlans = foodPlans.filter(p => p.id !== planToDelete);
       setFoodPlans(updatedPlans);

       // 3. Force Sync to Cloud
       await saveUserData(currentUser.uid, updatedPlans, learningHistory);
       showToast("Plan deleted.", 'success');

    } catch (error) {
       console.error("Error deleting plan:", error);
       showToast("Failed to delete plan.", 'error');
    } finally {
       setIsDeleting(false);
       setShowDeleteConfirm(false);
       setPlanToDelete(null);
    }
  };


  const movePlan = (idx: number, dir: 'up' | 'down', list: FoodPlan[]) => {
    // Basic array move logic
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === list.length - 1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newPlans = [...foodPlans];
    // Find absolute indices
    const itemA = list[idx];
    const itemB = list[targetIdx];
    const realIdxA = newPlans.findIndex(p => p.id === itemA.id);
    const realIdxB = newPlans.findIndex(p => p.id === itemB.id);
    [newPlans[realIdxA], newPlans[realIdxB]] = [newPlans[realIdxB], newPlans[realIdxA]];
    setFoodPlans(newPlans);
  };
  const startEditingPlanTitle = (id: string, title: string) => { setEditingPlanTitleId(id); setTempEditValue(title); };
  const savePlanTitle = (id: string, title: string) => { setFoodPlans(prev => prev.map(p => p.id === id ? { ...p, title } : p)); setEditingPlanTitleId(null); };
  const startEditingItemName = (uniqueId: string, name: string) => { setEditingItemNameId(uniqueId); setTempEditValue(name); };
  const saveItemName = (planId: string, itemId: string, name: string) => { setFoodPlans(prev => prev.map(p => p.id === planId ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, name } : i) } : p)); setEditingItemNameId(null); };
  const removeItemFromPlan = (planId: string, itemId: string) => { setFoodPlans(prev => prev.map(p => p.id === planId ? { ...p, items: p.items.filter(i => i.id !== itemId) } : p)); };
  
  // Tooltip Helpers
  const handleMouseEnterTooltip = (e: React.MouseEvent, c: string, shelfLife?: { room?: string; fridge?: string }) => {
    setTooltipData({ x: e.clientX, y: e.clientY, type: 'TEXT', content: c, shelfLife });
  };
  
  const handleMouseEnterVisualTooltip = (e: React.MouseEvent, item: FoodPlanItem) => {
    if (!item.originalImageUrl || !item.box_2d) return;
    setTooltipData({
      x: e.clientX,
      y: e.clientY,
      type: 'VISUAL',
      visualData: {
        url: item.originalImageUrl,
        box: item.box_2d,
        score: item.score,
        name: item.name
      }
    });
  };

  const handleMouseLeaveTooltip = () => setTooltipData(null);
  const visiblePlans = foodPlans.filter(p => userRole === 'PERSONAL' ? p.type === 'CONSUMPTION' : p.type === 'SALES');

  // ------------------------------------------------------------------
  // RENDER: LOADING STATE
  // ------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-green-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Syncing with FreshLoop Cloud...</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: LOGIN SCREEN (MANDATORY)
  // ------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900 relative overflow-hidden font-sans">
         {/* Background Effects - Deep Aurora */}
         <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950"></div>
         <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
         
         {/* Floating Orbs */}
         <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[120px] opacity-20 animate-pulse-glow"></div>
         <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px] opacity-20 animate-pulse-glow" style={{animationDelay: '1s'}}></div>
         
         <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative z-10 min-h-[600px] border border-white/10">
            
            {/* Left: Branding & Value */}
            <div className="p-12 text-white flex flex-col justify-between relative overflow-hidden">
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="p-2.5 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 rounded-xl shadow-lg">
                     <Leaf size={28} className="text-white" />
                   </div>
                   <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300">FreshLoop</h1>
                 </div>
                 <h2 className="text-4xl font-extrabold mb-6 leading-tight">
                   Every Bite Counts. <br/>
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">Nothing Left Behind.</span>
                 </h2>
                 <p className="text-gray-300 text-lg leading-relaxed">
                   AI-powered freshness tracking that turns your ingredients into delicious plans.
                 </p>
               </div>

               <div className="relative z-10 space-y-5 mt-8">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10"><ScanLine size={18} className="text-cyan-300" /></div>
                     <span className="font-medium text-gray-200">Smart Freshness Detection</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10"><Share2 size={18} className="text-purple-300" /></div>
                     <span className="font-medium text-gray-200">Synced Across Devices</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10"><Layers size={18} className="text-pink-300" /></div>
                     <span className="font-medium text-gray-200">Personal + Business Modes</span>
                  </div>
               </div>
            </div>

            {/* Right: Auth Form */}
            <div className="p-12 flex flex-col justify-center bg-white/95 backdrop-blur-md">
               <div className="max-w-md mx-auto w-full">
                  <div className="mb-8">
                     <h3 className="text-2xl font-bold text-gray-900 mb-2">
                       {authMode === 'LOGIN' ? 'Welcome Back' : 'Join FreshLoop'}
                     </h3>
                     <p className="text-gray-500">
                       {authMode === 'LOGIN' ? 'Enter your details to access your dashboard.' : 'Start your zero-waste journey today.'}
                     </p>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-5">
                     <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 ml-1">Email Address</label>
                        <input 
                           type="email" 
                           required
                           value={email}
                           onChange={(e) => setEmail(e.target.value)}
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-gray-900"
                           placeholder="name@example.com"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5 ml-1">Password</label>
                        <input 
                           type="password" 
                           required
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-gray-900"
                           placeholder="••••••••"
                        />
                     </div>

                     {authFormError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 border border-red-100">
                           <AlertCircle size={16} /> {authFormError}
                        </div>
                     )}

                     <button 
                        type="submit" 
                        disabled={isSubmittingAuth}
                        className="w-full py-3.5 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 animate-gradient-flow"
                     >
                        {isSubmittingAuth ? <Loader2 className="animate-spin" size={20} /> : (
                           <>
                             {authMode === 'LOGIN' ? 'Log In' : 'Create Account'}
                             <ArrowRightCircle size={20} />
                           </>
                        )}
                     </button>
                  </form>

                  <div className="mt-8 text-center pt-6 border-t border-gray-100">
                     <p className="text-sm text-gray-600 mb-4">
                        {authMode === 'LOGIN' ? "New to FreshLoop?" : "Already have an account?"}
                     </p>
                     <button 
                        onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setAuthFormError(null); }}
                        className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-80 transition-opacity"
                     >
                        {authMode === 'LOGIN' ? 'Create Free Account' : 'Log In Existing Account'}
                     </button>
                  </div>
               </div>
            </div>
         </div>
         <p className="absolute bottom-6 text-white/30 text-xs font-mono">FreshLoop v3.0 • Secure Firebase Auth</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: MAIN APP (AUTHENTICATED)
  // ------------------------------------------------------------------
  
  // Theme Variables based on Role - Deepened for better visibility
  const theme = userRole === 'PERSONAL' ? {
    headerGradient: 'bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-400',
    headerText: 'text-rose-800',
    iconColor: 'text-rose-700',
    subtleBg: 'bg-rose-50',
    primaryBtn: 'bg-gradient-to-r from-rose-500 to-orange-500',
    roadmapBg: 'bg-gradient-to-br from-rose-50/80 via-white to-orange-50/50',
    accentColor: 'text-rose-700',
    scanIcon: <Camera size={18} />
  } : {
    headerGradient: 'bg-gradient-to-r from-cyan-500 via-violet-500 to-blue-500',
    headerText: 'text-indigo-800',
    iconColor: 'text-indigo-700',
    subtleBg: 'bg-indigo-50',
    primaryBtn: 'bg-gradient-to-r from-blue-600 to-indigo-700',
    roadmapBg: 'bg-gradient-to-br from-cyan-50/80 via-white to-indigo-50/50',
    accentColor: 'text-indigo-700',
    scanIcon: <PackageSearch size={18} />
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 font-sans">
      {/* ALWAYS RENDER HIDDEN FILE INPUT FOR GLOBAL ACCESS */}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* GLASS NAV HEADER */}
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setMode(AppMode.DASHBOARD)}>
            <div className={`p-2 rounded-xl text-white shadow-lg transition-all duration-500 ${theme.headerGradient} group-hover:scale-110 group-hover:rotate-3`}>
               <Leaf size={22} className="text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-extrabold tracking-tight bg-clip-text text-transparent ${theme.headerGradient}`}>
                FreshLoop
              </h1>
              {/* TAGLINE UPDATE */}
              <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
                {userRole === 'BUSINESS' ? "Audit. Grade. Profit." : "Scan. Plan. Savor."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Role Switcher */}
            {(mode === AppMode.DASHBOARD || mode === AppMode.PLANS) && (
              <div className="flex bg-gray-100/50 p-1 rounded-full border border-gray-200/50 hidden md:flex backdrop-blur-sm">
                 <button onClick={() => setUserRole('PERSONAL')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${userRole === 'PERSONAL' ? 'bg-white text-rose-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}>
                   <User size={14} /> Personal
                 </button>
                 <button onClick={() => setUserRole('BUSINESS')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${userRole === 'BUSINESS' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}>
                   <Briefcase size={14} /> Business
                   {userRole === 'BUSINESS' && <span className="text-[8px] bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-1 py-0.5 rounded ml-1">BETA</span>}
                 </button>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              <button
                 onClick={() => setMode(AppMode.DASHBOARD)}
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === AppMode.DASHBOARD ? `bg-gray-100 ${theme.accentColor}` : 'text-gray-500 hover:bg-gray-50'}`}
              >
                 <LayoutDashboard size={18} />
                 <span className="hidden sm:inline">Home</span>
              </button>

              {/* CONSOLIDATED SCAN BUTTON */}
              <div className="relative">
                 <button
                    onClick={() => setShowScanMenu(!showScanMenu)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === AppMode.CAMERA || mode === AppMode.UPLOAD ? `bg-gray-100 ${theme.accentColor}` : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                    {theme.scanIcon}
                    <span className="hidden sm:inline">Scan</span>
                    <ChevronDown size={14} className={`transition-transform ${showScanMenu ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {showScanMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95">
                       <button 
                          onClick={() => { setMode(AppMode.CAMERA); resetAnalysis(); setShowScanMenu(false); }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                       >
                          <Camera size={16} className="text-gray-400" /> Live Camera
                       </button>
                       <button 
                          onClick={() => { 
                             stopCamera(); // Stop live camera if active
                             setMode(AppMode.UPLOAD);
                             setShowScanMenu(false);
                             // Small delay to ensure render updates before trigger
                             setTimeout(() => triggerNewUpload(), 100); 
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                       >
                          <Upload size={16} className="text-gray-400" /> Upload Photo
                       </button>
                    </div>
                 )}
              </div>

              <button
                 onClick={() => setMode(AppMode.PLANS)} 
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === AppMode.PLANS ? `bg-gray-100 ${theme.accentColor}` : 'text-gray-500 hover:bg-gray-50'}`}
              >
                 {userRole === 'PERSONAL' ? <Utensils size={18} /> : <BarChart4 size={18} />}
                 <span className="hidden sm:inline">{userRole === 'PERSONAL' ? 'Plans' : 'Stock'}</span>
              </button>

              {userRole === 'PERSONAL' && (
                <button
                   onClick={() => setMode(AppMode.RECIPES)}
                   className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mode === AppMode.RECIPES ? `bg-gray-100 ${theme.accentColor}` : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <BookOpen size={18} />
                   <span className="hidden sm:inline">Recipes</span>
                </button>
              )}
            </nav>

            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            <div className="flex items-center gap-2">
               <button onClick={() => setShowTechSpecs(true)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors"><BrainCircuit size={20} /></button>
               <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={20} /> <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-900"><X size={18} /></button>
          </div>
        )}

        {/* --- RECIPE MODE --- */}
        {mode === AppMode.RECIPES && userRole === 'PERSONAL' && (
           <RecipeBook 
             currentUserId={currentUser.uid} 
             onNavigateToWizard={() => {
                setPreviousMode(AppMode.RECIPES);
                setMode(AppMode.CHEF_WIZARD);
             }} 
             onShowToast={showToast} 
           />
        )}
        
        {/* --- CHEF WIZARD MODE --- */}
        {mode === AppMode.CHEF_WIZARD && (
           <ClearanceChef 
             plans={foodPlans.filter(p => userRole === 'PERSONAL' ? p.type === 'CONSUMPTION' : p.type === 'SALES')}
             userRole={userRole}
             currentUserId={currentUser.uid}
             onClose={() => setMode(previousMode)}
             onNavigateToRecipes={() => {
                setPreviousMode(AppMode.RECIPES);
                setMode(AppMode.RECIPES);
             }}
             onShowToast={showToast}
           />
        )}

        {/* --- DASHBOARD & PLANS VIEW --- */}
        {(mode === AppMode.DASHBOARD || mode === AppMode.PLANS) && (
          <div className="space-y-10 animate-in fade-in duration-500">
            
            {/* 1. ROADMAP & ACTIONS (ONLY ON DASHBOARD) */}
            {mode === AppMode.DASHBOARD && (
              <>
                <div className={`rounded-3xl p-10 shadow-2xl relative overflow-hidden transition-all duration-700 border border-white/50 ${theme.roadmapBg}`}>
                  {/* Aurora Orbs */}
                  <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40 mix-blend-multiply transition-colors duration-700 ${userRole === 'PERSONAL' ? 'bg-pink-300' : 'bg-cyan-300'}`}></div>
                  <div className={`absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-40 mix-blend-multiply transition-colors duration-700 ${userRole === 'PERSONAL' ? 'bg-yellow-200' : 'bg-violet-300'}`}></div>
                  
                  <div className="max-w-6xl mx-auto relative z-10">
                    <div className="mb-10 text-center md:text-left">
                        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
                          {userRole === 'PERSONAL' ? "My Kitchen Hub" : "Inventory Command Center"}
                        </h2>
                        <p className="text-lg text-gray-600 font-medium">
                          {userRole === 'PERSONAL' ? "From fridge to fork in 3 simple steps." : "Audit. Grade. Profit."}
                        </p>
                    </div>
                    
                    {userRole === 'PERSONAL' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-orange-100 rounded-xl flex items-center justify-center mb-4 text-rose-500 shadow-inner"><ScanLine size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-rose-900/5 select-none">01</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Scan</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">Snap a photo — we'll identify every item and estimate its freshness.</p>
                          </div>
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center mb-4 text-orange-500 shadow-inner"><Layers size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-orange-900/5 select-none">02</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Prioritize</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">See what to eat first, what can wait, and what needs attention.</p>
                          </div>
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-lime-100 rounded-xl flex items-center justify-center mb-4 text-yellow-600 shadow-inner"><ChefHat size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-yellow-900/5 select-none">03</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Cook</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">Get personalized recipes from Clearance Chef to use it all up.</p>
                          </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center mb-4 text-cyan-600 shadow-inner"><PackageSearch size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-cyan-900/5 select-none">01</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Scan Inventory</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">The system automatically catalogs items and generates a structured digital inventory.</p>
                          </div>
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4 text-blue-600 shadow-inner"><ScanBarcode size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-blue-900/5 select-none">02</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Grading</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">Produce items are assigned standardized quality levels using consistency-focused models.</p>
                          </div>
                          <div className="glass-card p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mb-4 text-indigo-600 shadow-inner"><TrendingUp size={24} /></div>
                                <div className="absolute top-6 right-6 font-black text-6xl text-indigo-900/5 select-none">03</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Pricing</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">Route stock to full-price shelves, discount bins, or Clearance Chef processing.</p>
                          </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={() => setMode(AppMode.CAMERA)} className={`group relative h-40 bg-white border border-gray-100 rounded-2xl p-6 flex flex-row items-center gap-6 transition-all hover:shadow-lg overflow-hidden ${userRole === 'PERSONAL' ? 'hover:border-rose-200' : 'hover:border-cyan-200'}`}>
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${userRole === 'PERSONAL' ? 'bg-rose-50/30' : 'bg-cyan-50/30'}`}></div>
                      <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${userRole === 'PERSONAL' ? 'bg-rose-100 text-rose-600' : 'bg-cyan-100 text-cyan-600'}`}><Camera size={28} /></div>
                      <div className="relative z-10 text-left">
                        <h3 className="text-xl font-bold text-gray-900">Scan Now</h3>
                        <p className="text-sm text-gray-500">Real-time quality detection</p>
                      </div>
                      <ArrowRightCircle className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${theme.iconColor}`} />
                  </button>
                  <button onClick={() => triggerNewUpload()} className={`group relative h-40 bg-white border border-gray-100 rounded-2xl p-6 flex flex-row items-center gap-6 transition-all hover:shadow-lg overflow-hidden ${userRole === 'PERSONAL' ? 'hover:border-orange-200' : 'hover:border-indigo-200'}`}>
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${userRole === 'PERSONAL' ? 'bg-orange-50/30' : 'bg-indigo-50/30'}`}></div>
                      <div className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${userRole === 'PERSONAL' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}><Upload size={28} /></div>
                      <div className="relative z-10 text-left">
                        <h3 className="text-xl font-bold text-gray-900">Upload Photo</h3>
                        <p className="text-sm text-gray-500">Analyze existing images</p>
                      </div>
                      <ArrowRightCircle className={`ml-auto opacity-0 group-hover:opacity-100 transition-opacity ${theme.iconColor}`} />
                  </button>
                </div>
              </>
            )}

            {/* 3. PLANS MODULE (SHARED BETWEEN DASHBOARD AND PLANS TAB) */}
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                   <div className="flex items-center gap-3">
                      <div>
                         <h3 className="font-bold text-gray-900 text-2xl">{userRole === 'PERSONAL' ? 'My Plans' : 'Sales Strategies'}</h3>
                         <p className="text-sm text-gray-500 font-medium">{userRole === 'PERSONAL' ? 'Eat fresh, waste nothing.' : 'Optimization Reports'}</p>
                      </div>
                   </div>

                   {/* CLEARANCE CHEF BUTTON - RAINBOW GLOW */}
                   {userRole === 'PERSONAL' && (
                     <button 
                       onClick={() => {
                          setPreviousMode(mode); // Could be Dashboard or Plans
                          setMode(AppMode.CHEF_WIZARD);
                       }}
                       className="group relative flex items-center gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 hover:shadow-xl transition-all overflow-hidden animate-pulse-glow"
                     >
                       <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                       <ChefHat size={20} className="relative z-10 group-hover:rotate-12 transition-transform" />
                       <span className="relative z-10">Clearance Chef</span>
                       <Sparkles size={16} className="text-yellow-200 relative z-10" />
                     </button>
                   )}
                </div>

                {visiblePlans.length === 0 ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-200 border-dashed p-16 text-center flex flex-col items-center justify-center text-gray-400">
                     <div className="bg-gray-50 p-6 rounded-full mb-6">{userRole === 'PERSONAL' ? <ChefHat size={40} className="opacity-40 text-gray-600" /> : <Briefcase size={40} className="opacity-40 text-gray-600" />}</div>
                     <h4 className="text-xl font-bold text-gray-900 mb-2">{userRole === 'PERSONAL' ? "Your kitchen is waiting!" : "No audit data."}</h4>
                     <p className="text-gray-500 mb-8 max-w-sm mx-auto">{userRole === 'PERSONAL' ? "📸 Scan your first photo to get started." : "Scan inventory to begin."}</p>
                     <button onClick={() => triggerNewUpload()} className={`px-8 py-3 text-white rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105 ${theme.primaryBtn}`}>Create First Plan</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {visiblePlans.map((plan, planIndex) => (
                      <div key={plan.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 group transition-all hover:shadow-xl">
                         {/* Plan Header */}
                         <div className="bg-white p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                               {editingPlanTitleId === plan.id ? (
                                 <div className="flex items-center gap-2">
                                   <input autoFocus type="text" value={tempEditValue} onChange={(e) => setTempEditValue(e.target.value)} className="px-3 py-1.5 border border-blue-400 rounded-lg text-lg font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100" />
                                   <button onClick={() => savePlanTitle(plan.id, tempEditValue)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"><Check size={18} /></button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-3 cursor-pointer" onClick={() => startEditingPlanTitle(plan.id, plan.title)}>
                                    <h4 className="font-bold text-xl text-gray-900 tracking-tight">{plan.title}</h4>
                                    <Edit2 size={16} className="text-gray-300 hover:text-gray-600 transition-colors" />
                                 </div>
                               )}
                               <span className="text-xs text-gray-400 font-mono hidden sm:inline px-2 py-1 bg-gray-50 rounded border border-gray-100">{new Date(plan.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <button disabled={planIndex === 0} onClick={() => movePlan(planIndex, 'up', visiblePlans)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ArrowUp size={18} /></button>
                               <button disabled={planIndex === visiblePlans.length - 1} onClick={() => movePlan(planIndex, 'down', visiblePlans)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ArrowDown size={18} /></button>
                               <div className="h-6 w-px bg-gray-200 mx-2"></div>
                               <button onClick={() => handleDeleteClick(plan.id)} className="flex items-center gap-1.5 px-4 py-2 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-all"><Trash2 size={14} /> Delete</button>
                            </div>
                         </div>
                         <div className="overflow-x-auto bg-gray-50/30">
                           <table className="w-full text-left text-sm border-separate border-spacing-y-2 px-4 py-2">
                              <thead className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">
                                 <tr>
                                    <th className="px-6 py-2 pl-8">Item Name</th>
                                    <th className="px-6 py-2">Freshness</th>
                                    <th className="px-6 py-2">{userRole === 'PERSONAL' ? 'Priority' : 'Status'}</th>
                                    <th className="px-6 py-2">{userRole === 'PERSONAL' ? 'Advice' : 'Strategy'}</th>
                                    <th className="px-6 py-2 text-right pr-8">Action</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {plan.items.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No items in this plan.</td></tr>
                                 ) : (
                                   plan.items.map((item) => {
                                      const uniqueItemId = `${plan.id}-${item.id}`;
                                      const isRotten = item.priority === 'DISCARD';
                                      return (
                                        <tr key={item.id} className={`transition-all duration-300 shadow-sm rounded-2xl ${isRotten ? 'bg-gray-100' : 'bg-white hover:translate-y-[-2px] hover:shadow-md'}`}>
                                          <td className="px-6 py-4 font-medium text-gray-900 rounded-l-2xl pl-8 border-y border-l border-transparent hover:border-gray-200">
                                              {editingItemNameId === uniqueItemId ? (
                                                <div className="flex items-center gap-2"><input autoFocus type="text" value={tempEditValue} onChange={(e) => setTempEditValue(e.target.value)} className="w-32 px-2 py-1 border border-blue-400 rounded text-xs" onKeyDown={(e) => { if (e.key === 'Enter') saveItemName(plan.id, item.id, tempEditValue); }} /><button onClick={() => saveItemName(plan.id, item.id, tempEditValue)} className="text-green-600 p-1"><Check size={12} /></button></div>
                                              ) : (
                                                <div 
                                                  className="flex items-center gap-3 cursor-help relative group/item" 
                                                  onMouseEnter={(e) => handleMouseEnterVisualTooltip(e, item)} 
                                                  onMouseLeave={handleMouseLeaveTooltip}
                                                >
                                                   <span className={`w-2 h-2 rounded-full ${isRotten ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                                                   <span className={`${isRotten ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.name}</span>
                                                   {item.originalImageUrl && <MousePointer2 size={12} className="text-blue-400 opacity-0 group-hover/item:opacity-100 transition-opacity" />}
                                                   <button onClick={(e) => { e.stopPropagation(); startEditingItemName(uniqueItemId, item.name); }} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-blue-600 transition-opacity"><Edit2 size={12} /></button>
                                                </div>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 border-y border-transparent hover:border-gray-200">
                                              <div className="flex items-center gap-2">
                                                {/* Gradient Progress Bar */}
                                                <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                  <div className={`h-full bg-gradient-to-r ${item.score < 25 ? 'from-gray-500 to-gray-600' : item.score < 45 ? 'from-red-500 to-red-600' : item.score < 70 ? 'from-orange-400 to-orange-500' : item.score < 90 ? 'from-yellow-400 to-yellow-500' : 'from-green-500 to-emerald-500'}`} style={{ width: `${item.score}%` }}></div>
                                                </div>
                                                <span className={`text-xs font-mono font-bold ${isRotten ? 'text-gray-400' : 'text-gray-600'}`}>{item.score}%</span>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 border-y border-transparent hover:border-gray-200">
                                              {/* GRADIENT BADGES */}
                                              {userRole === 'PERSONAL' ? (
                                                <>
                                                  {item.priority === 'DISCARD' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500"><Skull size={12} /> DISCARD</span>}
                                                  {item.priority === 'URGENT' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-100 to-red-50 text-red-700 border border-red-100"><AlertCircle size={12} /> URGENT</span>}
                                                  {item.priority === 'HIGH' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border border-orange-100"><Star size={12} /> HIGH</span>}
                                                  {item.priority === 'MEDIUM' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border border-yellow-100"><Hourglass size={12} /> MEDIUM</span>}
                                                  {item.priority === 'LOW' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-green-100 to-green-50 text-green-700 border border-green-100"><CheckCircle2 size={12} /> LOW</span>}
                                                </>
                                              ) : (
                                                <>
                                                  {item.priority === 'DISCARD' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-white"><Skull size={12} /> WRITE-OFF</span>}
                                                  {item.priority === 'URGENT' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm"><Percent size={12} /> CLEARANCE</span>}
                                                  {item.priority === 'HIGH' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-sm"><Star size={12} /> PRIME</span>}
                                                  {item.priority === 'MEDIUM' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500 text-white"><Store size={12} /> STOCK</span>}
                                                  {item.priority === 'LOW' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200"><Archive size={12} /> STORAGE</span>}
                                                </>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 border-y border-transparent hover:border-gray-200">
                                              <div 
                                                className="flex items-center gap-2 cursor-help w-fit" 
                                                onMouseEnter={(e) => handleMouseEnterTooltip(e, item.fullAdvice || item.reasoning, { room: item.shelf_life_room, fridge: item.shelf_life_fridge })} 
                                                onMouseLeave={handleMouseLeaveTooltip}
                                              >
                                                <span className="text-xs text-gray-600 truncate max-w-[150px] block font-medium">{item.consumptionAdvice}</span>
                                                <Info size={12} className="text-gray-300 hover:text-blue-500 transition-colors" />
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-right rounded-r-2xl pr-8 border-y border-r border-transparent hover:border-gray-200">
                                              {isRotten ? (
                                                <button onClick={() => removeItemFromPlan(plan.id, item.id)} className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ml-auto"><Trash2 size={14} /> Remove</button>
                                              ) : (
                                                <button onClick={() => removeItemFromPlan(plan.id, item.id)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ml-auto border border-transparent ${userRole === 'PERSONAL' ? 'text-green-600 hover:bg-green-50' : 'text-blue-600 hover:bg-blue-50'}`}>{userRole === 'PERSONAL' ? <><Check size={14} /> Mark Eaten</> : <><ShoppingCart size={14} /> Mark Sold</>}</button>
                                              )}
                                          </td>
                                        </tr>
                                      );
                                   })
                                 )}
                              </tbody>
                           </table>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* --- CAMERA VIEW --- */}
        {mode === AppMode.CAMERA && (
          <div className="max-w-4xl mx-auto">
            {!currentImage ? (
              <div className="relative bg-black rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border-4 border-gray-900">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isTooDark && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40"><div className="bg-black/70 backdrop-blur-md text-yellow-400 px-6 py-4 rounded-xl border border-yellow-500/50 flex flex-col items-center gap-3 animate-pulse"><Lightbulb size={32} /><div className="text-center"><h3 className="font-bold text-lg">Too Dark</h3><p className="text-sm text-yellow-200/80">Turn on a light for better accuracy</p></div></div></div>}
                <div className="absolute inset-0 pointer-events-none border-[1px] border-white/20"><div className="absolute bottom-10 left-0 right-0 text-center"><p className="text-white/80 text-sm font-medium bg-black/50 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">Align produce within frame</p></div></div>
                <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20"><button onClick={captureImage} className="w-20 h-20 rounded-full bg-white border-[6px] border-white/30 shadow-2xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"><div className={`w-16 h-16 rounded-full ${userRole === 'PERSONAL' ? 'bg-rose-500' : 'bg-cyan-500'}`}></div></button></div>
              </div>
            ) : (
              <div className="space-y-6">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl shadow-sm border border-gray-100">
                     <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4 ${userRole === 'PERSONAL' ? 'border-rose-200 border-t-rose-500' : 'border-cyan-200 border-t-cyan-500'}`}></div>
                     <p className="text-gray-500 font-medium animate-pulse">{loadingMsg}</p>
                  </div>
                ) : (
                  currentResult && (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Analysis Results</h2><div className="flex gap-2"><button onClick={prepareFoodPlanSave} className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${userRole === 'PERSONAL' ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'}`}>{userRole === 'PERSONAL' ? <Utensils size={16} /> : <Briefcase size={16} />} {userRole === 'PERSONAL' ? 'Save to Food Plan' : 'Generate Sales Strategy'}</button><button onClick={resetAnalysis} className="text-sm font-medium text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors">Scan Another</button></div></div>
                      <AnalysisOverlay imageUrl={currentImage} items={currentResult.items} onCorrectPrediction={onUserCorrection} userRole={userRole} />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* --- UPLOAD VIEW --- */}
        {mode === AppMode.UPLOAD && (
          <div className="max-w-4xl mx-auto">
             {!currentImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-3xl p-16 text-center bg-white hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 ${userRole === 'PERSONAL' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}><Upload size={40} /></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Click to upload image</h3>
                  <p className="text-gray-500">JPG, PNG supported</p>
                </div>
             ) : (
                <div className="space-y-6">
                 {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl shadow-sm border border-gray-100">
                       <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4 ${userRole === 'PERSONAL' ? 'border-rose-200 border-t-rose-500' : 'border-cyan-200 border-t-cyan-500'}`}></div>
                       <p className="text-gray-500 font-medium animate-pulse">{loadingMsg}</p>
                    </div>
                  ) : (
                    currentResult && (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-800">Analysis Results</h2><div className="flex gap-2"><button onClick={prepareFoodPlanSave} className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${userRole === 'PERSONAL' ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'}`}>{userRole === 'PERSONAL' ? <Utensils size={16} /> : <Briefcase size={16} />} {userRole === 'PERSONAL' ? 'Save to Food Plan' : 'Generate Sales Strategy'}</button><button onClick={resetAnalysis} className="text-sm font-medium text-gray-500 hover:text-green-600 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors">Upload Another</button></div></div>
                        <AnalysisOverlay imageUrl={currentImage} items={currentResult.items} onCorrectPrediction={onUserCorrection} userRole={userRole} />
                      </div>
                    )
                  )}
                </div>
             )}
          </div>
        )}
      </main>

      <footer className="bg-slate-50 border-t border-gray-200 py-8 mt-12"><div className="max-w-7xl mx-auto px-4 text-center"><p className="text-xs text-gray-400 font-mono">FreshLoop AI v3.0 • Powered by Google Gemini 2.5 Flash & ViT-L/16</p></div></footer>

      {/* --- MODALS --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Settings size={18} /> System Settings</h3><button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
              <div className="p-6 space-y-6"><div><label className="block text-sm font-bold text-gray-700 mb-2">AI Model Selection</label><div className="grid grid-cols-2 gap-3"><button onClick={() => setSelectedModel('flash')} className={`p-3 rounded-xl border text-left transition-all ${selectedModel === 'flash' ? 'border-green-500 bg-green-50 ring-1 ring-green-200' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-sm mb-1">Gemini 2.5 Flash</div><div className="text-[10px] text-gray-500">Fast • Low Latency • Default</div></button><button onClick={() => setSelectedModel('pro')} className={`p-3 rounded-xl border text-left transition-all ${selectedModel === 'pro' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-200' : 'border-gray-200 hover:border-gray-300'}`}><div className="font-bold text-sm mb-1">Gemini 3.0 Pro</div><div className="text-[10px] text-gray-500">High Reasoning • Precise</div></button></div></div><div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Why Multimodal LLM?</h4><p className="text-xs text-blue-700 leading-relaxed">Unlike traditional object detection (YOLO), Multimodal LLMs understand "what" condition items are in, analyzing texture and oxidation.</p></div></div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <Trash2 size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Delete this Plan?</h3>
                 <p className="text-sm text-gray-500 mb-6">This will permanently delete the plan and remove all associated images from the cloud database. This action cannot be undone.</p>
                 <div className="flex gap-3">
                    <button onClick={() => { setShowDeleteConfirm(false); setPlanToDelete(null); }} disabled={isDeleting} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                    <button onClick={confirmDeletePlan} disabled={isDeleting} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg flex items-center justify-center gap-2">
                       {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Delete'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {showSaveDialog && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
               <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-lg text-gray-900">{userRole === 'PERSONAL' ? 'Save Consumption Plan' : 'Save Sales Strategy'}</h3><p className="text-xs text-gray-500 mt-1">{pendingItems.length} items to be tracked.</p></div>
               <div className="p-6 space-y-4">
                  <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Save Destination</label><select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="new">+ Create New Plan</option>{foodPlans.filter(p => p.type === (userRole === 'PERSONAL' ? 'CONSUMPTION' : 'SALES')).map(plan => (<option key={plan.id} value={plan.id}>Add to: {plan.title}</option>))}</select></div>
                  {selectedPlanId === 'new' && (<div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Plan Title</label><input type="text" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={userRole === 'PERSONAL' ? "e.g. Weekly Groceries" : "e.g. Q3 Inventory Audit"} /></div>)}
                  <div className="flex gap-3 pt-2">
                     <button onClick={() => setShowSaveDialog(false)} disabled={isSavingPlan} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                     <button onClick={confirmSavePlan} disabled={isSavingPlan} className={`flex-1 py-2.5 text-sm font-bold text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${userRole === 'PERSONAL' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} disabled:opacity-70 disabled:cursor-not-allowed`}>
                        {isSavingPlan ? <Loader2 className="animate-spin" size={16} /> : 'Confirm Save'}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {showTechSpecs && <TechSpecsModal onClose={() => setShowTechSpecs(false)} />}
      
      {/* GLOBAL TOAST */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[200] animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
           {toast.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
           <span className="font-bold text-sm">{toast.msg}</span>
        </div>
      )}
      
      {/* GLOBAL FLOATING TOOLTIP */}
      {tooltipData && (
        <div 
          className="fixed z-[9999] pointer-events-none bg-gray-900/95 text-white text-xs rounded-lg shadow-xl animate-in fade-in zoom-in-95 backdrop-blur-sm border border-white/10 overflow-hidden" 
          style={{ left: tooltipData.x + 15, top: tooltipData.y + 15, maxWidth: tooltipData.type === 'VISUAL' ? '250px' : '300px' }}
        >
          {tooltipData.type === 'TEXT' ? (
            <div className="p-3 flex flex-col gap-2">
               {/* SHELF LIFE BADGES */}
               {tooltipData.shelfLife && (tooltipData.shelfLife.room || tooltipData.shelfLife.fridge) && (
                 <div className="flex gap-2 mb-1">
                   {tooltipData.shelfLife.room && tooltipData.shelfLife.room !== 'N/A' && (
                     <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 flex items-center gap-1 font-bold">
                        <Sun size={10} /> Room: {tooltipData.shelfLife.room}
                     </span>
                   )}
                   {tooltipData.shelfLife.fridge && tooltipData.shelfLife.fridge !== 'N/A' && (
                     <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1 font-bold">
                        <Snowflake size={10} /> Fridge: {tooltipData.shelfLife.fridge}
                     </span>
                   )}
                 </div>
               )}
               <div className="flex items-start gap-2">
                  <Lightbulb size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{tooltipData.content}</p>
               </div>
            </div>
          ) : (
            // VISUAL RECALL TOOLTIP
            tooltipData.visualData && (
              <div className="flex flex-col">
                 <div className="relative w-full h-auto">
                    <img 
                      src={tooltipData.visualData.url} 
                      alt="Recall" 
                      className="block w-full h-auto object-contain max-h-[300px]" 
                    />
                    {/* BOUNDING BOX OVERLAY */}
                    {(() => {
                        // box_2d is [ymin, xmin, ymax, xmax] in 0-1000 scale
                        const [ymin, xmin, ymax, xmax] = tooltipData.visualData.box;
                        return (
                          <div 
                             className="absolute border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] z-10"
                             style={{
                               top: `${ymin/10}%`,
                               left: `${xmin/10}%`,
                               width: `${(xmax-xmin)/10}%`,
                               height: `${(ymax-ymin)/10}%`
                             }}
                          >
                            <span className="absolute -top-5 left-0 bg-yellow-400 text-black text-[9px] font-bold px-1 rounded-sm whitespace-nowrap">
                              {tooltipData.visualData.name} ({tooltipData.visualData.score})
                            </span>
                          </div>
                        );
                    })()}
                 </div>
                 <div className="p-2 bg-gray-900 border-t border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                       <ScanLine size={12} className="text-green-400" />
                       <span className="font-bold text-gray-200 uppercase tracking-wider text-[10px]">Visual Recall</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Showing original detection context.</p>
                 </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default App;
