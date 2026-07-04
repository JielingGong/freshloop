import React, { useState, useEffect } from 'react';
import { ChefHat, ArrowRight, Sparkles, RefreshCw, Save, Check, Plus, X, Clock, Flame, Utensils, AlertCircle, Loader2 } from 'lucide-react';
import { generateRecipes } from '../services/geminiService';
import { saveRecipe } from '../services/firebase';
import { Recipe, FoodPlan, AppMode, UserRole } from '../types';

interface ClearanceChefProps {
  plans: FoodPlan[];
  userRole: UserRole;
  currentUserId: string;
  onClose: () => void;
  onNavigateToRecipes: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const ClearanceChef: React.FC<ClearanceChefProps> = ({ 
  plans, userRole, currentUserId, onClose, onNavigateToRecipes, onShowToast 
}) => {
  const [step, setStep] = useState<'SELECT' | 'PREFERENCES' | 'LOADING' | 'RESULTS'>('SELECT');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [otherAvailableItems, setOtherAvailableItems] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');
  const [preferences, setPreferences] = useState('');
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

  // Data categorization
  const urgentItems = plans
    .flatMap(p => p.items)
    .filter(i => (i.priority === 'URGENT' || i.score < 45) && i.priority !== 'DISCARD')
    .map(i => i.name);

  const highItems = plans
    .flatMap(p => p.items)
    .filter(i => (i.priority === 'HIGH' || (i.score >= 45 && i.score < 70)))
    .map(i => i.name);
    
  const allOtherItems = plans
    .flatMap(p => p.items)
    .filter(i => i.priority !== 'URGENT' && i.priority !== 'HIGH' && i.priority !== 'DISCARD')
    .map(i => i.name);

  // Auto-select urgent and high priority items on mount
  useEffect(() => {
    const initialSelection = Array.from(new Set([...urgentItems, ...highItems]));
    setSelectedItems(initialSelection);
    setOtherAvailableItems(Array.from(new Set(allOtherItems)));
  }, []);

  const handleGenerate = async () => {
    setStep('LOADING');
    try {
      // Segregate selected items back into urgency buckets for the prompt
      const selectedSet = new Set(selectedItems);
      const promptUrgent = urgentItems.filter(i => selectedSet.has(i));
      const promptHigh = highItems.filter(i => selectedSet.has(i));
      // Any custom items or manual selections are treated as "high" importance for generation
      const promptOther = [...otherAvailableItems, ...customItems]; 

      const recipes = await generateRecipes(promptUrgent, promptHigh, promptOther, preferences);
      setGeneratedRecipes(recipes);
      setStep('RESULTS');
    } catch (e) {
      console.error(e);
      onShowToast("Failed to generate recipes. Try again.", 'error');
      setStep('PREFERENCES');
    }
  };

  const handleSaveRecipe = async (recipe: Recipe) => {
    try {
      await saveRecipe(currentUserId, recipe);
      setSavedRecipeIds(prev => new Set(prev).add(recipe.id));
      onShowToast("Recipe saved to My Recipes!", 'success');
    } catch (e) {
      onShowToast("Failed to save recipe.", 'error');
    }
  };

  const handleAddCustomItem = () => {
    if (newItemInput.trim()) {
      setCustomItems(prev => [...prev, newItemInput.trim()]);
      setSelectedItems(prev => [...prev, newItemInput.trim()]);
      setNewItemInput('');
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-xl min-h-[calc(100vh-100px)] rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4">
      {/* Header - Rainbow Gradient */}
      <div className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 p-6 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm shadow-inner">
            <ChefHat size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Clearance Chef</h2>
            <p className="text-pink-50 text-sm font-medium">Turn expiring food into delicious meals</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
      </div>

      <div className="flex-grow overflow-y-auto p-6 md:p-10">
        
        {/* STEP 1: SELECT INGREDIENTS */}
        {step === 'SELECT' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 1: Check Your Inventory</h3>
              <p className="text-gray-500">We've auto-selected items that need to be used soon.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 shadow-sm">
                <h4 className="flex items-center gap-2 font-bold text-red-700 mb-4 uppercase tracking-wider text-sm">
                  <AlertCircle size={16} /> Use Immediately
                </h4>
                <div className="flex flex-wrap gap-3">
                   {urgentItems.length === 0 && <span className="text-sm text-gray-400 italic">No urgent items. Great job!</span>}
                   {urgentItems.map(item => (
                     <label key={item} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm cursor-pointer transition-all ${selectedItems.includes(item) ? 'bg-red-100 border-red-300 ring-2 ring-red-200' : 'bg-white border-red-200 hover:bg-red-50'}`}>
                       <input 
                         type="checkbox" 
                         checked={selectedItems.includes(item)}
                         onChange={(e) => {
                           if(e.target.checked) setSelectedItems([...selectedItems, item]);
                           else setSelectedItems(selectedItems.filter(i => i !== item));
                         }}
                         className="accent-red-600 w-4 h-4 rounded"
                       />
                       <span className={`font-bold ${selectedItems.includes(item) ? 'text-red-900' : 'text-gray-700'}`}>{item}</span>
                     </label>
                   ))}
                </div>
              </div>

              <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6 shadow-sm">
                <h4 className="flex items-center gap-2 font-bold text-orange-700 mb-4 uppercase tracking-wider text-sm">
                  <Clock size={16} /> Use Soon (2-3 Days)
                </h4>
                <div className="flex flex-wrap gap-3">
                   {highItems.length === 0 && <span className="text-sm text-gray-400 italic">Nothing expiring soon.</span>}
                   {highItems.map(item => (
                     <label key={item} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm cursor-pointer transition-all ${selectedItems.includes(item) ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-200' : 'bg-white border-orange-200 hover:bg-orange-50'}`}>
                       <input 
                         type="checkbox" 
                         checked={selectedItems.includes(item)}
                         onChange={(e) => {
                           if(e.target.checked) setSelectedItems([...selectedItems, item]);
                           else setSelectedItems(selectedItems.filter(i => i !== item));
                         }}
                         className="accent-orange-500 w-4 h-4 rounded"
                       />
                       <span className={`font-bold ${selectedItems.includes(item) ? 'text-orange-900' : 'text-gray-700'}`}>{item}</span>
                     </label>
                   ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6">
               <h4 className="flex items-center gap-2 font-bold text-gray-600 mb-4 uppercase tracking-wider text-sm">
                  <Plus size={16} /> Add Pantry Staples or Other Items
               </h4>
               <div className="flex flex-wrap gap-2 mb-4">
                  {otherAvailableItems.map(item => (
                     <button 
                       key={item}
                       onClick={() => setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                       className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedItems.includes(item) ? 'bg-gradient-to-r from-pink-100 to-yellow-100 border-pink-300 text-pink-900 font-bold shadow-sm' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}
                     >
                       {item}
                     </button>
                  ))}
                  {customItems.map(item => (
                     <button 
                       key={item}
                       onClick={() => setSelectedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])}
                       className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedItems.includes(item) ? 'bg-gradient-to-r from-pink-100 to-yellow-100 border-pink-300 text-pink-900 font-bold shadow-sm' : 'bg-white border-gray-300 text-gray-600'}`}
                     >
                       {item}
                     </button>
                  ))}
               </div>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={newItemInput}
                   onChange={(e) => setNewItemInput(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                   placeholder="e.g. Rice, Pasta, Eggs..."
                   className="flex-grow px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                 />
                 <button onClick={handleAddCustomItem} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm">Add</button>
               </div>
            </div>

            <div className="flex justify-end pt-4">
               <button 
                 onClick={() => setStep('PREFERENCES')} 
                 disabled={selectedItems.length === 0}
                 className="flex items-center gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Next: Set Preferences <ArrowRight size={20} />
               </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREFERENCES */}
        {step === 'PREFERENCES' && (
           <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Step 2: How do you want to eat?</h3>
                <p className="text-gray-500">Customize the style or cuisine.</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {['Fast (< 15 mins)', 'Healthy / Low Carb', 'Asian Cuisine', 'Western / Pasta', 'Comfort Food', 'Kid Friendly'].map(style => (
                   <button 
                     key={style}
                     onClick={() => setPreferences(style)}
                     className={`p-5 rounded-2xl border text-sm font-bold transition-all ${preferences === style ? 'bg-gradient-to-r from-pink-50 to-yellow-50 border-pink-300 text-pink-900 ring-2 ring-pink-200' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'}`}
                   >
                     {style}
                   </button>
                 ))}
              </div>

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2 uppercase">Or type your own request</label>
                 <textarea 
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 h-32 resize-none"
                    placeholder="e.g. Something spicy with soup..."
                 />
              </div>

              <div className="flex justify-between pt-6">
                 <button onClick={() => setStep('SELECT')} className="text-gray-500 font-bold hover:text-gray-800 px-6 py-3 hover:bg-gray-100 rounded-xl transition-colors">Back</button>
                 <button 
                   onClick={handleGenerate} 
                   className="flex items-center gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-xl hover:scale-105 transition-all"
                 >
                   <Sparkles size={20} /> Generate Recipes
                 </button>
              </div>
           </div>
        )}

        {/* STEP 3: LOADING */}
        {step === 'LOADING' && (
           <div className="flex flex-col items-center justify-center h-full space-y-8 py-12">
              <div className="relative">
                 <div className="w-32 h-32 border-[6px] border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat size={40} className="text-pink-500" />
                 </div>
              </div>
              <div className="text-center">
                 <h3 className="text-2xl font-bold text-gray-900 mb-2">The Chef is Thinking...</h3>
                 <p className="text-gray-500 font-medium">Pairing flavors and optimizing for zero waste.</p>
              </div>
           </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 'RESULTS' && (
           <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <h3 className="text-2xl font-bold text-gray-900">Suggested Recipes</h3>
                 <div className="flex gap-3">
                    <button onClick={() => { setGeneratedRecipes([]); handleGenerate(); }} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm"><RefreshCw size={16} /> Swap Ideas</button>
                    <button onClick={onClose} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black shadow-lg">Done</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {generatedRecipes.map(recipe => {
                   const isSaved = savedRecipeIds.has(recipe.id);
                   return (
                     <div key={recipe.id} className="bg-white border border-gray-200 rounded-3xl shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden flex flex-col group">
                        <div className="p-6 bg-gradient-to-r from-pink-50/80 to-yellow-50/80 border-b border-pink-100">
                           <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-pink-100 shadow-sm">{recipe.cuisine}</span>
                              <div className="flex items-center gap-1.5 text-gray-600 text-xs font-bold"><Clock size={14} /> {recipe.cookingTime}</div>
                           </div>
                           <h4 className="text-xl font-extrabold text-gray-900 leading-tight">{recipe.name}</h4>
                        </div>
                        
                        <div className="p-6 flex-grow space-y-5">
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Ingredients</p>
                              <div className="flex flex-wrap gap-2">
                                 {recipe.ingredients.map((ing, idx) => (
                                    <span key={idx} className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${ing.fromPlan ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                       {ing.name} <span className="opacity-60 text-[10px] ml-1">({ing.amount})</span>
                                    </span>
                                 ))}
                              </div>
                           </div>
                           
                           <div>
                              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Instructions</p>
                              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line line-clamp-6 group-hover:line-clamp-none transition-all cursor-pointer bg-gray-50 p-4 rounded-xl border border-gray-100">
                                 {recipe.instructions}
                              </div>
                           </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                           {isSaved ? (
                             <button disabled className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 rounded-xl font-bold text-sm">
                               <Check size={18} /> Saved
                             </button>
                           ) : (
                             <button onClick={() => handleSaveRecipe(recipe)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:scale-[1.02] transition-all">
                               <Save size={18} /> Save Recipe
                             </button>
                           )}
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};