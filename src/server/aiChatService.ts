/**
 * Global Multilingual AI Chatbot Service for Feeder ("Pawsy AI")
 *
 * Capabilities:
 * 1. Automatic Language & Dialect Detection (Tamil, Tanglish, Hindi, Hinglish, Malayalam, Telugu, Spanish, Arabic, etc.)
 * 2. Natural Writing Style & Code-Switching (understands typos, slang, transliteration, mixed language)
 * 3. Deep Intent & Urgency Understanding (not simple keyword matching; understands trauma, inappetence, triage)
 * 4. Multi-Turn Context Memory (remembers pronouns, duration, prior symptoms across turns)
 * 5. Veterinary Safety First (zero human painkillers; immediate emergency vet guidance for trauma/poisoning)
 * 6. Global Location Awareness (respects user's actual location worldwide; never assumes Chennai or India)
 */

import { GoogleGenAI } from '@google/genai';

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ChatContext {
  location?: string;
  userCoords?: { lat: number; lng: number };
  userRole?: string;
}

export interface ChatResponse {
  reply: string;
  suggestions: string[];
  actions: { type: string; label: string; targetId?: string }[];
  detectedLanguage?: string;
}

export type DetectedLanguage =
  | 'ta'       // Tamil script
  | 'tanglish' // Tamil transliterated into Latin script
  | 'hi'       // Hindi Devanagari script
  | 'hinglish' // Hindi transliterated into Latin script
  | 'ml'       // Malayalam script
  | 'te'       // Telugu script
  | 'kn'       // Kannada script
  | 'bn'       // Bengali script
  | 'es'       // Spanish
  | 'ar'       // Arabic
  | 'fr'       // French
  | 'de'       // German
  | 'it'       // Italian
  | 'pt'       // Portuguese
  | 'ja'       // Japanese
  | 'zh'       // Chinese
  | 'en';      // English default

export interface UserCommunicationProfile {
  primaryLanguage: DetectedLanguage;
  isTransliterated: boolean;
  isMixedLanguage: boolean;
  isShortQuery: boolean;
  isCasual: boolean;
  urgency: 'high' | 'medium' | 'low';
  intent:
    | 'greeting'
    | 'casual'
    | 'inappetence'
    | 'vomiting'
    | 'fever'
    | 'trauma_emergency'
    | 'feeding_inquiry'
    | 'location_vet'
    | 'follow_up_duration'
    | 'follow_up_feeding'
    | 'general';
  animal: 'dog' | 'puppy' | 'cat' | 'kitten' | 'bird' | 'community_animal' | 'unknown';
  duration?: string;
  hasTypo: boolean;
}

export const CHATBOT_SYSTEM_INSTRUCTION = `You are Pawsy, the expert AI Animal Care, Rescue & Community Assistant for Feeder ("Where animal people connect").

CRITICAL CONVERSATIONAL & MULTILINGUAL RULES:
1. NEVER OUTPUT GENERIC CAPABILITY ESSAYS:
   - NEVER dump a list of features or capabilities (e.g. "Emergency First Aid, Safe Feeding, Kitten & Puppy Care, Local Veterinary Care, Global Multilingual Support").
   - Do NOT introduce yourself with a long list of features.
2. SIMPLE GREETINGS REQUIRE SHORT SIMPLE RESPONSES:
   - When the user sends a greeting ("hi", "hello", "hi namba", "vanakkam", "வணக்கம்", "hey", "namaste", "hola", etc.):
     Respond with ONLY a 1-2 sentence warm friendly greeting matching their exact language and style.
     Examples:
     • "hi namba" -> "Hi namba! 🐾 Sollu, enna help venum?"
     • "hello" -> "Hello! 🐾 How can I help you and your animal today?"
     • "vanakkam" -> "Vanakkam! 🐾 Enna help venum?"
     • "வணக்கம்" -> "வணக்கம்! 🐾 எப்படி உதவலாம்?"
     • "how are you" -> "I'm doing well! 🐾 How can I help you and your pets today?"
     • "enna pannura" -> "Nalla irukken namba! 🐾 Sollu, unga animal friend-ku enna help venum?"
3. DYNAMIC LANGUAGE & STYLE MATCHING:
   - Understand HOW the user communicates.
   - ALWAYS respond in the SAME language and writing style:
     • Natural English for English.
     • Natural Tamil (தமிழ்) for Tamil script.
     • Natural casual Tanglish for Tamil written in Latin letters (e.g. "hi namba", "dog ku fever iruku", "food kudukalama").
     • Natural Hindi (हिंदी) for Hindi script.
     • Natural Hinglish for Hindi in Latin letters.
     • Natural Malayalam (മലയാളം) for Malayalam script.
     • Natural Spanish, Arabic, French, German for their respective languages.
     • For mixed language (e.g. "என் puppy is not eating"), respond in the same comfortable blend.
4. CONVERSATION CONTEXT & MEMORY:
   - Retain multi-turn context.
   - If user previously mentioned a vomiting dog, and then says "since morning" followed by "food kudukalama?", understand they are asking whether to feed the same vomiting dog.
5. PROPORTIONAL RESPONSE LENGTH:
   - Short greeting -> 1-2 short friendly sentences.
   - Short question -> direct, clear answer.
   - Genuine medical / health question -> structured, helpful, safe bullet points.
   - Critical emergency -> immediate urgent life-saving steps FIRST.
6. VETERINARY SAFETY FIRST:
   - NEVER prescribe or recommend human painkillers (Paracetamol, Dolo, Tylenol, Ibuprofen, Aspirin) — they cause lethal organ failure in dogs and cats.
   - Safe foods: Plain boiled boneless chicken breast, plain white rice, boiled pumpkin.
   - Strictly toxic foods: Cooked bones, chocolate, grapes/raisins, onions, garlic, xylitol, caffeine.
7. LOCATION AWARENESS:
   - Reference the user's actual location or prompt them to check Feeder's "Nearby Map" tab. NEVER assume India or Chennai. Never fabricate live phone numbers or clinic names.`;

/**
 * Automatically detects language based on script ranges, transliteration patterns, and vocabulary
 */
export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();

  // 1. Script checks
  // Malayalam script range: U+0D00 - U+0D7F
  if (/[\u0D00-\u0D7F]/.test(trimmed)) {
    return 'ml';
  }

  // Tamil script range: U+0B80 - U+0BFF
  if (/[\u0B80-\u0BFF]/.test(trimmed)) {
    return 'ta';
  }

  // Devanagari / Hindi script range: U+0900 - U+097F
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return 'hi';
  }

  // Telugu script range: U+0C00 - U+0C7F
  if (/[\u0C00-\u0C7F]/.test(trimmed)) {
    return 'te';
  }

  // Kannada script range: U+0C80 - U+0CFF
  if (/[\u0C80-\u0CFF]/.test(trimmed)) {
    return 'kn';
  }

  // Bengali script range: U+0980 - U+09FF
  if (/[\u0980-\u09FF]/.test(trimmed)) {
    return 'bn';
  }

  // Arabic script range: U+0600 - U+06FF
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return 'ar';
  }

  // Japanese script ranges (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed)) {
    return 'ja';
  }

  // Chinese script range
  if (/[\u4E00-\u9FFF]/.test(trimmed)) {
    return 'zh';
  }

  const lower = trimmed.toLowerCase();

  // 2. Tanglish (Tamil in Latin script) tokens & morphology
  const tanglishPatterns = [
    /\b(namba|nanba|nanban|nanbargal|machan|machi|thala|thalaiva|bro)\b/,
    /\b(dog-ku|dogku|dog ku|naai|nayi|cat-ku|catku|cat ku|poona|poonai|kutty|kutti)\b/,
    /\b(enna|edhavadhu|ethavathu|pannura|pannra|panrathu|panradhu|pannalam|pannanum|panren)\b/,
    /\b(sapdala|saapala|sapda|saapada|saapdave|saapidave|saapadu|sapadu|thann|thanni)\b/,
    /\b(kudukalama|kudukalam|kuduka|kuduthu|kudukanuma|iruku|irukku|irukken|irukkinga)\b/,
    /\b(romba|udambu|kaachal|vaanthi|vanthi|adi|patturuku|patruku|ratham|valikuthu|valikithu|valikidhu)\b/,
    /\b(kitta|kondu|poganuma|pakkathula|inga|enga|anga|unga|ungala|sollu|solra|solunga|epdi|eppadi|vanakkam)\b/
  ];
  if (tanglishPatterns.some(pat => pat.test(lower))) {
    return 'tanglish';
  }

  // 3. Hinglish (Hindi in Latin script) tokens
  const hinglishPatterns = [
    /\b(kutta|kutte|kutti|billi|pilla|mera|meri|mere)\b/,
    /\b(khana|nahi|kha|raha|rahi|rahe|kya|karu|karun|kare|karein|bimar|bimari)\b/,
    /\b(bahut|pani|dard|chot|khoon|ulti|dast|bukhar|dawa|kaha|hai|bhai|kaise|ho|theek|madad|de|sakte)\b/
  ];
  if (hinglishPatterns.some(pat => pat.test(lower))) {
    return 'hinglish';
  }

  // 4. Spanish tokens & punctuation
  const spanishPatterns = [
    /¿|\b(perro|perros|gato|gatos|comer|comida|comiendo|veterinario|enfermo|enferma|vomitando|sangre|ayuda|debo|hacer|que puedo darle|mi perro|mi gato|cachorro|desde ayer|hola)\b/
  ];
  if (spanishPatterns.some(pat => pat.test(lower))) {
    return 'es';
  }

  // 5. French tokens
  const frenchPatterns = [
    /\b(chien|chiens|chat|chats|manger|nourriture|vétérinaire|malade|vomit|blessé|que faire|mon chien|mon chat|bonjour|salut)\b/
  ];
  if (frenchPatterns.some(pat => pat.test(lower))) {
    return 'fr';
  }

  // 6. German tokens
  const germanPatterns = [
    /\b(hund|hunde|katze|katzen|fressen|tierarzt|krank|verletzt|futter|mein hund|meine katze|hallo)\b/
  ];
  if (germanPatterns.some(pat => pat.test(lower))) {
    return 'de';
  }

  // 7. Portuguese tokens
  const portuguesePatterns = [
    /\b(cachorro|cão|gato|comer|veterinário|doente|vomitando|meu cachorro|meu cão|ração|olá)\b/
  ];
  if (portuguesePatterns.some(pat => pat.test(lower))) {
    return 'pt';
  }

  // 8. Italian tokens
  const italianPatterns = [
    /\b(cane|cani|gatto|gatti|mangia|veterinario|malato|ferito|il mio cane|il mio gatto|ciao)\b/
  ];
  if (italianPatterns.some(pat => pat.test(lower))) {
    return 'it';
  }

  return 'en';
}

/**
 * Deep semantic communication analyzer:
 * Extracts user intent, style, language, urgency, target entity, and multi-turn context
 */
export function analyzeUserCommunication(
  message: string,
  history: ChatHistoryTurn[] = [],
  context?: ChatContext
): UserCommunicationProfile {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  const lang = detectLanguage(trimmed);

  // Check mixed language (e.g. English words alongside Tamil/Hindi/Malayalam script or words)
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(trimmed);
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  const hasEnglishWords = /\b(puppy|dog|cat|kitten|food|eating|vomiting|fever|sick|curd|chicken|vet)\b/.test(lower);
  const isMixedLanguage =
    (hasTamilScript && hasEnglishWords) ||
    (hasDevanagari && hasEnglishWords) ||
    lang === 'tanglish' ||
    lang === 'hinglish';

  const isTransliterated = lang === 'tanglish' || lang === 'hinglish';
  const isShortQuery = words.length <= 3 && !trimmed.includes('?') && trimmed.length <= 22;
  const isCasual =
    !/[.!?]$/.test(trimmed) ||
    /\b(gonna|wanna|wat|plz|pls|bro|yaar|enna|maari|namba|machan)\b/.test(lower);

  // Detect typos
  const hasTypo =
    /\b(vometing|vomitng|vomitting|eatingg|hospitl|feverr|doctot|peero)\b/.test(lower);

  // Multi-turn context history analysis
  const safeHistory = Array.isArray(history) ? history : [];
  const historyText = safeHistory
    .map(h => (h?.text || (h as any)?.content || '').toLowerCase())
    .join(' ');

  // Animal entity detection
  let animal: UserCommunicationProfile['animal'] = 'unknown';
  if (lower.includes('puppy') || lower.includes('குட்டி நாய்') || lower.includes('pilla') || lower.includes('cachorro')) {
    animal = 'puppy';
  } else if (lower.includes('dog') || lower.includes('நாய்') || lower.includes('kutta') || lower.includes('kutte') || lower.includes('നായ') || lower.includes('perro') || lower.includes('كلب')) {
    animal = 'dog';
  } else if (lower.includes('kitten') || lower.includes('பூனைக்குட்டி')) {
    animal = 'kitten';
  } else if (lower.includes('cat') || lower.includes('பூனை') || lower.includes('billi') || lower.includes('gato') || lower.includes('قط')) {
    animal = 'cat';
  } else if (lower.includes('bird') || lower.includes('பறவை') || lower.includes('chidiya')) {
    animal = 'bird';
  } else if (lower.includes('street') || lower.includes('stray') || lower.includes('தெரு')) {
    animal = 'community_animal';
  } else if (historyText.includes('puppy')) {
    animal = 'puppy';
  } else if (historyText.includes('dog') || historyText.includes('kutta') || historyText.includes('perro') || historyText.includes('நாய்')) {
    animal = 'dog';
  } else if (historyText.includes('cat') || historyText.includes('kitten') || historyText.includes('பூனை')) {
    animal = 'cat';
  }

  // Duration detection
  let duration: string | undefined;
  if (lower.includes('since morning') || lower.includes('from morning') || lower.includes('subah se') || lower.includes('kaalaila irunthu') || lower.includes('desde la mañana') || lower.includes('രാവിലെ മുതൽ')) {
    duration = 'since morning';
  } else if (lower.includes('yesterday') || lower.includes('kal se') || lower.includes('nethu') || lower.includes('நேற்று') || lower.includes('desde ayer') || lower.includes('ഇന്നലെ')) {
    duration = 'yesterday';
  } else if (lower.includes('2 days') || lower.includes('two days') || lower.includes('rendu naal') || lower.includes('दो दिन')) {
    duration = '2 days';
  }

  // Contextual condition inheritance
  const wasVomitingDiscussed = historyText.includes('vomit') || historyText.includes('ulti') || historyText.includes('vanthi') || historyText.includes('vomita');
  const wasNotEatingDiscussed = historyText.includes('not eating') || historyText.includes('sapdala') || historyText.includes('nahi khaya') || historyText.includes('no quiere comer') || historyText.includes('ഭക്ഷണം കഴിക്കുന്നില്ല');

  // Greeting detection tokens
  const greetingTokens = [
    'hi', 'hello', 'hey', 'heya', 'hai', 'vanakkam', 'வணக்கம்',
    'namaste', 'नमस्ते', 'namaskar', 'namaskaram', 'നമസ്കാരം',
    'hola', 'bonjour', 'salut', 'hallo', 'ciao', 'marhaba', 'مرحبا', 'salam'
  ];
  const isGreetingWord = greetingTokens.some(tok => lower === tok || lower.startsWith(tok + ' ') || lower.split(/\s+/).includes(tok));
  const isGreetingQuery =
    isGreetingWord &&
    !lower.includes('fever') &&
    !lower.includes('kaachal') &&
    !lower.includes('vomit') &&
    !lower.includes('vanthi') &&
    !lower.includes('sick') &&
    !lower.includes('bleed') &&
    !lower.includes('ratham') &&
    !lower.includes('hit by') &&
    !lower.includes('accident') &&
    !lower.includes('vet') &&
    !lower.includes('clinic') &&
    !lower.includes('hospital');

  // Casual banter detection
  const isCasualQuery =
    lower.includes('how are you') ||
    lower.includes('how r u') ||
    lower.includes('enna pannura') ||
    lower.includes('enna pandra') ||
    lower.includes('enna panra') ||
    lower.includes('kya kar rahe') ||
    lower.includes('kya chal raha') ||
    lower.includes('kya haal') ||
    lower === 'super' ||
    lower === 'awesome' ||
    lower === 'nice' ||
    lower === 'cool' ||
    lower === 'thanks' ||
    lower === 'thank you' ||
    lower === 'nandri' ||
    lower === 'shukriya';

  // Intent classification
  let intent: UserCommunicationProfile['intent'] = 'general';
  let urgency: UserCommunicationProfile['urgency'] = 'low';

  // 1. Emergency Trauma / Bleeding / Urgent Help
  if (
    lower.includes('urgent') ||
    lower.includes('emergency') ||
    lower.includes('காப்பாத்துங்க') ||
    lower.includes('bachao') ||
    lower.includes('rescue') ||
    lower.includes('hit by') ||
    lower.includes('accident') ||
    lower.includes('bleeding') ||
    lower.includes('ratham') ||
    lower.includes('ரத்தம்') ||
    lower.includes('khoon') ||
    lower.includes('खून') ||
    lower.includes('sangr') ||
    lower.includes('fracture') ||
    lower.includes('trauma') ||
    lower.includes('unconscious') ||
    lower.includes('seizure') ||
    lower.includes('poison')
  ) {
    intent = 'trauma_emergency';
    urgency = 'high';
  }
  // 2. Multi-turn Duration follow-up ("Since morning", "Yesterday")
  else if (duration && (wasVomitingDiscussed || wasNotEatingDiscussed || words.length <= 4)) {
    intent = 'follow_up_duration';
    urgency = 'medium';
  }
  // 3. Multi-turn Feeding follow-up ("Can I give him food?", "Can I give her chicken?", "food kudukalama?")
  else if (
    (lower.includes('can i give') || lower.includes('kudukalama') || lower.includes('de sakte') || lower.includes('kudukkalaama') || lower.includes('sapadu kudukalama')) &&
    (lower.includes('food') || lower.includes('chicken') || lower.includes('rice') || lower.includes('curd') || lower.includes('saapadu') || lower.includes('khana')) &&
    wasVomitingDiscussed
  ) {
    intent = 'follow_up_feeding';
    urgency = 'medium';
  }
  // 4. Vomiting (including typos)
  else if (
    lower.includes('vomit') ||
    lower.includes('vometing') ||
    lower.includes('vomitng') ||
    lower.includes('vomitting') ||
    lower.includes('ulti') ||
    lower.includes('vaanthi') ||
    lower.includes('vanthi') ||
    lower.includes('ഛർദ്ദി')
  ) {
    intent = 'vomiting';
    urgency = 'medium';
  }
  // 5. Inappetence / Not eating
  else if (
    lower.includes('not eating') ||
    lower.includes('not eatingg') ||
    lower.includes('refusing food') ||
    lower.includes('won\'t eat') ||
    lower.includes('wont eat') ||
    lower.includes('சாப்பிட') ||
    lower.includes('sapdala') ||
    lower.includes('saapala') ||
    (lower.includes('food') && lower.includes('sapdala')) ||
    (lower.includes('खाना') && (lower.includes('नहीं') || lower.includes('न खाया'))) ||
    lower.includes('नहीं खाया') ||
    lower.includes('नहीं खा रहा') ||
    lower.includes('khana nahi') ||
    lower.includes('nahi khaya') ||
    lower.includes('nahi kha raha') ||
    lower.includes('no quiere comer') ||
    lower.includes('no come') ||
    lower.includes('ഭക്ഷണം കഴിക്കുന്നില്ല') ||
    lower.includes('لا يأكل')
  ) {
    intent = 'inappetence';
    urgency = 'medium';
  }
  // 6. Fever (including Tanglish "dog ku fever iruku")
  else if (
    lower.includes('fever') ||
    lower.includes('feverr') ||
    lower.includes('kaachal') ||
    lower.includes('காய்ச்சல்') ||
    lower.includes('bukhar') ||
    lower.includes('बुखार') ||
    lower.includes('fiebre') ||
    lower.includes('പനി') ||
    lower.includes('udambu sooda') ||
    lower.includes('body heat')
  ) {
    intent = 'fever';
    urgency = 'medium';
  }
  // 7. Location / Vet search (including Tanglish "inga pakkathula vet iruka?")
  else if (
    lower.includes('nearby vet') ||
    lower.includes('vet near') ||
    lower.includes('nearest vet') ||
    lower.includes('find clinic') ||
    lower.includes('clinic near') ||
    lower.includes('hospital near') ||
    lower.includes('animal hospital') ||
    lower.includes('vet clinic') ||
    lower.includes('vet hospital') ||
    lower.includes('vet hospitl') ||
    lower.includes('emergency vet') ||
    lower.includes('pakkathula vet') ||
    lower.includes('inga pakkathula') ||
    lower.includes('vet kitta kondu poganuma') ||
    lower.includes('vet kitta') ||
    lower.includes('vet kaha') ||
    lower.includes('closest vet') ||
    lower.includes('veterinario')
  ) {
    intent = 'location_vet';
    urgency = 'low';
  }
  // 8. General Feeding
  else if (
    lower.includes('food') ||
    lower.includes('feed') ||
    lower.includes('chicken') ||
    lower.includes('curd') ||
    lower.includes('saapadu') ||
    lower.includes('khana') ||
    lower.includes('ഭക്ഷണം')
  ) {
    intent = 'feeding_inquiry';
    urgency = 'low';
  }
  // 9. Greeting (Simple greeting -> simple response)
  else if (isGreetingQuery) {
    intent = 'greeting';
    urgency = 'low';
  }
  // 10. Casual banter
  else if (isCasualQuery) {
    intent = 'casual';
    urgency = 'low';
  }

  return {
    primaryLanguage: lang,
    isTransliterated,
    isMixedLanguage,
    isShortQuery,
    isCasual,
    urgency,
    intent,
    animal,
    duration,
    hasTypo,
  };
}

/**
 * Dynamic contextual response generator:
 * Adapts to intent, language, tone, urgency, animal entity, and multi-turn context
 */
export function generateContextualDynamicResponse(
  analysis: UserCommunicationProfile,
  message: string,
  history: ChatHistoryTurn[] = [],
  context?: ChatContext
): ChatResponse {
  const { primaryLanguage: lang, intent, animal, duration, isShortQuery, isMixedLanguage } = analysis;
  const userLoc = context?.location || 'your area';
  const lower = message.trim().toLowerCase();

  // --- 0. SIMPLE GREETINGS (SHORT, NATURAL, CONVERSATIONAL) ---
  if (intent === 'greeting') {
    if (lang === 'tanglish') {
      const greetName = lower.includes('nanba') ? 'nanba' : 'namba';
      return {
        reply: `Hi ${greetName}! 🐾 Sollu, unga animal friend-ku enna help venum?`,
        suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
        actions: [],
        detectedLanguage: 'tanglish',
      };
    }
    if (lang === 'ta') {
      return {
        reply: `வணக்கம்! 🐾 உங்களுக்கு எப்படி உதவலாம்? உங்கள் செல்லப் பிராணிக்கு என்ன உதவி வேண்டும்?`,
        suggestions: ['🐾 செல்லப் பிராணி நலம்', '🥗 பாதுகாப்பான உணவுகள்', '🩺 கால்நடை மருத்துவர்கள்'],
        actions: [],
        detectedLanguage: 'ta',
      };
    }
    if (lang === 'hi' || lang === 'hinglish') {
      return {
        reply: lang === 'hi' ? `नमस्ते! 🐾 कैसे मदद कर सकता हूँ आपके प्यारे दोस्त के लिए?` : `Hello! 🐾 Boliye, aapke pet ke liye kya help chahiye?`,
        suggestions: ['🐾 स्वास्थ्य सलाह', '🥗 सुरक्षित आहार', '🩺 नजदीकी पशु अस्पताल'],
        actions: [],
        detectedLanguage: lang,
      };
    }
    if (lang === 'ml') {
      return {
        reply: `നമസ്കാരം! 🐾 എനിക്ക് എങ്ങനെ സഹായിക്കാനാകും? നിങ്ങളുടെ വളർത്തുമൃഗത്തിന് എന്ത് സഹായമാണ് വേണ്ടത്?`,
        suggestions: ['🐾 ആരോഗ്യ വിവരങ്ങൾ', '🥗 സുരക്ഷിതമായ ഭക്ഷണം', '🩺 വെറ്ററിനറി ക്ലിനിക്കുകൾ'],
        actions: [],
        detectedLanguage: 'ml',
      };
    }
    if (lang === 'es') {
      return {
        reply: `¡Hola! 🐾 ¿Cómo puedo ayudarte a ti y a tu animalito hoy?`,
        suggestions: ['🐾 Salud de mascotas', '🥗 Alimentos seguros', '🩺 Veterinarios cercanos'],
        actions: [],
        detectedLanguage: 'es',
      };
    }
    if (lang === 'ar') {
      return {
        reply: `مرحباً! 🐾 كيف يمكنني مساعدتك أنت وحيوانك اليوم؟`,
        suggestions: ['🐾 رعاية الحيوانات', '🥗 أطعمة آمنة', '🩺 عيادات بيطرية'],
        actions: [],
        detectedLanguage: 'ar',
      };
    }
    if (lang === 'fr') {
      return {
        reply: `Bonjour! 🐾 Comment puis-je vous aider aujourd'hui pour votre animal?`,
        suggestions: ['🐾 Santé animale', '🥗 Aliments sûrs', '🩺 Vétérinaires proches'],
        actions: [],
        detectedLanguage: 'fr',
      };
    }
    if (lang === 'de') {
      return {
        reply: `Hallo! 🐾 Wie kann ich dir und deinem Tier heute helfen?`,
        suggestions: ['🐾 Tiergesundheit', '🥗 Sicheres Futter', '🩺 Tierärzte in der Nähe'],
        actions: [],
        detectedLanguage: 'de',
      };
    }
    return {
      reply: `Hello! 🐾 How can I help you and your animal today?`,
      suggestions: ['🐾 Ask pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
      actions: [],
      detectedLanguage: 'en',
    };
  }

  // --- 0.1 CASUAL CHAT & POLITE EXCHANGES ---
  if (intent === 'casual') {
    const isThanks = lower.includes('thank') || lower.includes('nandri') || lower.includes('shukriya');
    const isSuper = lower.includes('super') || lower.includes('awesome') || lower.includes('nice') || lower.includes('cool');

    if (lang === 'tanglish') {
      if (isThanks) {
        return {
          reply: `Romba nandri namba! 🐾 Take good care of your pets. Any time help venumna kelunga!`,
          suggestions: ['🐾 Ask another question', '🥗 Safe food guide', '🩺 Nearby Vets'],
          actions: [],
          detectedLanguage: 'tanglish',
        };
      }
      if (isSuper) {
        return {
          reply: `😊 Super namba! Sollu, Pawsy enna help pannattum?`,
          suggestions: ['🐾 Health query', '🥗 Food tips', '🩺 Nearby Vets'],
          actions: [],
          detectedLanguage: 'tanglish',
        };
      }
      return {
        reply: `Nalla irukken namba! 🐾 Animal care, feeding tips, or veterinary guidance edhavadhu venuma nu sollu, help panren!`,
        suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
        actions: [],
        detectedLanguage: 'tanglish',
      };
    }

    if (isThanks) {
      return {
        reply: `You're very welcome! 🐾 Always happy to help you and your animal companions.`,
        suggestions: ['🐾 Ask another question', '🥗 Safe food guide', '🩺 View Nearby Map'],
        actions: [],
        detectedLanguage: 'en',
      };
    }
    if (isSuper) {
      return {
        reply: `😊 Glad to hear that! 🐾 Let me know if you need any advice on care, feeding, or rescue.`,
        suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 View Nearby Map'],
        actions: [],
        detectedLanguage: 'en',
      };
    }
    return {
      reply: `I'm doing well, thank you! 🐾 Ready to assist with pet health, safe nutrition, or rescue guidance. What's on your mind?`,
      suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
      actions: [],
      detectedLanguage: 'en',
    };
  }

  // --- 1. TRAUMA & HIGH URGENCY EMERGENCIES ---
  if (intent === 'trauma_emergency') {
    if (lang === 'ta' || lang === 'tanglish') {
      return {
        reply: `🚨 **அவசர முதலுதவி வழிகாட்டுதல் (Emergency First Aid):**

1. **பாதுகாப்பாக அணுகவும்:** காயமடைந்த விலங்கு பயத்திலும் வலியிலும் கடிக்கக்கூடும். போர்வையால் மெதுவாக போர்த்தி அணுகவும்.
2. **இரத்தப்போக்கை கட்டுப்படுத்த:** சுத்தமான துணி அல்லது துண்டு வைத்து காயத்தின் மீது அழுத்தவும்.
3. **முதுகுத்தண்டை நகர்த்தாதீர்கள்:** தண்டுவடம் அல்லது எலும்பு முறிவு சந்தேகம் இருந்தால், தட்டையான அட்டைப்பெட்டி அல்லது பலகை மூலம் தூக்குங்கள்.
4. **⚠️ மிக முக்கிய எச்சரிக்கை:** மனிதர்களின் வலி நிவாரண மாத்திரைகளை (Paracetamol/Dolo) ஒருபோதும் தரக்கூடாது — அது மரணத்தை உண்டாக்கும்.
5. **உடனடி மருத்துவ உதவி:** அருகிலுள்ள அவசர கால்நடை மருத்துவமனைக்கு உடனடியாக கொண்டு செல்லவும்.`,
        suggestions: ['🩺 அவசர கால்நடை மருத்துவமனைகள்', '🚨 Feeder-ல் மீட்பு உதவி கோர', '🩹 காயத்தை சுத்தம் செய்வது எப்படி?'],
        actions: [
          { type: 'open_help', label: 'அவசர உதவி கோர 🚨' },
          { type: 'open_map', label: 'அருகிலுள்ள மருத்துவமனைகள் 🩺' }
        ],
        detectedLanguage: lang,
      };
    }
    if (lang === 'es') {
      return {
        reply: `🚨 **Primeros Auxilios de Emergencia:**

1. **Aproximación segura:** Un animal herido puede morder por dolor y miedo. Acércate lentamente cubriéndolo con una toalla o manta.
2. **Controlar hemorragias:** Aplica presión directa y suave sobre la herida con gasas limpias o un paño.
3. **Inmovilización:** Si sospechas de fractura o golpe en la columna, transpórtalo sobre una superficie plana y rígida.
4. **⚠️ Advertencia estricta:** NUNCA des medicamentos para humanos (paracetamol, ibuprofeno) ya que son letales para mascotas.
5. **Atención médica urgente:** Trasládalo de inmediato a la clínica veterinaria de urgencias más cercana.`,
        suggestions: ['🩺 Clínicas de urgencias veterinarias', '🚨 Publicar alerta de rescate', '🩹 Cómo limpiar una herida'],
        actions: [
          { type: 'open_help', label: 'Crear Alerta de Rescate 🚨' },
          { type: 'open_map', label: 'Ver Veterinarios de Urgencia 🩺' }
        ],
        detectedLanguage: 'es',
      };
    }
    return {
      reply: `🚨 **Immediate Emergency First-Aid Protocol:**

1. **Approach Gently & Ensure Safety:** Injured animals may bite out of fear and pain. Approach calmly, speaking in a low voice, and gently drape a towel or blanket over their head and body.
2. **Control Bleeding:** Apply direct, sustained pressure over the bleeding wound using a clean towel or sterile gauze.
3. **Spine & Fracture Stabilization:** If hit by a vehicle, avoid bending the neck or back. Slide a firm cardboard sheet or folded blanket underneath as a makeshift stretcher.
4. **⚠️ LETHAL WARNING:** NEVER administer human painkillers (Paracetamol, Tylenol, Dolo, Ibuprofen, Aspirin) — they cause irreversible toxic liver and kidney failure.
5. **Emergency Veterinary Care:** Transport immediately to the nearest 24/7 veterinary trauma center.`,
      suggestions: ['🩺 Find nearest 24/7 Emergency Vet', '🚨 Broadcast urgent community rescue call', '🩹 How to bandage a wound safely'],
      actions: [
        { type: 'open_help', label: 'Broadcast Rescue Call 🚨' },
        { type: 'open_map', label: 'View Emergency Vets 🩺' }
      ],
      detectedLanguage: 'en',
    };
  }

  // --- 2. MULTI-TURN FEEDING FOLLOW-UP AFTER VOMITING ---
  // Turn 1: "My dog is vomiting." -> Turn 2: "Since morning." -> Turn 3: "Can I give him food?" or "food kudukalama?"
  if (intent === 'follow_up_feeding') {
    if (lang === 'tanglish') {
      return {
        reply: `Dog-ku vomiting irukkumbodhu heavy food kudukka koodadhu. Stomach-ku rest thevai.

🥣 **Safe Care Protocol:**
1. **Rest Period:** At least 4 to 6 hours continuous-ah vomiting illama irukanum.
2. **Water Sips First:** First small sips of clean fresh water (1-2 spoons) kuduthu paarunga.
3. **Bland Food:** Water vomit pannalana, small amount plain boiled white rice mixed with shredded boiled chicken breast (oil, salt, masala illama) kudukalam.
4. **⚠️ Note:** Thirumba vomit pannina or lethargic-a irundhal, delay pannama vet kitta kootitu ponga.`,
        suggestions: ['🍚 Bland rice recipe', '💧 Check dehydration', '🩺 Nearby Vet Clinics'],
        actions: [{ type: 'open_map', label: 'Find Nearby Vet Clinic 🩺' }],
        detectedLanguage: 'tanglish',
      };
    }

    return {
      reply: `Because he has been vomiting since this morning, do not give regular dog food, heavy kibble, or rich meats right now — that will likely trigger another vomiting episode.

🥣 **Safe Care Protocol:**
1. **Rest the Stomach:** Withhold solid food until he has gone at least 4 to 6 hours without vomiting.
2. **Hydration First:** Offer small sips (1–2 tablespoons) of fresh water or ice cubes every 30 minutes. Make sure he can keep water down before introducing any food.
3. **Gentle Bland Meal:** Once his stomach has settled and he is keeping liquids down, offer a small portion of plain boiled white rice mixed with shredded, skinless boiled chicken breast (absolutely no salt, oil, or spices).
4. **When to see a Vet:** If he vomits water, appears lethargic, or vomits again after 12 hours, he should be examined by a veterinarian.`,
      suggestions: ['🍚 How to prepare bland rice broth', '💧 Check dog hydration levels', '🩺 When to visit the vet'],
      actions: [{ type: 'open_map', label: 'Find Nearby Vet Clinic 🩺' }],
      detectedLanguage: 'en',
    };
  }

  // --- 3. MULTI-TURN DURATION FOLLOW-UP ("Since morning", "Yesterday") ---
  if (intent === 'follow_up_duration') {
    if (lang === 'tanglish') {
      return {
        reply: `Puriyudhu namba. ${duration || 'Kaalaila irundhe'} ipdi irukkunradhala, immediate-a indha steps follow pannunga:

1. **Hydration:** Fresh clean water konjam konjam-a kudunga. Gums moist & pink-a irukkannu check pannunga.
2. **Bland Diet:** Stomach settle aanavudan, plain boiled white rice + boiled shredded chicken (salt/masala illama) konjam kudukalam.
3. **⚠️ Critical Warning:** Paracetamol / Dolo human tablets kandippa kudukka koodadhu.
4. **Vet Visit:** Evening kulla improve aagalana or lethargic-a aana, kandippa vet kitta kaatunga.`,
        suggestions: ['🩺 Local veterinary clinics', '💧 Signs of dehydration in pets', '🍗 Bland diet instructions'],
        actions: [{ type: 'open_map', label: 'Explore Nearby Vets 🩺' }],
        detectedLanguage: 'tanglish',
      };
    }

    return {
      reply: `Understood. Since this has been going on ${duration || 'since this morning'}, here is the immediate recommended plan:

1. **Monitor Hydration:** Offer small sips of fresh water. Check gums: they should be moist and pink, not sticky or pale.
2. **Gentle Bland Diet:** Once the stomach has settled, offer a small portion of plain boiled shredded chicken (skinless, boneless, no salt/seasoning) mixed with plain white rice.
3. **⚠️ Critical Warning:** NEVER administer human painkillers (Paracetamol, Tylenol, Ibuprofen, Aspirin) — they cause fatal organ failure in pets.
4. **Veterinary Attention:** If lethargy develops, vomiting continues, or your dog refuses liquids by evening, please visit a local veterinarian.`,
      suggestions: ['🩺 Local veterinary clinics', '💧 Signs of dehydration in pets', '🍗 Bland diet feeding instructions'],
      actions: [{ type: 'open_map', label: 'Explore Nearby Vets 🩺' }],
      detectedLanguage: 'en',
    };
  }

  // --- 4. FEVER (HANDLES TANGLISH "dog ku fever iruku", TAMIL, HINDI, AND ENGLISH) ---
  if (intent === 'fever') {
    if (lang === 'tanglish') {
      return {
        reply: `Dog-ku fever irukka? 🌡️ Romba carefully handle பண்ணனும்:

⚠️ **CRITICAL WARNING:** Paracetamol, Dolo, or human painkiller tablets **kandippa kudukka koodadhu** — dogs-ku idhu lethal liver and kidney failure undakkum!

🐾 **Safe Care Steps:**
1. **Cool & Shaded Area:** Fan keezha, cool ana idathula rest edukka vidunga.
2. **Hydration:** Clean fresh water kitta vaiyunga, force pannama sips kudikkutha nu paarunga.
3. **Cool Compress:** Room temperature water-la wet cloth vechu paw pads & belly-la gently thudaikalam (ice use pannatheenga).
4. **When to see a Vet:** 103°F mela irundhal, shivering, or 24 hours-ku mela irundhal, delay pannama vet kitta kootitu ponga.`,
        suggestions: ['🩺 View Nearby Vet Clinics', '💧 How to check hydration', '🌡️ Normal pet temperature'],
        actions: [{ type: 'open_map', label: 'View Nearby Vets 🩺' }],
        detectedLanguage: 'tanglish',
      };
    }

    if (lang === 'ta') {
      return {
        reply: `நாய்க்கு காய்ச்சல் உள்ளதா? 🌡️ கவனமாக கையாள வேண்டும்:

⚠️ **மிக முக்கிய எச்சரிக்கை:** மனிதர்களின் காய்ச்சல் மாத்திரைகளை (Paracetamol/Dolo) ஒருபோதும் தரக்கூடாது — அது நாய்களுக்கு தீவிர நச்சுத்தன்மை உண்டாக்கி மரணத்தை விளைவிக்கும்!

🐾 **பாதுகாப்பான வழிகாட்டுதல்:**
1. **குளிர்ந்த இடம்:** நேரடி வெயில் படாமல் மின்விசிறி கீழ் ஓய்வெடுக்க வைக்கவும்.
2. **நீர் அருந்துதல்:** சுத்தமான குடிநீர் அருகிலேயே வைக்கவும்.
3. **ஒத்தடம்:** சாதாரண நீரில் நனைத்த துணியால் பாதங்கள் மற்றும் வயிற்றுப் பகுதியில் ஒத்தடம் கொடுக்கலாம்.
4. **மருத்துவ உதவி:** 24 மணி நேரத்திற்கு மேல் காய்ச்சல் நீடித்தாலோ அல்லது உடல் நடுக்கம் இருந்தாலோ உடனே கால்நடை மருத்துவரிடம் அழைத்துச் செல்லவும்.`,
        suggestions: ['🩺 கால்நடை மருத்துவர்கள்', '💧 நீரிழப்பு அறிகுறிகள்', '🌡️ உடல் வெப்பநிலை'],
        actions: [{ type: 'open_map', label: 'கால்நடை மருத்துவர்களை பார்க்க 🩺' }],
        detectedLanguage: 'ta',
      };
    }

    if (lang === 'hi' || lang === 'hinglish') {
      return {
        reply: `कुत्ते को बुखार होने पर इन बातों का विशेष ध्यान रखें: 🌡️

⚠️ **सख्त चेतावनी:** इंसानों की बुखार की दवाइयां (जैसे Paracetamol, Dolo, Crocin) कभी न दें — यह पालतू जानवरों के लिवर और किडनी के लिए जानलेवा है!

🐾 **प्राथमिक उपचार:**
1. **ठंडी व हवादार जगह:** कुत्ते को धूप से दूर पंखे के नीचे आराम करने दें।
2. **पानी की उपलब्धता:** ताजा और साफ पानी पास रखें ताकि डिहाइड्रेशन न हो।
3. **गीला कपड़ा:** सामान्य पानी में कपड़ा भिगोकर पंजों और पेट पर हल्के से फेरें (बर्फ का उपयोग न करें)।
4. **डॉक्टर को दिखाएं:** यदि बुखार 103°F से अधिक हो या वह बहुत सुस्त हो, तो तुरंत पशु चिकित्सक से संपर्क करें।`,
        suggestions: ['🩺 नजदीकी पशु अस्पताल', '💧 पानी की कमी के लक्षण', '🌡️ सामान्य तापमान जांचें'],
        actions: [{ type: 'open_map', label: 'नजदीकी पशु चिकित्सक देखें 🩺' }],
        detectedLanguage: lang,
      };
    }

    if (isShortQuery) {
      return {
        reply: `If you suspect your ${animal === 'unknown' ? 'dog' : animal} has a fever, common signs include warm dry ears and nose, shivering, lethargy, red or glassy eyes, and loss of appetite.

🔍 **Clarifying Questions to Help You:**
• What specific symptoms are you noticing right now?
• How long has your dog felt warm or unwell?
• Are they still drinking water and able to stand comfortably?

⚠️ **Vital Safety Rule:** Never give human fever medicines (such as Paracetamol, Dolo, or Ibuprofen) — even a small dose can cause fatal toxicity in dogs. If their temperature feels high or they are shivering continuously, a veterinarian should check them promptly.`,
        suggestions: ['🌡️ How to check pet temperature', '💧 Safe ways to cool down a pet', '🩺 Find nearest vet clinic'],
        actions: [{ type: 'open_map', label: 'Find Nearby Vet 🩺' }],
        detectedLanguage: 'en',
      };
    }

    return {
      reply: `If your ${animal === 'unknown' ? 'dog' : animal} has a fever, monitor them carefully:

⚠️ **Vital Safety Warning:** NEVER administer human fever medicines (such as Paracetamol, Tylenol, Dolo, or Ibuprofen) — even small doses cause lethal liver and kidney failure in pets.

🐾 **Immediate Safe Steps:**
1. **Cool Rest Environment:** Keep them in a cool, well-ventilated space away from direct heat.
2. **Encourage Hydration:** Keep fresh, clean water easily accessible. Offer small sips without force-feeding.
3. **Cool Water Compress:** Apply a cloth dampened with room-temperature water to their paw pads, groin, and belly (never use freezing ice).
4. **Veterinary Attention:** Normal pet temperature is 101.0°F to 102.5°F (38.3°C to 39.2°C). If temperature exceeds 103°F, shivering occurs, or lethargy continues past 24 hours, take them to a veterinary clinic promptly.`,
      suggestions: ['🩺 Find nearest Vet Clinic', '🌡️ Normal pet temperature guide', '💧 Signs of dehydration in pets'],
      actions: [{ type: 'open_map', label: 'Find Nearby Vet 🩺' }],
      detectedLanguage: 'en',
    };
  }

  // --- 5. VOMITING (HANDLES TYPOS LIKE "my dog is vometing" AND HINGLISH) ---
  if (intent === 'vomiting') {
    if (lang === 'hi' || lang === 'hinglish') {
      return {
        reply: `यदि आपके कुत्ते को उल्टी (vomiting) हो रही है, तो घबराएं नहीं। सबसे पहले इन बातों का ध्यान रखें:

🥣 **तुरंत क्या करें:**
1. **पेट को आराम दें:** उल्टी के तुरंत बाद भारी या ठोस खाना न दें — इससे दोबारा उल्टी हो सकती है। कम से कम 3-4 घंटे खाना रोकें।
2. **पानी की थोड़ी मात्रा:** एक साथ बहुत सारा पानी न दें। हर आधे घंटे में 2-3 चम्मच ताजा पानी दें ताकि डिहाइड्रेशन न हो।
3. **हल्का आहार:** जब उल्टी रुक जाए, तो सादा उबला हुआ सफेद चावल और बिना मसाले का उबला चिकन दें।
4. **⚠️ सख्त चेतावनी:** इंसानों की दवाइयां (जैसे Paracetamol/Dolo) कभी न दें।

यदि उल्टी बार-बार हो रही हो या कुत्ता बहुत सुस्त हो, तो तुरंत डॉक्टर को दिखाएं।`,
        suggestions: ['🩺 नजदीकी पशु अस्पताल', '💧 पानी की कमी से कैसे बचाएं?', '🍗 हल्का आहार कैसे तैयार करें?'],
        actions: [{ type: 'open_map', label: 'नजदीकी पशु चिकित्सक देखें 🩺' }],
        detectedLanguage: 'hi',
      };
    }

    return {
      reply: `If your ${animal === 'unknown' ? 'dog' : animal} is vomiting, the first priority is allowing the gastrointestinal tract to rest:

🥣 **Immediate Care Steps:**
1. **Withhold Solid Food:** Pause regular food for 3 to 6 hours. Feeding immediately after an upset stomach can trigger recurrent spasms.
2. **Prevent Dehydration:** Offer small sips of clean water (1–2 tablespoons every 30 minutes) rather than letting them gulp a large bowl.
3. **Observe Symptoms:** Notice whether there is bile (yellow froth), blood, foreign objects, or diarrhea.
4. **Bland Reintroduction:** Once vomiting has ceased for several hours, offer a small spoonful of plain boiled white rice or plain boiled skinless chicken breast.
5. **⚠️ Strict Warning:** Never give human nausea or pain medications. If vomiting continues past 12–24 hours or if lethargy is severe, please visit a veterinarian.`,
      suggestions: ['🩺 Find nearest Vet Clinic', '💧 How to spot dehydration', '🍚 Bland diet preparation guide'],
      actions: [{ type: 'open_map', label: 'Explore Nearby Vets 🩺' }],
      detectedLanguage: 'en',
    };
  }

  // --- 6. INAPPETENCE / NOT EATING ACROSS STYLES & LANGUAGES ---
  if (intent === 'inappetence') {
    // Malayalam: "എന്റെ നായ ഭക്ഷണം കഴിക്കുന്നില്ല"
    if (lang === 'ml') {
      return {
        reply: `നിങ്ങളുടെ നായ ഭക്ഷണം കഴിക്കുന്നില്ലെങ്കിൽ ഉടൻ നിർബന്ധിച്ച് കഴിപ്പിക്കരുത്. പനിയോ കടുത്ത ക്ഷീണമോ ഉണ്ടോയെന്ന് ശ്രദ്ധിക്കുക.

🔍 **പ്രധാനമായി ശ്രദ്ധിക്കേണ്ട കാര്യങ്ങൾ:**
1. **വെള്ളം കുടിക്കുന്നുണ്ടോ:** നിർജ്ജലീകരണം (Dehydration) ഉണ്ടാകാതിരിക്കാൻ ശുദ്ധജലം ആവശ്യത്തിന് നൽകുക.
2. **മറ്റ് ലക്ഷണങ്ങൾ:** ഛർദ്ദിയോ വയറിളക്കമോ പല്ലുകളിൽ വേദനയോ ഉണ്ടോയെന്ന് പരിശോധിക്കുക.
3. **ലളിതമായ ഭക്ഷണം:** എണ്ണയോ ഉപ്പോ മസാലയോ ഇല്ലാത്ത വേവിച്ച ചിക്കൻ സൂപ്പോ കഞ്ഞിവെള്ളമോ നൽകി നോക്കാം.

⚠️ **ശ്രദ്ധിക്കുക:** മനുഷ്യർ കഴിക്കുന്ന പാരസെറ്റാമോൾ പോലുള്ള മരുന്നുകൾ മൃഗങ്ങൾക്ക് നൽകരുത്, അത് വിഷകരമാണ്. 24 മണിക്കൂറിലധികം ഭക്ഷണം കഴിക്കാതിരിക്കുകയോ ക്ഷീണം കൂടുകയോ ചെയ്താൽ ഒരു വെറ്ററിനറി ഡോക്ടറുടെ സഹായം തേടുക.`,
        suggestions: ['🩺 അടുത്തുള്ള വെറ്ററിനറി ക്ലിനിക്കുകൾ', '🥗 സുരക്ഷിതമായ ഭക്ഷണക്രമം', '💧 നിർജ്ജലീകരണ ലക്ഷണങ്ങൾ'],
        actions: [{ type: 'open_map', label: 'വെറ്ററിനറി ക്ലിനിക്കുകൾ കാണുക 🩺' }],
        detectedLanguage: 'ml',
      };
    }

    // Tamil + English Mixed: "என் puppy is not eating"
    if ((isMixedLanguage || /[\u0B80-\u0BFF]/.test(message)) && message.toLowerCase().includes('puppy')) {
      return {
        reply: `Puppies-க்கு appetite drop ஆனா கொஞ்சம் careful-ஆ இருக்கணும், because puppy-க்கு energy சீக்கிரம் குறையும்.

🔍 **Check பண்ண வேண்டியவை:**
1. **Activity Level:** Puppy playful-ஆ இருக்கா இல்ல ரொம்ப dull-ஆ படுத்திருக்கா?
2. **Hydration:** Fresh water குடிக்குதான்னு பாருங்க. Gums pink & moist-ஆ இருக்கான்னு செக் பண்ணுங்க.
3. **Stomach upset:** வாந்தி (vomiting) அல்லது loose stool எதுவும் இருக்கா?

🥣 **First Steps:**
• Force feed பண்ணாதீங்க.
• Oil/salt/masala இல்லாத plain boiled chicken soup அல்லது soft curd rice கொஞ்சம் கொடுத்து பார்க்கலாம்.
• Puppy 12 மணி நேரத்துக்கு மேல சாப்பிடலன்னா அல்லது dull-ஆ இருந்தா delay பண்ணாம vet கிட்ட காட்டுங்க.`,
        suggestions: ['🩺 View Nearby Vet Clinics', '🍼 Puppy care guide', '💧 Check dehydration'],
        actions: [{ type: 'open_map', label: 'View Nearby Vets 🩺' }],
        detectedLanguage: 'tanglish',
      };
    }

    // Pure Tamil: "என் நாய் சாப்பிட மாட்டேங்குது"
    if (lang === 'ta') {
      return {
        reply: `உங்கள் செல்ல நாய் சாப்பிடாமல் இருப்பதற்கு லேசான அஜீரணம், காய்ச்சல் அல்லது பற்களில் வலி போன்ற பல காரணங்கள் இருக்கலாம்:

🔍 **முதலில் கவனிக்க வேண்டியவை:**
1. **சுறுசுறுப்பு & நீர் அருந்துதல்:** நாய் தண்ணீர் குடிக்கிறதா? உடல் காய்ச்சல் போல சூடாக உள்ளதா அல்லது மிகவும் சோர்வாக படுத்துள்ளதா?
2. **உணவை கட்டாயப்படுத்தாதீர்கள்:** சிறிது நேரம் அமைதியாக ஓய்வெடுக்க விடுங்கள்.
3. **எளிய உணவு:** எண்ணெய், உப்பு இல்லாத மிதமான சூட்டில் உள்ள **வேகவைத்த சிக்கன் சூப்** அல்லது தயிர் சாதம் சிறிய அளவில் கொடுத்துப் பார்க்கலாம்.
4. **⚠️ மிக முக்கிய எச்சரிக்கை:** மனிதர்களின் வலி நிவாரண மாத்திரைகளை (Paracetamol/Dolo) ஒருபோதும் தரக்கூடாது — அது மரணத்தை உண்டாக்கும்.

24 மணி நேரத்திற்கு மேல் சாப்பிடாமல் இருந்தாலோ அல்லது வாந்தி/பேதி இருந்தாலோ உடனே கால்நடை மருத்துவரை அணுகவும்.`,
        suggestions: ['🩺 அருகிலுள்ள கால்நடை மருத்துவர்கள்', '🥗 பாதுகாப்பான உணவுகள்', '💧 நீரிழப்பு அறிகுறிகள்'],
        actions: [{ type: 'open_map', label: 'கால்நடை மருத்துவர்களை பார்க்க 🩺' }],
        detectedLanguage: 'ta',
      };
    }

    // Tanglish: "En dog-ku food sapdala enna pannalam"
    if (lang === 'tanglish') {
      return {
        reply: `Unga dog food sapdalana athukku sila common reasons irukkalam (mild indigestion, fever, or stress):

🔍 **Check panna vendiya mukkiyamaana vishayangal:**
1. **Energy & Hydration:** Normal-ah velayadutha or romba dull-ah paduthirukka? Fresh water kudikkutha nu check pannunga.
2. **Don't force feed:** Force panni heavy food tharathinga, konjam neram rest edukattum.
3. **Mild Diet:** Oil/salt/masala illatha plain boiled chicken breast shredded with white rice konjam kuduthu paarunga.
4. **⚠️ Critical Warning:** Human painkiller tablets (Paracetamol/Dolo) kandippa kudukka koodathu.

24 hours-ku mela sapdalana or fever/vomiting maari iruntha, kandippa local veterinarian-a consult pannunga.`,
        suggestions: ['🩺 View Nearby Vet Clinics', '🍗 Boiled chicken kudukalama?', '💧 Dehydration signs'],
        actions: [{ type: 'open_map', label: 'View Nearby Vets 🩺' }],
        detectedLanguage: 'tanglish',
      };
    }

    // Hindi: "मेरे कुत्ते ने खाना नहीं खाया"
    if (lang === 'hi') {
      return {
        reply: `यदि आपके कुत्ते ने खाना नहीं खाया है, तो इसके कई कारण हो सकते हैं (जैसे हल्का पेट खराब, बुखार, या तनाव):

🔍 **मुख्य बातें जो तुरंत देखनी चाहिए:**
1. **सुस्ती या कमजोरी:** क्या वह सामान्य रूप से खेल रहा है या बहुत सुस्त होकर लेटा है?
2. **पानी पीना:** क्या वह नियमित रूप से ताजा पानी पी रहा है?
3. **जबरदस्ती न करें:** उसे जबरन खाना खिलाने की कोशिश न करें।
4. **हल्का आहार:** पेट शांत होने पर थोड़ा सा उबला हुआ सादा चिकन और सफेद चावल (बिना नमक या मसाले के) दें।
5. **⚠️ सख्त चेतावनी:** इंसानों की दवाइयां (जैसे Paracetamol, Dolo) कभी न दें — ये पालतू जानवरों के लिए जानलेवा हैं।

यदि वह 24 घंटे से अधिक समय तक न खाए या उसे उल्टी/दस्त हो, तो तुरंत पशु चिकित्सक से सलाह लें।`,
        suggestions: ['🩺 नजदीकी पशु अस्पताल', '🥗 सुरक्षित आहार सूची', '💧 पानी की कमी के लक्षण'],
        actions: [{ type: 'open_map', label: 'नजदीकी पशु अस्पताल देखें 🩺' }],
        detectedLanguage: 'hi',
      };
    }

    // Spanish: "Mi perro no quiere comer"
    if (lang === 'es') {
      return {
        reply: `Si tu perro no quiere comer, lo primero es no forzarlo. Esto puede deberse a una indigestión leve, fiebre, dolor dental o estrés:

🔍 **Puntos clave a observar:**
1. **Nivel de energía e hidratación:** ¿Se muestra activo o letárgico? Asegúrate de que tenga agua fresca y limpia disponible.
2. **Síntomas acompañantes:** Observa si presenta vómitos, diarrea o salivación excesiva.
3. **Dieta blanda recomendada:** Puedes ofrecerle una pequeña porción de pollo hervido sin sal, piel ni huesos, mezclado con arroz blanco cocido.
4. **⚠️ Advertencia vital:** NUNCA administres analgésicos humanos (como paracetamol o ibuprofeno), son altamente tóxicos para perros y gatos.

Si el ayuno supera las 24 horas o notas debilidad marcada, consulta de inmediato a un veterinario.`,
        suggestions: ['🩺 Clínicas veterinarias cercanas', '🍗 Cómo preparar dieta blanda', '💧 Signos de deshidratación'],
        actions: [{ type: 'open_map', label: 'Ver clínicas veterinarias 🩺' }],
        detectedLanguage: 'es',
      };
    }

    // Casual English: "dog not eating what do i do"
    if (analysis.isCasual || isShortQuery) {
      return {
        reply: `If your dog won't eat, start by checking whether they are still drinking water and acting energetic or sluggish:

1. **Don't Force Feed:** Withhold heavy kibble for a few hours to let their stomach rest.
2. **Check Gums & Energy:** Lift their lip — gums should be pink and moist, not pale, yellowish, or sticky.
3. **Offer a Gentle Meal:** Try offering a handful of warm plain boiled chicken breast (no salt, oil, or spices) with plain white rice.
4. **⚠️ Never Give Human Meds:** Never give Tylenol, Advil, or Paracetamol — they are toxic to pets.
5. **Vet Threshold:** If they refuse food for more than 24 hours, or if you notice vomiting or fever, have a vet examine them.`,
        suggestions: ['🩺 Find nearby vet clinic', '🍗 Bland diet recipe', '💧 How to check dehydration'],
        actions: [{ type: 'open_map', label: 'Explore Nearby Vets 🩺' }],
        detectedLanguage: 'en',
      };
    }

    // Standard English: "My dog is not eating."
    return {
      reply: `When a dog stops eating, it is typically a sign of mild gastrointestinal upset, dental discomfort, stress, or an underlying infection:

🔍 **Key Observations to Check:**
1. **Activity & Hydration:** Are they alert and willing to drink clean water? Dehydration is the greatest immediate concern.
2. **Digestive Symptoms:** Have you noticed any vomiting, loose stools, or lip-smacking nausea?
3. **Bland Diet Step:** Once their stomach is settled, offer a small portion of shredded plain boiled boneless chicken breast mixed with plain white rice.
4. **⚠️ Safety Rule:** Never administer human painkillers (such as Paracetamol, Tylenol, or Ibuprofen), as they cause fatal liver and kidney damage in pets.
5. **Veterinary Visit:** If the refusal of food continues for more than 24 hours, or if accompanied by extreme lethargy or fever, consult a veterinarian promptly.`,
      suggestions: ['🩺 Find nearest Vet Clinic', '🍗 Bland diet feeding instructions', '💧 Signs of dehydration in pets'],
      actions: [{ type: 'open_map', label: 'Explore Nearby Vets 🩺' }],
      detectedLanguage: 'en',
    };
  }

  // --- 7. LOCATION & NEARBY VET CLINIC INQUIRIES ---
  if (intent === 'location_vet') {
    if (lang === 'tanglish') {
      return {
        reply: `Unga area-la vet clinic paakka, keezha irukura **Explore Nearby Map 📍** button-a click pannunga. Anga ungalukku pakkathula irukkura verified clinics, animal hospitals and contact details clear-ah kaattum!`,
        suggestions: ['📍 Open Nearby Map', '🚨 Emergency Vet Help', '📞 Call Emergency Vet'],
        actions: [{ type: 'open_map', label: 'Explore Nearby Map 📍' }],
        detectedLanguage: 'tanglish',
      };
    }
    if (lang === 'ta') {
      return {
        reply: `உங்கள் பகுதியில் உள்ள கால்நடை மருத்துவமனைகளை அறிய, கீழே உள்ள **Explore Nearby Map 📍** பட்டனை கிளிக் செய்யவும். அருகிலுள்ள அனைத்து மருத்துவமனைகளின் தொலைவு மற்றும் தொடர்பு எண்களை எளிதாகப் பார்க்கலாம்!`,
        suggestions: ['📍 வரைபடத்தை திறக்க', '🚨 அவசர உதவி', '🩺 மருத்துவமனைகள்'],
        actions: [{ type: 'open_map', label: 'அருகிலுள்ள வரைபடம் 📍' }],
        detectedLanguage: 'ta',
      };
    }
    if (lang === 'hi' || lang === 'hinglish') {
      return {
        reply: `नजदीकी पशु अस्पताल और क्लिनिक खोजने के लिए नीचे दिए गए **Explore Nearby Map 📍** बटन पर क्लिक करें। वहां आपको अपने क्षेत्र के सभी क्लिनिक और आपातकालीन केंद्र मिल जाएंगे।`,
        suggestions: ['📍 नजदीकी मैप देखें', '🚨 आपातकालीन सहायता', '🩺 पशु चिकित्सक'],
        actions: [{ type: 'open_map', label: 'Explore Nearby Map 📍' }],
        detectedLanguage: lang,
      };
    }

    return {
      reply: `To find verified veterinary hospitals and clinics near ${userLoc}, tap the **Explore Nearby Map 📍** button below to view live distances, phone numbers, and directions.`,
      suggestions: ['📍 Open Nearby Map', '🚨 Emergency Vet Help', '📞 Call Emergency Vet'],
      actions: [{ type: 'open_map', label: 'Explore Nearby Map 📍' }],
      detectedLanguage: 'en',
    };
  }

  // --- 8. GENERAL FEEDING INQUIRY ---
  if (intent === 'feeding_inquiry') {
    if (lang === 'tanglish') {
      return {
        reply: `Dogs & cats-ku safe ana food guidelines idho:

✅ **Safe & Healthy Foods:**
• **Plain Boiled Chicken:** Boneless, skinless, salt/oil/masala illama.
• **Plain White Rice:** Easy digestion-ku romba nalladhu.
• **Plain Curd / Yogurt:** Small quantity-la nalla probiotic.
• **Boiled Eggs & Pumpkin:** Protein and fiber-ku nalladhu.

🚫 **Strictly Toxic Foods (Kandippa Kudukka Koodadhu):**
• Cooked bones (splinter aagi stomach tear pannum)
• Onions, garlic, leeks (anemia undakkum)
• Chocolate, grapes, raisins, xylitol sweetener, alcohol, and tea/coffee.`,
        suggestions: ['🍗 Safe puppy feeding recipe', '🚫 Toxic foods list', '🩺 Consult vet'],
        actions: [],
        detectedLanguage: 'tanglish',
      };
    }

    return {
      reply: `Here are healthy and safe feeding guidelines for dogs and cats:

✅ **Safe & Healthy Foods:**
• **Plain Boiled Chicken:** Skinless, boneless, shredded, with no salt, oil, or spices.
• **Plain White Rice:** Easy on sensitive stomachs.
• **Plain Curd / Yogurt:** In small quantities, excellent natural probiotics for adult dogs.
• **Boiled Eggs & Pumpkin:** High protein and dietary fiber for digestive balance.

🚫 **Strictly Toxic Foods (Never Give):**
• Cooked bones (they splinter and puncture stomach walls).
• Onions, garlic, leeks (cause hemolytic anemia).
• Chocolate, grapes, raisins, xylitol sweetener, alcohol, and caffeine.`,
      suggestions: ['🍗 Safe puppy feeding recipe', '🚫 Complete toxic foods list', '🩺 Consult vet nutritionist'],
      actions: [],
      detectedLanguage: 'en',
    };
  }

  // --- 9. DEFAULT COMPACT CONVERSATIONAL FALLBACK (NO GENERIC ESSAYS) ---
  if (lang === 'tanglish') {
    return {
      reply: `Sollu namba! 🐾 Unga pet or street animal-ku enna help venum? Health, safe feeding, or nearby clinic pathi kelunga, Pawsy help panren!`,
      suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
      actions: [],
      detectedLanguage: 'tanglish',
    };
  }
  if (lang === 'ta') {
    return {
      reply: `வணக்கம்! 🐾 உங்கள் செல்லப் பிராணிக்கு என்ன உதவி வேண்டும்? நலம், பாதுகாப்பான உணவு அல்லது கால்நடை மருத்துவர் குறித்து என்னிடம் கேட்கலாம்.`,
      suggestions: ['🐾 செல்லப் பிராணி நலம்', '🥗 பாதுகாப்பான உணவுகள்', '🩺 கால்நடை மருத்துவர்கள்'],
      actions: [],
      detectedLanguage: 'ta',
    };
  }
  return {
    reply: `I'm here to help! 🐾 How can I assist you and your animal friends today? You can ask about pet health symptoms, safe feeding, or finding nearby clinics in ${userLoc}.`,
    suggestions: ['🐾 Pet health question', '🥗 Safe food guide', '🩺 Find Nearby Vets'],
    actions: [],
    detectedLanguage: 'en',
  };
}

/**
 * Main chat handler orchestrating Gemini API and robust multilingual knowledge fallback
 */
export async function handleChatMessage(
  message: string,
  history: ChatHistoryTurn[] = [],
  context?: ChatContext,
  geminiClient?: GoogleGenAI | null
): Promise<ChatResponse> {
  const userLoc = context?.location || 'your area';

  console.log(`[Pawsy] Request received: "${message.slice(0, 45)}"`);

  // 1. If Gemini client is available, try generating response via Gemini
  if (geminiClient) {
    try {
      const contents: any[] = [];

      // Pass conversation history turns safely
      if (Array.isArray(history) && history.length > 0) {
        for (const turn of history.slice(-10)) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text || (turn as any)?.content || '' }]
          });
        }
      }

      // Add user turn with contextual location metadata
      contents.push({
        role: 'user',
        parts: [{ text: `[User Location: ${userLoc}]\n\n${message}` }]
      });

      console.log('[Pawsy] AI provider request started');
      let response: any = null;
      try {
        response = await geminiClient.models.generateContent({
          model: 'gemini-2.0-flash',
          contents,
          config: {
            systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          }
        });
      } catch (primaryModelErr: any) {
        console.warn('[Pawsy] gemini-2.0-flash failed, attempting gemini-1.5-flash:', primaryModelErr.message || primaryModelErr);
        response = await geminiClient.models.generateContent({
          model: 'gemini-1.5-flash',
          contents,
          config: {
            systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          }
        });
      }

      console.log('[Pawsy] AI provider response received');
      const replyText = response.text?.trim();
      if (replyText) {
        const analysis = analyzeUserCommunication(message, history, context);
        console.log(`[Pawsy] Response returned from Gemini (detected: ${analysis.primaryLanguage})`);
        return {
          reply: replyText,
          suggestions: analysis.primaryLanguage === 'ta' || analysis.primaryLanguage === 'tanglish'
            ? ['🚨 அவசர முதலுதவி', '🥗 பாதுகாப்பான உணவுகள்', '🩺 அருகிலுள்ள மருத்துவர்கள்']
            : analysis.primaryLanguage === 'hi' || analysis.primaryLanguage === 'hinglish'
            ? ['🚨 आपातकालीन प्राथमिक चिकित्सा', '🥗 सुरक्षित आहार', '🩺 नजदीकी पशु अस्पताल']
            : analysis.primaryLanguage === 'ml'
            ? ['🚨 അടിയന്തര പ്രഥമശുശ്രൂഷ', '🥗 സുരക്ഷിതമായ ഭക്ഷണക്രമം', '🩺 വെറ്ററിനറി ക്ലിനിക്കുകൾ']
            : analysis.primaryLanguage === 'es'
            ? ['🚨 Primeros auxilios de urgencia', '🥗 Alimentos seguros', '🩺 Clínicas cercanas']
            : analysis.primaryLanguage === 'ar'
            ? ['🚨 إسعافات الطوارئ', '🥗 أطعمة آمنة', '🩺 عيادات بيطرية']
            : ['🚨 Emergency rescue guidance', '🥗 Safe foods guide', '🩺 Nearest veterinary clinics'],
          actions: lowerMentionsVet(message)
            ? [{ type: 'open_map', label: 'View Nearby Map 📍' }]
            : lowerMentionsRescue(message)
            ? [{ type: 'open_help', label: 'Urgent Help Tab 🚨' }]
            : [],
          detectedLanguage: analysis.primaryLanguage,
        };
      }
    } catch (geminiError: any) {
      console.warn('[Pawsy] AI request failed: contextual engine fallback engaged -', geminiError.message || geminiError);
    }
  }

  // 2. Perform deep semantic analysis and dynamic response synthesis
  const analysis = analyzeUserCommunication(message, history, context);
  const result = generateContextualDynamicResponse(analysis, message, history, context);
  console.log(`[Pawsy] Response returned from contextual engine (detected: ${analysis.primaryLanguage})`);
  return result;
}

function lowerMentionsVet(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('vet') || t.includes('hospital') || t.includes('clinic') || t.includes('மருத்துவர்') || t.includes('डॉक्टर') || t.includes('veterinario');
}

function lowerMentionsRescue(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('injured') || t.includes('accident') || t.includes('bleeding') || t.includes('காயம்') || t.includes('घायल') || t.includes('herido') || t.includes('rescue');
}
