
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { FoodPlan, TrainingExample, Recipe } from "../types";

// --- FIREBASE CONFIGURATION ---
// Configuration values are now loaded from environment variables to prevent hardcoding secrets in the repository.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- AUTH FUNCTIONS ---

export const signUpUser = async (email: string, pass: string) => {
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const signInUser = async (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const logOutUser = async () => {
  return signOut(auth);
};

// --- DATABASE FUNCTIONS ---

// Structure: collection 'users' -> doc 'UID' -> fields { plans: [], learning: [] }

export const saveUserData = async (uid: string, plans: FoodPlan[], learningHistory: TrainingExample[]) => {
  try {
    await setDoc(doc(db, "users", uid), {
      plans: plans,
      learningHistory: learningHistory,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (e) {
    console.error("Error saving to cloud:", e);
    throw e;
  }
};

export const loadUserData = async (uid: string) => {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null; // New user, no data yet
    }
  } catch (e) {
    console.error("Error loading from cloud:", e);
    throw e;
  }
};

// --- STORAGE FUNCTIONS ---

export const uploadImageToStorage = async (userId: string, dataUrl: string) => {
  try {
    // Create a reference to 'user_scans/{userId}/{timestamp}.jpg'
    const timestamp = Date.now();
    const storageRef = ref(storage, `user_scans/${userId}/${timestamp}.jpg`);
    
    // Upload the base64 string
    await uploadString(storageRef, dataUrl, 'data_url');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (e) {
    console.error("Error uploading image:", e);
    throw e;
  }
};

export const deleteImageFromStorage = async (imageUrl: string) => {
  try {
    // Create a reference from the full HTTPS URL
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (e) {
    console.error("Error deleting image:", e);
    // Ignore "object not found" errors to prevent blocking the deletion flow
    // if the image was already deleted or invalid.
    if ((e as any).code !== 'storage/object-not-found') {
       throw e;
    }
  }
};

// --- RECIPE FUNCTIONS ---

export const saveRecipe = async (uid: string, recipe: Recipe) => {
  try {
    // Store recipes in a sub-collection for better scalability
    await setDoc(doc(db, "users", uid, "recipes", recipe.id), recipe);
  } catch (e) {
    console.error("Error saving recipe:", e);
    throw e;
  }
};

export const getRecipes = async (uid: string): Promise<Recipe[]> => {
  try {
    const recipesRef = collection(db, "users", uid, "recipes");
    const q = query(recipesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const recipes: Recipe[] = [];
    querySnapshot.forEach((doc) => {
      recipes.push(doc.data() as Recipe);
    });
    return recipes;
  } catch (e) {
    console.error("Error loading recipes:", e);
    return [];
  }
};

export const deleteRecipe = async (uid: string, recipeId: string) => {
  try {
    await deleteDoc(doc(db, "users", uid, "recipes", recipeId));
  } catch (e) {
    console.error("Error deleting recipe:", e);
    throw e;
  }
};

export const updateRecipe = async (uid: string, recipe: Recipe) => {
  try {
    await updateDoc(doc(db, "users", uid, "recipes", recipe.id), { ...recipe });
  } catch (e) {
    console.error("Error updating recipe:", e);
    throw e;
  }
};
