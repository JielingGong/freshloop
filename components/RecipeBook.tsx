import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Trash2, Edit2, Plus, ChefHat, Search, X, Save, Check, ChevronDown, ChevronUp, AlertCircle, Loader2 } from 'lucide-react';
import { Recipe } from '../types';
import { getRecipes, deleteRecipe, saveRecipe, updateRecipe } from '../services/firebase';

interface RecipeBookProps {
  currentUserId: string;
  onNavigateToWizard: () => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const RecipeBook: React.FC<RecipeBookProps> = ({ currentUserId, onNavigateToWizard, onShowToast }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  
  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, [currentUserId]);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await getRecipes(currentUserId);
    setRecipes(data);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedRecipeId(prev => prev === id ? null : id);
  };

  // --- DELETE LOGIC ---
  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRecipeToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recipeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRecipe(currentUserId, recipeToDelete);
      setRecipes(prev => prev.filter(r => r.id !== recipeToDelete));
      onShowToast("Recipe deleted.", 'success');
    } catch (e) {
      console.error(e);
      onShowToast("Failed to delete recipe.", 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setRecipeToDelete(null);
    }
  };

  // --- CREATE / EDIT LOGIC ---
  const openNewRecipeModal = () => {
    setEditForm({
      name: "New Recipe",
      cuisine: "General",
      cookingTime: "30 mins",
      ingredients: [],
      instructions: "Step 1: ...",
      source: "manual"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setEditForm({ ...recipe });
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!editForm.name) return;
    setIsSaving(true);
    try {
      const isNew = !editForm.id || (editForm.id.startsWith('manual-') && !recipes.find(r => r.id === editForm.id));
      
      if (isNew) {
         // Create New
         const newRecipe = {
           ...editForm,
           id: `manual-${Date.now()}`,
           createdAt: Date.now()
         } as Recipe;
         await saveRecipe(currentUserId, newRecipe);
         setRecipes([newRecipe, ...recipes]);
         onShowToast("Recipe created!", 'success');
      } else {
         // Update Existing
         const updatedRecipe = { ...editForm } as Recipe;
         await updateRecipe(currentUserId, updatedRecipe);
         setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
         onShowToast("Recipe updated!", 'success');
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      onShowToast("Failed to save recipe.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to handle controlled input changes safely
  const updateFormField = (field: keyof Recipe, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-transparent pb-20 animate-in fade-in duration-500">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">My Cookbook</h2>
            <p className="text-gray-500 font-medium">Your zero-waste recipe collection.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onNavigateToWizard} className="flex items-center gap-2 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white px-5 py-2.5 rounded-xl font-bold hover:scale-105 shadow-md transition-all animate-pulse-glow">
               <ChefHat size={18} /> Clearance Chef
            </button>
            <button onClick={openNewRecipeModal} className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 shadow-sm transition-all">
               <Plus size={18} /> New Recipe
            </button>
          </div>
        </div>

        {/* Recipe List */}
        {loading ? (
           <div className="text-center py-20 text-gray-400 flex flex-col items-center gap-2">
             <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
             Loading recipes...
           </div>
        ) : recipes.length === 0 ? (
           <div className="bg-white/80 backdrop-blur-md rounded-3xl border-2 border-dashed border-gray-200 p-16 text-center flex flex-col items-center shadow-sm">
              <div className="bg-pink-50 p-6 rounded-full mb-6">
                <BookOpen size={48} className="text-pink-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No recipes yet!</h3>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">Use Clearance Chef to generate recipes from your leftovers, or create your own.</p>
              <button onClick={onNavigateToWizard} className="text-pink-600 font-bold hover:text-pink-700 border-b-2 border-pink-200 hover:border-pink-500 transition-all">Launch Chef Wizard</button>
           </div>
        ) : (
           <div className="space-y-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                   {/* Card Header (Click to Expand) */}
                   <div 
                     onClick={() => toggleExpand(recipe.id)}
                     className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                   >
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm ${recipe.source === 'generated' ? 'bg-gradient-to-br from-pink-100 to-orange-100 text-pink-600' : 'bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600'}`}>
                           {recipe.name.charAt(0)}
                         </div>
                         <div>
                            <h3 className="font-bold text-lg text-gray-900 leading-tight">{recipe.name}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                               <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded font-medium"><Clock size={12} /> {recipe.cookingTime}</span>
                               <span className="px-2 py-0.5 border border-gray-200 rounded font-medium">{recipe.cuisine}</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-3">
                         {expandedRecipeId === recipe.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                      </div>
                   </div>

                   {/* Expanded Content */}
                   {expandedRecipeId === recipe.id && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-6 animate-in slide-in-from-top-2">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                            <div>
                               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ingredients</h4>
                               <ul className="space-y-2">
                                  {recipe.ingredients.map((ing, i) => (
                                     <li key={i} className="flex justify-between text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <span className="font-bold text-gray-700">{ing.name}</span>
                                        <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded text-xs">{ing.amount}</span>
                                     </li>
                                  ))}
                                  {recipe.ingredients.length === 0 && <li className="text-gray-400 text-sm italic">No ingredients listed.</li>}
                               </ul>
                            </div>
                            <div>
                               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Instructions</h4>
                               <div className="prose prose-sm text-gray-600 bg-white p-5 rounded-xl border border-gray-100 shadow-sm whitespace-pre-line leading-relaxed">
                                  {recipe.instructions}
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <button 
                               onClick={(e) => initiateDelete(e, recipe.id)}
                               className="flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                            >
                               <Trash2 size={16} /> Delete
                            </button>
                            <button 
                               onClick={(e) => openEditModal(e, recipe)}
                               className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                            >
                               <Edit2 size={16} /> Edit
                            </button>
                         </div>
                      </div>
                   )}
                </div>
              ))}
           </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-900">{editForm.id ? 'Edit Recipe' : 'New Recipe'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Recipe Name</label>
                    <input 
                      type="text" 
                      value={editForm.name || ''} 
                      onChange={(e) => updateFormField('name', e.target.value)} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-lg" 
                      placeholder="e.g. Grandma's Apple Pie"
                    />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cuisine Type</label>
                       <input 
                         type="text" 
                         value={editForm.cuisine || ''} 
                         onChange={(e) => updateFormField('cuisine', e.target.value)} 
                         className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cooking Time</label>
                       <input 
                         type="text" 
                         value={editForm.cookingTime || ''} 
                         onChange={(e) => updateFormField('cookingTime', e.target.value)} 
                         className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                       />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Instructions</label>
                    <textarea 
                      value={editForm.instructions || ''} 
                      onChange={(e) => updateFormField('instructions', e.target.value)} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 h-40"
                    />
                 </div>
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                 <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                 <button 
                   onClick={handleSaveModal} 
                   disabled={isSaving} 
                   className="px-6 py-2.5 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2"
                 >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Recipe</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="p-6 text-center">
                 <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <Trash2 size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Recipe?</h3>
                 <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this recipe? This cannot be undone.</p>
                 <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                    <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg flex items-center justify-center gap-2">
                       {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'Yes, Delete'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};