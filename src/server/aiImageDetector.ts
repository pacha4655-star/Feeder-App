import { GoogleGenAI } from '@google/genai';

/**
 * Structured Detection Result from Real Vision Model Analysis
 */
export interface VisualAiDetectionResult {
  isAiGenerated: boolean;
  confidence: number;
  classification: 'real_photograph' | 'ai_generated' | 'uncertain';
  reason: string;
  provider: string;
  durationMs: number;
}

/**
 * Initializes the Google GenAI client if the API key is configured.
 * All credentials remain strictly server-side.
 */
function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'feeder-media-authenticity-guard',
      },
    },
  });
}

/**
 * System instruction and prompt for real visual pixel analysis of authenticity
 */
const VISION_AUTHENTICITY_PROMPT = `You are a forensic computer vision authenticity evaluator for an ethical community pet and street animal platform.
Your task is to analyze the raw visual pixels of the provided image to determine whether it is a real camera photograph or an AI-generated image (e.g., Midjourney, Stable Diffusion, DALL-E, Flux, Imagen, Sora, etc.).

Analyze visual artifacts:
1. Fur/skin texture: Natural individual strands with optical focus vs plastic hyper-smoothness or unnatural uniform blending.
2. Anatomical coherence: Paw digits, whisker roots, pupil reflections, eye symmetry, ear cartilage structure.
3. Optical sensor physics: Natural camera lens bokeh, chromatic aberration, sensor grain/noise vs synthetic diffusion blur.
4. Lighting & geometry: Consistency of light sources, specular highlights, background perspective consistency.

You MUST respond strictly with a valid JSON object in the following format:
{
  "classification": "real_photograph" | "ai_generated" | "uncertain",
  "isAiGenerated": boolean,
  "confidence": number, // float from 0.00 to 1.00 indicating model confidence
  "reason": "Clear concise explanation of visual observations (1-2 sentences)"
}

Guidelines:
- If visual evidence strongly indicates synthetic diffusion/generative generation (e.g. painterly skin texture, melted background objects, anatomical artifacts), classify as "ai_generated" with confidence >= 0.75.
- If visual evidence demonstrates natural optical camera characteristics (sensor grain, natural lighting reflections, standard camera depth of field), classify as "real_photograph" with confidence >= 0.70.
- If the image is ambiguous, heavily compressed, or impossible to verify confidently, classify as "uncertain" with isAiGenerated: false.
- Do not make assumptions based on file extensions. Inspect pixel structure only.`;

/**
 * Analyzes an image's actual pixels using a server-side AI Vision Model
 *
 * @param fileBase64 Base64-encoded image data
 * @param mimeType MIME type of the image (image/jpeg, image/png, image/webp, image/avif)
 * @returns VisualAiDetectionResult
 */
export async function analyzeImageAuthenticity(
  fileBase64: string,
  mimeType: string
): Promise<VisualAiDetectionResult> {
  const startTime = Date.now();
  const ai = getGenAiClient();

  if (!ai) {
    const durationMs = Date.now() - startTime;
    console.warn('[AI Image Detector] No server-side API key configured (GEMINI_API_KEY is empty).');
    throw new Error('REAL AI IMAGE DETECTION PROVIDER REQUIRED — NO VALID SERVER-SIDE API CONFIGURED');
  }

  // Ensure supported image mime type for vision models
  const supportedMime = mimeType === 'image/avif' || mimeType === 'image/webp' || mimeType === 'image/png' || mimeType === 'image/jpeg'
    ? mimeType
    : 'image/jpeg';

  try {
    const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: supportedMime,
              },
            },
            {
              text: VISION_AUTHENTICITY_PROMPT,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for consistent classification
      },
    });

    const durationMs = Date.now() - startTime;
    const responseText = response.text || '{}';

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[AI Image Detector] Failed to parse model JSON output:', responseText);
      throw new Error('Invalid response structure from AI vision model.');
    }

    const classification = (parsed.classification === 'ai_generated' || parsed.classification === 'real_photograph' || parsed.classification === 'uncertain')
      ? parsed.classification
      : (parsed.isAiGenerated ? 'ai_generated' : 'real_photograph');

    const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;
    const confidence = Math.min(Math.max(rawConfidence, 0.0), 1.0);
    const isAiGenerated = classification === 'ai_generated';
    const reason = parsed.reason || (isAiGenerated ? 'Visual patterns consistent with synthetic AI generation.' : 'Visual features consistent with authentic camera photograph.');

    // Log audit trail (NO image contents, NO credentials)
    console.log(`[AI Image Detector Audit] Provider: gemini-2.5-flash | Decision: ${classification} | Confidence: ${confidence.toFixed(2)} | Duration: ${durationMs}ms`);

    return {
      isAiGenerated,
      confidence,
      classification,
      reason,
      provider: 'google-gemini-2.5-flash-vision',
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI Image Detector] Error during visual analysis (${durationMs}ms):`, err.message);
    throw err;
  }
}
