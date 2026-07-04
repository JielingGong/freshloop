import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post("/api/analyze", async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { base64Image, modelId, feedbackHistory } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const modelName = modelId === 'pro' ? 'gemini-2.0-pro-exp-02-05' : 'gemini-2.5-flash';
    
    let learningContext = "";
    if (feedbackHistory && feedbackHistory.length > 0) {
      const labelCorrections = feedbackHistory.filter((f: any) => f.type === 'LABEL_CORRECTION');
      const scoreCorrections = feedbackHistory.filter((f: any) => f.type === 'SCORE_CORRECTION');

      learningContext = `
      USER FEEDBACK MEMORY:
      - LABEL FIXES: ${labelCorrections.map((ex: any) => `'${ex.originalLabel}'->'${ex.correctedLabel}'`).join(', ')}
      - SCORE FIXES: ${scoreCorrections.map((ex: any) => `Score ${ex.originalScore}->${ex.correctedScore}`).join(', ')}
      `;
    }

    const systemInstruction = `
    You are a precision Optical Sorting Machine.
    ${learningContext}

    TASK: Detect produce with PIXEL-PERFECT Bounding Boxes.

    RULES:
    1. **SEPARATION:** If items touch, find the shadow line between them. Do not merge them.
    2. **BOUNDARIES:** Box must cover the FULL object. For Bananas, include the stem and tip.
    3. **LIFECYCLE SCORE (0-100):**
       - 100 = Unripe/Hard/Green (Max Shelf Life)
       - 50 = Ripe/Perfect (Eat Now)
       - 0 = Rotten/Mushy (Discard)

    OUTPUT JSON ONLY.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Fresh', 'Semi-fresh', 'Rotten'] },
              ripeness_stage: { type: Type.STRING, enum: ['Unripe', 'Semi-ripe', 'Ripe', 'Overripe', 'Rotten'] },
              score: { type: Type.INTEGER },
              confidence: { type: Type.NUMBER },
              box_2d: { 
                type: Type.ARRAY, 
                items: { type: Type.NUMBER },
                description: "[ymin, xmin, ymax, xmax] 0-1000. EXACT EDGES."
              },
              reasoning: { type: Type.STRING },
              visual_features: { type: Type.ARRAY, items: { type: Type.STRING } },
              shelf_life_room: { type: Type.STRING },
              shelf_life_fridge: { type: Type.STRING },
              lighting_condition: { type: Type.STRING, enum: ['Good', 'Low'] },
              action: { type: Type.STRING, enum: ['Sell', 'Discount', 'Discard', 'Store'] },
              defects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    center_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                  }
                }
              },
              explainability: {
                type: Type.OBJECT,
                properties: {
                  surface_discoloration_percent: { type: Type.NUMBER },
                  defect_count: { type: Type.INTEGER },
                  primary_visual_cue: { type: Type.STRING }
                }
              },
              color_distribution: {
                type: Type.OBJECT,
                properties: {
                  green_ratio: { type: Type.NUMBER },
                  yellow_ratio: { type: Type.NUMBER },
                  brown_ratio: { type: Type.NUMBER },
                  dominant_color: { type: Type.STRING }
                }
              },
              texture_metrics: {
                type: Type.OBJECT,
                properties: {
                  roughness_score: { type: Type.NUMBER },
                  pattern_irregularity: { type: Type.NUMBER },
                  surface_type: { type: Type.STRING, enum: ['Smooth', 'Rough', 'Pitted', 'Wrinkled'] }
                }
              }
            },
            required: ["name", "status", "ripeness_stage", "score", "confidence", "reasoning", "action", "box_2d"]
          }
        }
      },
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Detect all produce items. Ensure strict separation of touching items."
          }
        ]
      }
    });

    const text = response.text;
    if (!text) {
      return res.json([]);
    }

    const rawItems = JSON.parse(text) as any[];
    
    const results = rawItems.map((item, index) => {
      let [ymin, xmin, ymax, xmax] = item.box_2d || [0,0,100,100];
      
      const height = ymax - ymin;
      const width = xmax - xmin;
      const padY = height * 0.015; 
      const padX = width * 0.015;

      ymin = Math.max(0, ymin - padY);
      xmin = Math.max(0, xmin - padX);
      ymax = Math.min(1000, ymax + padY);
      xmax = Math.min(1000, xmax + padX);

      return {
        ...item,
        id: `item-${Date.now()}-${index}`,
        confidence: item.confidence || 0.95,
        visual_features: item.visual_features || [],
        box_2d: [ymin, xmin, ymax, xmax], 
        shelf_life_room: item.shelf_life_room || "N/A",
        shelf_life_fridge: item.shelf_life_fridge || "N/A",
        lighting_condition: item.lighting_condition || 'Good',
        action: item.action || 'Sell',
        ripeness_stage: item.ripeness_stage || 'Ripe',
        defects: item.defects || [],
        explainability: item.explainability || { surface_discoloration_percent: 0, defect_count: 0, primary_visual_cue: "Uniform texture" },
        color_distribution: item.color_distribution || { green_ratio: 0.5, yellow_ratio: 0.5, brown_ratio: 0, dominant_color: 'Mixed' },
        texture_metrics: item.texture_metrics || { roughness_score: 10, pattern_irregularity: 10, surface_type: 'Smooth' }
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

app.post("/api/generate-recipes", async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { urgentItems, highPriorityItems, otherItems, preferences } = req.body;
    
    const prompt = `
    你是一个智能食谱助手。用户有以下需要尽快消耗的食材：
    紧急（今天必须用）：${urgentItems.join(', ')}
    高优先级（2-3天内用）：${highPriorityItems.join(', ')}
    用户计划中的其他食材（可选用）：${otherItems.join(', ')}

    请根据这些食材生成合理的食谱：
    规则：
    1. 根据食材的搭配性合理分组，生成 1-3 个独立食谱
    2. 绝对不要把明显不搭的食材强行放一道菜（比如香蕉和鸡肉、梨子和土豆）
    3. 如果食材不搭配，就分成多个食谱（比如：梨子→冰糖雪梨，鸡肉+土豆→土豆炖鸡）
    4. 优先消耗 URGENT 和 HIGH 的食材
    5. 需要额外食材时，先从"用户计划中的其他食材"里选
    6. 如果必须用计划外的食材，尽量选常见调料/配料，数量要少
    7. 明确标注每个食材是"来自计划"还是"需要额外准备"

    用户偏好：${preferences}

    输出 JSON 格式。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.STRING },
                        fromPlan: { type: Type.BOOLEAN }
                      }
                    }
                  },
                  instructions: { type: Type.STRING },
                  cookingTime: { type: Type.STRING },
                  cuisine: { type: Type.STRING }
                },
                required: ["name", "ingredients", "instructions", "cookingTime", "cuisine"]
              }
            }
          }
        }
      },
      contents: prompt
    });

    const result = JSON.parse(response.text || '{}');
    
    if (!result.recipes) {
      return res.json([]);
    }

    const recipesWithMeta = result.recipes.map((r: any, idx: number) => ({
      ...r,
      id: `gen-${Date.now()}-${idx}`,
      source: 'generated',
      createdAt: Date.now()
    }));

    res.json(recipesWithMeta);
  } catch (error) {
    console.error("Recipe generation failed:", error);
    res.status(500).json({ error: "Recipe generation failed." });
  }
});

export default app;
