
import { GoogleGenAI } from "@google/genai";
import { GenerationResult } from "../types";

const API_KEY = process.env.API_KEY || "";

export const generateFrameConcept = async (idea: string): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // 1. Generate Main Frame Concept
  const mainPrompt = `A high-quality, ornate circular fantasy avatar frame, symmetrical design. 
    Style: Game UI, luxury, magic. 
    Details: ${idea}. 
    Features: Gold filigree, glowing gemstones, intricate ornaments, isolated on a black background, 8k resolution, photorealistic materials.`;

  // 2. Generate Exploded View of the Frame
  const explodedPrompt = `An engineering exploded view (منظور تفكيك أجزاء) of the same fantasy circular frame: ${idea}. 
    Separate the components: The golden circular base, individual floating gemstones, ornamental wings, and decorations. 
    Show them floating apart in a technical 3D layout. 
    Clean dark background, technical but magical style.`;

  try {
    const mainResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: mainPrompt }] }],
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const explodedResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: explodedPrompt }] }],
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    let mainImageUrl = "";
    let explodedImageUrl = "";

    for (const part of mainResponse.candidates[0].content.parts) {
      if (part.inlineData) mainImageUrl = `data:image/png;base64,${part.inlineData.data}`;
    }

    for (const part of explodedResponse.candidates[0].content.parts) {
      if (part.inlineData) explodedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
    }

    return {
      mainImageUrl,
      explodedImageUrl,
      conceptName: idea,
      description: `إطار خيالي مصمم بناءً على فكرة: ${idea}`
    };
  } catch (error) {
    console.error("Frame Generation Error:", error);
    throw error;
  }
};
