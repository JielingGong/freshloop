
import { ProduceItem, TrainingExample, Recipe } from '../types';

const resizeImage = (base64Str: string, maxWidth = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Lower quality slightly for speed
    };
    img.onerror = () => {
      resolve(base64Str); // Fallback
    }
  });
};

export const analyzeProduceImage = async (
  base64Image: string, 
  modelId: string = 'flash',
  feedbackHistory: TrainingExample[] = []
): Promise<ProduceItem[]> => {
  try {
    const optimizedImage = await resizeImage(base64Image);
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64Image: cleanBase64,
        modelId,
        feedbackHistory
      })
    });

    if (!response.ok) {
      throw new Error('Analysis request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Analysis failed. Please try again.");
  }
};

// --- RECIPE GENERATION ---
export const generateRecipes = async (
  urgentItems: string[],
  highPriorityItems: string[],
  otherItems: string[],
  preferences: string
): Promise<Recipe[]> => {
  try {
    const response = await fetch('/api/generate-recipes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urgentItems,
        highPriorityItems,
        otherItems,
        preferences
      })
    });

    if (!response.ok) {
      throw new Error('Recipe generation request failed');
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Recipe generation failed:", e);
    throw new Error("Recipe generation failed.");
  }
};

