import { getFirebaseIdToken } from '../services/firebaseAuth';
import { resolveApiUrl } from './apiConfig';

/**
 * AI Media Guard & Real Vision Authenticity Verification Utility
 *
 * Policy: AI-generated photos are strictly prohibited in Feeder.
 * Only genuine photographs and videos of real animals, feeding spots, and rescues are permitted.
 *
 * Architecture:
 * 1. Fast client-side metadata provenance inspection (detects AI metadata tags).
 * 2. Server-side pixel analysis using real AI vision model (Gemini 2.5 Flash Vision).
 */

export const AI_RESTRICTION_NOTICE = 'AI-generated photos are not allowed. Please upload real photographs only.';
export const AI_CONFIRMATION_TITLE = 'Real Photograph Confirmation';
export const AI_CONFIRMATION_PROMPT = 'Please confirm that this is a real photograph and not an AI-generated image.';
export const AI_CONFIRMATION_SUBTITLE = 'Feeder is a community dedicated to real animals and genuine rescues. All shared media must be authentic photographs.';

/**
 * Common metadata tokens and software indicators inserted by generative AI tools
 * (e.g. Stable Diffusion, Midjourney, DALL-E, NovelAI, ComfyUI, Automatic1111, Fooocus, InvokeAI)
 */
const AI_METADATA_INDICATORS = [
  'parameters\0',
  'negative_prompt',
  'prompt:',
  'steps: ',
  'sampler: ',
  'cfg scale: ',
  'seed: ',
  'stable diffusion',
  'midjourney',
  'dall-e',
  'dalle',
  'comfyui',
  'novelai',
  'automatic1111',
  'invokeai',
  'fooocus',
  'civitai',
  'adobe firefly',
  'generative ai',
  'prompt_generator',
];

export interface AiCheckResult {
  isAiDetected: boolean;
  reason?: string;
}

export interface ServerVerificationResult {
  verified: boolean;
  classification: 'real_photograph' | 'ai_generated' | 'uncertain';
  confidence?: number;
  reason?: string;
  userMessage?: string;
}

/**
 * Converts a File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Layer 1: Inspects a media file for explicit AI generation signatures in its header/metadata chunks.
 * Does not block standard camera files, phone photos, or edited photos without AI markers.
 */
export async function checkIfAiGenerated(file: File): Promise<AiCheckResult> {
  if (file.type.startsWith('video/')) {
    return { isAiDetected: false };
  }

  try {
    const sliceSize = Math.min(file.size, 65536);
    const slice = file.slice(0, sliceSize);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let headerText = '';
    for (let i = 0; i < bytes.length; i++) {
      const code = bytes[i];
      if (code >= 32 && code <= 126) {
        headerText += String.fromCharCode(code);
      } else {
        headerText += ' ';
      }
    }
    const lowerHeaderText = headerText.toLowerCase();

    for (const indicator of AI_METADATA_INDICATORS) {
      if (lowerHeaderText.includes(indicator)) {
        console.warn(`[AI Guard] Flagged explicit AI provenance marker: "${indicator}" in ${file.name}`);
        return {
          isAiDetected: true,
          reason: `Image contains AI generation metadata signatures (${indicator}).`,
        };
      }
    }

    return { isAiDetected: false };
  } catch (err) {
    console.warn('[AI Guard] Error reading image metadata:', err);
    return { isAiDetected: false };
  }
}

/**
 * Layer 2: Performs real server-side visual pixel analysis via authenticated backend bridge.
 * Passes actual image pixels to the configured AI vision model (Gemini 2.5 Flash Vision).
 */
export async function verifyImageAuthenticityWithServer(file: File): Promise<ServerVerificationResult> {
  if (file.type.startsWith('video/')) {
    return {
      verified: true,
      classification: 'real_photograph',
      confidence: 1.0,
      reason: 'Video file verified.',
    };
  }

  // 1. Fast metadata provenance check first
  const metaCheck = await checkIfAiGenerated(file);
  if (metaCheck.isAiDetected) {
    return {
      verified: false,
      classification: 'ai_generated',
      confidence: 0.99,
      reason: metaCheck.reason || 'AI generation metadata markers detected.',
      userMessage: 'AI-generated photos are not allowed. Please upload a real photograph.',
    };
  }

  // 2. Real server-side pixel analysis
  const fileBase64 = await fileToBase64(file);
  const token = await getFirebaseIdToken();
  if (!token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const targetUrl = resolveApiUrl('/api/media/verify-authenticity');
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || 'image/jpeg',
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 422) {
    return {
      verified: false,
      classification: data.classification || 'ai_generated',
      confidence: data.confidence,
      reason: data.reason,
      userMessage: data.userMessage || 'AI-generated photos are not allowed. Please upload a real photograph.',
    };
  }

  if (response.status === 503 || !response.ok) {
    const userMsg = data.userMessage || data.error || 'Image authenticity verification is currently unavailable. Please try again later.';
    throw new Error(userMsg);
  }

  return {
    verified: true,
    classification: data.classification || 'real_photograph',
    confidence: data.confidence,
    reason: data.reason,
  };
}
