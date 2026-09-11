var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express2 = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_genai2 = require("@google/genai");

// src/server/routes.ts
var import_express = require("express");

// src/server/firebaseVerifier.ts
var import_crypto = __toESM(require("crypto"), 1);
var FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "feeder-app-103ec";
var GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
var cachedCertificates = {};
var certsExpiresAt = 0;
async function getGooglePublicKeys() {
  const now = Date.now();
  if (Object.keys(cachedCertificates).length > 0 && now < certsExpiresAt) {
    return cachedCertificates;
  }
  try {
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch Google certs: HTTP ${res.status}`);
    }
    const cacheControl = res.headers.get("cache-control");
    let maxAge = 3600;
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match && match[1]) {
        maxAge = parseInt(match[1], 10);
      }
    }
    cachedCertificates = await res.json();
    certsExpiresAt = now + maxAge * 1e3;
    return cachedCertificates;
  } catch (err) {
    console.error("[Firebase Token Verifier] Error fetching Google public keys:", err);
    if (Object.keys(cachedCertificates).length > 0) {
      return cachedCertificates;
    }
    throw err;
  }
}
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Firebase ID token is missing or invalid.");
  }
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format.");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch (e) {
    throw new Error("Invalid JWT header.");
  }
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid JWT header: Must use RS256 algorithm with a valid kid.");
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch (e) {
    throw new Error("Invalid JWT payload.");
  }
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error(`Firebase token audience mismatch. Expected "${FIREBASE_PROJECT_ID}", got "${payload.aud}".`);
  }
  if (payload.iss !== expectedIssuer) {
    throw new Error(`Firebase token issuer mismatch. Expected "${expectedIssuer}", got "${payload.iss}".`);
  }
  if (typeof payload.sub !== "string" || !payload.sub.trim()) {
    throw new Error("Firebase token subject (UID) is empty.");
  }
  if (payload.exp <= nowSeconds) {
    throw new Error("Firebase token has expired.");
  }
  if (payload.iat > nowSeconds + 300) {
    throw new Error("Firebase token issued in the future.");
  }
  const certs = await getGooglePublicKeys();
  const publicKey = certs[header.kid];
  if (!publicKey) {
    throw new Error(`Google public key not found for kid: ${header.kid}`);
  }
  const verifier = import_crypto.default.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(signatureB64, "base64url");
  const isValid = verifier.verify(publicKey, signature);
  if (!isValid) {
    throw new Error("Firebase ID token signature verification failed.");
  }
  return {
    ...payload,
    uid: payload.sub
  };
}

// src/server/supabaseAdmin.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
if (!SUPABASE_URL) {
  console.warn("[Supabase Admin] SUPABASE_URL / VITE_SUPABASE_URL is not set in environment.");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to ANON key. For full security, provide SUPABASE_SERVICE_ROLE_KEY in .env.");
}
var supabaseAdmin = (0, import_supabase_js.createClient)(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// src/server/notificationService.ts
var import_app = require("firebase-admin/app");
var import_messaging = require("firebase-admin/messaging");
var isFcmInitialized = false;
var fcmInitError = null;
var adminAppInstance = null;
function initializeFirebaseAdminMessaging() {
  if (isFcmInitialized) return true;
  const existingApps = (0, import_app.getApps)();
  if (existingApps.length > 0) {
    adminAppInstance = existingApps[0];
    isFcmInitialized = true;
    return true;
  }
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const sa = typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY === "string" ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      adminAppInstance = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)(sa)
      });
      isFcmInitialized = true;
      console.log("[NotificationService] Firebase Admin Messaging initialized via FIREBASE_SERVICE_ACCOUNT_KEY.");
      return true;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "feeder-app-103ec";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    if (clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
      adminAppInstance = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)({
          projectId,
          clientEmail,
          privateKey
        })
      });
      isFcmInitialized = true;
      console.log("[NotificationService] Firebase Admin Messaging initialized via discrete credentials.");
      return true;
    }
    fcmInitError = "Missing server credentials: FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_KEY)";
    return false;
  } catch (err) {
    fcmInitError = err.message;
    console.warn("[NotificationService] Firebase Admin Messaging init failed:", err.message);
    return false;
  }
}
initializeFirebaseAdminMessaging();
async function getPushProviderStatus() {
  const isConfigured = initializeFirebaseAdminMessaging();
  const missing = [];
  if (!isConfigured) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push("FIREBASE_CLIENT_EMAIL");
      if (!process.env.FIREBASE_PRIVATE_KEY) missing.push("FIREBASE_PRIVATE_KEY");
    }
  }
  const vapidConfigured = Boolean(
    process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY
  );
  let activeCount = 0;
  try {
    const { count } = await supabaseAdmin.from("responder_devices").select("*", { count: "exact", head: true }).eq("is_active", true);
    activeCount = count || 0;
  } catch (e) {
  }
  return {
    configured: isConfigured,
    provider: isConfigured ? "fcm" : "none",
    status: isConfigured ? "CONFIGURED" : "BLOCKED / CONFIGURATION REQUIRED",
    missingCredentials: missing,
    activeDevicesCount: activeCount,
    vapidConfigured
  };
}
async function registerResponderDevice(firebaseUid, payload) {
  try {
    if (!payload.pushToken || !payload.pushToken.trim()) {
      return { success: false, error: "Push token cannot be empty." };
    }
    const platform = payload.platform || "web";
    const deviceType = payload.deviceType || "web";
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { error } = await supabaseAdmin.from("responder_devices").upsert(
      {
        firebase_uid: firebaseUid,
        push_token: payload.pushToken.trim(),
        platform,
        device_type: deviceType,
        is_active: true,
        last_seen_at: now,
        updated_at: now
      },
      { onConflict: "push_token" }
    );
    if (error) {
      console.warn("[NotificationService] Failed to register device token:", error.message);
      return { success: false, error: error.message };
    }
    console.log(`[NotificationService] FCM token registered for responder ${firebaseUid} (${platform})`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function sendEmergencyPushNotification(helpRequestId, emergencyType, address, latitude, longitude) {
  try {
    const { data: responders, error: respErr } = await supabaseAdmin.from("responder_profiles").select("firebase_uid").in("role", ["responder", "admin"]).eq("is_active", true);
    if (respErr || !responders || responders.length === 0) {
      return {
        success: false,
        status: "NO_ACTIVE_RESPONDERS",
        sentCount: 0,
        message: "No active responders registered."
      };
    }
    const responderUids = responders.map((r) => r.firebase_uid);
    const { data: devices, error: devErr } = await supabaseAdmin.from("responder_devices").select("id, firebase_uid, push_token").in("firebase_uid", responderUids).eq("is_active", true);
    if (devErr || !devices || devices.length === 0) {
      await logRescueEvent(
        helpRequestId,
        "SYSTEM",
        "no_active_push_devices",
        "No active registered push devices found for active responders."
      );
      return {
        success: false,
        status: "NO_ACTIVE_PUSH_DEVICES",
        sentCount: 0,
        message: "No active responder devices registered for push notifications."
      };
    }
    const isConfigured = initializeFirebaseAdminMessaging();
    if (!isConfigured) {
      const missing = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
      await logRescueEvent(
        helpRequestId,
        "SYSTEM",
        "push_send_failed",
        "Push send skipped: Server Firebase Admin credentials not configured (BLOCKED / CONFIGURATION REQUIRED)."
      );
      return {
        success: false,
        status: "BLOCKED / CONFIGURATION REQUIRED",
        sentCount: 0,
        missingCredentials: missing,
        message: "Background push notifications are not configured on the server."
      };
    }
    await logRescueEvent(
      helpRequestId,
      "SYSTEM",
      "push_send_attempted",
      `Attempting FCM push delivery to ${devices.length} registered device(s).`
    );
    const tokens = devices.map((d) => d.push_token);
    const message = {
      tokens,
      notification: {
        title: "\u{1F6A8} Emergency Rescue Request",
        body: `Emergency reported: ${emergencyType} at ${address || "nearby location"}.`
      },
      data: {
        type: "EMERGENCY_RESCUE",
        helpRequestId,
        emergencyType,
        latitude: String(latitude || ""),
        longitude: String(longitude || ""),
        route: `/?emergency=${helpRequestId}`
      },
      webpush: {
        fcmOptions: {
          link: `/?emergency=${helpRequestId}`
        },
        notification: {
          tag: `emergency-${helpRequestId}`,
          requireInteraction: true,
          icon: "/favicon.ico",
          badge: "/favicon.ico"
        }
      }
    };
    const messagingInstance = (0, import_messaging.getMessaging)(adminAppInstance || void 0);
    const response = await messagingInstance.sendEachForMulticast(message);
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code || "";
        if (errCode === "messaging/invalid-registration-token" || errCode === "messaging/registration-token-not-registered" || errCode === "messaging/mismatched-credential" || errCode.includes("invalid") || errCode.includes("not-registered") || errCode.includes("argument")) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      await supabaseAdmin.from("responder_devices").update({ is_active: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).in("push_token", invalidTokens);
      await logRescueEvent(
        helpRequestId,
        "SYSTEM",
        "push_invalid_token",
        `Deactivated ${invalidTokens.length} expired or invalid FCM device token(s).`
      );
    }
    if (response.successCount > 0) {
      await logRescueEvent(
        helpRequestId,
        "SYSTEM",
        "push_send_success",
        `FCM push accepted for ${response.successCount}/${devices.length} device(s).`
      );
      return {
        success: true,
        status: "PUSH_ACCEPTED_BY_FCM",
        sentCount: response.successCount,
        failureCount: response.failureCount,
        message: `FCM push notification sent to ${response.successCount} responder device(s).`
      };
    } else {
      await logRescueEvent(
        helpRequestId,
        "SYSTEM",
        "push_send_failed",
        `FCM push failed for all ${devices.length} device(s).`
      );
      return {
        success: false,
        status: "PUSH_SEND_FAILED",
        sentCount: 0,
        failureCount: response.failureCount,
        message: "FCM push delivery failed for all registered devices."
      };
    }
  } catch (err) {
    console.error("[NotificationService] Push delivery exception:", err.message);
    await logRescueEvent(
      helpRequestId,
      "SYSTEM",
      "push_send_failed",
      `Push delivery exception: ${err.message}`
    );
    return {
      success: false,
      status: "PUSH_SEND_FAILED",
      sentCount: 0,
      message: err.message
    };
  }
}

// src/server/dispatchService.ts
async function getResponderProfile(firebaseUid, userEmail) {
  try {
    const { data, error } = await supabaseAdmin.from("responder_profiles").select("*").eq("firebase_uid", firebaseUid).maybeSingle();
    if (data) {
      return data;
    }
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminUid = process.env.INITIAL_ADMIN_UID;
    const isBootstrapAdmin = adminUid && adminUid === firebaseUid || adminEmail && userEmail && adminEmail.toLowerCase() === userEmail.toLowerCase();
    if (isBootstrapAdmin) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const { data: bootstrapped } = await supabaseAdmin.from("responder_profiles").upsert(
        {
          firebase_uid: firebaseUid,
          name: userEmail?.split("@")[0] || "System Admin",
          email: userEmail || "admin@feeder.app",
          role: "admin",
          is_active: true,
          created_at: now,
          updated_at: now
        },
        { onConflict: "firebase_uid" }
      ).select("*").single();
      if (bootstrapped) {
        return bootstrapped;
      }
    }
    if (error) {
      console.warn("[DispatchService] Error fetching responder profile:", error.message);
      return null;
    }
    return null;
  } catch (err) {
    console.warn("[DispatchService] Profile check exception:", err.message);
    return null;
  }
}
async function logRescueEvent(helpRequestId, actorUid, eventType, details) {
  try {
    await supabaseAdmin.from("rescue_audit_logs").insert({
      help_request_id: helpRequestId,
      actor_uid: actorUid,
      event_type: eventType,
      details: details || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.warn("[DispatchService] Failed to record audit log:", err.message);
  }
}
async function dispatchEmergencyToResponders(helpRequestId, requesterUid, emergencyType, address, latitude, longitude) {
  try {
    const { data: responders, error: respErr } = await supabaseAdmin.from("responder_profiles").select("*").in("role", ["responder", "admin"]).eq("is_active", true);
    if (respErr) {
      console.error("[DispatchService] Responder lookup error:", respErr.message);
      return {
        dispatched: false,
        responderCount: 0,
        message: "Could not query active responders."
      };
    }
    const activeResponders = responders || [];
    if (activeResponders.length === 0) {
      await logRescueEvent(
        helpRequestId,
        requesterUid,
        "emergency_created_no_responders",
        "No active registered responders available in the database."
      );
      return {
        dispatched: false,
        responderCount: 0,
        message: "Rescue request submitted, but no active responder is currently available."
      };
    }
    const assignmentInserts = activeResponders.map((r) => ({
      help_request_id: helpRequestId,
      responder_uid: r.firebase_uid,
      status: "NOTIFIED",
      assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    await supabaseAdmin.from("rescue_assignments").insert(assignmentInserts);
    const notificationInserts = activeResponders.map((r) => ({
      recipient_uid: r.firebase_uid,
      actor_uid: requesterUid,
      type: "emergency_rescue",
      is_read: false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    await supabaseAdmin.from("notifications").insert(notificationInserts);
    const pushResult = await sendEmergencyPushNotification(
      helpRequestId,
      emergencyType,
      address,
      latitude || 0,
      longitude || 0
    );
    await logRescueEvent(
      helpRequestId,
      requesterUid,
      "responders_notified",
      `Notified ${activeResponders.length} active responder(s) in-app. FCM push status: ${pushResult.status}.`
    );
    let dispatchMessage = `Rescue request submitted. ${activeResponders.length} active responder(s) notified in-app.`;
    if (pushResult.status === "PUSH_ACCEPTED_BY_FCM") {
      dispatchMessage += ` Push notifications delivered to ${pushResult.sentCount} responder device(s).`;
    } else if (pushResult.status === "NO_ACTIVE_PUSH_DEVICES") {
      dispatchMessage += ` (No active push devices registered for responders).`;
    } else if (pushResult.status === "BLOCKED / CONFIGURATION REQUIRED") {
      dispatchMessage += ` (Background push notifications are not configured on the server).`;
    }
    return {
      dispatched: true,
      responderCount: activeResponders.length,
      push: pushResult,
      message: dispatchMessage
    };
  } catch (err) {
    console.error("[DispatchService] Dispatch failure:", err.message);
    return {
      dispatched: false,
      responderCount: 0,
      message: "Rescue request saved, but responder notification encountered an error."
    };
  }
}
async function acceptRescueRequest(helpRequestId, responderUid) {
  try {
    const { data: existingAccepted, error: checkErr } = await supabaseAdmin.from("rescue_assignments").select("*").eq("help_request_id", helpRequestId).in("status", ["ACCEPTED", "ARRIVED", "RESOLVED"]).maybeSingle();
    if (checkErr) {
      return { success: false, error: checkErr.message };
    }
    if (existingAccepted) {
      if (existingAccepted.responder_uid === responderUid) {
        return { success: true, assignment: existingAccepted };
      }
      return {
        success: false,
        conflict: true,
        error: "This rescue request has already been accepted by another responder."
      };
    }
    const { data: existingAssignment } = await supabaseAdmin.from("rescue_assignments").select("*").eq("help_request_id", helpRequestId).eq("responder_uid", responderUid).maybeSingle();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    let updatedAssignment;
    if (existingAssignment) {
      const { data, error } = await supabaseAdmin.from("rescue_assignments").update({
        status: "ACCEPTED",
        accepted_at: now,
        updated_at: now
      }).eq("id", existingAssignment.id).select("*").single();
      if (error) return { success: false, error: error.message };
      updatedAssignment = data;
    } else {
      const { data, error } = await supabaseAdmin.from("rescue_assignments").insert({
        help_request_id: helpRequestId,
        responder_uid: responderUid,
        status: "ACCEPTED",
        assigned_at: now,
        accepted_at: now,
        created_at: now,
        updated_at: now
      }).select("*").single();
      if (error) return { success: false, error: error.message };
      updatedAssignment = data;
    }
    await supabaseAdmin.from("rescue_assignments").update({ status: "CANCELLED", updated_at: now }).eq("help_request_id", helpRequestId).neq("responder_uid", responderUid).eq("status", "NOTIFIED");
    await logRescueEvent(helpRequestId, responderUid, "responder_accepted", `Request claimed by responder.`);
    return { success: true, assignment: updatedAssignment };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function markResponderArrived(helpRequestId, responderUid) {
  try {
    const { data: assignment, error: findErr } = await supabaseAdmin.from("rescue_assignments").select("*").eq("help_request_id", helpRequestId).eq("responder_uid", responderUid).eq("status", "ACCEPTED").maybeSingle();
    if (findErr || !assignment) {
      return { success: false, error: "No active accepted assignment found for this responder on this request." };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { error: updErr } = await supabaseAdmin.from("rescue_assignments").update({
      status: "ARRIVED",
      arrived_at: now,
      updated_at: now
    }).eq("id", assignment.id);
    if (updErr) return { success: false, error: updErr.message };
    await logRescueEvent(helpRequestId, responderUid, "responder_arrived", "Responder arrived at accident location.");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function resolveRescueRequest(helpRequestId, responderUid, isAdmin = false) {
  try {
    let query = supabaseAdmin.from("rescue_assignments").select("*").eq("help_request_id", helpRequestId);
    if (!isAdmin) {
      query = query.eq("responder_uid", responderUid);
    }
    const { data: assignment, error: findErr } = await query.in("status", ["ACCEPTED", "ARRIVED"]).maybeSingle();
    if (findErr || !assignment) {
      return { success: false, error: "No claimable assignment found to resolve." };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { error: updErr } = await supabaseAdmin.from("rescue_assignments").update({
      status: "RESOLVED",
      resolved_at: now,
      updated_at: now
    }).eq("id", assignment.id);
    if (updErr) return { success: false, error: updErr.message };
    await logRescueEvent(helpRequestId, responderUid, "rescue_resolved", "Rescue request marked resolved.");
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// src/server/aiImageDetector.ts
var import_genai = require("@google/genai");
function getGenAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "feeder-media-authenticity-guard"
      }
    }
  });
}
var VISION_AUTHENTICITY_PROMPT = `You are a forensic computer vision authenticity evaluator for an ethical community pet and street animal platform.
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
async function analyzeImageAuthenticity(fileBase64, mimeType) {
  const startTime = Date.now();
  const ai2 = getGenAiClient();
  if (!ai2) {
    const durationMs = Date.now() - startTime;
    console.warn("[AI Image Detector] No server-side API key configured (GEMINI_API_KEY is empty).");
    throw new Error("REAL AI IMAGE DETECTION PROVIDER REQUIRED \u2014 NO VALID SERVER-SIDE API CONFIGURED");
  }
  const supportedMime = mimeType === "image/avif" || mimeType === "image/webp" || mimeType === "image/png" || mimeType === "image/jpeg" ? mimeType : "image/jpeg";
  try {
    const cleanBase64 = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
    const response = await ai2.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: supportedMime
              }
            },
            {
              text: VISION_AUTHENTICITY_PROMPT
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
        // Low temperature for consistent classification
      }
    });
    const durationMs = Date.now() - startTime;
    const responseText = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("[AI Image Detector] Failed to parse model JSON output:", responseText);
      throw new Error("Invalid response structure from AI vision model.");
    }
    const classification = parsed.classification === "ai_generated" || parsed.classification === "real_photograph" || parsed.classification === "uncertain" ? parsed.classification : parsed.isAiGenerated ? "ai_generated" : "real_photograph";
    const rawConfidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.85;
    const confidence = Math.min(Math.max(rawConfidence, 0), 1);
    const isAiGenerated = classification === "ai_generated";
    const reason = parsed.reason || (isAiGenerated ? "Visual patterns consistent with synthetic AI generation." : "Visual features consistent with authentic camera photograph.");
    console.log(`[AI Image Detector Audit] Provider: gemini-2.5-flash | Decision: ${classification} | Confidence: ${confidence.toFixed(2)} | Duration: ${durationMs}ms`);
    return {
      isAiGenerated,
      confidence,
      classification,
      reason,
      provider: "google-gemini-2.5-flash-vision",
      durationMs
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI Image Detector] Error during visual analysis (${durationMs}ms):`, err.message);
    throw err;
  }
}

// src/server/routes.ts
var backendRouter = (0, import_express.Router)();
async function requireFirebaseAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid Authorization header." });
  }
  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return res.status(401).json({ error: "Unauthorized: Empty token." });
  }
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[Backend Auth] Token verification failed:", err.message);
    return res.status(401).json({ error: `Unauthorized: ${err.message}` });
  }
}
var ALLOWED_BUCKETS = ["post-media", "story-media", "profile-images", "general-media"];
async function ensurePublicBuckets() {
  try {
    for (const b of ALLOWED_BUCKETS) {
      await supabaseAdmin.storage.updateBucket(b, { public: true });
    }
    console.log("[Supabase Storage] Verified all media buckets are public.");
  } catch (err) {
    console.warn("[Supabase Storage] Notice updating buckets to public:", err.message);
  }
}
ensurePublicBuckets();
backendRouter.post("/media/verify-authenticity", requireFirebaseAuth, async (req, res) => {
  try {
    const { fileBase64, mimeType } = req.body;
    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing required file data (fileBase64, mimeType)." });
    }
    if (mimeType.startsWith("video/")) {
      return res.json({
        success: true,
        isAiGenerated: false,
        classification: "real_photograph",
        confidence: 1,
        reason: "Video file verified.",
        provider: "system"
      });
    }
    try {
      const result = await analyzeImageAuthenticity(fileBase64, mimeType);
      if (result.classification === "ai_generated" && result.confidence >= 0.75) {
        return res.status(422).json({
          success: false,
          isAiGenerated: true,
          classification: "ai_generated",
          confidence: result.confidence,
          reason: result.reason,
          provider: result.provider,
          userMessage: "AI-generated photos are not allowed. Please upload a real photograph."
        });
      }
      if (result.classification === "uncertain" || result.isAiGenerated && result.confidence < 0.75) {
        return res.status(422).json({
          success: false,
          isAiGenerated: false,
          classification: "uncertain",
          confidence: result.confidence,
          reason: result.reason,
          provider: result.provider,
          userMessage: "We couldn't verify this image as a real photograph. Please upload a different real photograph."
        });
      }
      return res.json({
        success: true,
        isAiGenerated: false,
        classification: result.classification,
        confidence: result.confidence,
        reason: result.reason,
        provider: result.provider
      });
    } catch (detectorErr) {
      if (detectorErr.message?.includes("REAL AI IMAGE DETECTION PROVIDER REQUIRED")) {
        return res.status(503).json({
          error: "Image authenticity verification is currently unavailable. Real server-side AI detection provider is not configured.",
          code: "AI_DETECTION_UNCONFIGURED",
          requiredEnv: "GEMINI_API_KEY",
          userMessage: "Image authenticity verification is currently unavailable. Please try again later."
        });
      }
      return res.status(503).json({
        error: "Image authenticity verification is currently unavailable. Please try again later.",
        code: "AI_DETECTION_UNAVAILABLE",
        userMessage: "Image authenticity verification is currently unavailable. Please try again later.",
        details: detectorErr.message
      });
    }
  } catch (err) {
    console.error("[Backend Authenticity Check] Error:", err);
    return res.status(500).json({ error: err.message || "Authenticity verification failed." });
  }
});
backendRouter.post("/media/upload", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { fileBase64, fileName, mimeType, bucket } = req.body;
    if (!fileBase64 || !fileName || !mimeType) {
      return res.status(400).json({ error: "Missing required file data (fileBase64, fileName, mimeType)." });
    }
    const targetBucket = ALLOWED_BUCKETS.includes(bucket) ? bucket : "general-media";
    if ((targetBucket === "post-media" || targetBucket === "story-media") && mimeType.startsWith("image/")) {
      try {
        const checkResult = await analyzeImageAuthenticity(fileBase64, mimeType);
        if (checkResult.classification === "ai_generated" && checkResult.confidence >= 0.75) {
          return res.status(422).json({
            error: "AI-generated photos are not allowed. Please upload a real photograph.",
            code: "AI_IMAGE_REJECTED",
            confidence: checkResult.confidence,
            reason: checkResult.reason
          });
        }
        if (checkResult.classification === "uncertain") {
          return res.status(422).json({
            error: "We couldn't verify this image as a real photograph. Please upload a different real photograph.",
            code: "AI_IMAGE_UNCERTAIN"
          });
        }
      } catch (checkErr) {
        if (checkErr.message?.includes("REAL AI IMAGE DETECTION PROVIDER REQUIRED")) {
          return res.status(503).json({
            error: "Image authenticity verification is currently unavailable. Please try again later.",
            code: "AI_DETECTION_UNCONFIGURED",
            requiredEnv: "GEMINI_API_KEY"
          });
        }
        return res.status(503).json({
          error: "Image authenticity verification is currently unavailable. Please try again later.",
          code: "AI_DETECTION_UNAVAILABLE"
        });
      }
    }
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${verifiedUid}/${Date.now()}_${cleanFileName}`;
    const fileBuffer = Buffer.from(fileBase64, "base64");
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from(targetBucket).upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });
    if (uploadError) {
      console.error("[Backend Upload] Supabase Storage error:", uploadError);
      return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    }
    const { data: urlData } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(storagePath);
    return res.json({
      success: true,
      publicUrl: urlData.publicUrl,
      path: storagePath,
      bucket: targetBucket
    });
  } catch (err) {
    console.error("[Backend Upload] Error:", err);
    return res.status(500).json({ error: err.message || "Media upload failed." });
  }
});
backendRouter.post("/media/delete", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { mediaUrl, path: path2, bucket } = req.body;
    let targetBucket = bucket;
    let storagePath = path2;
    if (mediaUrl && !storagePath) {
      for (const b of ALLOWED_BUCKETS) {
        const marker = `/storage/v1/object/public/${b}/`;
        if (mediaUrl.includes(marker)) {
          targetBucket = b;
          storagePath = decodeURIComponent(mediaUrl.split(marker)[1]);
          break;
        }
      }
    }
    if (targetBucket && storagePath) {
      if (storagePath.startsWith(`${verifiedUid}/`) || storagePath.startsWith(verifiedUid)) {
        const { error } = await supabaseAdmin.storage.from(targetBucket).remove([storagePath]);
        if (error) {
          console.warn("[Backend Media Delete] Supabase remove notice:", error.message);
        }
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.warn("[Backend Media Delete] Error:", err);
    return res.status(500).json({ error: err.message || "Media delete failed." });
  }
});
backendRouter.post("/profile/sync", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const user = req.body || {};
    const avatarUrl = user.avatar || user.photo_url || req.user.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(verifiedUid)}`;
    const name = user.name || req.user.name || "Feeder Caregiver";
    const email = user.email || req.user.email || null;
    const bio = user.bio !== void 0 ? user.bio : "Compassionate animal lover, street feeder & pet protector.";
    const location = user.location !== void 0 ? user.location : "";
    const { data: existingProfile } = await supabaseAdmin.from("profiles").select("*").eq("firebase_uid", verifiedUid).maybeSingle();
    let profileResult;
    if (existingProfile) {
      const { data, error } = await supabaseAdmin.from("profiles").update({
        name: name || existingProfile.name,
        email: email || existingProfile.email,
        photo_url: user.avatar || user.photo_url || existingProfile.photo_url || avatarUrl,
        bio: bio || existingProfile.bio,
        location: location || existingProfile.location
      }).eq("firebase_uid", verifiedUid).select("*").single();
      if (error) throw error;
      profileResult = data;
    } else {
      const { data, error } = await supabaseAdmin.from("profiles").insert({
        firebase_uid: verifiedUid,
        name,
        email,
        photo_url: avatarUrl,
        bio,
        location,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select("*").single();
      if (error) throw error;
      profileResult = data;
    }
    return res.json({ success: true, profile: profileResult });
  } catch (err) {
    console.error("[Backend Profile] Error:", err);
    return res.status(500).json({ error: err.message || "Profile sync failed." });
  }
});
backendRouter.get("/profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("firebase_uid", uid).maybeSingle();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, profile: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/users/search", async (req, res) => {
  try {
    const rawQuery = req.query.q || "";
    const cleanQuery = rawQuery.trim().replace(/^@/, "").trim();
    if (!cleanQuery) {
      return res.json({ success: true, users: [] });
    }
    const sanitized = cleanQuery.replace(/[%_,()\\.]/g, " ").trim();
    if (!sanitized) {
      return res.json({ success: true, users: [] });
    }
    const { data: directProfiles, error } = await supabaseAdmin.from("profiles").select("id, firebase_uid, name, photo_url, bio, location, created_at").or(`name.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`).limit(20);
    if (error) {
      console.warn("[User Search] Supabase query notice:", error.message);
      return res.status(500).json({ error: error.message, users: [] });
    }
    let profiles = directProfiles || [];
    if (profiles.length === 0 && sanitized.length >= 3) {
      const prefix = sanitized.slice(0, 4);
      const { data: prefixProfiles } = await supabaseAdmin.from("profiles").select("id, firebase_uid, name, photo_url, bio, location, created_at").ilike("name", `%${prefix}%`).limit(20);
      if (prefixProfiles && prefixProfiles.length > 0) {
        const queryNormalized = sanitized.toLowerCase();
        profiles = prefixProfiles.filter((p) => {
          const normName = (p.name || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
          return normName.includes(queryNormalized);
        });
      }
    }
    const users = profiles.map((p) => {
      const uid = p.firebase_uid || p.id || "";
      const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid || "feeder")}`;
      return {
        id: uid,
        firebase_uid: uid,
        name: p.name || "Feeder Caregiver",
        username: (p.name || "feeder").toLowerCase().replace(/[^a-z0-9_]/g, "") || "feeder",
        avatar: p.photo_url || defaultAvatar,
        bio: p.bio || "",
        location: p.location || "",
        roles: ["Feeder", "Animal Lover"],
        interests: ["Community Care"],
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        followerIds: [],
        followingIds: [],
        joinedDate: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Joined recently",
        isVerified: true
      };
    });
    return res.json({ success: true, users });
  } catch (err) {
    console.error("[User Search] Unexpected error:", err);
    return res.status(500).json({ error: err.message || "Search failed", users: [] });
  }
});
backendRouter.post("/posts", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { content, mediaUrl, mediaType, media } = req.body;
    const resolvedMediaUrl = mediaUrl || (Array.isArray(media) && media.length > 0 ? media[0] : null);
    const resolvedMediaType = mediaType || (resolvedMediaUrl ? "image" : null);
    const postPayload = {
      firebase_uid: verifiedUid,
      content: (content || "").trim(),
      media_url: resolvedMediaUrl,
      media_type: resolvedMediaType,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data, error } = await supabaseAdmin.from("posts").insert(postPayload).select("*").single();
    if (error) {
      console.error("[Backend Posts] Post insert error:", error);
      return res.status(500).json({ error: `Failed to create post: ${error.message}` });
    }
    return res.json({ success: true, post: data });
  } catch (err) {
    console.error("[Backend Posts] Error:", err);
    return res.status(500).json({ error: err.message || "Post creation failed." });
  }
});
backendRouter.delete("/posts/:id", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const postId = req.params.id;
    const { data: existingPost, error: fetchError } = await supabaseAdmin.from("posts").select("id, firebase_uid").eq("id", postId).single();
    if (fetchError || !existingPost) {
      return res.status(404).json({ error: "Post not found." });
    }
    if (existingPost.firebase_uid !== verifiedUid) {
      return res.status(403).json({ error: "Forbidden: You do not own this post." });
    }
    const { error: deleteError } = await supabaseAdmin.from("posts").delete().eq("id", postId).eq("firebase_uid", verifiedUid);
    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/stories", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { mediaUrl, mediaType } = req.body;
    if (!mediaUrl) {
      return res.status(400).json({ error: "Media URL is required for stories." });
    }
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    const storyPayload = {
      firebase_uid: verifiedUid,
      media_url: mediaUrl,
      media_type: mediaType || "image",
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };
    const { data, error } = await supabaseAdmin.from("stories").insert(storyPayload).select("*").single();
    if (error) {
      console.error("[Backend Stories] Story insert error:", error);
      return res.status(500).json({ error: `Failed to create story: ${error.message}` });
    }
    return res.json({ success: true, story: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Story creation failed." });
  }
});
backendRouter.delete("/stories/:id", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const storyId = req.params.id;
    const { data: existing, error: fetchErr } = await supabaseAdmin.from("stories").select("id, firebase_uid").eq("id", storyId).single();
    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Story not found." });
    }
    if (existing.firebase_uid !== verifiedUid) {
      return res.status(403).json({ error: "Forbidden: You do not own this story." });
    }
    const { error: delErr } = await supabaseAdmin.from("stories").delete().eq("id", storyId).eq("firebase_uid", verifiedUid);
    if (delErr) {
      return res.status(500).json({ error: delErr.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/posts/:id/like", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const postId = req.params.id;
    const { data: existingLike } = await supabaseAdmin.from("likes").select("id").eq("post_id", postId).eq("firebase_uid", verifiedUid).maybeSingle();
    if (existingLike) {
      await supabaseAdmin.from("likes").delete().eq("id", existingLike.id);
      return res.json({ success: true, liked: false });
    } else {
      const { error: insertErr } = await supabaseAdmin.from("likes").insert({
        post_id: postId,
        firebase_uid: verifiedUid,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }
      return res.json({ success: true, liked: true });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/posts/:id/comment", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Comment content cannot be empty." });
    }
    const { data, error } = await supabaseAdmin.from("comments").insert({
      post_id: postId,
      firebase_uid: verifiedUid,
      content: content.trim(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select("*").single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, comment: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/users/:id/follow", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const targetUserId = req.params.id;
    if (verifiedUid === targetUserId) {
      return res.status(400).json({ error: "Cannot follow yourself." });
    }
    const { data: existingFollow } = await supabaseAdmin.from("followers").select("id").eq("follower_uid", verifiedUid).eq("following_uid", targetUserId).maybeSingle();
    if (existingFollow) {
      await supabaseAdmin.from("followers").delete().eq("id", existingFollow.id);
      return res.json({ success: true, following: false });
    } else {
      const { error: insErr } = await supabaseAdmin.from("followers").insert({
        follower_uid: verifiedUid,
        following_uid: targetUserId,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (insErr) {
        return res.status(500).json({ error: insErr.message });
      }
      return res.json({ success: true, following: true });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/notifications", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { data, error } = await supabaseAdmin.from("notifications").select("*").eq("recipient_uid", verifiedUid).order("created_at", { ascending: false }).limit(50);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, notifications: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.patch("/notifications/:id/read", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const notifId = req.params.id;
    const { data, error } = await supabaseAdmin.from("notifications").update({ is_read: true }).eq("id", notifId).eq("recipient_uid", verifiedUid).select("*").single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ success: true, notification: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/emergency/report", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { emergencyType, description, lat, lng, address, photoUrl } = req.body;
    if (lat === void 0 || lat === null || lng === void 0 || lng === null || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ error: "Valid GPS latitude and longitude coordinates are required." });
    }
    if (!emergencyType || !emergencyType.trim()) {
      return res.status(400).json({ error: "Emergency type is required (e.g. Pet Accident, Pet Injured, Animal in Danger)." });
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const locationAddress = address ? address.trim() : `GPS: ${latitude.toFixed(5)}\xB0, ${longitude.toFixed(5)}\xB0`;
    const emergencyRecord = {
      firebase_uid: verifiedUid,
      emergency_type: emergencyType.trim(),
      description: description ? description.trim() : null,
      latitude,
      longitude,
      address: locationAddress,
      photo_url: photoUrl || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data: helpData, error: helpErr } = await supabaseAdmin.from("help_requests").insert(emergencyRecord).select("*").single();
    if (helpErr) {
      console.error("[Backend Emergency] Supabase insert error:", helpErr);
      return res.status(500).json({
        error: `Unable to submit the rescue request (${helpErr.message}).`,
        code: helpErr.code
      });
    }
    const dispatchResult = await dispatchEmergencyToResponders(
      helpData.id,
      verifiedUid,
      emergencyType,
      locationAddress,
      latitude,
      longitude
    );
    return res.status(201).json({
      success: true,
      report: helpData,
      reportId: helpData.id,
      dispatch: dispatchResult,
      message: dispatchResult.message
    });
  } catch (err) {
    console.error("[Backend Emergency] Fatal error:", err);
    return res.status(500).json({ error: err.message || "Unable to submit the rescue request. Please try again." });
  }
});
backendRouter.get("/emergency/reports", requireFirebaseAuth, async (_req, res) => {
  try {
    const { data: requests, error: reqErr } = await supabaseAdmin.from("help_requests").select("*").order("created_at", { ascending: false }).limit(50);
    if (reqErr) {
      console.error("[Backend Emergency] Error fetching help requests:", reqErr.message);
      return res.status(500).json({ error: reqErr.message });
    }
    if (!requests || requests.length === 0) {
      return res.json({ success: true, reports: [] });
    }
    const uids = Array.from(new Set(requests.map((r) => r.firebase_uid).filter(Boolean)));
    const profileMap = {};
    if (uids.length > 0) {
      const { data: profiles, error: profErr } = await supabaseAdmin.from("profiles").select("firebase_uid, name, photo_url").in("firebase_uid", uids);
      if (!profErr && profiles) {
        profiles.forEach((p) => {
          profileMap[p.firebase_uid] = {
            name: p.name,
            photo_url: p.photo_url
          };
        });
      }
    }
    const reports = requests.map((r) => {
      const prof = profileMap[r.firebase_uid];
      return {
        ...r,
        profiles: prof ? { name: prof.name, photo_url: prof.photo_url } : null,
        userName: prof?.name || "Feeder User",
        userAvatar: prof?.photo_url || null
      };
    });
    return res.json({ success: true, reports });
  } catch (err) {
    console.error("[Backend Emergency] Exception in /emergency/reports:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/emergency/status/:id", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const requestId = req.params.id;
    const { data: request, error: reqErr } = await supabaseAdmin.from("help_requests").select("*").eq("id", requestId).maybeSingle();
    if (reqErr || !request) {
      return res.status(404).json({ error: "Rescue request not found." });
    }
    const responder = await getResponderProfile(verifiedUid);
    const isOwner = request.firebase_uid === verifiedUid;
    const isAuthorizedResponder = responder && responder.is_active && (responder.role === "responder" || responder.role === "admin");
    if (!isOwner && !isAuthorizedResponder) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to view this emergency status." });
    }
    const { data: assignment } = await supabaseAdmin.from("rescue_assignments").select("*").eq("help_request_id", requestId).in("status", ["ACCEPTED", "ARRIVED", "RESOLVED"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    let responderInfo = null;
    if (assignment) {
      const { data: respProfile } = await supabaseAdmin.from("responder_profiles").select("name, phone").eq("firebase_uid", assignment.responder_uid).maybeSingle();
      responderInfo = respProfile || { name: "Assigned Responder", phone: null };
    }
    let effectiveStatus = "PENDING";
    if (assignment) {
      effectiveStatus = assignment.status;
    } else {
      const { count } = await supabaseAdmin.from("rescue_assignments").select("*", { count: "exact", head: true }).eq("help_request_id", requestId).eq("status", "NOTIFIED");
      if (count && count > 0) {
        effectiveStatus = "NOTIFIED";
      }
    }
    return res.json({
      success: true,
      request,
      status: effectiveStatus,
      assignment: assignment ? { ...assignment, responder: responderInfo } : null
    });
  } catch (err) {
    console.error("[Backend Emergency Status] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});
async function requireResponderOrAdmin(req, res, next) {
  const verifiedUid = req.user.uid;
  const profile = await getResponderProfile(verifiedUid, req.user.email);
  if (!profile || profile.role !== "responder" && profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: You are not authorized to access rescue requests." });
  }
  if (!profile.is_active) {
    return res.status(403).json({ error: "Forbidden: Your responder account is currently inactive." });
  }
  req.responder = profile;
  next();
}
async function requireAdmin(req, res, next) {
  const verifiedUid = req.user.uid;
  const profile = await getResponderProfile(verifiedUid, req.user.email);
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
  }
  req.responder = profile;
  next();
}
backendRouter.get("/responder/requests", requireFirebaseAuth, requireResponderOrAdmin, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { data: requests, error: reqErr } = await supabaseAdmin.from("help_requests").select("*").order("created_at", { ascending: false }).limit(50);
    if (reqErr) {
      return res.status(500).json({ error: reqErr.message });
    }
    const { data: assignments } = await supabaseAdmin.from("rescue_assignments").select("*").in("help_request_id", (requests || []).map((r) => r.id));
    const assignmentsMap = /* @__PURE__ */ new Map();
    (assignments || []).forEach((a) => {
      if (!assignmentsMap.has(a.help_request_id) || ["ACCEPTED", "ARRIVED", "RESOLVED"].includes(a.status)) {
        assignmentsMap.set(a.help_request_id, a);
      }
    });
    const enriched = (requests || []).map((r) => {
      const assignment = assignmentsMap.get(r.id);
      return {
        ...r,
        status: assignment ? assignment.status : "PENDING",
        assignedResponderUid: assignment ? assignment.responder_uid : null,
        isMyAssignment: assignment?.responder_uid === verifiedUid
      };
    });
    return res.json({ success: true, requests: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/emergency/:id/accept", requireFirebaseAuth, requireResponderOrAdmin, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const requestId = req.params.id;
    const result = await acceptRescueRequest(requestId, verifiedUid);
    if (result.conflict) {
      return res.status(409).json({ error: result.error || "This rescue request has already been accepted by another responder." });
    }
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to accept rescue request." });
    }
    return res.status(200).json({
      success: true,
      status: "ACCEPTED",
      assignmentId: result.assignment?.id,
      message: "Rescue request accepted successfully."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/emergency/:id/arrived", requireFirebaseAuth, requireResponderOrAdmin, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const requestId = req.params.id;
    const result = await markResponderArrived(requestId, verifiedUid);
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to update status to arrived." });
    }
    return res.status(200).json({
      success: true,
      status: "ARRIVED",
      message: "Status updated to arrived."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/emergency/:id/resolve", requireFirebaseAuth, requireResponderOrAdmin, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const requestId = req.params.id;
    const isAdmin = req.responder?.role === "admin";
    const result = await resolveRescueRequest(requestId, verifiedUid, isAdmin);
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to resolve rescue request." });
    }
    return res.status(200).json({
      success: true,
      status: "RESOLVED",
      message: "Rescue request marked resolved."
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/users/me/role", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const profile = await getResponderProfile(verifiedUid);
    return res.json({
      success: true,
      role: profile?.role || "user",
      isActive: profile?.is_active ?? false,
      profile: profile || null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/notifications/register-device", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const { pushToken, token, platform, deviceType } = req.body;
    const tokenToRegister = (pushToken || token || "").trim();
    if (!tokenToRegister) {
      return res.status(400).json({ error: "Valid push notification token is required." });
    }
    const profile = await getResponderProfile(verifiedUid, req.user.email);
    if (!profile || profile.role !== "responder" && profile.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Only verified emergency responders or admins may register responder notification devices." });
    }
    const result = await registerResponderDevice(verifiedUid, {
      pushToken: tokenToRegister,
      platform: platform || "web",
      deviceType: deviceType || "web"
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Failed to register device." });
    }
    return res.json({ success: true, message: "Device token registered successfully." });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/notifications/status", requireFirebaseAuth, async (req, res) => {
  try {
    const verifiedUid = req.user.uid;
    const profile = await getResponderProfile(verifiedUid, req.user.email);
    const { data: userDevices } = await supabaseAdmin.from("responder_devices").select("id, push_token, platform, device_type, is_active, last_seen_at, updated_at").eq("firebase_uid", verifiedUid).order("updated_at", { ascending: false });
    const serverStatus = await getPushProviderStatus();
    return res.json({
      success: true,
      role: profile?.role || "user",
      isAuthorizedResponder: profile ? profile.role === "responder" || profile.role === "admin" : false,
      registeredDevices: userDevices || [],
      serverPushStatus: serverStatus
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/admin/responders", requireFirebaseAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("responder_profiles").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, responders: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.post("/admin/responders/role", requireFirebaseAuth, requireAdmin, async (req, res) => {
  try {
    const { targetUid, name, email, phone, role, isActive } = req.body;
    if (!targetUid || !role) {
      return res.status(400).json({ error: "targetUid and role are required." });
    }
    if (!["user", "responder", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be user, responder, or admin." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { data, error } = await supabaseAdmin.from("responder_profiles").upsert(
      {
        firebase_uid: targetUid,
        name: name || "Responder User",
        email: email || "",
        phone: phone || null,
        role,
        is_active: isActive !== void 0 ? !!isActive : true,
        updated_at: now
      },
      { onConflict: "firebase_uid" }
    ).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, responder: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/admin/audit-logs", requireFirebaseAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("rescue_audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, auditLogs: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
backendRouter.get("/admin/notification-status", requireFirebaseAuth, requireAdmin, async (_req, res) => {
  try {
    const status = await getPushProviderStatus();
    return res.json({ success: true, ...status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// src/server/aiChatService.ts
var CHATBOT_SYSTEM_INSTRUCTION = `You are Pawsy, the expert AI Animal Care, Rescue & Community Assistant for Feeder ("Where animal people connect").

CRITICAL CONVERSATIONAL & MULTILINGUAL RULES:
1. NEVER OUTPUT GENERIC CAPABILITY ESSAYS:
   - NEVER dump a list of features or capabilities (e.g. "Emergency First Aid, Safe Feeding, Kitten & Puppy Care, Local Veterinary Care, Global Multilingual Support").
   - Do NOT introduce yourself with a long list of features.
2. SIMPLE GREETINGS REQUIRE SHORT SIMPLE RESPONSES:
   - When the user sends a greeting ("hi", "hello", "hi namba", "vanakkam", "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD", "hey", "namaste", "hola", etc.):
     Respond with ONLY a 1-2 sentence warm friendly greeting matching their exact language and style.
     Examples:
     \u2022 "hi namba" -> "Hi namba! \u{1F43E} Sollu, enna help venum?"
     \u2022 "hello" -> "Hello! \u{1F43E} How can I help you and your animal today?"
     \u2022 "vanakkam" -> "Vanakkam! \u{1F43E} Enna help venum?"
     \u2022 "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD" -> "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD! \u{1F43E} \u0B8E\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0B89\u0BA4\u0BB5\u0BB2\u0BBE\u0BAE\u0BCD?"
     \u2022 "how are you" -> "I'm doing well! \u{1F43E} How can I help you and your pets today?"
     \u2022 "enna pannura" -> "Nalla irukken namba! \u{1F43E} Sollu, unga animal friend-ku enna help venum?"
3. DYNAMIC LANGUAGE & STYLE MATCHING:
   - Understand HOW the user communicates.
   - ALWAYS respond in the SAME language and writing style:
     \u2022 Natural English for English.
     \u2022 Natural Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD) for Tamil script.
     \u2022 Natural casual Tanglish for Tamil written in Latin letters (e.g. "hi namba", "dog ku fever iruku", "food kudukalama").
     \u2022 Natural Hindi (\u0939\u093F\u0902\u0926\u0940) for Hindi script.
     \u2022 Natural Hinglish for Hindi in Latin letters.
     \u2022 Natural Malayalam (\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02) for Malayalam script.
     \u2022 Natural Spanish, Arabic, French, German for their respective languages.
     \u2022 For mixed language (e.g. "\u0B8E\u0BA9\u0BCD puppy is not eating"), respond in the same comfortable blend.
4. CONVERSATION CONTEXT & MEMORY:
   - Retain multi-turn context.
   - If user previously mentioned a vomiting dog, and then says "since morning" followed by "food kudukalama?", understand they are asking whether to feed the same vomiting dog.
5. PROPORTIONAL RESPONSE LENGTH:
   - Short greeting -> 1-2 short friendly sentences.
   - Short question -> direct, clear answer.
   - Genuine medical / health question -> structured, helpful, safe bullet points.
   - Critical emergency -> immediate urgent life-saving steps FIRST.
6. VETERINARY SAFETY FIRST:
   - NEVER prescribe or recommend human painkillers (Paracetamol, Dolo, Tylenol, Ibuprofen, Aspirin) \u2014 they cause lethal organ failure in dogs and cats.
   - Safe foods: Plain boiled boneless chicken breast, plain white rice, boiled pumpkin.
   - Strictly toxic foods: Cooked bones, chocolate, grapes/raisins, onions, garlic, xylitol, caffeine.
7. LOCATION AWARENESS:
   - Reference the user's actual location or prompt them to check Feeder's "Nearby Map" tab. NEVER assume India or Chennai. Never fabricate live phone numbers or clinic names.`;
function detectLanguage(text) {
  const trimmed = text.trim();
  if (/[\u0D00-\u0D7F]/.test(trimmed)) {
    return "ml";
  }
  if (/[\u0B80-\u0BFF]/.test(trimmed)) {
    return "ta";
  }
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return "hi";
  }
  if (/[\u0C00-\u0C7F]/.test(trimmed)) {
    return "te";
  }
  if (/[\u0C80-\u0CFF]/.test(trimmed)) {
    return "kn";
  }
  if (/[\u0980-\u09FF]/.test(trimmed)) {
    return "bn";
  }
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return "ar";
  }
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(trimmed)) {
    return "ja";
  }
  if (/[\u4E00-\u9FFF]/.test(trimmed)) {
    return "zh";
  }
  const lower = trimmed.toLowerCase();
  const tanglishPatterns = [
    /\b(namba|nanba|nanban|nanbargal|machan|machi|thala|thalaiva|bro)\b/,
    /\b(dog-ku|dogku|dog ku|naai|nayi|cat-ku|catku|cat ku|poona|poonai|kutty|kutti)\b/,
    /\b(enna|edhavadhu|ethavathu|pannura|pannra|panrathu|panradhu|pannalam|pannanum|panren)\b/,
    /\b(sapdala|saapala|sapda|saapada|saapdave|saapidave|saapadu|sapadu|thann|thanni)\b/,
    /\b(kudukalama|kudukalam|kuduka|kuduthu|kudukanuma|iruku|irukku|irukken|irukkinga)\b/,
    /\b(romba|udambu|kaachal|vaanthi|vanthi|adi|patturuku|patruku|ratham|valikuthu|valikithu|valikidhu)\b/,
    /\b(kitta|kondu|poganuma|pakkathula|inga|enga|anga|unga|ungala|sollu|solra|solunga|epdi|eppadi|vanakkam)\b/
  ];
  if (tanglishPatterns.some((pat) => pat.test(lower))) {
    return "tanglish";
  }
  const hinglishPatterns = [
    /\b(kutta|kutte|kutti|billi|pilla|mera|meri|mere)\b/,
    /\b(khana|nahi|kha|raha|rahi|rahe|kya|karu|karun|kare|karein|bimar|bimari)\b/,
    /\b(bahut|pani|dard|chot|khoon|ulti|dast|bukhar|dawa|kaha|hai|bhai|kaise|ho|theek|madad|de|sakte)\b/
  ];
  if (hinglishPatterns.some((pat) => pat.test(lower))) {
    return "hinglish";
  }
  const spanishPatterns = [
    /¿|\b(perro|perros|gato|gatos|comer|comida|comiendo|veterinario|enfermo|enferma|vomitando|sangre|ayuda|debo|hacer|que puedo darle|mi perro|mi gato|cachorro|desde ayer|hola)\b/
  ];
  if (spanishPatterns.some((pat) => pat.test(lower))) {
    return "es";
  }
  const frenchPatterns = [
    /\b(chien|chiens|chat|chats|manger|nourriture|vétérinaire|malade|vomit|blessé|que faire|mon chien|mon chat|bonjour|salut)\b/
  ];
  if (frenchPatterns.some((pat) => pat.test(lower))) {
    return "fr";
  }
  const germanPatterns = [
    /\b(hund|hunde|katze|katzen|fressen|tierarzt|krank|verletzt|futter|mein hund|meine katze|hallo)\b/
  ];
  if (germanPatterns.some((pat) => pat.test(lower))) {
    return "de";
  }
  const portuguesePatterns = [
    /\b(cachorro|cão|gato|comer|veterinário|doente|vomitando|meu cachorro|meu cão|ração|olá)\b/
  ];
  if (portuguesePatterns.some((pat) => pat.test(lower))) {
    return "pt";
  }
  const italianPatterns = [
    /\b(cane|cani|gatto|gatti|mangia|veterinario|malato|ferito|il mio cane|il mio gatto|ciao)\b/
  ];
  if (italianPatterns.some((pat) => pat.test(lower))) {
    return "it";
  }
  return "en";
}
function analyzeUserCommunication(message, history = [], context) {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const lang = detectLanguage(trimmed);
  const hasTamilScript = /[\u0B80-\u0BFF]/.test(trimmed);
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  const hasEnglishWords = /\b(puppy|dog|cat|kitten|food|eating|vomiting|fever|sick|curd|chicken|vet)\b/.test(lower);
  const isMixedLanguage = hasTamilScript && hasEnglishWords || hasDevanagari && hasEnglishWords || lang === "tanglish" || lang === "hinglish";
  const isTransliterated = lang === "tanglish" || lang === "hinglish";
  const isShortQuery = words.length <= 3 && !trimmed.includes("?") && trimmed.length <= 22;
  const isCasual = !/[.!?]$/.test(trimmed) || /\b(gonna|wanna|wat|plz|pls|bro|yaar|enna|maari|namba|machan)\b/.test(lower);
  const hasTypo = /\b(vometing|vomitng|vomitting|eatingg|hospitl|feverr|doctot|peero)\b/.test(lower);
  const safeHistory = Array.isArray(history) ? history : [];
  const historyText = safeHistory.map((h) => (h?.text || h?.content || "").toLowerCase()).join(" ");
  let animal = "unknown";
  if (lower.includes("puppy") || lower.includes("\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF \u0BA8\u0BBE\u0BAF\u0BCD") || lower.includes("pilla") || lower.includes("cachorro")) {
    animal = "puppy";
  } else if (lower.includes("dog") || lower.includes("\u0BA8\u0BBE\u0BAF\u0BCD") || lower.includes("kutta") || lower.includes("kutte") || lower.includes("\u0D28\u0D3E\u0D2F") || lower.includes("perro") || lower.includes("\u0643\u0644\u0628")) {
    animal = "dog";
  } else if (lower.includes("kitten") || lower.includes("\u0BAA\u0BC2\u0BA9\u0BC8\u0B95\u0BCD\u0B95\u0BC1\u0B9F\u0BCD\u0B9F\u0BBF")) {
    animal = "kitten";
  } else if (lower.includes("cat") || lower.includes("\u0BAA\u0BC2\u0BA9\u0BC8") || lower.includes("billi") || lower.includes("gato") || lower.includes("\u0642\u0637")) {
    animal = "cat";
  } else if (lower.includes("bird") || lower.includes("\u0BAA\u0BB1\u0BB5\u0BC8") || lower.includes("chidiya")) {
    animal = "bird";
  } else if (lower.includes("street") || lower.includes("stray") || lower.includes("\u0BA4\u0BC6\u0BB0\u0BC1")) {
    animal = "community_animal";
  } else if (historyText.includes("puppy")) {
    animal = "puppy";
  } else if (historyText.includes("dog") || historyText.includes("kutta") || historyText.includes("perro") || historyText.includes("\u0BA8\u0BBE\u0BAF\u0BCD")) {
    animal = "dog";
  } else if (historyText.includes("cat") || historyText.includes("kitten") || historyText.includes("\u0BAA\u0BC2\u0BA9\u0BC8")) {
    animal = "cat";
  }
  let duration;
  if (lower.includes("since morning") || lower.includes("from morning") || lower.includes("subah se") || lower.includes("kaalaila irunthu") || lower.includes("desde la ma\xF1ana") || lower.includes("\u0D30\u0D3E\u0D35\u0D3F\u0D32\u0D46 \u0D2E\u0D41\u0D24\u0D7D")) {
    duration = "since morning";
  } else if (lower.includes("yesterday") || lower.includes("kal se") || lower.includes("nethu") || lower.includes("\u0BA8\u0BC7\u0BB1\u0BCD\u0BB1\u0BC1") || lower.includes("desde ayer") || lower.includes("\u0D07\u0D28\u0D4D\u0D28\u0D32\u0D46")) {
    duration = "yesterday";
  } else if (lower.includes("2 days") || lower.includes("two days") || lower.includes("rendu naal") || lower.includes("\u0926\u094B \u0926\u093F\u0928")) {
    duration = "2 days";
  }
  const wasVomitingDiscussed = historyText.includes("vomit") || historyText.includes("ulti") || historyText.includes("vanthi") || historyText.includes("vomita");
  const wasNotEatingDiscussed = historyText.includes("not eating") || historyText.includes("sapdala") || historyText.includes("nahi khaya") || historyText.includes("no quiere comer") || historyText.includes("\u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02 \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D3F\u0D32\u0D4D\u0D32");
  const greetingTokens = [
    "hi",
    "hello",
    "hey",
    "heya",
    "hai",
    "vanakkam",
    "\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD",
    "namaste",
    "\u0928\u092E\u0938\u094D\u0924\u0947",
    "namaskar",
    "namaskaram",
    "\u0D28\u0D2E\u0D38\u0D4D\u0D15\u0D3E\u0D30\u0D02",
    "hola",
    "bonjour",
    "salut",
    "hallo",
    "ciao",
    "marhaba",
    "\u0645\u0631\u062D\u0628\u0627",
    "salam"
  ];
  const isGreetingWord = greetingTokens.some((tok) => lower === tok || lower.startsWith(tok + " ") || lower.split(/\s+/).includes(tok));
  const isGreetingQuery = isGreetingWord && !lower.includes("fever") && !lower.includes("kaachal") && !lower.includes("vomit") && !lower.includes("vanthi") && !lower.includes("sick") && !lower.includes("bleed") && !lower.includes("ratham") && !lower.includes("hit by") && !lower.includes("accident") && !lower.includes("vet") && !lower.includes("clinic") && !lower.includes("hospital");
  const isCasualQuery = lower.includes("how are you") || lower.includes("how r u") || lower.includes("enna pannura") || lower.includes("enna pandra") || lower.includes("enna panra") || lower.includes("kya kar rahe") || lower.includes("kya chal raha") || lower.includes("kya haal") || lower === "super" || lower === "awesome" || lower === "nice" || lower === "cool" || lower === "thanks" || lower === "thank you" || lower === "nandri" || lower === "shukriya";
  let intent = "general";
  let urgency = "low";
  if (lower.includes("urgent") || lower.includes("emergency") || lower.includes("\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA4\u0BCD\u0BA4\u0BC1\u0B99\u0BCD\u0B95") || lower.includes("bachao") || lower.includes("rescue") || lower.includes("hit by") || lower.includes("accident") || lower.includes("bleeding") || lower.includes("ratham") || lower.includes("\u0BB0\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD") || lower.includes("khoon") || lower.includes("\u0916\u0942\u0928") || lower.includes("sangr") || lower.includes("fracture") || lower.includes("trauma") || lower.includes("unconscious") || lower.includes("seizure") || lower.includes("poison")) {
    intent = "trauma_emergency";
    urgency = "high";
  } else if (duration && (wasVomitingDiscussed || wasNotEatingDiscussed || words.length <= 4)) {
    intent = "follow_up_duration";
    urgency = "medium";
  } else if ((lower.includes("can i give") || lower.includes("kudukalama") || lower.includes("de sakte") || lower.includes("kudukkalaama") || lower.includes("sapadu kudukalama")) && (lower.includes("food") || lower.includes("chicken") || lower.includes("rice") || lower.includes("curd") || lower.includes("saapadu") || lower.includes("khana")) && wasVomitingDiscussed) {
    intent = "follow_up_feeding";
    urgency = "medium";
  } else if (lower.includes("vomit") || lower.includes("vometing") || lower.includes("vomitng") || lower.includes("vomitting") || lower.includes("ulti") || lower.includes("vaanthi") || lower.includes("vanthi") || lower.includes("\u0D1B\u0D7C\u0D26\u0D4D\u0D26\u0D3F")) {
    intent = "vomiting";
    urgency = "medium";
  } else if (lower.includes("not eating") || lower.includes("not eatingg") || lower.includes("refusing food") || lower.includes("won't eat") || lower.includes("wont eat") || lower.includes("\u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F") || lower.includes("sapdala") || lower.includes("saapala") || lower.includes("food") && lower.includes("sapdala") || lower.includes("\u0916\u093E\u0928\u093E") && (lower.includes("\u0928\u0939\u0940\u0902") || lower.includes("\u0928 \u0916\u093E\u092F\u093E")) || lower.includes("\u0928\u0939\u0940\u0902 \u0916\u093E\u092F\u093E") || lower.includes("\u0928\u0939\u0940\u0902 \u0916\u093E \u0930\u0939\u093E") || lower.includes("khana nahi") || lower.includes("nahi khaya") || lower.includes("nahi kha raha") || lower.includes("no quiere comer") || lower.includes("no come") || lower.includes("\u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02 \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D3F\u0D32\u0D4D\u0D32") || lower.includes("\u0644\u0627 \u064A\u0623\u0643\u0644")) {
    intent = "inappetence";
    urgency = "medium";
  } else if (lower.includes("fever") || lower.includes("feverr") || lower.includes("kaachal") || lower.includes("\u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD") || lower.includes("bukhar") || lower.includes("\u092C\u0941\u0916\u093E\u0930") || lower.includes("fiebre") || lower.includes("\u0D2A\u0D28\u0D3F") || lower.includes("udambu sooda") || lower.includes("body heat")) {
    intent = "fever";
    urgency = "medium";
  } else if (lower.includes("nearby vet") || lower.includes("vet near") || lower.includes("nearest vet") || lower.includes("find clinic") || lower.includes("clinic near") || lower.includes("hospital near") || lower.includes("animal hospital") || lower.includes("vet clinic") || lower.includes("vet hospital") || lower.includes("vet hospitl") || lower.includes("emergency vet") || lower.includes("pakkathula vet") || lower.includes("inga pakkathula") || lower.includes("vet kitta kondu poganuma") || lower.includes("vet kitta") || lower.includes("vet kaha") || lower.includes("closest vet") || lower.includes("veterinario")) {
    intent = "location_vet";
    urgency = "low";
  } else if (lower.includes("food") || lower.includes("feed") || lower.includes("chicken") || lower.includes("curd") || lower.includes("saapadu") || lower.includes("khana") || lower.includes("\u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02")) {
    intent = "feeding_inquiry";
    urgency = "low";
  } else if (isGreetingQuery) {
    intent = "greeting";
    urgency = "low";
  } else if (isCasualQuery) {
    intent = "casual";
    urgency = "low";
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
    hasTypo
  };
}
function generateContextualDynamicResponse(analysis, message, history = [], context) {
  const { primaryLanguage: lang, intent, animal, duration, isShortQuery, isMixedLanguage } = analysis;
  const userLoc = context?.location || "your area";
  const lower = message.trim().toLowerCase();
  if (intent === "greeting") {
    if (lang === "tanglish") {
      const greetName = lower.includes("nanba") ? "nanba" : "namba";
      return {
        reply: `Hi ${greetName}! \u{1F43E} Sollu, unga animal friend-ku enna help venum?`,
        suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
        actions: [],
        detectedLanguage: "tanglish"
      };
    }
    if (lang === "ta") {
      return {
        reply: `\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD! \u{1F43E} \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF \u0B89\u0BA4\u0BB5\u0BB2\u0BBE\u0BAE\u0BCD? \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BAA\u0BCD \u0BAA\u0BBF\u0BB0\u0BBE\u0BA3\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9 \u0B89\u0BA4\u0BB5\u0BBF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD?`,
        suggestions: ["\u{1F43E} \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BAA\u0BCD \u0BAA\u0BBF\u0BB0\u0BBE\u0BA3\u0BBF \u0BA8\u0BB2\u0BAE\u0BCD", "\u{1F957} \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BB3\u0BCD", "\u{1FA7A} \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BCD"],
        actions: [],
        detectedLanguage: "ta"
      };
    }
    if (lang === "hi" || lang === "hinglish") {
      return {
        reply: lang === "hi" ? `\u0928\u092E\u0938\u094D\u0924\u0947! \u{1F43E} \u0915\u0948\u0938\u0947 \u092E\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0942\u0901 \u0906\u092A\u0915\u0947 \u092A\u094D\u092F\u093E\u0930\u0947 \u0926\u094B\u0938\u094D\u0924 \u0915\u0947 \u0932\u093F\u090F?` : `Hello! \u{1F43E} Boliye, aapke pet ke liye kya help chahiye?`,
        suggestions: ["\u{1F43E} \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0938\u0932\u093E\u0939", "\u{1F957} \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0906\u0939\u093E\u0930", "\u{1FA7A} \u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932"],
        actions: [],
        detectedLanguage: lang
      };
    }
    if (lang === "ml") {
      return {
        reply: `\u0D28\u0D2E\u0D38\u0D4D\u0D15\u0D3E\u0D30\u0D02! \u{1F43E} \u0D0E\u0D28\u0D3F\u0D15\u0D4D\u0D15\u0D4D \u0D0E\u0D19\u0D4D\u0D19\u0D28\u0D46 \u0D38\u0D39\u0D3E\u0D2F\u0D3F\u0D15\u0D4D\u0D15\u0D3E\u0D28\u0D3E\u0D15\u0D41\u0D02? \u0D28\u0D3F\u0D19\u0D4D\u0D19\u0D33\u0D41\u0D1F\u0D46 \u0D35\u0D33\u0D7C\u0D24\u0D4D\u0D24\u0D41\u0D2E\u0D43\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D \u0D0E\u0D28\u0D4D\u0D24\u0D4D \u0D38\u0D39\u0D3E\u0D2F\u0D2E\u0D3E\u0D23\u0D4D \u0D35\u0D47\u0D23\u0D4D\u0D1F\u0D24\u0D4D?`,
        suggestions: ["\u{1F43E} \u0D06\u0D30\u0D4B\u0D17\u0D4D\u0D2F \u0D35\u0D3F\u0D35\u0D30\u0D19\u0D4D\u0D19\u0D7E", "\u{1F957} \u0D38\u0D41\u0D30\u0D15\u0D4D\u0D37\u0D3F\u0D24\u0D2E\u0D3E\u0D2F \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02", "\u{1FA7A} \u0D35\u0D46\u0D31\u0D4D\u0D31\u0D31\u0D3F\u0D28\u0D31\u0D3F \u0D15\u0D4D\u0D32\u0D3F\u0D28\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15\u0D7E"],
        actions: [],
        detectedLanguage: "ml"
      };
    }
    if (lang === "es") {
      return {
        reply: `\xA1Hola! \u{1F43E} \xBFC\xF3mo puedo ayudarte a ti y a tu animalito hoy?`,
        suggestions: ["\u{1F43E} Salud de mascotas", "\u{1F957} Alimentos seguros", "\u{1FA7A} Veterinarios cercanos"],
        actions: [],
        detectedLanguage: "es"
      };
    }
    if (lang === "ar") {
      return {
        reply: `\u0645\u0631\u062D\u0628\u0627\u064B! \u{1F43E} \u0643\u064A\u0641 \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0623\u0646\u062A \u0648\u062D\u064A\u0648\u0627\u0646\u0643 \u0627\u0644\u064A\u0648\u0645\u061F`,
        suggestions: ["\u{1F43E} \u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u062D\u064A\u0648\u0627\u0646\u0627\u062A", "\u{1F957} \u0623\u0637\u0639\u0645\u0629 \u0622\u0645\u0646\u0629", "\u{1FA7A} \u0639\u064A\u0627\u062F\u0627\u062A \u0628\u064A\u0637\u0631\u064A\u0629"],
        actions: [],
        detectedLanguage: "ar"
      };
    }
    if (lang === "fr") {
      return {
        reply: `Bonjour! \u{1F43E} Comment puis-je vous aider aujourd'hui pour votre animal?`,
        suggestions: ["\u{1F43E} Sant\xE9 animale", "\u{1F957} Aliments s\xFBrs", "\u{1FA7A} V\xE9t\xE9rinaires proches"],
        actions: [],
        detectedLanguage: "fr"
      };
    }
    if (lang === "de") {
      return {
        reply: `Hallo! \u{1F43E} Wie kann ich dir und deinem Tier heute helfen?`,
        suggestions: ["\u{1F43E} Tiergesundheit", "\u{1F957} Sicheres Futter", "\u{1FA7A} Tier\xE4rzte in der N\xE4he"],
        actions: [],
        detectedLanguage: "de"
      };
    }
    return {
      reply: `Hello! \u{1F43E} How can I help you and your animal today?`,
      suggestions: ["\u{1F43E} Ask pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
      actions: [],
      detectedLanguage: "en"
    };
  }
  if (intent === "casual") {
    const isThanks = lower.includes("thank") || lower.includes("nandri") || lower.includes("shukriya");
    const isSuper = lower.includes("super") || lower.includes("awesome") || lower.includes("nice") || lower.includes("cool");
    if (lang === "tanglish") {
      if (isThanks) {
        return {
          reply: `Romba nandri namba! \u{1F43E} Take good care of your pets. Any time help venumna kelunga!`,
          suggestions: ["\u{1F43E} Ask another question", "\u{1F957} Safe food guide", "\u{1FA7A} Nearby Vets"],
          actions: [],
          detectedLanguage: "tanglish"
        };
      }
      if (isSuper) {
        return {
          reply: `\u{1F60A} Super namba! Sollu, Pawsy enna help pannattum?`,
          suggestions: ["\u{1F43E} Health query", "\u{1F957} Food tips", "\u{1FA7A} Nearby Vets"],
          actions: [],
          detectedLanguage: "tanglish"
        };
      }
      return {
        reply: `Nalla irukken namba! \u{1F43E} Animal care, feeding tips, or veterinary guidance edhavadhu venuma nu sollu, help panren!`,
        suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
        actions: [],
        detectedLanguage: "tanglish"
      };
    }
    if (isThanks) {
      return {
        reply: `You're very welcome! \u{1F43E} Always happy to help you and your animal companions.`,
        suggestions: ["\u{1F43E} Ask another question", "\u{1F957} Safe food guide", "\u{1FA7A} View Nearby Map"],
        actions: [],
        detectedLanguage: "en"
      };
    }
    if (isSuper) {
      return {
        reply: `\u{1F60A} Glad to hear that! \u{1F43E} Let me know if you need any advice on care, feeding, or rescue.`,
        suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} View Nearby Map"],
        actions: [],
        detectedLanguage: "en"
      };
    }
    return {
      reply: `I'm doing well, thank you! \u{1F43E} Ready to assist with pet health, safe nutrition, or rescue guidance. What's on your mind?`,
      suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
      actions: [],
      detectedLanguage: "en"
    };
  }
  if (intent === "trauma_emergency") {
    if (lang === "ta" || lang === "tanglish") {
      return {
        reply: `\u{1F6A8} **\u0B85\u0BB5\u0B9A\u0BB0 \u0BAE\u0BC1\u0BA4\u0BB2\u0BC1\u0BA4\u0BB5\u0BBF \u0BB5\u0BB4\u0BBF\u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD (Emergency First Aid):**

1. **\u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0B95 \u0B85\u0BA3\u0BC1\u0B95\u0BB5\u0BC1\u0BAE\u0BCD:** \u0B95\u0BBE\u0BAF\u0BAE\u0B9F\u0BC8\u0BA8\u0BCD\u0BA4 \u0BB5\u0BBF\u0BB2\u0B99\u0BCD\u0B95\u0BC1 \u0BAA\u0BAF\u0BA4\u0BCD\u0BA4\u0BBF\u0BB2\u0BC1\u0BAE\u0BCD \u0BB5\u0BB2\u0BBF\u0BAF\u0BBF\u0BB2\u0BC1\u0BAE\u0BCD \u0B95\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0B95\u0BCD\u0B95\u0BC2\u0B9F\u0BC1\u0BAE\u0BCD. \u0BAA\u0BCB\u0BB0\u0BCD\u0BB5\u0BC8\u0BAF\u0BBE\u0BB2\u0BCD \u0BAE\u0BC6\u0BA4\u0BC1\u0BB5\u0BBE\u0B95 \u0BAA\u0BCB\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BBF \u0B85\u0BA3\u0BC1\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.
2. **\u0B87\u0BB0\u0BA4\u0BCD\u0BA4\u0BAA\u0BCD\u0BAA\u0BCB\u0B95\u0BCD\u0B95\u0BC8 \u0B95\u0B9F\u0BCD\u0B9F\u0BC1\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4:** \u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BBE\u0BA9 \u0BA4\u0BC1\u0BA3\u0BBF \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BA4\u0BC1\u0BA3\u0BCD\u0B9F\u0BC1 \u0BB5\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0B95\u0BBE\u0BAF\u0BA4\u0BCD\u0BA4\u0BBF\u0BA9\u0BCD \u0BAE\u0BC0\u0BA4\u0BC1 \u0B85\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BB5\u0BC1\u0BAE\u0BCD.
3. **\u0BAE\u0BC1\u0BA4\u0BC1\u0B95\u0BC1\u0BA4\u0BCD\u0BA4\u0BA3\u0BCD\u0B9F\u0BC8 \u0BA8\u0B95\u0BB0\u0BCD\u0BA4\u0BCD\u0BA4\u0BBE\u0BA4\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BCD:** \u0BA4\u0BA3\u0BCD\u0B9F\u0BC1\u0BB5\u0B9F\u0BAE\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B8E\u0BB2\u0BC1\u0BAE\u0BCD\u0BAA\u0BC1 \u0BAE\u0BC1\u0BB1\u0BBF\u0BB5\u0BC1 \u0B9A\u0BA8\u0BCD\u0BA4\u0BC7\u0B95\u0BAE\u0BCD \u0B87\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCD, \u0BA4\u0B9F\u0BCD\u0B9F\u0BC8\u0BAF\u0BBE\u0BA9 \u0B85\u0B9F\u0BCD\u0B9F\u0BC8\u0BAA\u0BCD\u0BAA\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAA\u0BB2\u0B95\u0BC8 \u0BAE\u0BC2\u0BB2\u0BAE\u0BCD \u0BA4\u0BC2\u0B95\u0BCD\u0B95\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD.
4. **\u26A0\uFE0F \u0BAE\u0BBF\u0B95 \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8:** \u0BAE\u0BA9\u0BBF\u0BA4\u0BB0\u0BCD\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0BB5\u0BB2\u0BBF \u0BA8\u0BBF\u0BB5\u0BBE\u0BB0\u0BA3 \u0BAE\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC8\u0B95\u0BB3\u0BC8 (Paracetamol/Dolo) \u0B92\u0BB0\u0BC1\u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BCD \u0BA4\u0BB0\u0B95\u0BCD\u0B95\u0BC2\u0B9F\u0BBE\u0BA4\u0BC1 \u2014 \u0B85\u0BA4\u0BC1 \u0BAE\u0BB0\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0B89\u0BA3\u0BCD\u0B9F\u0BBE\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD.
5. **\u0B89\u0B9F\u0BA9\u0B9F\u0BBF \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5 \u0B89\u0BA4\u0BB5\u0BBF:** \u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0B85\u0BB5\u0B9A\u0BB0 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BCD\u0B95\u0BC1 \u0B89\u0B9F\u0BA9\u0B9F\u0BBF\u0BAF\u0BBE\u0B95 \u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BC1 \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BB5\u0BC1\u0BAE\u0BCD.`,
        suggestions: ["\u{1FA7A} \u0B85\u0BB5\u0B9A\u0BB0 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BB3\u0BCD", "\u{1F6A8} Feeder-\u0BB2\u0BCD \u0BAE\u0BC0\u0B9F\u0BCD\u0BAA\u0BC1 \u0B89\u0BA4\u0BB5\u0BBF \u0B95\u0BCB\u0BB0", "\u{1FA79} \u0B95\u0BBE\u0BAF\u0BA4\u0BCD\u0BA4\u0BC8 \u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BB5\u0BA4\u0BC1 \u0B8E\u0BAA\u0BCD\u0BAA\u0B9F\u0BBF?"],
        actions: [
          { type: "open_help", label: "\u0B85\u0BB5\u0B9A\u0BB0 \u0B89\u0BA4\u0BB5\u0BBF \u0B95\u0BCB\u0BB0 \u{1F6A8}" },
          { type: "open_map", label: "\u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BB3\u0BCD \u{1FA7A}" }
        ],
        detectedLanguage: lang
      };
    }
    if (lang === "es") {
      return {
        reply: `\u{1F6A8} **Primeros Auxilios de Emergencia:**

1. **Aproximaci\xF3n segura:** Un animal herido puede morder por dolor y miedo. Ac\xE9rcate lentamente cubri\xE9ndolo con una toalla o manta.
2. **Controlar hemorragias:** Aplica presi\xF3n directa y suave sobre la herida con gasas limpias o un pa\xF1o.
3. **Inmovilizaci\xF3n:** Si sospechas de fractura o golpe en la columna, transp\xF3rtalo sobre una superficie plana y r\xEDgida.
4. **\u26A0\uFE0F Advertencia estricta:** NUNCA des medicamentos para humanos (paracetamol, ibuprofeno) ya que son letales para mascotas.
5. **Atenci\xF3n m\xE9dica urgente:** Trasl\xE1dalo de inmediato a la cl\xEDnica veterinaria de urgencias m\xE1s cercana.`,
        suggestions: ["\u{1FA7A} Cl\xEDnicas de urgencias veterinarias", "\u{1F6A8} Publicar alerta de rescate", "\u{1FA79} C\xF3mo limpiar una herida"],
        actions: [
          { type: "open_help", label: "Crear Alerta de Rescate \u{1F6A8}" },
          { type: "open_map", label: "Ver Veterinarios de Urgencia \u{1FA7A}" }
        ],
        detectedLanguage: "es"
      };
    }
    return {
      reply: `\u{1F6A8} **Immediate Emergency First-Aid Protocol:**

1. **Approach Gently & Ensure Safety:** Injured animals may bite out of fear and pain. Approach calmly, speaking in a low voice, and gently drape a towel or blanket over their head and body.
2. **Control Bleeding:** Apply direct, sustained pressure over the bleeding wound using a clean towel or sterile gauze.
3. **Spine & Fracture Stabilization:** If hit by a vehicle, avoid bending the neck or back. Slide a firm cardboard sheet or folded blanket underneath as a makeshift stretcher.
4. **\u26A0\uFE0F LETHAL WARNING:** NEVER administer human painkillers (Paracetamol, Tylenol, Dolo, Ibuprofen, Aspirin) \u2014 they cause irreversible toxic liver and kidney failure.
5. **Emergency Veterinary Care:** Transport immediately to the nearest 24/7 veterinary trauma center.`,
      suggestions: ["\u{1FA7A} Find nearest 24/7 Emergency Vet", "\u{1F6A8} Broadcast urgent community rescue call", "\u{1FA79} How to bandage a wound safely"],
      actions: [
        { type: "open_help", label: "Broadcast Rescue Call \u{1F6A8}" },
        { type: "open_map", label: "View Emergency Vets \u{1FA7A}" }
      ],
      detectedLanguage: "en"
    };
  }
  if (intent === "follow_up_feeding") {
    if (lang === "tanglish") {
      return {
        reply: `Dog-ku vomiting irukkumbodhu heavy food kudukka koodadhu. Stomach-ku rest thevai.

\u{1F963} **Safe Care Protocol:**
1. **Rest Period:** At least 4 to 6 hours continuous-ah vomiting illama irukanum.
2. **Water Sips First:** First small sips of clean fresh water (1-2 spoons) kuduthu paarunga.
3. **Bland Food:** Water vomit pannalana, small amount plain boiled white rice mixed with shredded boiled chicken breast (oil, salt, masala illama) kudukalam.
4. **\u26A0\uFE0F Note:** Thirumba vomit pannina or lethargic-a irundhal, delay pannama vet kitta kootitu ponga.`,
        suggestions: ["\u{1F35A} Bland rice recipe", "\u{1F4A7} Check dehydration", "\u{1FA7A} Nearby Vet Clinics"],
        actions: [{ type: "open_map", label: "Find Nearby Vet Clinic \u{1FA7A}" }],
        detectedLanguage: "tanglish"
      };
    }
    return {
      reply: `Because he has been vomiting since this morning, do not give regular dog food, heavy kibble, or rich meats right now \u2014 that will likely trigger another vomiting episode.

\u{1F963} **Safe Care Protocol:**
1. **Rest the Stomach:** Withhold solid food until he has gone at least 4 to 6 hours without vomiting.
2. **Hydration First:** Offer small sips (1\u20132 tablespoons) of fresh water or ice cubes every 30 minutes. Make sure he can keep water down before introducing any food.
3. **Gentle Bland Meal:** Once his stomach has settled and he is keeping liquids down, offer a small portion of plain boiled white rice mixed with shredded, skinless boiled chicken breast (absolutely no salt, oil, or spices).
4. **When to see a Vet:** If he vomits water, appears lethargic, or vomits again after 12 hours, he should be examined by a veterinarian.`,
      suggestions: ["\u{1F35A} How to prepare bland rice broth", "\u{1F4A7} Check dog hydration levels", "\u{1FA7A} When to visit the vet"],
      actions: [{ type: "open_map", label: "Find Nearby Vet Clinic \u{1FA7A}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "follow_up_duration") {
    if (lang === "tanglish") {
      return {
        reply: `Puriyudhu namba. ${duration || "Kaalaila irundhe"} ipdi irukkunradhala, immediate-a indha steps follow pannunga:

1. **Hydration:** Fresh clean water konjam konjam-a kudunga. Gums moist & pink-a irukkannu check pannunga.
2. **Bland Diet:** Stomach settle aanavudan, plain boiled white rice + boiled shredded chicken (salt/masala illama) konjam kudukalam.
3. **\u26A0\uFE0F Critical Warning:** Paracetamol / Dolo human tablets kandippa kudukka koodadhu.
4. **Vet Visit:** Evening kulla improve aagalana or lethargic-a aana, kandippa vet kitta kaatunga.`,
        suggestions: ["\u{1FA7A} Local veterinary clinics", "\u{1F4A7} Signs of dehydration in pets", "\u{1F357} Bland diet instructions"],
        actions: [{ type: "open_map", label: "Explore Nearby Vets \u{1FA7A}" }],
        detectedLanguage: "tanglish"
      };
    }
    return {
      reply: `Understood. Since this has been going on ${duration || "since this morning"}, here is the immediate recommended plan:

1. **Monitor Hydration:** Offer small sips of fresh water. Check gums: they should be moist and pink, not sticky or pale.
2. **Gentle Bland Diet:** Once the stomach has settled, offer a small portion of plain boiled shredded chicken (skinless, boneless, no salt/seasoning) mixed with plain white rice.
3. **\u26A0\uFE0F Critical Warning:** NEVER administer human painkillers (Paracetamol, Tylenol, Ibuprofen, Aspirin) \u2014 they cause fatal organ failure in pets.
4. **Veterinary Attention:** If lethargy develops, vomiting continues, or your dog refuses liquids by evening, please visit a local veterinarian.`,
      suggestions: ["\u{1FA7A} Local veterinary clinics", "\u{1F4A7} Signs of dehydration in pets", "\u{1F357} Bland diet feeding instructions"],
      actions: [{ type: "open_map", label: "Explore Nearby Vets \u{1FA7A}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "fever") {
    if (lang === "tanglish") {
      return {
        reply: `Dog-ku fever irukka? \u{1F321}\uFE0F Romba carefully handle \u0BAA\u0BA3\u0BCD\u0BA3\u0BA9\u0BC1\u0BAE\u0BCD:

\u26A0\uFE0F **CRITICAL WARNING:** Paracetamol, Dolo, or human painkiller tablets **kandippa kudukka koodadhu** \u2014 dogs-ku idhu lethal liver and kidney failure undakkum!

\u{1F43E} **Safe Care Steps:**
1. **Cool & Shaded Area:** Fan keezha, cool ana idathula rest edukka vidunga.
2. **Hydration:** Clean fresh water kitta vaiyunga, force pannama sips kudikkutha nu paarunga.
3. **Cool Compress:** Room temperature water-la wet cloth vechu paw pads & belly-la gently thudaikalam (ice use pannatheenga).
4. **When to see a Vet:** 103\xB0F mela irundhal, shivering, or 24 hours-ku mela irundhal, delay pannama vet kitta kootitu ponga.`,
        suggestions: ["\u{1FA7A} View Nearby Vet Clinics", "\u{1F4A7} How to check hydration", "\u{1F321}\uFE0F Normal pet temperature"],
        actions: [{ type: "open_map", label: "View Nearby Vets \u{1FA7A}" }],
        detectedLanguage: "tanglish"
      };
    }
    if (lang === "ta") {
      return {
        reply: `\u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BCD\u0B95\u0BC1 \u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BBE? \u{1F321}\uFE0F \u0B95\u0BB5\u0BA9\u0BAE\u0BBE\u0B95 \u0B95\u0BC8\u0BAF\u0BBE\u0BB3 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD:

\u26A0\uFE0F **\u0BAE\u0BBF\u0B95 \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8:** \u0BAE\u0BA9\u0BBF\u0BA4\u0BB0\u0BCD\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC8\u0B95\u0BB3\u0BC8 (Paracetamol/Dolo) \u0B92\u0BB0\u0BC1\u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BCD \u0BA4\u0BB0\u0B95\u0BCD\u0B95\u0BC2\u0B9F\u0BBE\u0BA4\u0BC1 \u2014 \u0B85\u0BA4\u0BC1 \u0BA8\u0BBE\u0BAF\u0BCD\u0B95\u0BB3\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BA4\u0BC0\u0BB5\u0BBF\u0BB0 \u0BA8\u0B9A\u0BCD\u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BA9\u0BCD\u0BAE\u0BC8 \u0B89\u0BA3\u0BCD\u0B9F\u0BBE\u0B95\u0BCD\u0B95\u0BBF \u0BAE\u0BB0\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0BB5\u0BBF\u0BB3\u0BC8\u0BB5\u0BBF\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD!

\u{1F43E} **\u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0BB5\u0BB4\u0BBF\u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0BA4\u0BB2\u0BCD:**
1. **\u0B95\u0BC1\u0BB3\u0BBF\u0BB0\u0BCD\u0BA8\u0BCD\u0BA4 \u0B87\u0B9F\u0BAE\u0BCD:** \u0BA8\u0BC7\u0BB0\u0B9F\u0BBF \u0BB5\u0BC6\u0BAF\u0BBF\u0BB2\u0BCD \u0BAA\u0B9F\u0BBE\u0BAE\u0BB2\u0BCD \u0BAE\u0BBF\u0BA9\u0BCD\u0BB5\u0BBF\u0B9A\u0BBF\u0BB1\u0BBF \u0B95\u0BC0\u0BB4\u0BCD \u0B93\u0BAF\u0BCD\u0BB5\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.
2. **\u0BA8\u0BC0\u0BB0\u0BCD \u0B85\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0BA4\u0BB2\u0BCD:** \u0B9A\u0BC1\u0BA4\u0BCD\u0BA4\u0BAE\u0BBE\u0BA9 \u0B95\u0BC1\u0B9F\u0BBF\u0BA8\u0BC0\u0BB0\u0BCD \u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC7\u0BAF\u0BC7 \u0BB5\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.
3. **\u0B92\u0BA4\u0BCD\u0BA4\u0B9F\u0BAE\u0BCD:** \u0B9A\u0BBE\u0BA4\u0BBE\u0BB0\u0BA3 \u0BA8\u0BC0\u0BB0\u0BBF\u0BB2\u0BCD \u0BA8\u0BA9\u0BC8\u0BA4\u0BCD\u0BA4 \u0BA4\u0BC1\u0BA3\u0BBF\u0BAF\u0BBE\u0BB2\u0BCD \u0BAA\u0BBE\u0BA4\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BB5\u0BAF\u0BBF\u0BB1\u0BCD\u0BB1\u0BC1\u0BAA\u0BCD \u0BAA\u0B95\u0BC1\u0BA4\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B92\u0BA4\u0BCD\u0BA4\u0B9F\u0BAE\u0BCD \u0B95\u0BCA\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD.
4. **\u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5 \u0B89\u0BA4\u0BB5\u0BBF:** 24 \u0BAE\u0BA3\u0BBF \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BC1 \u0BAE\u0BC7\u0BB2\u0BCD \u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD \u0BA8\u0BC0\u0B9F\u0BBF\u0BA4\u0BCD\u0BA4\u0BBE\u0BB2\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B89\u0B9F\u0BB2\u0BCD \u0BA8\u0B9F\u0BC1\u0B95\u0BCD\u0B95\u0BAE\u0BCD \u0B87\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCB \u0B89\u0B9F\u0BA9\u0BC7 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BBF\u0B9F\u0BAE\u0BCD \u0B85\u0BB4\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BB5\u0BC1\u0BAE\u0BCD.`,
        suggestions: ["\u{1FA7A} \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BCD", "\u{1F4A7} \u0BA8\u0BC0\u0BB0\u0BBF\u0BB4\u0BAA\u0BCD\u0BAA\u0BC1 \u0B85\u0BB1\u0BBF\u0B95\u0BC1\u0BB1\u0BBF\u0B95\u0BB3\u0BCD", "\u{1F321}\uFE0F \u0B89\u0B9F\u0BB2\u0BCD \u0BB5\u0BC6\u0BAA\u0BCD\u0BAA\u0BA8\u0BBF\u0BB2\u0BC8"],
        actions: [{ type: "open_map", label: "\u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BC8 \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95 \u{1FA7A}" }],
        detectedLanguage: "ta"
      };
    }
    if (lang === "hi" || lang === "hinglish") {
      return {
        reply: `\u0915\u0941\u0924\u094D\u0924\u0947 \u0915\u094B \u092C\u0941\u0916\u093E\u0930 \u0939\u094B\u0928\u0947 \u092A\u0930 \u0907\u0928 \u092C\u093E\u0924\u094B\u0902 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u0927\u094D\u092F\u093E\u0928 \u0930\u0916\u0947\u0902: \u{1F321}\uFE0F

\u26A0\uFE0F **\u0938\u0916\u094D\u0924 \u091A\u0947\u0924\u093E\u0935\u0928\u0940:** \u0907\u0902\u0938\u093E\u0928\u094B\u0902 \u0915\u0940 \u092C\u0941\u0916\u093E\u0930 \u0915\u0940 \u0926\u0935\u093E\u0907\u092F\u093E\u0902 (\u091C\u0948\u0938\u0947 Paracetamol, Dolo, Crocin) \u0915\u092D\u0940 \u0928 \u0926\u0947\u0902 \u2014 \u092F\u0939 \u092A\u093E\u0932\u0924\u0942 \u091C\u093E\u0928\u0935\u0930\u094B\u0902 \u0915\u0947 \u0932\u093F\u0935\u0930 \u0914\u0930 \u0915\u093F\u0921\u0928\u0940 \u0915\u0947 \u0932\u093F\u090F \u091C\u093E\u0928\u0932\u0947\u0935\u093E \u0939\u0948!

\u{1F43E} **\u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915 \u0909\u092A\u091A\u093E\u0930:**
1. **\u0920\u0902\u0921\u0940 \u0935 \u0939\u0935\u093E\u0926\u093E\u0930 \u091C\u0917\u0939:** \u0915\u0941\u0924\u094D\u0924\u0947 \u0915\u094B \u0927\u0942\u092A \u0938\u0947 \u0926\u0942\u0930 \u092A\u0902\u0916\u0947 \u0915\u0947 \u0928\u0940\u091A\u0947 \u0906\u0930\u093E\u092E \u0915\u0930\u0928\u0947 \u0926\u0947\u0902\u0964
2. **\u092A\u093E\u0928\u0940 \u0915\u0940 \u0909\u092A\u0932\u092C\u094D\u0927\u0924\u093E:** \u0924\u093E\u091C\u093E \u0914\u0930 \u0938\u093E\u092B \u092A\u093E\u0928\u0940 \u092A\u093E\u0938 \u0930\u0916\u0947\u0902 \u0924\u093E\u0915\u093F \u0921\u093F\u0939\u093E\u0907\u0921\u094D\u0930\u0947\u0936\u0928 \u0928 \u0939\u094B\u0964
3. **\u0917\u0940\u0932\u093E \u0915\u092A\u0921\u093C\u093E:** \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092A\u093E\u0928\u0940 \u092E\u0947\u0902 \u0915\u092A\u0921\u093C\u093E \u092D\u093F\u0917\u094B\u0915\u0930 \u092A\u0902\u091C\u094B\u0902 \u0914\u0930 \u092A\u0947\u091F \u092A\u0930 \u0939\u0932\u094D\u0915\u0947 \u0938\u0947 \u092B\u0947\u0930\u0947\u0902 (\u092C\u0930\u094D\u092B \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0928 \u0915\u0930\u0947\u0902)\u0964
4. **\u0921\u0949\u0915\u094D\u091F\u0930 \u0915\u094B \u0926\u093F\u0916\u093E\u090F\u0902:** \u092F\u0926\u093F \u092C\u0941\u0916\u093E\u0930 103\xB0F \u0938\u0947 \u0905\u0927\u093F\u0915 \u0939\u094B \u092F\u093E \u0935\u0939 \u092C\u0939\u0941\u0924 \u0938\u0941\u0938\u094D\u0924 \u0939\u094B, \u0924\u094B \u0924\u0941\u0930\u0902\u0924 \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u0915 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964`,
        suggestions: ["\u{1FA7A} \u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932", "\u{1F4A7} \u092A\u093E\u0928\u0940 \u0915\u0940 \u0915\u092E\u0940 \u0915\u0947 \u0932\u0915\u094D\u0937\u0923", "\u{1F321}\uFE0F \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0924\u093E\u092A\u092E\u093E\u0928 \u091C\u093E\u0902\u091A\u0947\u0902"],
        actions: [{ type: "open_map", label: "\u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u0915 \u0926\u0947\u0916\u0947\u0902 \u{1FA7A}" }],
        detectedLanguage: lang
      };
    }
    if (isShortQuery) {
      return {
        reply: `If you suspect your ${animal === "unknown" ? "dog" : animal} has a fever, common signs include warm dry ears and nose, shivering, lethargy, red or glassy eyes, and loss of appetite.

\u{1F50D} **Clarifying Questions to Help You:**
\u2022 What specific symptoms are you noticing right now?
\u2022 How long has your dog felt warm or unwell?
\u2022 Are they still drinking water and able to stand comfortably?

\u26A0\uFE0F **Vital Safety Rule:** Never give human fever medicines (such as Paracetamol, Dolo, or Ibuprofen) \u2014 even a small dose can cause fatal toxicity in dogs. If their temperature feels high or they are shivering continuously, a veterinarian should check them promptly.`,
        suggestions: ["\u{1F321}\uFE0F How to check pet temperature", "\u{1F4A7} Safe ways to cool down a pet", "\u{1FA7A} Find nearest vet clinic"],
        actions: [{ type: "open_map", label: "Find Nearby Vet \u{1FA7A}" }],
        detectedLanguage: "en"
      };
    }
    return {
      reply: `If your ${animal === "unknown" ? "dog" : animal} has a fever, monitor them carefully:

\u26A0\uFE0F **Vital Safety Warning:** NEVER administer human fever medicines (such as Paracetamol, Tylenol, Dolo, or Ibuprofen) \u2014 even small doses cause lethal liver and kidney failure in pets.

\u{1F43E} **Immediate Safe Steps:**
1. **Cool Rest Environment:** Keep them in a cool, well-ventilated space away from direct heat.
2. **Encourage Hydration:** Keep fresh, clean water easily accessible. Offer small sips without force-feeding.
3. **Cool Water Compress:** Apply a cloth dampened with room-temperature water to their paw pads, groin, and belly (never use freezing ice).
4. **Veterinary Attention:** Normal pet temperature is 101.0\xB0F to 102.5\xB0F (38.3\xB0C to 39.2\xB0C). If temperature exceeds 103\xB0F, shivering occurs, or lethargy continues past 24 hours, take them to a veterinary clinic promptly.`,
      suggestions: ["\u{1FA7A} Find nearest Vet Clinic", "\u{1F321}\uFE0F Normal pet temperature guide", "\u{1F4A7} Signs of dehydration in pets"],
      actions: [{ type: "open_map", label: "Find Nearby Vet \u{1FA7A}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "vomiting") {
    if (lang === "hi" || lang === "hinglish") {
      return {
        reply: `\u092F\u0926\u093F \u0906\u092A\u0915\u0947 \u0915\u0941\u0924\u094D\u0924\u0947 \u0915\u094B \u0909\u0932\u094D\u091F\u0940 (vomiting) \u0939\u094B \u0930\u0939\u0940 \u0939\u0948, \u0924\u094B \u0918\u092C\u0930\u093E\u090F\u0902 \u0928\u0939\u0940\u0902\u0964 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u0947 \u0907\u0928 \u092C\u093E\u0924\u094B\u0902 \u0915\u093E \u0927\u094D\u092F\u093E\u0928 \u0930\u0916\u0947\u0902:

\u{1F963} **\u0924\u0941\u0930\u0902\u0924 \u0915\u094D\u092F\u093E \u0915\u0930\u0947\u0902:**
1. **\u092A\u0947\u091F \u0915\u094B \u0906\u0930\u093E\u092E \u0926\u0947\u0902:** \u0909\u0932\u094D\u091F\u0940 \u0915\u0947 \u0924\u0941\u0930\u0902\u0924 \u092C\u093E\u0926 \u092D\u093E\u0930\u0940 \u092F\u093E \u0920\u094B\u0938 \u0916\u093E\u0928\u093E \u0928 \u0926\u0947\u0902 \u2014 \u0907\u0938\u0938\u0947 \u0926\u094B\u092C\u093E\u0930\u093E \u0909\u0932\u094D\u091F\u0940 \u0939\u094B \u0938\u0915\u0924\u0940 \u0939\u0948\u0964 \u0915\u092E \u0938\u0947 \u0915\u092E 3-4 \u0918\u0902\u091F\u0947 \u0916\u093E\u0928\u093E \u0930\u094B\u0915\u0947\u0902\u0964
2. **\u092A\u093E\u0928\u0940 \u0915\u0940 \u0925\u094B\u0921\u093C\u0940 \u092E\u093E\u0924\u094D\u0930\u093E:** \u090F\u0915 \u0938\u093E\u0925 \u092C\u0939\u0941\u0924 \u0938\u093E\u0930\u093E \u092A\u093E\u0928\u0940 \u0928 \u0926\u0947\u0902\u0964 \u0939\u0930 \u0906\u0927\u0947 \u0918\u0902\u091F\u0947 \u092E\u0947\u0902 2-3 \u091A\u092E\u094D\u092E\u091A \u0924\u093E\u091C\u093E \u092A\u093E\u0928\u0940 \u0926\u0947\u0902 \u0924\u093E\u0915\u093F \u0921\u093F\u0939\u093E\u0907\u0921\u094D\u0930\u0947\u0936\u0928 \u0928 \u0939\u094B\u0964
3. **\u0939\u0932\u094D\u0915\u093E \u0906\u0939\u093E\u0930:** \u091C\u092C \u0909\u0932\u094D\u091F\u0940 \u0930\u0941\u0915 \u091C\u093E\u090F, \u0924\u094B \u0938\u093E\u0926\u093E \u0909\u092C\u0932\u093E \u0939\u0941\u0906 \u0938\u092B\u0947\u0926 \u091A\u093E\u0935\u0932 \u0914\u0930 \u092C\u093F\u0928\u093E \u092E\u0938\u093E\u0932\u0947 \u0915\u093E \u0909\u092C\u0932\u093E \u091A\u093F\u0915\u0928 \u0926\u0947\u0902\u0964
4. **\u26A0\uFE0F \u0938\u0916\u094D\u0924 \u091A\u0947\u0924\u093E\u0935\u0928\u0940:** \u0907\u0902\u0938\u093E\u0928\u094B\u0902 \u0915\u0940 \u0926\u0935\u093E\u0907\u092F\u093E\u0902 (\u091C\u0948\u0938\u0947 Paracetamol/Dolo) \u0915\u092D\u0940 \u0928 \u0926\u0947\u0902\u0964

\u092F\u0926\u093F \u0909\u0932\u094D\u091F\u0940 \u092C\u093E\u0930-\u092C\u093E\u0930 \u0939\u094B \u0930\u0939\u0940 \u0939\u094B \u092F\u093E \u0915\u0941\u0924\u094D\u0924\u093E \u092C\u0939\u0941\u0924 \u0938\u0941\u0938\u094D\u0924 \u0939\u094B, \u0924\u094B \u0924\u0941\u0930\u0902\u0924 \u0921\u0949\u0915\u094D\u091F\u0930 \u0915\u094B \u0926\u093F\u0916\u093E\u090F\u0902\u0964`,
        suggestions: ["\u{1FA7A} \u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932", "\u{1F4A7} \u092A\u093E\u0928\u0940 \u0915\u0940 \u0915\u092E\u0940 \u0938\u0947 \u0915\u0948\u0938\u0947 \u092C\u091A\u093E\u090F\u0902?", "\u{1F357} \u0939\u0932\u094D\u0915\u093E \u0906\u0939\u093E\u0930 \u0915\u0948\u0938\u0947 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902?"],
        actions: [{ type: "open_map", label: "\u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u0915 \u0926\u0947\u0916\u0947\u0902 \u{1FA7A}" }],
        detectedLanguage: "hi"
      };
    }
    return {
      reply: `If your ${animal === "unknown" ? "dog" : animal} is vomiting, the first priority is allowing the gastrointestinal tract to rest:

\u{1F963} **Immediate Care Steps:**
1. **Withhold Solid Food:** Pause regular food for 3 to 6 hours. Feeding immediately after an upset stomach can trigger recurrent spasms.
2. **Prevent Dehydration:** Offer small sips of clean water (1\u20132 tablespoons every 30 minutes) rather than letting them gulp a large bowl.
3. **Observe Symptoms:** Notice whether there is bile (yellow froth), blood, foreign objects, or diarrhea.
4. **Bland Reintroduction:** Once vomiting has ceased for several hours, offer a small spoonful of plain boiled white rice or plain boiled skinless chicken breast.
5. **\u26A0\uFE0F Strict Warning:** Never give human nausea or pain medications. If vomiting continues past 12\u201324 hours or if lethargy is severe, please visit a veterinarian.`,
      suggestions: ["\u{1FA7A} Find nearest Vet Clinic", "\u{1F4A7} How to spot dehydration", "\u{1F35A} Bland diet preparation guide"],
      actions: [{ type: "open_map", label: "Explore Nearby Vets \u{1FA7A}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "inappetence") {
    if (lang === "ml") {
      return {
        reply: `\u0D28\u0D3F\u0D19\u0D4D\u0D19\u0D33\u0D41\u0D1F\u0D46 \u0D28\u0D3E\u0D2F \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02 \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D3F\u0D32\u0D4D\u0D32\u0D46\u0D19\u0D4D\u0D15\u0D3F\u0D7D \u0D09\u0D1F\u0D7B \u0D28\u0D3F\u0D7C\u0D2C\u0D28\u0D4D\u0D27\u0D3F\u0D1A\u0D4D\u0D1A\u0D4D \u0D15\u0D34\u0D3F\u0D2A\u0D4D\u0D2A\u0D3F\u0D15\u0D4D\u0D15\u0D30\u0D41\u0D24\u0D4D. \u0D2A\u0D28\u0D3F\u0D2F\u0D4B \u0D15\u0D1F\u0D41\u0D24\u0D4D\u0D24 \u0D15\u0D4D\u0D37\u0D40\u0D23\u0D2E\u0D4B \u0D09\u0D23\u0D4D\u0D1F\u0D4B\u0D2F\u0D46\u0D28\u0D4D\u0D28\u0D4D \u0D36\u0D4D\u0D30\u0D26\u0D4D\u0D27\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15.

\u{1F50D} **\u0D2A\u0D4D\u0D30\u0D27\u0D3E\u0D28\u0D2E\u0D3E\u0D2F\u0D3F \u0D36\u0D4D\u0D30\u0D26\u0D4D\u0D27\u0D3F\u0D15\u0D4D\u0D15\u0D47\u0D23\u0D4D\u0D1F \u0D15\u0D3E\u0D30\u0D4D\u0D2F\u0D19\u0D4D\u0D19\u0D7E:**
1. **\u0D35\u0D46\u0D33\u0D4D\u0D33\u0D02 \u0D15\u0D41\u0D1F\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28\u0D41\u0D23\u0D4D\u0D1F\u0D4B:** \u0D28\u0D3F\u0D7C\u0D1C\u0D4D\u0D1C\u0D32\u0D40\u0D15\u0D30\u0D23\u0D02 (Dehydration) \u0D09\u0D23\u0D4D\u0D1F\u0D3E\u0D15\u0D3E\u0D24\u0D3F\u0D30\u0D3F\u0D15\u0D4D\u0D15\u0D3E\u0D7B \u0D36\u0D41\u0D26\u0D4D\u0D27\u0D1C\u0D32\u0D02 \u0D06\u0D35\u0D36\u0D4D\u0D2F\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D \u0D28\u0D7D\u0D15\u0D41\u0D15.
2. **\u0D2E\u0D31\u0D4D\u0D31\u0D4D \u0D32\u0D15\u0D4D\u0D37\u0D23\u0D19\u0D4D\u0D19\u0D7E:** \u0D1B\u0D7C\u0D26\u0D4D\u0D26\u0D3F\u0D2F\u0D4B \u0D35\u0D2F\u0D31\u0D3F\u0D33\u0D15\u0D4D\u0D15\u0D2E\u0D4B \u0D2A\u0D32\u0D4D\u0D32\u0D41\u0D15\u0D33\u0D3F\u0D7D \u0D35\u0D47\u0D26\u0D28\u0D2F\u0D4B \u0D09\u0D23\u0D4D\u0D1F\u0D4B\u0D2F\u0D46\u0D28\u0D4D\u0D28\u0D4D \u0D2A\u0D30\u0D3F\u0D36\u0D4B\u0D27\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15.
3. **\u0D32\u0D33\u0D3F\u0D24\u0D2E\u0D3E\u0D2F \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02:** \u0D0E\u0D23\u0D4D\u0D23\u0D2F\u0D4B \u0D09\u0D2A\u0D4D\u0D2A\u0D4B \u0D2E\u0D38\u0D3E\u0D32\u0D2F\u0D4B \u0D07\u0D32\u0D4D\u0D32\u0D3E\u0D24\u0D4D\u0D24 \u0D35\u0D47\u0D35\u0D3F\u0D1A\u0D4D\u0D1A \u0D1A\u0D3F\u0D15\u0D4D\u0D15\u0D7B \u0D38\u0D42\u0D2A\u0D4D\u0D2A\u0D4B \u0D15\u0D1E\u0D4D\u0D1E\u0D3F\u0D35\u0D46\u0D33\u0D4D\u0D33\u0D2E\u0D4B \u0D28\u0D7D\u0D15\u0D3F \u0D28\u0D4B\u0D15\u0D4D\u0D15\u0D3E\u0D02.

\u26A0\uFE0F **\u0D36\u0D4D\u0D30\u0D26\u0D4D\u0D27\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15:** \u0D2E\u0D28\u0D41\u0D37\u0D4D\u0D2F\u0D7C \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28 \u0D2A\u0D3E\u0D30\u0D38\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2E\u0D4B\u0D7E \u0D2A\u0D4B\u0D32\u0D41\u0D33\u0D4D\u0D33 \u0D2E\u0D30\u0D41\u0D28\u0D4D\u0D28\u0D41\u0D15\u0D7E \u0D2E\u0D43\u0D17\u0D19\u0D4D\u0D19\u0D7E\u0D15\u0D4D\u0D15\u0D4D \u0D28\u0D7D\u0D15\u0D30\u0D41\u0D24\u0D4D, \u0D05\u0D24\u0D4D \u0D35\u0D3F\u0D37\u0D15\u0D30\u0D2E\u0D3E\u0D23\u0D4D. 24 \u0D2E\u0D23\u0D3F\u0D15\u0D4D\u0D15\u0D42\u0D31\u0D3F\u0D32\u0D27\u0D3F\u0D15\u0D02 \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D02 \u0D15\u0D34\u0D3F\u0D15\u0D4D\u0D15\u0D3E\u0D24\u0D3F\u0D30\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15\u0D2F\u0D4B \u0D15\u0D4D\u0D37\u0D40\u0D23\u0D02 \u0D15\u0D42\u0D1F\u0D41\u0D15\u0D2F\u0D4B \u0D1A\u0D46\u0D2F\u0D4D\u0D24\u0D3E\u0D7D \u0D12\u0D30\u0D41 \u0D35\u0D46\u0D31\u0D4D\u0D31\u0D31\u0D3F\u0D28\u0D31\u0D3F \u0D21\u0D4B\u0D15\u0D4D\u0D1F\u0D31\u0D41\u0D1F\u0D46 \u0D38\u0D39\u0D3E\u0D2F\u0D02 \u0D24\u0D47\u0D1F\u0D41\u0D15.`,
        suggestions: ["\u{1FA7A} \u0D05\u0D1F\u0D41\u0D24\u0D4D\u0D24\u0D41\u0D33\u0D4D\u0D33 \u0D35\u0D46\u0D31\u0D4D\u0D31\u0D31\u0D3F\u0D28\u0D31\u0D3F \u0D15\u0D4D\u0D32\u0D3F\u0D28\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15\u0D7E", "\u{1F957} \u0D38\u0D41\u0D30\u0D15\u0D4D\u0D37\u0D3F\u0D24\u0D2E\u0D3E\u0D2F \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D15\u0D4D\u0D30\u0D2E\u0D02", "\u{1F4A7} \u0D28\u0D3F\u0D7C\u0D1C\u0D4D\u0D1C\u0D32\u0D40\u0D15\u0D30\u0D23 \u0D32\u0D15\u0D4D\u0D37\u0D23\u0D19\u0D4D\u0D19\u0D7E"],
        actions: [{ type: "open_map", label: "\u0D35\u0D46\u0D31\u0D4D\u0D31\u0D31\u0D3F\u0D28\u0D31\u0D3F \u0D15\u0D4D\u0D32\u0D3F\u0D28\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15\u0D7E \u0D15\u0D3E\u0D23\u0D41\u0D15 \u{1FA7A}" }],
        detectedLanguage: "ml"
      };
    }
    if ((isMixedLanguage || /[\u0B80-\u0BFF]/.test(message)) && message.toLowerCase().includes("puppy")) {
      return {
        reply: `Puppies-\u0B95\u0BCD\u0B95\u0BC1 appetite drop \u0B86\u0BA9\u0BBE \u0B95\u0BCA\u0B9E\u0BCD\u0B9A\u0BAE\u0BCD careful-\u0B86 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BA3\u0BC1\u0BAE\u0BCD, because puppy-\u0B95\u0BCD\u0B95\u0BC1 energy \u0B9A\u0BC0\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BAE\u0BCD \u0B95\u0BC1\u0BB1\u0BC8\u0BAF\u0BC1\u0BAE\u0BCD.

\u{1F50D} **Check \u0BAA\u0BA3\u0BCD\u0BA3 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BBF\u0BAF\u0BB5\u0BC8:**
1. **Activity Level:** Puppy playful-\u0B86 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BBE \u0B87\u0BB2\u0BCD\u0BB2 \u0BB0\u0BCA\u0BAE\u0BCD\u0BAA dull-\u0B86 \u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BBE?
2. **Hydration:** Fresh water \u0B95\u0BC1\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0BC1\u0BA4\u0BBE\u0BA9\u0BCD\u0BA9\u0BC1 \u0BAA\u0BBE\u0BB0\u0BC1\u0B99\u0BCD\u0B95. Gums pink & moist-\u0B86 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BBE\u0BA9\u0BCD\u0BA9\u0BC1 \u0B9A\u0BC6\u0B95\u0BCD \u0BAA\u0BA3\u0BCD\u0BA3\u0BC1\u0B99\u0BCD\u0B95.
3. **Stomach upset:** \u0BB5\u0BBE\u0BA8\u0BCD\u0BA4\u0BBF (vomiting) \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 loose stool \u0B8E\u0BA4\u0BC1\u0BB5\u0BC1\u0BAE\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BBE?

\u{1F963} **First Steps:**
\u2022 Force feed \u0BAA\u0BA3\u0BCD\u0BA3\u0BBE\u0BA4\u0BC0\u0B99\u0BCD\u0B95.
\u2022 Oil/salt/masala \u0B87\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4 plain boiled chicken soup \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 soft curd rice \u0B95\u0BCA\u0B9E\u0BCD\u0B9A\u0BAE\u0BCD \u0B95\u0BCA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD.
\u2022 Puppy 12 \u0BAE\u0BA3\u0BBF \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BC1 \u0BAE\u0BC7\u0BB2 \u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BB2\u0BA9\u0BCD\u0BA9\u0BBE \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 dull-\u0B86 \u0B87\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBE delay \u0BAA\u0BA3\u0BCD\u0BA3\u0BBE\u0BAE vet \u0B95\u0BBF\u0B9F\u0BCD\u0B9F \u0B95\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B99\u0BCD\u0B95.`,
        suggestions: ["\u{1FA7A} View Nearby Vet Clinics", "\u{1F37C} Puppy care guide", "\u{1F4A7} Check dehydration"],
        actions: [{ type: "open_map", label: "View Nearby Vets \u{1FA7A}" }],
        detectedLanguage: "tanglish"
      };
    }
    if (lang === "ta") {
      return {
        reply: `\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2 \u0BA8\u0BBE\u0BAF\u0BCD \u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BBE\u0BAE\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BA4\u0BB1\u0BCD\u0B95\u0BC1 \u0BB2\u0BC7\u0B9A\u0BBE\u0BA9 \u0B85\u0B9C\u0BC0\u0BB0\u0BA3\u0BAE\u0BCD, \u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAA\u0BB1\u0BCD\u0B95\u0BB3\u0BBF\u0BB2\u0BCD \u0BB5\u0BB2\u0BBF \u0BAA\u0BCB\u0BA9\u0BCD\u0BB1 \u0BAA\u0BB2 \u0B95\u0BBE\u0BB0\u0BA3\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD:

\u{1F50D} **\u0BAE\u0BC1\u0BA4\u0BB2\u0BBF\u0BB2\u0BCD \u0B95\u0BB5\u0BA9\u0BBF\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BBF\u0BAF\u0BB5\u0BC8:**
1. **\u0B9A\u0BC1\u0BB1\u0BC1\u0B9A\u0BC1\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1 & \u0BA8\u0BC0\u0BB0\u0BCD \u0B85\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1\u0BA4\u0BB2\u0BCD:** \u0BA8\u0BBE\u0BAF\u0BCD \u0BA4\u0BA3\u0BCD\u0BA3\u0BC0\u0BB0\u0BCD \u0B95\u0BC1\u0B9F\u0BBF\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BA4\u0BBE? \u0B89\u0B9F\u0BB2\u0BCD \u0B95\u0BBE\u0BAF\u0BCD\u0B9A\u0BCD\u0B9A\u0BB2\u0BCD \u0BAA\u0BCB\u0BB2 \u0B9A\u0BC2\u0B9F\u0BBE\u0B95 \u0B89\u0BB3\u0BCD\u0BB3\u0BA4\u0BBE \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BAE\u0BBF\u0B95\u0BB5\u0BC1\u0BAE\u0BCD \u0B9A\u0BCB\u0BB0\u0BCD\u0BB5\u0BBE\u0B95 \u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB3\u0BCD\u0BB3\u0BA4\u0BBE?
2. **\u0B89\u0BA3\u0BB5\u0BC8 \u0B95\u0B9F\u0BCD\u0B9F\u0BBE\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BBE\u0BA4\u0BC0\u0BB0\u0BCD\u0B95\u0BB3\u0BCD:** \u0B9A\u0BBF\u0BB1\u0BBF\u0BA4\u0BC1 \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD \u0B85\u0BAE\u0BC8\u0BA4\u0BBF\u0BAF\u0BBE\u0B95 \u0B93\u0BAF\u0BCD\u0BB5\u0BC6\u0B9F\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BBF\u0B9F\u0BC1\u0B99\u0BCD\u0B95\u0BB3\u0BCD.
3. **\u0B8E\u0BB3\u0BBF\u0BAF \u0B89\u0BA3\u0BB5\u0BC1:** \u0B8E\u0BA3\u0BCD\u0BA3\u0BC6\u0BAF\u0BCD, \u0B89\u0BAA\u0BCD\u0BAA\u0BC1 \u0B87\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4 \u0BAE\u0BBF\u0BA4\u0BAE\u0BBE\u0BA9 \u0B9A\u0BC2\u0B9F\u0BCD\u0B9F\u0BBF\u0BB2\u0BCD \u0B89\u0BB3\u0BCD\u0BB3 **\u0BB5\u0BC7\u0B95\u0BB5\u0BC8\u0BA4\u0BCD\u0BA4 \u0B9A\u0BBF\u0B95\u0BCD\u0B95\u0BA9\u0BCD \u0B9A\u0BC2\u0BAA\u0BCD** \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BA4\u0BAF\u0BBF\u0BB0\u0BCD \u0B9A\u0BBE\u0BA4\u0BAE\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF \u0B85\u0BB3\u0BB5\u0BBF\u0BB2\u0BCD \u0B95\u0BCA\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD.
4. **\u26A0\uFE0F \u0BAE\u0BBF\u0B95 \u0BAE\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BAF \u0B8E\u0B9A\u0BCD\u0B9A\u0BB0\u0BBF\u0B95\u0BCD\u0B95\u0BC8:** \u0BAE\u0BA9\u0BBF\u0BA4\u0BB0\u0BCD\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0BB5\u0BB2\u0BBF \u0BA8\u0BBF\u0BB5\u0BBE\u0BB0\u0BA3 \u0BAE\u0BBE\u0BA4\u0BCD\u0BA4\u0BBF\u0BB0\u0BC8\u0B95\u0BB3\u0BC8 (Paracetamol/Dolo) \u0B92\u0BB0\u0BC1\u0BAA\u0BCB\u0BA4\u0BC1\u0BAE\u0BCD \u0BA4\u0BB0\u0B95\u0BCD\u0B95\u0BC2\u0B9F\u0BBE\u0BA4\u0BC1 \u2014 \u0B85\u0BA4\u0BC1 \u0BAE\u0BB0\u0BA3\u0BA4\u0BCD\u0BA4\u0BC8 \u0B89\u0BA3\u0BCD\u0B9F\u0BBE\u0B95\u0BCD\u0B95\u0BC1\u0BAE\u0BCD.

24 \u0BAE\u0BA3\u0BBF \u0BA8\u0BC7\u0BB0\u0BA4\u0BCD\u0BA4\u0BBF\u0BB1\u0BCD\u0B95\u0BC1 \u0BAE\u0BC7\u0BB2\u0BCD \u0B9A\u0BBE\u0BAA\u0BCD\u0BAA\u0BBF\u0B9F\u0BBE\u0BAE\u0BB2\u0BCD \u0B87\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCB \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0BB5\u0BBE\u0BA8\u0BCD\u0BA4\u0BBF/\u0BAA\u0BC7\u0BA4\u0BBF \u0B87\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BBE\u0BB2\u0BCB \u0B89\u0B9F\u0BA9\u0BC7 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BC8 \u0B85\u0BA3\u0BC1\u0B95\u0BB5\u0BC1\u0BAE\u0BCD.`,
        suggestions: ["\u{1FA7A} \u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BCD", "\u{1F957} \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BB3\u0BCD", "\u{1F4A7} \u0BA8\u0BC0\u0BB0\u0BBF\u0BB4\u0BAA\u0BCD\u0BAA\u0BC1 \u0B85\u0BB1\u0BBF\u0B95\u0BC1\u0BB1\u0BBF\u0B95\u0BB3\u0BCD"],
        actions: [{ type: "open_map", label: "\u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BC8 \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95 \u{1FA7A}" }],
        detectedLanguage: "ta"
      };
    }
    if (lang === "tanglish") {
      return {
        reply: `Unga dog food sapdalana athukku sila common reasons irukkalam (mild indigestion, fever, or stress):

\u{1F50D} **Check panna vendiya mukkiyamaana vishayangal:**
1. **Energy & Hydration:** Normal-ah velayadutha or romba dull-ah paduthirukka? Fresh water kudikkutha nu check pannunga.
2. **Don't force feed:** Force panni heavy food tharathinga, konjam neram rest edukattum.
3. **Mild Diet:** Oil/salt/masala illatha plain boiled chicken breast shredded with white rice konjam kuduthu paarunga.
4. **\u26A0\uFE0F Critical Warning:** Human painkiller tablets (Paracetamol/Dolo) kandippa kudukka koodathu.

24 hours-ku mela sapdalana or fever/vomiting maari iruntha, kandippa local veterinarian-a consult pannunga.`,
        suggestions: ["\u{1FA7A} View Nearby Vet Clinics", "\u{1F357} Boiled chicken kudukalama?", "\u{1F4A7} Dehydration signs"],
        actions: [{ type: "open_map", label: "View Nearby Vets \u{1FA7A}" }],
        detectedLanguage: "tanglish"
      };
    }
    if (lang === "hi") {
      return {
        reply: `\u092F\u0926\u093F \u0906\u092A\u0915\u0947 \u0915\u0941\u0924\u094D\u0924\u0947 \u0928\u0947 \u0916\u093E\u0928\u093E \u0928\u0939\u0940\u0902 \u0916\u093E\u092F\u093E \u0939\u0948, \u0924\u094B \u0907\u0938\u0915\u0947 \u0915\u0908 \u0915\u093E\u0930\u0923 \u0939\u094B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 (\u091C\u0948\u0938\u0947 \u0939\u0932\u094D\u0915\u093E \u092A\u0947\u091F \u0916\u0930\u093E\u092C, \u092C\u0941\u0916\u093E\u0930, \u092F\u093E \u0924\u0928\u093E\u0935):

\u{1F50D} **\u092E\u0941\u0916\u094D\u092F \u092C\u093E\u0924\u0947\u0902 \u091C\u094B \u0924\u0941\u0930\u0902\u0924 \u0926\u0947\u0916\u0928\u0940 \u091A\u093E\u0939\u093F\u090F:**
1. **\u0938\u0941\u0938\u094D\u0924\u0940 \u092F\u093E \u0915\u092E\u091C\u094B\u0930\u0940:** \u0915\u094D\u092F\u093E \u0935\u0939 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0916\u0947\u0932 \u0930\u0939\u093E \u0939\u0948 \u092F\u093E \u092C\u0939\u0941\u0924 \u0938\u0941\u0938\u094D\u0924 \u0939\u094B\u0915\u0930 \u0932\u0947\u091F\u093E \u0939\u0948?
2. **\u092A\u093E\u0928\u0940 \u092A\u0940\u0928\u093E:** \u0915\u094D\u092F\u093E \u0935\u0939 \u0928\u093F\u092F\u092E\u093F\u0924 \u0930\u0942\u092A \u0938\u0947 \u0924\u093E\u091C\u093E \u092A\u093E\u0928\u0940 \u092A\u0940 \u0930\u0939\u093E \u0939\u0948?
3. **\u091C\u092C\u0930\u0926\u0938\u094D\u0924\u0940 \u0928 \u0915\u0930\u0947\u0902:** \u0909\u0938\u0947 \u091C\u092C\u0930\u0928 \u0916\u093E\u0928\u093E \u0916\u093F\u0932\u093E\u0928\u0947 \u0915\u0940 \u0915\u094B\u0936\u093F\u0936 \u0928 \u0915\u0930\u0947\u0902\u0964
4. **\u0939\u0932\u094D\u0915\u093E \u0906\u0939\u093E\u0930:** \u092A\u0947\u091F \u0936\u093E\u0902\u0924 \u0939\u094B\u0928\u0947 \u092A\u0930 \u0925\u094B\u0921\u093C\u093E \u0938\u093E \u0909\u092C\u0932\u093E \u0939\u0941\u0906 \u0938\u093E\u0926\u093E \u091A\u093F\u0915\u0928 \u0914\u0930 \u0938\u092B\u0947\u0926 \u091A\u093E\u0935\u0932 (\u092C\u093F\u0928\u093E \u0928\u092E\u0915 \u092F\u093E \u092E\u0938\u093E\u0932\u0947 \u0915\u0947) \u0926\u0947\u0902\u0964
5. **\u26A0\uFE0F \u0938\u0916\u094D\u0924 \u091A\u0947\u0924\u093E\u0935\u0928\u0940:** \u0907\u0902\u0938\u093E\u0928\u094B\u0902 \u0915\u0940 \u0926\u0935\u093E\u0907\u092F\u093E\u0902 (\u091C\u0948\u0938\u0947 Paracetamol, Dolo) \u0915\u092D\u0940 \u0928 \u0926\u0947\u0902 \u2014 \u092F\u0947 \u092A\u093E\u0932\u0924\u0942 \u091C\u093E\u0928\u0935\u0930\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u091C\u093E\u0928\u0932\u0947\u0935\u093E \u0939\u0948\u0902\u0964

\u092F\u0926\u093F \u0935\u0939 24 \u0918\u0902\u091F\u0947 \u0938\u0947 \u0905\u0927\u093F\u0915 \u0938\u092E\u092F \u0924\u0915 \u0928 \u0916\u093E\u090F \u092F\u093E \u0909\u0938\u0947 \u0909\u0932\u094D\u091F\u0940/\u0926\u0938\u094D\u0924 \u0939\u094B, \u0924\u094B \u0924\u0941\u0930\u0902\u0924 \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u0915 \u0938\u0947 \u0938\u0932\u093E\u0939 \u0932\u0947\u0902\u0964`,
        suggestions: ["\u{1FA7A} \u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932", "\u{1F957} \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0906\u0939\u093E\u0930 \u0938\u0942\u091A\u0940", "\u{1F4A7} \u092A\u093E\u0928\u0940 \u0915\u0940 \u0915\u092E\u0940 \u0915\u0947 \u0932\u0915\u094D\u0937\u0923"],
        actions: [{ type: "open_map", label: "\u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932 \u0926\u0947\u0916\u0947\u0902 \u{1FA7A}" }],
        detectedLanguage: "hi"
      };
    }
    if (lang === "es") {
      return {
        reply: `Si tu perro no quiere comer, lo primero es no forzarlo. Esto puede deberse a una indigesti\xF3n leve, fiebre, dolor dental o estr\xE9s:

\u{1F50D} **Puntos clave a observar:**
1. **Nivel de energ\xEDa e hidrataci\xF3n:** \xBFSe muestra activo o let\xE1rgico? Aseg\xFArate de que tenga agua fresca y limpia disponible.
2. **S\xEDntomas acompa\xF1antes:** Observa si presenta v\xF3mitos, diarrea o salivaci\xF3n excesiva.
3. **Dieta blanda recomendada:** Puedes ofrecerle una peque\xF1a porci\xF3n de pollo hervido sin sal, piel ni huesos, mezclado con arroz blanco cocido.
4. **\u26A0\uFE0F Advertencia vital:** NUNCA administres analg\xE9sicos humanos (como paracetamol o ibuprofeno), son altamente t\xF3xicos para perros y gatos.

Si el ayuno supera las 24 horas o notas debilidad marcada, consulta de inmediato a un veterinario.`,
        suggestions: ["\u{1FA7A} Cl\xEDnicas veterinarias cercanas", "\u{1F357} C\xF3mo preparar dieta blanda", "\u{1F4A7} Signos de deshidrataci\xF3n"],
        actions: [{ type: "open_map", label: "Ver cl\xEDnicas veterinarias \u{1FA7A}" }],
        detectedLanguage: "es"
      };
    }
    if (analysis.isCasual || isShortQuery) {
      return {
        reply: `If your dog won't eat, start by checking whether they are still drinking water and acting energetic or sluggish:

1. **Don't Force Feed:** Withhold heavy kibble for a few hours to let their stomach rest.
2. **Check Gums & Energy:** Lift their lip \u2014 gums should be pink and moist, not pale, yellowish, or sticky.
3. **Offer a Gentle Meal:** Try offering a handful of warm plain boiled chicken breast (no salt, oil, or spices) with plain white rice.
4. **\u26A0\uFE0F Never Give Human Meds:** Never give Tylenol, Advil, or Paracetamol \u2014 they are toxic to pets.
5. **Vet Threshold:** If they refuse food for more than 24 hours, or if you notice vomiting or fever, have a vet examine them.`,
        suggestions: ["\u{1FA7A} Find nearby vet clinic", "\u{1F357} Bland diet recipe", "\u{1F4A7} How to check dehydration"],
        actions: [{ type: "open_map", label: "Explore Nearby Vets \u{1FA7A}" }],
        detectedLanguage: "en"
      };
    }
    return {
      reply: `When a dog stops eating, it is typically a sign of mild gastrointestinal upset, dental discomfort, stress, or an underlying infection:

\u{1F50D} **Key Observations to Check:**
1. **Activity & Hydration:** Are they alert and willing to drink clean water? Dehydration is the greatest immediate concern.
2. **Digestive Symptoms:** Have you noticed any vomiting, loose stools, or lip-smacking nausea?
3. **Bland Diet Step:** Once their stomach is settled, offer a small portion of shredded plain boiled boneless chicken breast mixed with plain white rice.
4. **\u26A0\uFE0F Safety Rule:** Never administer human painkillers (such as Paracetamol, Tylenol, or Ibuprofen), as they cause fatal liver and kidney damage in pets.
5. **Veterinary Visit:** If the refusal of food continues for more than 24 hours, or if accompanied by extreme lethargy or fever, consult a veterinarian promptly.`,
      suggestions: ["\u{1FA7A} Find nearest Vet Clinic", "\u{1F357} Bland diet feeding instructions", "\u{1F4A7} Signs of dehydration in pets"],
      actions: [{ type: "open_map", label: "Explore Nearby Vets \u{1FA7A}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "location_vet") {
    if (lang === "tanglish") {
      return {
        reply: `Unga area-la vet clinic paakka, keezha irukura **Explore Nearby Map \u{1F4CD}** button-a click pannunga. Anga ungalukku pakkathula irukkura verified clinics, animal hospitals and contact details clear-ah kaattum!`,
        suggestions: ["\u{1F4CD} Open Nearby Map", "\u{1F6A8} Emergency Vet Help", "\u{1F4DE} Call Emergency Vet"],
        actions: [{ type: "open_map", label: "Explore Nearby Map \u{1F4CD}" }],
        detectedLanguage: "tanglish"
      };
    }
    if (lang === "ta") {
      return {
        reply: `\u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0BAA\u0B95\u0BC1\u0BA4\u0BBF\u0BAF\u0BBF\u0BB2\u0BCD \u0B89\u0BB3\u0BCD\u0BB3 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BB3\u0BC8 \u0B85\u0BB1\u0BBF\u0BAF, \u0B95\u0BC0\u0BB4\u0BC7 \u0B89\u0BB3\u0BCD\u0BB3 **Explore Nearby Map \u{1F4CD}** \u0BAA\u0B9F\u0BCD\u0B9F\u0BA9\u0BC8 \u0B95\u0BBF\u0BB3\u0BBF\u0B95\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BB5\u0BC1\u0BAE\u0BCD. \u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0B85\u0BA9\u0BC8\u0BA4\u0BCD\u0BA4\u0BC1 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BB3\u0BBF\u0BA9\u0BCD \u0BA4\u0BCA\u0BB2\u0BC8\u0BB5\u0BC1 \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BA4\u0BCA\u0B9F\u0BB0\u0BCD\u0BAA\u0BC1 \u0B8E\u0BA3\u0BCD\u0B95\u0BB3\u0BC8 \u0B8E\u0BB3\u0BBF\u0BA4\u0BBE\u0B95\u0BAA\u0BCD \u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD!`,
        suggestions: ["\u{1F4CD} \u0BB5\u0BB0\u0BC8\u0BAA\u0B9F\u0BA4\u0BCD\u0BA4\u0BC8 \u0BA4\u0BBF\u0BB1\u0B95\u0BCD\u0B95", "\u{1F6A8} \u0B85\u0BB5\u0B9A\u0BB0 \u0B89\u0BA4\u0BB5\u0BBF", "\u{1FA7A} \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BAE\u0BA9\u0BC8\u0B95\u0BB3\u0BCD"],
        actions: [{ type: "open_map", label: "\u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0BB5\u0BB0\u0BC8\u0BAA\u0B9F\u0BAE\u0BCD \u{1F4CD}" }],
        detectedLanguage: "ta"
      };
    }
    if (lang === "hi" || lang === "hinglish") {
      return {
        reply: `\u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932 \u0914\u0930 \u0915\u094D\u0932\u093F\u0928\u093F\u0915 \u0916\u094B\u091C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0928\u0940\u091A\u0947 \u0926\u093F\u090F \u0917\u090F **Explore Nearby Map \u{1F4CD}** \u092C\u091F\u0928 \u092A\u0930 \u0915\u094D\u0932\u093F\u0915 \u0915\u0930\u0947\u0902\u0964 \u0935\u0939\u093E\u0902 \u0906\u092A\u0915\u094B \u0905\u092A\u0928\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0915\u0947 \u0938\u092D\u0940 \u0915\u094D\u0932\u093F\u0928\u093F\u0915 \u0914\u0930 \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 \u0915\u0947\u0902\u0926\u094D\u0930 \u092E\u093F\u0932 \u091C\u093E\u090F\u0902\u0917\u0947\u0964`,
        suggestions: ["\u{1F4CD} \u0928\u091C\u0926\u0940\u0915\u0940 \u092E\u0948\u092A \u0926\u0947\u0916\u0947\u0902", "\u{1F6A8} \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 \u0938\u0939\u093E\u092F\u0924\u093E", "\u{1FA7A} \u092A\u0936\u0941 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u0915"],
        actions: [{ type: "open_map", label: "Explore Nearby Map \u{1F4CD}" }],
        detectedLanguage: lang
      };
    }
    return {
      reply: `To find verified veterinary hospitals and clinics near ${userLoc}, tap the **Explore Nearby Map \u{1F4CD}** button below to view live distances, phone numbers, and directions.`,
      suggestions: ["\u{1F4CD} Open Nearby Map", "\u{1F6A8} Emergency Vet Help", "\u{1F4DE} Call Emergency Vet"],
      actions: [{ type: "open_map", label: "Explore Nearby Map \u{1F4CD}" }],
      detectedLanguage: "en"
    };
  }
  if (intent === "feeding_inquiry") {
    if (lang === "tanglish") {
      return {
        reply: `Dogs & cats-ku safe ana food guidelines idho:

\u2705 **Safe & Healthy Foods:**
\u2022 **Plain Boiled Chicken:** Boneless, skinless, salt/oil/masala illama.
\u2022 **Plain White Rice:** Easy digestion-ku romba nalladhu.
\u2022 **Plain Curd / Yogurt:** Small quantity-la nalla probiotic.
\u2022 **Boiled Eggs & Pumpkin:** Protein and fiber-ku nalladhu.

\u{1F6AB} **Strictly Toxic Foods (Kandippa Kudukka Koodadhu):**
\u2022 Cooked bones (splinter aagi stomach tear pannum)
\u2022 Onions, garlic, leeks (anemia undakkum)
\u2022 Chocolate, grapes, raisins, xylitol sweetener, alcohol, and tea/coffee.`,
        suggestions: ["\u{1F357} Safe puppy feeding recipe", "\u{1F6AB} Toxic foods list", "\u{1FA7A} Consult vet"],
        actions: [],
        detectedLanguage: "tanglish"
      };
    }
    return {
      reply: `Here are healthy and safe feeding guidelines for dogs and cats:

\u2705 **Safe & Healthy Foods:**
\u2022 **Plain Boiled Chicken:** Skinless, boneless, shredded, with no salt, oil, or spices.
\u2022 **Plain White Rice:** Easy on sensitive stomachs.
\u2022 **Plain Curd / Yogurt:** In small quantities, excellent natural probiotics for adult dogs.
\u2022 **Boiled Eggs & Pumpkin:** High protein and dietary fiber for digestive balance.

\u{1F6AB} **Strictly Toxic Foods (Never Give):**
\u2022 Cooked bones (they splinter and puncture stomach walls).
\u2022 Onions, garlic, leeks (cause hemolytic anemia).
\u2022 Chocolate, grapes, raisins, xylitol sweetener, alcohol, and caffeine.`,
      suggestions: ["\u{1F357} Safe puppy feeding recipe", "\u{1F6AB} Complete toxic foods list", "\u{1FA7A} Consult vet nutritionist"],
      actions: [],
      detectedLanguage: "en"
    };
  }
  if (lang === "tanglish") {
    return {
      reply: `Sollu namba! \u{1F43E} Unga pet or street animal-ku enna help venum? Health, safe feeding, or nearby clinic pathi kelunga, Pawsy help panren!`,
      suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
      actions: [],
      detectedLanguage: "tanglish"
    };
  }
  if (lang === "ta") {
    return {
      reply: `\u0BB5\u0BA3\u0B95\u0BCD\u0B95\u0BAE\u0BCD! \u{1F43E} \u0B89\u0B99\u0BCD\u0B95\u0BB3\u0BCD \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BAA\u0BCD \u0BAA\u0BBF\u0BB0\u0BBE\u0BA3\u0BBF\u0B95\u0BCD\u0B95\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9 \u0B89\u0BA4\u0BB5\u0BBF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD? \u0BA8\u0BB2\u0BAE\u0BCD, \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0B89\u0BA3\u0BB5\u0BC1 \u0B85\u0BB2\u0BCD\u0BB2\u0BA4\u0BC1 \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD \u0B95\u0BC1\u0BB1\u0BBF\u0BA4\u0BCD\u0BA4\u0BC1 \u0B8E\u0BA9\u0BCD\u0BA9\u0BBF\u0B9F\u0BAE\u0BCD \u0B95\u0BC7\u0B9F\u0BCD\u0B95\u0BB2\u0BBE\u0BAE\u0BCD.`,
      suggestions: ["\u{1F43E} \u0B9A\u0BC6\u0BB2\u0BCD\u0BB2\u0BAA\u0BCD \u0BAA\u0BBF\u0BB0\u0BBE\u0BA3\u0BBF \u0BA8\u0BB2\u0BAE\u0BCD", "\u{1F957} \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BB3\u0BCD", "\u{1FA7A} \u0B95\u0BBE\u0BB2\u0BCD\u0BA8\u0B9F\u0BC8 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BCD"],
      actions: [],
      detectedLanguage: "ta"
    };
  }
  return {
    reply: `I'm here to help! \u{1F43E} How can I assist you and your animal friends today? You can ask about pet health symptoms, safe feeding, or finding nearby clinics in ${userLoc}.`,
    suggestions: ["\u{1F43E} Pet health question", "\u{1F957} Safe food guide", "\u{1FA7A} Find Nearby Vets"],
    actions: [],
    detectedLanguage: "en"
  };
}
async function handleChatMessage(message, history = [], context, geminiClient) {
  const userLoc = context?.location || "your area";
  console.log(`[Pawsy] Request received: "${message.slice(0, 45)}"`);
  if (geminiClient) {
    try {
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const turn of history.slice(-10)) {
          contents.push({
            role: turn.role === "user" ? "user" : "model",
            parts: [{ text: turn.text || turn?.content || "" }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: `[User Location: ${userLoc}]

${message}` }]
      });
      console.log("[Pawsy] AI provider request started");
      let response = null;
      try {
        response = await geminiClient.models.generateContent({
          model: "gemini-2.0-flash",
          contents,
          config: {
            systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
            temperature: 0.7
          }
        });
      } catch (primaryModelErr) {
        console.warn("[Pawsy] gemini-2.0-flash failed, attempting gemini-1.5-flash:", primaryModelErr.message || primaryModelErr);
        response = await geminiClient.models.generateContent({
          model: "gemini-1.5-flash",
          contents,
          config: {
            systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
            temperature: 0.7
          }
        });
      }
      console.log("[Pawsy] AI provider response received");
      const replyText = response.text?.trim();
      if (replyText) {
        const analysis2 = analyzeUserCommunication(message, history, context);
        console.log(`[Pawsy] Response returned from Gemini (detected: ${analysis2.primaryLanguage})`);
        return {
          reply: replyText,
          suggestions: analysis2.primaryLanguage === "ta" || analysis2.primaryLanguage === "tanglish" ? ["\u{1F6A8} \u0B85\u0BB5\u0B9A\u0BB0 \u0BAE\u0BC1\u0BA4\u0BB2\u0BC1\u0BA4\u0BB5\u0BBF", "\u{1F957} \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BBE\u0BA9 \u0B89\u0BA3\u0BB5\u0BC1\u0B95\u0BB3\u0BCD", "\u{1FA7A} \u0B85\u0BB0\u0BC1\u0B95\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3 \u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD\u0B95\u0BB3\u0BCD"] : analysis2.primaryLanguage === "hi" || analysis2.primaryLanguage === "hinglish" ? ["\u{1F6A8} \u0906\u092A\u093E\u0924\u0915\u093E\u0932\u0940\u0928 \u092A\u094D\u0930\u093E\u0925\u092E\u093F\u0915 \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E", "\u{1F957} \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0906\u0939\u093E\u0930", "\u{1FA7A} \u0928\u091C\u0926\u0940\u0915\u0940 \u092A\u0936\u0941 \u0905\u0938\u094D\u092A\u0924\u093E\u0932"] : analysis2.primaryLanguage === "ml" ? ["\u{1F6A8} \u0D05\u0D1F\u0D3F\u0D2F\u0D28\u0D4D\u0D24\u0D30 \u0D2A\u0D4D\u0D30\u0D25\u0D2E\u0D36\u0D41\u0D36\u0D4D\u0D30\u0D42\u0D37", "\u{1F957} \u0D38\u0D41\u0D30\u0D15\u0D4D\u0D37\u0D3F\u0D24\u0D2E\u0D3E\u0D2F \u0D2D\u0D15\u0D4D\u0D37\u0D23\u0D15\u0D4D\u0D30\u0D2E\u0D02", "\u{1FA7A} \u0D35\u0D46\u0D31\u0D4D\u0D31\u0D31\u0D3F\u0D28\u0D31\u0D3F \u0D15\u0D4D\u0D32\u0D3F\u0D28\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D15\u0D7E"] : analysis2.primaryLanguage === "es" ? ["\u{1F6A8} Primeros auxilios de urgencia", "\u{1F957} Alimentos seguros", "\u{1FA7A} Cl\xEDnicas cercanas"] : analysis2.primaryLanguage === "ar" ? ["\u{1F6A8} \u0625\u0633\u0639\u0627\u0641\u0627\u062A \u0627\u0644\u0637\u0648\u0627\u0631\u0626", "\u{1F957} \u0623\u0637\u0639\u0645\u0629 \u0622\u0645\u0646\u0629", "\u{1FA7A} \u0639\u064A\u0627\u062F\u0627\u062A \u0628\u064A\u0637\u0631\u064A\u0629"] : ["\u{1F6A8} Emergency rescue guidance", "\u{1F957} Safe foods guide", "\u{1FA7A} Nearest veterinary clinics"],
          actions: lowerMentionsVet(message) ? [{ type: "open_map", label: "View Nearby Map \u{1F4CD}" }] : lowerMentionsRescue(message) ? [{ type: "open_help", label: "Urgent Help Tab \u{1F6A8}" }] : [],
          detectedLanguage: analysis2.primaryLanguage
        };
      }
    } catch (geminiError) {
      console.warn("[Pawsy] AI request failed: contextual engine fallback engaged -", geminiError.message || geminiError);
    }
  }
  const analysis = analyzeUserCommunication(message, history, context);
  const result = generateContextualDynamicResponse(analysis, message, history, context);
  console.log(`[Pawsy] Response returned from contextual engine (detected: ${analysis.primaryLanguage})`);
  return result;
}
function lowerMentionsVet(text) {
  const t = text.toLowerCase();
  return t.includes("vet") || t.includes("hospital") || t.includes("clinic") || t.includes("\u0BAE\u0BB0\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0BB5\u0BB0\u0BCD") || t.includes("\u0921\u0949\u0915\u094D\u091F\u0930") || t.includes("veterinario");
}
function lowerMentionsRescue(text) {
  const t = text.toLowerCase();
  return t.includes("injured") || t.includes("accident") || t.includes("bleeding") || t.includes("\u0B95\u0BBE\u0BAF\u0BAE\u0BCD") || t.includes("\u0918\u093E\u092F\u0932") || t.includes("herido") || t.includes("rescue");
}

// src/server/placesService.ts
var placesCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 5 * 60 * 1e3;
function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
function formatDistanceKm(km) {
  if (km < 1) {
    const meters = Math.round(km * 1e3);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}
function formatDistanceMi(km) {
  const miles = km * 0.621371;
  if (miles < 0.1) {
    const feet = Math.round(miles * 5280);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}
function parseIsOpen(openingHours) {
  if (!openingHours) return null;
  const lower = openingHours.trim().toLowerCase();
  if (lower === "24/7" || lower.includes("24/7") || lower.includes("open 24 hours")) {
    return true;
  }
  return null;
}
async function fetchNearbyPetPlaces(userLat, userLng, radiusKm = 10, category = "all") {
  const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1e3), 1e3), 5e4);
  const cacheKey = `${userLat.toFixed(2)}_${userLng.toFixed(2)}_${radiusMeters}_${category}`;
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results.map((p) => {
      const dist = calculateHaversineDistanceKm(userLat, userLng, p.lat, p.lng);
      return {
        ...p,
        distanceKm: dist,
        distanceFormatted: formatDistanceKm(dist),
        distanceFormattedMi: formatDistanceMi(dist)
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);
  }
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="veterinary"](around:${radiusMeters},${userLat},${userLng});
      way["amenity"="veterinary"](around:${radiusMeters},${userLat},${userLng});
      node["healthcare"="veterinary"](around:${radiusMeters},${userLat},${userLng});
      way["healthcare"="veterinary"](around:${radiusMeters},${userLat},${userLng});
      node["shop"="pet"](around:${radiusMeters},${userLat},${userLng});
      way["shop"="pet"](around:${radiusMeters},${userLat},${userLng});
      node["shop"="pet_grooming"](around:${radiusMeters},${userLat},${userLng});
      way["shop"="pet_grooming"](around:${radiusMeters},${userLat},${userLng});
      node["amenity"="animal_shelter"](around:${radiusMeters},${userLat},${userLng});
      way["amenity"="animal_shelter"](around:${radiusMeters},${userLat},${userLng});
      node["amenity"="animal_boarding"](around:${radiusMeters},${userLat},${userLng});
      way["amenity"="animal_boarding"](around:${radiusMeters},${userLat},${userLng});
      node["animal_rescue"](around:${radiusMeters},${userLat},${userLng});
      way["animal_rescue"](around:${radiusMeters},${userLat},${userLng});
      node["amenity"="pharmacy"]["veterinary"="yes"](around:${radiusMeters},${userLat},${userLng});
      way["amenity"="pharmacy"]["veterinary"="yes"](around:${radiusMeters},${userLat},${userLng});
    );
    out center tags;
  `;
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  let elements = [];
  let querySucceeded = false;
  for (const mirror of mirrors) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12e3);
      const response = await fetch(mirror, {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "FeederPetCareApp/2.0 (global.animal.care)"
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (response.ok) {
        const data = await response.json();
        elements = data.elements || [];
        querySucceeded = true;
        break;
      }
    } catch {
    }
  }
  if (!querySucceeded && cached) {
    return cached.results;
  }
  try {
    const results = [];
    const seenCoordinates = /* @__PURE__ */ new Set();
    for (const elem of elements) {
      const tags = elem.tags || {};
      const lat = elem.lat || elem.center?.lat;
      const lng = elem.lon || elem.center?.lon;
      if (!lat || !lng) continue;
      const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (seenCoordinates.has(coordKey)) continue;
      seenCoordinates.add(coordKey);
      const name = tags.name || tags["name:en"] || tags.brand || tags.operator || (tags.shop === "pet" ? "Pet Shop" : tags.shop === "pet_grooming" ? "Pet Grooming" : tags.amenity === "animal_shelter" ? "Animal Shelter" : tags.amenity === "animal_boarding" ? "Animal Care & Boarding" : tags.amenity === "pharmacy" ? "Veterinary Pharmacy" : "Veterinary Clinic");
      const nameLower = name.toLowerCase();
      let placeType = "clinic";
      let categoryLabel = "Veterinary Clinic";
      let isEmergency = false;
      if (tags.amenity === "animal_shelter" || tags.animal_shelter === "yes") {
        placeType = "shelter";
        categoryLabel = "Animal Shelter";
      } else if (tags.animal_rescue || nameLower.includes("rescue") || nameLower.includes("spca") || nameLower.includes("humane society") || nameLower.includes("animal protection") || nameLower.includes("welfare")) {
        placeType = "rescue";
        categoryLabel = "Animal Rescue Center";
      } else if (tags.amenity === "animal_boarding") {
        placeType = "welfare_org";
        categoryLabel = "Animal Welfare Org";
      } else if (tags.amenity === "pharmacy" && (tags.veterinary === "yes" || tags.pet === "yes")) {
        placeType = "pet_pharmacy";
        categoryLabel = "Pet Pharmacy";
      } else if (tags.shop === "pet" || tags.shop === "pet_grooming") {
        placeType = "pet_shop";
        categoryLabel = tags.shop === "pet_grooming" ? "Pet Grooming & Care" : "Pet Shop & Supplies";
      } else {
        isEmergency = tags.emergency === "yes" || tags.veterinary === "emergency" || tags.opening_hours && tags.opening_hours.includes("24/7") || nameLower.includes("emergency") || nameLower.includes("trauma") || nameLower.includes("urgent care") || nameLower.includes("24 hour") || nameLower.includes("24hr") || nameLower.includes("24/7");
        const isHospital = tags.veterinary === "hospital" || tags.healthcare === "hospital" || nameLower.includes("hospital");
        if (isEmergency) {
          placeType = "emergency_vet";
          categoryLabel = "Emergency Veterinary Hospital";
        } else if (isHospital) {
          placeType = "hospital";
          categoryLabel = "Veterinary Hospital";
        } else {
          placeType = "clinic";
          categoryLabel = "Veterinary Clinic";
        }
      }
      if (category && category !== "all") {
        if (category === "veterinary") {
          if (placeType !== "hospital" && placeType !== "clinic" && placeType !== "emergency_vet") {
            continue;
          }
        } else if (category === "emergency_vet") {
          if (placeType !== "emergency_vet" && !isEmergency && placeType !== "hospital") {
            continue;
          }
        } else if (category === "pet_shop") {
          if (placeType !== "pet_shop" && placeType !== "pet_pharmacy") {
            continue;
          }
        } else if (category === "shelter") {
          if (placeType !== "shelter") {
            continue;
          }
        } else if (category === "rescue") {
          if (placeType !== "rescue" && placeType !== "welfare_org") {
            continue;
          }
        } else if (placeType !== category) {
          continue;
        }
      }
      const street = tags["addr:street"] || tags["addr:road"] || "";
      const housenumber = tags["addr:housenumber"] || "";
      const suburb = tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:district"] || "";
      const city = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || tags["addr:county"] || "";
      const state = tags["addr:state"] || "";
      const postcode = tags["addr:postcode"] || "";
      const country = tags["addr:country"] || "";
      const addressParts = [
        [housenumber, street].filter(Boolean).join(" "),
        suburb,
        city,
        state,
        postcode,
        country
      ].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(", ") : `${name}, GPS: ${lat.toFixed(4)}\xB0, ${lng.toFixed(4)}\xB0`;
      const phone = tags.phone || tags["contact:phone"] || tags["phone:mobile"] || tags["contact:mobile"] || null;
      const openHours = tags.opening_hours || (isEmergency ? "24/7 Emergency Care" : null);
      const isOpen = parseIsOpen(openHours);
      const website = tags.website || tags["contact:website"] || tags.url || null;
      const distanceKm = calculateHaversineDistanceKm(userLat, userLng, lat, lng);
      results.push({
        id: `osm_${elem.type}_${elem.id}`,
        name,
        type: placeType,
        categoryLabel,
        lat,
        lng,
        distanceKm,
        distanceFormatted: formatDistanceKm(distanceKm),
        distanceFormattedMi: formatDistanceMi(distanceKm),
        address,
        phone,
        openHours,
        isOpen,
        website,
        isEmergency,
        directionUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      });
    }
    results.sort((a, b) => a.distanceKm - b.distanceKm);
    placesCache.set(cacheKey, {
      timestamp: Date.now(),
      results
    });
    return results;
  } catch (err) {
    console.warn("[Places Service] Notice:", err.message);
    if (cached) {
      return cached.results;
    }
    return [];
  }
}

// server.ts
var app = (0, import_express2.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/,
  /^https:\/\/[a-zA-Z0-9-]+\.feeder\.org$/,
  /^https:\/\/feeder\.org$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
  /^https:\/\/localhost$/
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Client-Info, Accept");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});
app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "feeder-backend",
    version: "1.0.0"
  });
});
app.use(import_express2.default.json({ limit: "50mb" }));
app.use(import_express2.default.urlencoded({ extended: true, limit: "50mb" }));
app.get("/firebase-messaging-sw.js", (_req, res) => {
  res.setHeader("Content-Type", "text/javascript");
  res.setHeader("Service-Worker-Allowed", "/");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(import_path.default.resolve(process.cwd(), "public", "firebase-messaging-sw.js"));
});
app.use("/api", backendRouter);
app.use("/", backendRouter);
var geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.GOOGLE_AI_API_KEY)?.trim();
var ai = geminiApiKey && geminiApiKey.length > 5 ? new import_genai2.GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "feeder-pawsy-ai"
    }
  }
}) : null;
console.log(`[Pawsy] AI provider status: ${ai ? "Google Gemini (@google/genai) active" : "Running on multilingual context engine (no Gemini key configured)"}`);
var WORLD_CITIES = [
  { name: "London, UK", displayName: "London, Greater London, England, United Kingdom", lat: 51.5074, lng: -0.1278 },
  { name: "New York, NY", displayName: "New York City, New York, United States", lat: 40.7128, lng: -74.006 },
  { name: "Tokyo, Japan", displayName: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney, Australia", displayName: "Sydney, New South Wales, Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Toronto, Canada", displayName: "Toronto, Ontario, Canada", lat: 43.6532, lng: -79.3832 },
  { name: "Paris, France", displayName: "Paris, \xCEle-de-France, France", lat: 48.8566, lng: 2.3522 },
  { name: "Berlin, Germany", displayName: "Berlin, Germany", lat: 52.52, lng: 13.405 },
  { name: "S\xE3o Paulo, Brazil", displayName: "S\xE3o Paulo, State of S\xE3o Paulo, Brazil", lat: -23.5505, lng: -46.6333 },
  { name: "Dubai, UAE", displayName: "Dubai, United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { name: "Singapore", displayName: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Mumbai, India", displayName: "Mumbai, Maharashtra, India", lat: 19.076, lng: 72.8777 },
  { name: "Nairobi, Kenya", displayName: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "Cairo, Egypt", displayName: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "Mexico City, Mexico", displayName: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Seoul, South Korea", displayName: "Seoul, South Korea", lat: 37.5665, lng: 126.978 },
  { name: "San Francisco, CA", displayName: "San Francisco, California, United States", lat: 37.7749, lng: -122.4194 }
];
app.get(["/api/location/reverse-geocode", "/location/reverse-geocode"], async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Valid lat and lng query params are required" });
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4e3);
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FeederAnimalCareApp/2.0 (global.animalcommunity.app)",
        "Accept-Language": "en"
      }
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const neighborhood = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || addr.town || addr.county;
      const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.state;
      const country = addr.country || "";
      const name = neighborhood && city ? `${neighborhood}, ${city}` : city || neighborhood || country || "Current Location";
      const displayName = data.display_name || `${name}, ${country}`;
      return res.json({
        name,
        displayName,
        lat,
        lng
      });
    }
  } catch (err) {
  }
  const latLabel = lat >= 0 ? `${lat.toFixed(3)}\xB0 N` : `${Math.abs(lat).toFixed(3)}\xB0 S`;
  const lngLabel = lng >= 0 ? `${lng.toFixed(3)}\xB0 E` : `${Math.abs(lng).toFixed(3)}\xB0 W`;
  return res.json({
    name: `Location (${latLabel}, ${lngLabel})`,
    displayName: `GPS: ${latLabel}, ${lngLabel}`,
    lat,
    lng
  });
});
app.get(["/api/location/geocode", "/location/geocode"], async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    return res.json({ results: WORLD_CITIES.slice(0, 10) });
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FeederAnimalCareApp/2.0 (global.animalcommunity.app)",
        "Accept-Language": "en"
      }
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map((item) => {
          const addr = item.address || {};
          const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential;
          const city = addr.city || addr.town || addr.county || addr.state;
          const country = addr.country || "";
          const shortName = neighborhood && city ? `${neighborhood}, ${city}` : city ? `${city}${country ? `, ${country}` : ""}` : item.name || q;
          return {
            name: shortName,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
        return res.json({ results });
      }
    }
  } catch (err) {
  }
  const matches = WORLD_CITIES.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.displayName.toLowerCase().includes(q.toLowerCase())
  );
  if (matches.length > 0) {
    return res.json({ results: matches });
  }
  return res.json({ results: [] });
});
app.get(["/api/location/nearby-places", "/location/nearby-places"], async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const category = req.query.category || "all";
  const radiusKm = parseFloat(req.query.radiusKm) || 10;
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Valid lat and lng query params are required" });
  }
  try {
    const places = await fetchNearbyPetPlaces(lat, lng, radiusKm, category);
    return res.json({
      success: true,
      places,
      count: places.length,
      userLocation: { lat, lng },
      radiusKm
    });
  } catch (err) {
    console.error("[API Nearby Places] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch nearby places" });
  }
});
app.get(["/api/location/veterinary", "/location/veterinary"], async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const emergencyOnly = req.query.emergencyOnly === "true";
  const radiusKm = parseFloat(req.query.radiusKm) || 25;
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Valid lat and lng query params are required" });
  }
  try {
    const category = emergencyOnly ? "hospital" : "clinic";
    const places = await fetchNearbyPetPlaces(lat, lng, radiusKm, category);
    const filtered = emergencyOnly ? places.filter((p) => p.isEmergency || p.type === "hospital") : places;
    return res.json({
      hospitals: filtered,
      userLocation: { lat, lng },
      total: filtered.length
    });
  } catch (err) {
    console.error("[API Veterinary] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch veterinary hospitals" });
  }
});
app.post(["/api/chat", "/chat"], async (req, res) => {
  const { message, history, context } = req.body;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message string is required" });
  }
  try {
    const chatResult = await handleChatMessage(message, history, context, ai);
    return res.json(chatResult);
  } catch (err) {
    console.error("[Chat Endpoint] Safe error:", err.message || err);
    return res.status(500).json({
      error: "Pawsy communication issue",
      reply: "Sorry, I had a momentary communication issue. Please try your message again, or check the Nearby Map / Urgent Help section.",
      suggestions: ["\u{1F6A8} Urgent Help", "\u{1FA7A} Nearby Vets"],
      actions: []
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `API endpoint '${req.path}' not found` });
      }
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Feeder Full-Stack Server running on port ${PORT}`);
  });
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
