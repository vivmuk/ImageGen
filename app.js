// Venice AI Image Generator Application

// API Key management - stored in localStorage, never hardcoded
function getApiKey() {
  return localStorage.getItem('venice_api_key') || '';
}

function setApiKey(key) {
  localStorage.setItem('venice_api_key', key.trim());
}

function hasApiKey() {
  const key = getApiKey();
  return key && key.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Venice API transport
// ---------------------------------------------------------------------------

const VENICE_API_BASE = 'https://api.venice.ai/api/v1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Venice caps image width/height at 1280px per side on /image/generate.
const MAX_IMAGE_DIMENSION = 1280;

// Single entry point for every Venice call: attaches auth, falls back to the
// CORS proxy when the browser blocks the direct request, and normalises the
// error shape (Venice returns `error` as either a string or {message}).
async function veniceFetch(path, options = {}) {
  const { method = 'GET', body = null } = options;
  const url = `${VENICE_API_BASE}${path}`;

  const headers = {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json'
  };

  const init = { method, headers };
  if (body !== null) init.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url, init);
  } catch (directError) {
    console.log(`Direct call to ${path} failed (${directError.message}), trying CORS proxy`);
    response = await fetch(CORS_PROXY + encodeURIComponent(url), {
      ...init,
      headers: { ...headers, 'X-Requested-With': 'XMLHttpRequest' }
    });
  }

  // Errors can come back as JSON or as plain text (proxy/gateway responses).
  const raw = await response.text();
  let result;
  try {
    result = raw ? JSON.parse(raw) : {};
  } catch (parseError) {
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${raw.slice(0, 200)}`);
    throw new Error('Venice returned a malformed response');
  }

  if (!response.ok) {
    const detail =
      result.error?.message ||
      (typeof result.error === 'string' ? result.error : null) ||
      result.message ||
      result.details ||
      `HTTP ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    error.body = result;
    throw error;
  }

  return result;
}

// Model options from Venice AI (will be populated dynamically)
let MODELS = [];

// Text model used by the prompt optimizer. Resolved at boot from
// /models/traits?type=text; this ID is only the last-resort fallback.
const FALLBACK_TEXT_MODEL = 'grok-41-fast';
let TEXT_MODEL_ID = null;

// Fallback models when the catalog request fails. Best-effort only - the live
// GET /models?type=image response is always authoritative when it succeeds.
const FALLBACK_MODELS = [
  {
    id: "venice-sd35",
    name: "Venice SD35",
    traits: ["default", "eliza-default"],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 25, max: 30 },
      widthHeightDivisor: 16
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "hidream",
    name: "HiDream",
    traits: [],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 8
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "flux-2-pro",
    name: "Flux 2 Pro",
    traits: [],
    constraints: {
      promptCharacterLimit: 3000,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 1
    },
    pricing: {
      generation: { usd: 0.04 }
    }
  },
  {
    id: "flux-2-max",
    name: "Flux 2 Max",
    traits: [],
    constraints: {
      promptCharacterLimit: 3000,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 1
    },
    pricing: {
      generation: { usd: 0.09 }
    }
  },
  // The three models below size by aspect ratio, not width/height, and take no
  // diffusion steps - hence no `steps` / `widthHeightDivisor` entries.
  {
    id: "gpt-image-1-5",
    name: "GPT Image 1.5",
    traits: [],
    capabilities: { supportsWebSearch: true },
    constraints: {
      promptCharacterLimit: 32768,
      aspectRatios: ["1:1", "16:9", "9:16"],
      defaultAspectRatio: "1:1"
    },
    pricing: {
      generation: { usd: 0.23 }
    }
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    traits: [],
    capabilities: { supportsWebSearch: true },
    constraints: {
      promptCharacterLimit: 32768,
      aspectRatios: ["1:1", "16:9", "9:16"],
      defaultAspectRatio: "1:1",
      resolutions: ["1K", "2K", "4K"],
      defaultResolution: "2K"
    },
    pricing: {
      generation: { usd: 0.18 }
    }
  },
  {
    id: "seedream-v4",
    name: "SeedreamV4.5",
    traits: [],
    constraints: {
      promptCharacterLimit: 1500,
      aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
      defaultAspectRatio: "1:1"
    },
    pricing: {
      generation: { usd: 0.05 }
    }
  },
  {
    id: "lustify-sdxl",
    name: "Lustify SDXL",
    traits: [],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 8
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "lustify-v7",
    name: "Lustify v7",
    traits: [],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 8
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "qwen-image",
    name: "Qwen Image",
    traits: ["highest_quality"],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 8, max: 8 },
      widthHeightDivisor: 8
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "wai-Illustrious",
    name: "Anime (WAI)",
    traits: [],
    constraints: {
      promptCharacterLimit: 1500,
      steps: { default: 25, max: 30 },
      widthHeightDivisor: 16
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  },
  {
    id: "z-image-turbo",
    name: "Z-Image Turbo",
    traits: [],
    constraints: {
      promptCharacterLimit: 7500,
      steps: { default: 8, max: 8 },
      widthHeightDivisor: 8
    },
    pricing: {
      generation: { usd: 0.01 }
    }
  }
];

// Normalise one /models entry. Keeping `capabilities` is what lets the app
// decide per model which request fields are legal — never hardcode model IDs.
function normalizeModel(entry) {
  const spec = entry.model_spec || {};
  return {
    id: entry.id,
    name: spec.name || entry.id,
    description: spec.description || '',
    traits: spec.traits || [],
    capabilities: spec.capabilities || {},
    constraints: spec.constraints || {},
    pricing: spec.pricing || {},
    beta: Boolean(spec.beta || spec.betaModel),
    offline: Boolean(spec.offline)
  };
}

// Function to fetch available models from Venice AI API
async function fetchModels() {
  try {
    const data = await veniceFetch('/models?type=image');

    // The catalog is `{ object: "list", data: [...] }`; tolerate a bare array.
    const entries = Array.isArray(data) ? data : (data.data || []);
    if (!entries.length) throw new Error('Model catalog came back empty');

    // Offline models are listed but cannot serve requests - treat as absent.
    MODELS = entries.map(normalizeModel).filter(model => !model.offline);

    console.log('Fetched models:', MODELS);
    return MODELS;
  } catch (error) {
    console.error('Error fetching models:', error);
    console.log('Using fallback models');
    // Fallback to full model list if API fails
    MODELS = FALLBACK_MODELS;
    return FALLBACK_MODELS;
  }
}

// Resolve the text model used by the prompt optimizer from /models/traits so
// we never ship a stale hardcoded ID.
async function fetchTextModel() {
  try {
    const traits = await veniceFetch('/models/traits?type=text');
    const map = traits.data || {};
    TEXT_MODEL_ID = map.fastest || map.default || map.most_intelligent || null;
  } catch (error) {
    console.warn('Could not resolve a text model from traits:', error.message);
  }

  if (!TEXT_MODEL_ID) {
    try {
      const list = await veniceFetch('/models?type=text');
      const entries = (Array.isArray(list) ? list : (list.data || []))
        .map(normalizeModel)
        .filter(model => !model.offline && !model.beta);
      if (entries.length) TEXT_MODEL_ID = entries[0].id;
    } catch (error) {
      console.warn('Could not list text models:', error.message);
    }
  }

  if (!TEXT_MODEL_ID) TEXT_MODEL_ID = FALLBACK_TEXT_MODEL;
  console.log('Prompt optimizer model:', TEXT_MODEL_ID);
  return TEXT_MODEL_ID;
}

// ---------------------------------------------------------------------------
// Model capability probing
//
// Image models on Venice pick exactly one sizing idiom, and reject fields that
// belong to a different one. Everything below reads the model's own
// `model_spec` rather than matching on model IDs, so newly launched models work
// without a code change.
// ---------------------------------------------------------------------------

// Models exposing constraints.aspectRatios size by ratio, not width/height.
function usesAspectRatio(model) {
  return Array.isArray(model?.constraints?.aspectRatios) &&
         model.constraints.aspectRatios.length > 0;
}

// Models exposing constraints.resolutions take a "1K"/"2K"/"4K" tier.
function usesResolutionTier(model) {
  return Array.isArray(model?.constraints?.resolutions) &&
         model.constraints.resolutions.length > 0;
}

// steps / cfg_scale are diffusion knobs. Ratio-sized models (Nano Banana,
// GPT Image, Seedream) have no steps constraint and reject them.
function usesDiffusionControls(model) {
  return Boolean(model?.constraints?.steps) && !usesAspectRatio(model);
}

function supportsWebSearch(model) {
  return Boolean(model?.capabilities?.supportsWebSearch);
}

function supportsNegativePrompt(model) {
  if (model?.capabilities?.supportsNegativePrompt !== undefined) {
    return Boolean(model.capabilities.supportsNegativePrompt);
  }
  // Not advertised explicitly: negative prompts are a diffusion-pipeline
  // feature, so mirror the diffusion-controls check.
  return usesDiffusionControls(model);
}

function supportsStylePreset(model) {
  if (model?.capabilities?.supportsStylePreset !== undefined) {
    return Boolean(model.capabilities.supportsStylePreset);
  }
  return usesDiffusionControls(model);
}

function supportsLoras(model) {
  return Boolean(
    model?.capabilities?.supportsLoras ||
    model?.constraints?.loraStrength ||
    (model?.traits || []).some(trait => String(trait).toLowerCase().includes('lora'))
  );
}

// Snap a requested ratio to one the model actually accepts.
function pickAspectRatio(model, requested) {
  const supported = model.constraints.aspectRatios;
  if (requested && supported.includes(requested)) return requested;

  const ratioValue = (str) => {
    const [w, h] = String(str).split(':').map(Number);
    return (w && h) ? w / h : NaN;
  };

  const target = ratioValue(requested);
  if (!Number.isFinite(target)) {
    return model.constraints.defaultAspectRatio || supported[0];
  }

  return supported.reduce((best, candidate) => {
    const delta = Math.abs(ratioValue(candidate) - target);
    return delta < Math.abs(ratioValue(best) - target) ? candidate : best;
  }, supported[0]);
}

// Map the UI's low/medium/high/ultra tiers onto the model's own tier names.
const RESOLUTION_TIER_ORDER = ['low', 'medium', 'high', 'ultra'];

function pickResolutionTier(model, requestedTier) {
  const supported = model.constraints.resolutions;
  if (supported.includes(requestedTier)) return requestedTier;

  const index = Math.max(0, RESOLUTION_TIER_ORDER.indexOf(requestedTier));
  const scaled = Math.round((index / (RESOLUTION_TIER_ORDER.length - 1)) * (supported.length - 1));
  return supported[scaled] || model.constraints.defaultResolution || supported[0];
}

// Fit width/height inside Venice's 1280px cap while keeping the aspect ratio,
// then snap both sides to the model's widthHeightDivisor.
function fitDimensions(width, height, divisor) {
  const step = divisor || 8;
  let w = width;
  let h = height;

  const largest = Math.max(w, h);
  if (largest > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / largest;
    w = Math.floor(w * scale);
    h = Math.floor(h * scale);
  }

  const snap = (value) => {
    let snapped = Math.round(value / step) * step;
    if (snapped > MAX_IMAGE_DIMENSION) snapped -= step;
    return Math.max(step, snapped);
  };

  return { width: snap(w), height: snap(h) };
}

// Per-image price. Resolution-tiered models price per tier instead of flat.
function getModelPrice(model, resolutionTier) {
  const pricing = model?.pricing || {};
  if (typeof pricing.generation?.usd === 'number') return pricing.generation.usd;

  const tiers = pricing.resolutions;
  if (tiers && typeof tiers === 'object') {
    if (resolutionTier && typeof tiers[resolutionTier]?.usd === 'number') {
      return tiers[resolutionTier].usd;
    }
    const values = Object.values(tiers)
      .map(tier => tier?.usd)
      .filter(usd => typeof usd === 'number');
    if (values.length) return Math.min(...values);
  }

  return 0;
}

// Ratio-sized models never carry pixel dimensions - label them by ratio/tier.
function formatSize(image) {
  if (!image) return '-';
  if (image.width && image.height) return `${image.width}×${image.height}`;
  const parts = [image.aspectRatio, image.resolution].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'model default';
}

function truncateToLimit(text, limit) {
  if (!text || !limit || text.length <= limit) return text;
  console.warn(`Prompt truncated from ${text.length} to ${limit} characters`);
  return text.slice(0, limit);
}

/**
 * Build an /image/generate payload that only contains fields the given model
 * accepts. This is the single place that decides how a model gets called.
 *
 * opts: { prompt, negativePrompt, style, width, height, aspectRatio,
 *         resolutionTier, steps, cfgScale, seed, variants, format,
 *         hideWatermark, embedMetadata, safeMode, loraStrength, webSearch }
 */
function buildImagePayload(model, opts = {}) {
  const constraints = model.constraints || {};
  const limit = constraints.promptCharacterLimit;

  const payload = {
    model: model.id,
    prompt: truncateToLimit(opts.prompt, limit),
    return_binary: false,
    format: opts.format || 'webp'
  };

  // --- sizing: exactly one idiom per model ---------------------------------
  if (usesAspectRatio(model)) {
    payload.aspect_ratio = pickAspectRatio(model, opts.aspectRatio);
    if (usesResolutionTier(model)) {
      payload.resolution = pickResolutionTier(model, opts.resolutionTier);
    }
  } else {
    const fitted = fitDimensions(
      opts.width || 1024,
      opts.height || 1024,
      constraints.widthHeightDivisor
    );
    payload.width = fitted.width;
    payload.height = fitted.height;
    if (usesResolutionTier(model)) {
      payload.resolution = pickResolutionTier(model, opts.resolutionTier);
    }
  }

  // --- diffusion-only knobs ------------------------------------------------
  if (usesDiffusionControls(model)) {
    const maxSteps = constraints.steps.max || 50;
    const requested = opts.steps || constraints.steps.default || 20;
    payload.steps = Math.max(1, Math.min(requested, maxSteps));

    if (typeof opts.cfgScale === 'number' && !Number.isNaN(opts.cfgScale)) {
      payload.cfg_scale = Math.max(0.1, Math.min(opts.cfgScale, 20));
    }
  }

  if (supportsStylePreset(model) && opts.style && opts.style !== 'None') {
    payload.style_preset = opts.style;
  }

  if (supportsNegativePrompt(model) && opts.negativePrompt) {
    payload.negative_prompt = truncateToLimit(opts.negativePrompt, limit);
  }

  if (supportsLoras(model) && typeof opts.loraStrength === 'number') {
    payload.lora_strength = Math.max(0, Math.min(opts.loraStrength, 100));
  }

  // --- generic knobs -------------------------------------------------------
  if (typeof opts.seed === 'number' && !Number.isNaN(opts.seed)) {
    payload.seed = Math.max(-999999999, Math.min(opts.seed, 999999999));
  }

  // variants > 1 is only legal alongside return_binary: false.
  const variants = Math.max(1, Math.min(opts.variants || 1, 4));
  if (variants > 1) payload.variants = variants;

  if (opts.hideWatermark !== undefined) payload.hide_watermark = Boolean(opts.hideWatermark);
  if (opts.embedMetadata !== undefined) payload.embed_exif_metadata = Boolean(opts.embedMetadata);
  if (opts.safeMode !== undefined) payload.safe_mode = Boolean(opts.safeMode);

  // Only send enable_web_search to models that advertise it - it is billed
  // extra and rejected by models without the capability.
  if (opts.webSearch && supportsWebSearch(model)) payload.enable_web_search = true;

  return payload;
}

// Pull every image out of a /image/generate response, whatever shape it uses.
function extractImages(result) {
  let images = [];

  if (Array.isArray(result?.images)) {
    images = result.images;
  } else if (typeof result?.images === 'string') {
    images = [result.images];
  } else if (result?.image) {
    images = [result.image];
  } else if (Array.isArray(result?.data)) {
    // OpenAI-compatible shape, in case the endpoint ever returns it.
    images = result.data.map(item => item.b64_json || item.url).filter(Boolean);
  }

  return images
    .filter(Boolean)
    .map(image => image.startsWith('data:image') ? image : `data:image/webp;base64,${image}`);
}

// Style presets from Venice AI
const STYLE_PRESETS = [
  "None",
  "3D Model", "Analog Film", "Anime", "Cinematic", "Comic Book", "Craft Clay", 
  "Digital Art", "Enhance", "Fantasy Art", "Isometric Style", "Line Art", 
  "Lowpoly", "Neon Punk", "Origami", "Photographic", "Pixel Art", "Texture", 
  "Advertising", "Food Photography", "Real Estate", "Abstract", "Cubist", 
  "Graffiti", "Hyperrealism", "Impressionist", "Pointillism", "Pop Art", 
  "Psychedelic", "Renaissance", "Steampunk", "Surrealist", "Typography", 
  "Watercolor", "Fighting Game", "GTA", "Super Mario", "Minecraft", "Pokemon", 
  "Retro Arcade", "Retro Game", "RPG Fantasy Game", "Strategy Game", 
  "Street Fighter", "Legend of Zelda", "Architectural", "Disco", "Dreamscape", 
  "Dystopian", "Fairy Tale", "Gothic", "Grunge", "Horror", "Minimalist", 
  "Monochrome", "Nautical", "Space", "Stained Glass", "Techwear Fashion", 
  "Tribal", "Zentangle", "Collage", "Flat Papercut", "Kirigami", "Paper Mache", 
  "Paper Quilling", "Papercut Collage", "Papercut Shadow Box", "Stacked Papercut", 
  "Thick Layered Papercut", "Alien", "Film Noir", "HDR", "Long Exposure", 
  "Neon Noir", "Silhouette", "Tilt-Shift"
];

// Resolution presets based on aspect ratio
const RESOLUTION_PRESETS = {
  "16:9": {
    low: { width: 640, height: 360 },
    medium: { width: 1024, height: 576 },
    high: { width: 1280, height: 720 },
    ultra: { width: 1920, height: 1080 }
  },
  "1:1": {
    low: { width: 512, height: 512 },
    medium: { width: 768, height: 768 },
    high: { width: 1024, height: 1024 },
    ultra: { width: 1536, height: 1536 }
  },
  "3:2": {
    low: { width: 600, height: 400 },
    medium: { width: 1080, height: 720 },
    high: { width: 1350, height: 900 },
    ultra: { width: 1800, height: 1200 }
  },
  "9:16": {
    low: { width: 360, height: 640 },
    medium: { width: 576, height: 1024 },
    high: { width: 720, height: 1280 },
    ultra: { width: 1080, height: 1920 }
  },
  "2:3": {
    low: { width: 400, height: 600 },
    medium: { width: 720, height: 1080 },
    high: { width: 900, height: 1350 },
    ultra: { width: 1200, height: 1800 }
  },
  "4:3": {
    low: { width: 640, height: 480 },
    medium: { width: 1024, height: 768 },
    high: { width: 1280, height: 960 },
    ultra: { width: 1600, height: 1200 }
  }
};

// API Key modal functions
function showApiKeyModal(message) {
  const modal = document.getElementById('api-key-modal');
  if (modal) {
    // Pre-fill with existing key if any
    const input = document.getElementById('api-key-input');
    if (input) input.value = getApiKey();

    const msgEl = document.getElementById('api-key-modal-message');
    if (msgEl) msgEl.textContent = message || '';

    modal.classList.remove('hidden');
  }
}

function hideApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) modal.classList.add('hidden');
}

function saveApiKeyAndInit() {
  const input = document.getElementById('api-key-input');
  const key = input ? input.value.trim() : '';
  if (!key) {
    const msgEl = document.getElementById('api-key-modal-message');
    if (msgEl) msgEl.textContent = 'Please enter a valid API key.';
    return;
  }
  setApiKey(key);
  hideApiKeyModal();
  // Re-initialize the app now that we have a key
  window._veniceApp = new VeniceImageGenerator();
}

// Main application class
class VeniceImageGenerator {
  constructor() {
    this.generatedImages = [];
    this.progressInterval = null;
    this.startTime = null;
    this.currentSlideIndex = 0;
    this.reelAutoPlayInterval = null;
    this.initializeApp();
  }

  async initializeApp() {
    // Check for API key before doing anything else
    if (!hasApiKey()) {
      showApiKeyModal();
      return;
    }
    // Fetch models first, then setup DOM. The text model for the prompt
    // optimizer resolves in the background - it is not needed to render.
    await fetchModels();
    fetchTextModel();
    this.setupDOM();
    this.setupTabs();
    this.addEventListeners();
  }

  setupDOM() {
    // Populate model dropdown - default to whichever model Venice flags as
    // "default" rather than a hardcoded ID that may have been retired.
    const modelSelect = document.getElementById('model');
    if (modelSelect) {
      const defaultModel =
        MODELS.find(m => (m.traits || []).includes('default')) || MODELS[0];

      modelSelect.innerHTML = MODELS.map(model =>
        `<option value="${model.id}" ${model.id === defaultModel?.id ? "selected" : ""}>${model.name}</option>`
      ).join('');

      // Add change listener for model capabilities
      modelSelect.addEventListener('change', () => {
        this.updateModelCapabilities(modelSelect.value);
      });

      // Show initial model capabilities
      setTimeout(() => this.updateModelCapabilities(modelSelect.value), 100);
    }

    // Populate web search model dropdown from the capability flag, so newly
    // launched web-search models show up without a code change.
    const websearchModelSelect = document.getElementById('websearch-model');
    if (websearchModelSelect) {
      const webModels = MODELS.filter(supportsWebSearch);
      if (webModels.length) {
        websearchModelSelect.innerHTML = webModels.map(model => {
          const price = getModelPrice(model);
          // Tiered models have no single price - show the floor as "from".
          const prefix = usesResolutionTier(model) ? 'from ' : '';
          const label = price ? `${model.name} (${prefix}$${price.toFixed(2)})` : model.name;
          return `<option value="${model.id}">${label}</option>`;
        }).join('');
        websearchModelSelect.disabled = false;
      } else {
        websearchModelSelect.innerHTML =
          '<option value="">No web-search models available</option>';
        websearchModelSelect.disabled = true;
      }
    }

    // Populate style dropdown
    const styleSelect = document.getElementById('style');
    if (styleSelect) {
      styleSelect.innerHTML = STYLE_PRESETS.map(style =>
        `<option value="${style}">${style}</option>`
      ).join('');
    }

    // Populate comparison style dropdown
    const comparisonStyleSelect = document.getElementById('comparison-style');
    if (comparisonStyleSelect) {
      comparisonStyleSelect.innerHTML = STYLE_PRESETS.map(style =>
        `<option value="${style}">${style}</option>`
      ).join('');
    }

    // Populate web search style dropdown
    const websearchStyleSelect = document.getElementById('websearch-style');
    if (websearchStyleSelect) {
      websearchStyleSelect.innerHTML = STYLE_PRESETS.map(style =>
        `<option value="${style}">${style}</option>`
      ).join('');
    }

    // Setup aspect ratio and resolution handlers
    this.setupResolutionHandlers();

    // Setup advanced settings
    this.setupAdvancedSettings();
  }

  updateModelCapabilities(modelId) {
    const model = MODELS.find(m => m.id === modelId);
    const capabilitiesDiv = document.getElementById('model-capabilities');

    if (!model || !capabilitiesDiv) return;

    // Show the capabilities section
    capabilitiesDiv.classList.remove('hidden');

    // Update values
    document.getElementById('capabilities-model-name').textContent = model.name;
    document.getElementById('cap-prompt-limit').textContent =
      model.constraints?.promptCharacterLimit ? `${model.constraints.promptCharacterLimit} chars` : 'N/A';
    // Ratio-sized models ignore steps and the width/height divisor entirely.
    document.getElementById('cap-max-steps').textContent =
      usesDiffusionControls(model) ? (model.constraints.steps.max || 'N/A') : 'n/a';
    document.getElementById('cap-divisor').textContent =
      usesAspectRatio(model)
        ? (model.constraints.aspectRatios || []).join(', ')
        : (model.constraints?.widthHeightDivisor || 'N/A');

    // Price the tier the form is currently set to, not the cheapest one.
    const tier = usesResolutionTier(model)
      ? pickResolutionTier(model, document.getElementById('resolution')?.value || 'medium')
      : undefined;
    const price = getModelPrice(model, tier);
    document.getElementById('cap-cost').textContent =
      price ? `$${price.toFixed(4)}${tier ? ` / ${tier}` : ''}` : 'N/A';

    // Update traits
    const traitsContainer = document.getElementById('cap-traits');
    const traitsList = document.getElementById('cap-traits-list');

    if (model.traits && model.traits.length > 0) {
      traitsContainer.classList.remove('hidden');
      traitsList.innerHTML = model.traits.map(trait =>
        `<span class="trait-badge">${trait}</span>`
      ).join('');
    } else {
      traitsContainer.classList.add('hidden');
    }
  }

  setupAdvancedSettings() {
    // Toggle advanced settings
    const toggleBtn = document.getElementById('toggle-advanced');
    const advancedSettings = document.getElementById('advanced-settings');

    if (toggleBtn && advancedSettings) {
      toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        advancedSettings.classList.toggle('hidden');
      });
    }

    // CFG Scale slider
    const cfgSlider = document.getElementById('cfg-scale');
    const cfgValue = document.getElementById('cfg-scale-value');
    if (cfgSlider && cfgValue) {
      cfgSlider.addEventListener('input', () => {
        cfgValue.textContent = cfgSlider.value;
      });
    }

    // LoRA Strength slider
    const loraSlider = document.getElementById('lora-strength');
    const loraValue = document.getElementById('lora-strength-value');
    if (loraSlider && loraValue) {
      loraSlider.addEventListener('input', () => {
        loraValue.textContent = loraSlider.value;
      });
    }

    // Random seed button
    const randomSeedBtn = document.getElementById('random-seed');
    const seedInput = document.getElementById('seed-input');
    if (randomSeedBtn && seedInput) {
      randomSeedBtn.addEventListener('click', () => {
        seedInput.value = Math.floor(Math.random() * 999999999);
      });
    }
  }
  
  setupResolutionHandlers() {
    const aspectRatioSelect = document.getElementById('aspect-ratio');
    const resolutionSelect = document.getElementById('resolution');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    
    if (aspectRatioSelect && resolutionSelect && widthInput && heightInput) {
      // Set initial values based on default selections
      this.updateDimensions(aspectRatioSelect.value, resolutionSelect.value);
      
      // Add event listeners for changes
      aspectRatioSelect.addEventListener('change', () => {
        this.updateDimensions(aspectRatioSelect.value, resolutionSelect.value);
      });
      
      resolutionSelect.addEventListener('change', () => {
        this.updateDimensions(aspectRatioSelect.value, resolutionSelect.value);
        // Resolution-tiered models are priced per tier - refresh the estimate.
        const modelSelect = document.getElementById('model');
        if (modelSelect) this.updateModelCapabilities(modelSelect.value);
      });
    }
  }
  
  updateDimensions(aspectRatio, resolution) {
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    
    if (widthInput && heightInput) {
      const preset = RESOLUTION_PRESETS[aspectRatio] || RESOLUTION_PRESETS['1:1'];
      const raw = preset[resolution] || preset.medium;
      // Presets go above Venice's 1280px cap at the ultra tier - fit them here
      // so the form never shows a size the API would reject.
      const dimensions = fitDimensions(raw.width, raw.height, 8);
      widthInput.value = dimensions.width;
      heightInput.value = dimensions.height;
      
      // Update any UI elements that show dimensions
      const sizeDisplay = document.getElementById('size-display');
      if (sizeDisplay) {
        sizeDisplay.textContent = `${dimensions.width}×${dimensions.height}px`;
      }
    }
  }

  setupTabs() {
    const generatorTab = document.getElementById('generator-tab');
    const optimizerTab = document.getElementById('optimizer-tab');
    const websearchTab = document.getElementById('websearch-tab');
    const comparisonTab = document.getElementById('comparison-tab');
    const generatorPanel = document.getElementById('generator-panel');
    const optimizerPanel = document.getElementById('optimizer-panel');
    const websearchPanel = document.getElementById('websearch-panel');
    const comparisonPanel = document.getElementById('comparison-panel');

    if (generatorTab) {
      generatorTab.addEventListener('click', () => {
        this.switchTab('generator');
      });
    }

    if (optimizerTab) {
      optimizerTab.addEventListener('click', () => {
        this.switchTab('optimizer');
      });
    }

    if (websearchTab) {
      websearchTab.addEventListener('click', () => {
        this.switchTab('websearch');
      });
    }

    if (comparisonTab) {
      comparisonTab.addEventListener('click', () => {
        this.switchTab('comparison');
      });
    }
  }
  
  switchTab(activeTab) {
    const generatorTab = document.getElementById('generator-tab');
    const optimizerTab = document.getElementById('optimizer-tab');
    const websearchTab = document.getElementById('websearch-tab');
    const comparisonTab = document.getElementById('comparison-tab');
    const generatorPanel = document.getElementById('generator-panel');
    const optimizerPanel = document.getElementById('optimizer-panel');
    const websearchPanel = document.getElementById('websearch-panel');
    const comparisonPanel = document.getElementById('comparison-panel');
    const mainGrid = document.getElementById('main-grid');
    const resultsPanel = document.querySelector('.results-panel');

    // Remove active class from all tabs
    if (generatorTab) generatorTab.classList.remove('active');
    if (optimizerTab) optimizerTab.classList.remove('active');
    if (websearchTab) websearchTab.classList.remove('active');
    if (comparisonTab) comparisonTab.classList.remove('active');

    // Hide all panels
    if (generatorPanel) generatorPanel.classList.add('hidden');
    if (optimizerPanel) optimizerPanel.classList.add('hidden');
    if (websearchPanel) websearchPanel.classList.add('hidden');
    if (comparisonPanel) comparisonPanel.classList.add('hidden');

    // Remove comparison mode class by default
    document.body.classList.remove('comparison-mode');

    // Show active tab and panel
    switch(activeTab) {
      case 'generator':
        if (generatorTab) generatorTab.classList.add('active');
        if (generatorPanel) generatorPanel.classList.remove('hidden');
        // Show two-column layout
        if (mainGrid) {
          mainGrid.classList.remove('hidden');
          mainGrid.classList.add('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-8');
        }
        if (resultsPanel) resultsPanel.style.display = '';
        break;
      case 'optimizer':
        if (optimizerTab) optimizerTab.classList.add('active');
        if (optimizerPanel) optimizerPanel.classList.remove('hidden');
        // Show two-column layout
        if (mainGrid) {
          mainGrid.classList.remove('hidden');
          mainGrid.classList.add('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-8');
        }
        if (resultsPanel) resultsPanel.style.display = '';
        break;
      case 'websearch':
        if (websearchTab) websearchTab.classList.add('active');
        if (websearchPanel) websearchPanel.classList.remove('hidden');
        // Show two-column layout
        if (mainGrid) {
          mainGrid.classList.remove('hidden');
          mainGrid.classList.add('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-8');
        }
        if (resultsPanel) resultsPanel.style.display = '';
        break;
      case 'comparison':
        if (comparisonTab) comparisonTab.classList.add('active');
        if (comparisonPanel) comparisonPanel.classList.remove('hidden');
        // Add comparison mode class for full-width layout
        document.body.classList.add('comparison-mode');
        // Hide right panel for comparison - show full width
        if (resultsPanel) resultsPanel.style.display = 'none';
        break;
    }
  }

  addEventListeners() {
    const form = document.getElementById('generate-form');
    const downloadButton = document.getElementById('download-button');
    const saveGalleryButton = document.getElementById('save-gallery-button');
    const optimizeButton = document.getElementById('optimize-button');
    const useOptimizedPromptButton = document.getElementById('use-optimized-prompt');
    const compareModelsButton = document.getElementById('compare-models-button');
    const websearchGenerateButton = document.getElementById('websearch-generate-button');

    if (form) {
      form.addEventListener('submit', this.handleGenerateImage.bind(this));
    }

    if (downloadButton) {
      downloadButton.addEventListener('click', this.handleDownloadImage.bind(this));
    }

    if (saveGalleryButton) {
      saveGalleryButton.addEventListener('click', this.handleSaveToGallery.bind(this));
    }

    if (optimizeButton) {
      optimizeButton.addEventListener('click', this.handleOptimizePrompt.bind(this));
    }

    if (useOptimizedPromptButton) {
      useOptimizedPromptButton.addEventListener('click', this.handleUseOptimizedPrompt.bind(this));
    }

    if (compareModelsButton) {
      compareModelsButton.addEventListener('click', this.handleCompareModels.bind(this));
    }

    if (websearchGenerateButton) {
      websearchGenerateButton.addEventListener('click', this.handleWebSearchGenerate.bind(this));
    }

    // Gallery controls
    const gridBtn = document.getElementById('gallery-view-grid');
    const reelBtn = document.getElementById('gallery-view-reel');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const reelPrev = document.getElementById('reel-prev');
    const reelNext = document.getElementById('reel-next');
    const reelAutoplayBtn = document.getElementById('reel-autoplay-btn');
    const reelDownloadCurrent = document.getElementById('reel-download-current');

    if (gridBtn) gridBtn.addEventListener('click', () => this.showGridView());
    if (reelBtn) reelBtn.addEventListener('click', () => this.showReelView());
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', () => this.handleDownloadAll());
    if (reelPrev) reelPrev.addEventListener('click', () => this.prevSlide());
    if (reelNext) reelNext.addEventListener('click', () => this.nextSlide());
    if (reelAutoplayBtn) reelAutoplayBtn.addEventListener('click', () => this.toggleAutoPlay());
    if (reelDownloadCurrent) {
      reelDownloadCurrent.addEventListener('click', () => {
        const img = this.generatedImages[this.currentSlideIndex];
        if (!img) return;
        const link = document.createElement('a');
        link.href = img.src;
        link.download = `vgen-${this.currentSlideIndex + 1}.png`;
        link.click();
      });
    }
  }

  startProgressIndicator() {
    // Show progress container
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const timeCounter = document.getElementById('time-counter');
    const placeholder = document.getElementById('placeholder');
    const result = document.getElementById('result');
    
    if (progressContainer && progressBar && progressPercentage && timeCounter) {
      // Hide placeholder and result
      if (placeholder) placeholder.classList.add('hidden');
      if (result) result.classList.add('hidden');
      
      // Show progress container
      progressContainer.classList.remove('hidden');
      progressBar.style.width = '0%';
      progressBar.classList.add('progress-animate');
      
      // Store start time
      this.startTime = Date.now();
      
      // Update progress indicator
      this.progressInterval = setInterval(() => {
        const elapsedSeconds = (Date.now() - this.startTime) / 1000;
        timeCounter.textContent = `${elapsedSeconds.toFixed(1)}s`;
        
        // Calculate estimated percentage (capped at 95% until complete)
        const estimatedPercentage = Math.min(95, Math.round((elapsedSeconds / 30) * 100));
        progressBar.style.width = `${estimatedPercentage}%`;
        progressPercentage.textContent = `${estimatedPercentage}%`;
      }, 100);
    }
  }
  
  stopProgressIndicator(success = true) {
    clearInterval(this.progressInterval);
    
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    
    if (progressContainer && progressBar) {
      if (success) {
        // Complete the progress bar animation
        progressBar.style.width = '100%';
        if (progressPercentage) progressPercentage.textContent = '100%';
        
        // Hide after a delay
        setTimeout(() => {
          progressContainer.classList.add('hidden');
          progressBar.classList.remove('progress-animate');
        }, 500);
      } else {
        // Show error state
        progressBar.style.backgroundColor = '#EF4444';
        progressBar.style.width = '100%';
        
        // Hide after a delay
        setTimeout(() => {
          progressContainer.classList.add('hidden');
          progressBar.style.backgroundColor = ''; // Reset to use the CSS gradient
          progressBar.classList.remove('progress-animate');
          
          // Show placeholder again on error
          const placeholder = document.getElementById('placeholder');
          if (placeholder) placeholder.classList.remove('hidden');
        }, 1000);
      }
    }
  }

  async handleGenerateImage(event) {
    event.preventDefault();
    
    // Get form values
    const model = document.getElementById('model')?.value;
    const style = document.getElementById('style')?.value;
    const prompt = document.getElementById('prompt')?.value;
    const negativePrompt = document.getElementById('negative-prompt')?.value || '';
    const bannerText = document.getElementById('banner-text')?.value || '';
    const width = parseInt(document.getElementById('width')?.value || '1024');
    const height = parseInt(document.getElementById('height')?.value || '576');
    const steps = parseInt(document.getElementById('steps')?.value || '20');
    
    // Validate inputs
    if (!prompt) {
      alert('Please enter a prompt to describe the image you want to generate.');
      return;
    }
    
    // Start progress indicator
    this.startProgressIndicator();
    
    try {
      // Prepare request body
      let finalPrompt = prompt;
      
      // Add banner text with more specific instructions if provided
      if (bannerText) {
        finalPrompt += `, with text "${bannerText}" displayed in a prominent red banner at the top of the image, white text, clear and readable font`;
      }
      
      // Resolve the model spec so the payload only carries fields it accepts
      const selectedModel = MODELS.find(m => m.id === model);
      if (!selectedModel) {
        throw new Error(`Model "${model}" is no longer available. Reload to refresh the model list.`);
      }

      // Get advanced settings
      const cfgScale = parseFloat(document.getElementById('cfg-scale')?.value || '7.5');
      const loraStrength = parseInt(document.getElementById('lora-strength')?.value || '50');
      const seedInput = document.getElementById('seed-input')?.value;
      const seed = seedInput ? parseInt(seedInput) : Math.floor(Math.random() * 999999999);
      const variants = parseInt(document.getElementById('variants')?.value || '1');
      const format = document.getElementById('format')?.value || 'webp';
      const hideWatermark = document.getElementById('hide-watermark')?.checked ?? true;
      const embedMetadata = document.getElementById('embed-metadata')?.checked ?? false;
      const ageVerification = document.getElementById('age-verification')?.checked ?? false;
      const aspectRatio = document.getElementById('aspect-ratio')?.value || '1:1';
      const resolutionTier = document.getElementById('resolution')?.value || 'medium';

      const payload = buildImagePayload(selectedModel, {
        prompt: finalPrompt,
        negativePrompt: negativePrompt,
        style: style,
        width: width,
        height: height,
        aspectRatio: aspectRatio,
        resolutionTier: resolutionTier,
        steps: steps,
        cfgScale: cfgScale,
        seed: seed,
        variants: variants,
        format: format,
        hideWatermark: hideWatermark,
        embedMetadata: embedMetadata,
        safeMode: !ageVerification,
        loraStrength: loraStrength
      });

      console.log('Sending request with payload:', payload);

      const result = await veniceFetch('/image/generate', { method: 'POST', body: payload });
      console.log('API response:', result);

      // Update progress indicator to complete
      this.stopProgressIndicator(true);

      const images = extractImages(result);
      const imageData = images[0] || null;

      if (imageData) {
        const imageElement = document.getElementById('generated-image');
        if (imageElement) {
          imageElement.src = imageData;

          // Store current image - report what was actually sent, not what the
          // form asked for, since the payload builder adapts to the model.
          this.currentImage = {
            src: imageData,
            prompt: prompt,
            model: model,
            style: payload.style_preset || 'No preset',
            width: payload.width || null,
            height: payload.height || null,
            aspectRatio: payload.aspect_ratio || null,
            resolution: payload.resolution || null,
            steps: payload.steps ?? 'n/a',
            timestamp: new Date().toISOString()
          };

          // Banner text is now part of the generated image, so we don't need to show a separate banner
          const bannerElement = document.getElementById('image-banner');
          if (bannerElement) {
            bannerElement.classList.add('hidden');
          }
          
          // Update image details
          this.updateImageDetails(this.currentImage);
          
          // Show result
          const placeholder = document.getElementById('placeholder');
          const resultPanel = document.getElementById('result');
          if (placeholder) placeholder.classList.add('hidden');
          if (resultPanel) resultPanel.classList.remove('hidden');
        }
      } else {
        console.error('Response structure:', result);
        throw new Error('Could not find image data in the API response');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      alert(`Error: ${error.message}`);
      
      // Stop progress indicator with error
      this.stopProgressIndicator(false);
      
      // Show placeholder again
      const placeholder = document.getElementById('placeholder');
      if (placeholder) placeholder.classList.remove('hidden');
    }
  }
  
  // Add a new function to update the image details section
  updateImageDetails(imageData) {
    const modelElem = document.getElementById('result-model');
    const styleElem = document.getElementById('result-style');
    const sizeElem = document.getElementById('result-size');
    const stepsElem = document.getElementById('result-steps');
    
    if (modelElem) {
      // Get the model name from the ID
      const modelObj = MODELS.find(m => m.id === imageData.model);
      modelElem.textContent = modelObj ? modelObj.name : imageData.model;
    }
    
    if (styleElem) {
      styleElem.textContent = imageData.style;
    }
    
    if (sizeElem) {
      // Ratio-sized models never receive width/height, so report what applies.
      if (imageData.width && imageData.height) {
        sizeElem.textContent = `${imageData.width}×${imageData.height}px`;
      } else if (imageData.aspectRatio) {
        sizeElem.textContent = imageData.resolution
          ? `${imageData.aspectRatio} · ${imageData.resolution}`
          : imageData.aspectRatio;
      } else {
        sizeElem.textContent = 'model default';
      }
    }

    if (stepsElem) {
      stepsElem.textContent = `${imageData.steps ?? 'n/a'}`;
    }
  }
  
  async handleOptimizePrompt(event) {
    event.preventDefault();
    
    const initialPrompt = document.getElementById('initial-prompt')?.value;
    
    if (!initialPrompt) {
      alert('Please enter an initial prompt to optimize.');
      return;
    }
    
    // Show loading state
    const optimizeButton = document.getElementById('optimize-button');
    if (!optimizeButton) return;
    
    const originalButtonText = optimizeButton.innerHTML;
    optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Optimizing...';
    optimizeButton.disabled = true;
    
    try {
      // Model is resolved from /models/traits at boot; fall back if that failed.
      const textModel = TEXT_MODEL_ID || await fetchTextModel();

      const chatPayload = {
        model: textModel,
        messages: [
          {
            role: "system",
            content: "You are an expert image prompt engineer. Your job is to enhance user prompts for AI image generation to make them more detailed, descriptive, and likely to produce high-quality images. Focus on adding visual details, style references, lighting, composition elements, and mood/atmosphere descriptions. Format your response to be just the enhanced prompt with no explanations or other text."
          },
          {
            role: "user",
            content: `Please optimize this image generation prompt: "${initialPrompt}"`
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.7,
        // Reasoning models wrap output in <thinking> blocks - strip them so the
        // optimizer returns a clean prompt regardless of which model resolves.
        venice_parameters: {
          strip_thinking_response: true,
          include_venice_system_prompt: false
        }
      };

      const result = await veniceFetch('/chat/completions', { method: 'POST', body: chatPayload });
      console.log('Prompt optimization response:', result);

      if (result.choices && result.choices.length > 0) {
        const optimizedPrompt = (result.choices[0].message?.content || '').trim();
        if (!optimizedPrompt) throw new Error('The model returned an empty prompt');

        // Display optimized prompt
        const optimizedPromptText = document.getElementById('optimized-prompt-text');
        const optimizationResult = document.getElementById('optimization-result');
        
        if (optimizedPromptText && optimizationResult) {
          optimizedPromptText.textContent = optimizedPrompt;
          optimizationResult.classList.remove('hidden');
        }
        
        // Store the optimized prompt for later use
        this.optimizedPrompt = optimizedPrompt;
      } else {
        throw new Error('No optimized prompt was returned');
      }
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      alert(`Error: ${error.message}`);
    } finally {
      // Restore button state
      optimizeButton.innerHTML = originalButtonText;
      optimizeButton.disabled = false;
    }
  }
  
  handleUseOptimizedPrompt() {
    if (!this.optimizedPrompt) return;
    
    // Switch to generator tab
    const generatorTab = document.getElementById('generator-tab');
    if (generatorTab) generatorTab.click();
    
    // Set the optimized prompt in the generator form
    const promptField = document.getElementById('prompt');
    if (!promptField) return;
    
    promptField.value = this.optimizedPrompt;
    
    // Highlight the prompt field briefly
    promptField.style.borderColor = 'var(--neon-pink)';
    promptField.style.backgroundColor = 'rgba(255, 0, 255, 0.1)';
    
    setTimeout(() => {
      promptField.style.borderColor = '';
      promptField.style.backgroundColor = '';
    }, 1500);
  }
  
  handleDownloadImage() {
    if (!this.currentImage) return;
    
    try {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = this.currentImage.src;
      link.download = `image-${Date.now()}.png`;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Small delay before removing the element
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      console.log('Download initiated for image');
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('There was an error downloading the image. Please try again.');
    }
  }
  
  handleSaveToGallery() {
    if (!this.currentImage) return;
    
    // Add to gallery array
    this.generatedImages.push(this.currentImage);
    
    // Show gallery section
    const gallerySection = document.getElementById('gallery-section');
    if (gallerySection) gallerySection.classList.remove('hidden');
    
    // Update gallery display
    this.updateGallery();
    
    // Show confirmation
    const saveButton = document.getElementById('save-gallery-button');
    if (!saveButton) return;
    
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-check mr-2"></i>Saved!';
    
    setTimeout(() => {
      saveButton.innerHTML = originalText;
    }, 2000);
  }
  
  updateGallery() {
    const galleryContainer = document.getElementById('image-gallery');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = '';

    this.generatedImages.forEach((image, index) => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';
      galleryItem.style.cursor = 'pointer';

      galleryItem.innerHTML = `
        <div class="gallery-image-container">
          <img src="${image.src}" alt="Generated image ${index + 1}" class="gallery-img">
        </div>
        <div class="p-3">
          <p class="text-sm text-light font-medium">${image.prompt.slice(0, 80)}${image.prompt.length > 80 ? '...' : ''}</p>
          <div class="mt-2 flex gap-2 flex-wrap">
            <span class="text-xs bg-darker-bg text-neon-blue px-2 py-1 rounded-full">${image.model}</span>
            <span class="text-xs bg-darker-bg text-neon-pink px-2 py-1 rounded-full">${image.style}</span>
            <span class="text-xs bg-darker-bg text-neon-green px-2 py-1 rounded-full">${formatSize(image)}</span>
          </div>
        </div>
      `;

      galleryItem.addEventListener('click', () => {
        this.currentSlideIndex = index;
        this.showReelView();
      });

      galleryContainer.appendChild(galleryItem);
    });

    // Keep reel in sync if it's visible
    const reel = document.getElementById('slide-reel');
    if (reel && !reel.classList.contains('hidden')) {
      this.updateReel();
    }
  }

  showGridView() {
    document.getElementById('image-gallery').classList.remove('hidden');
    document.getElementById('slide-reel').classList.add('hidden');
    document.getElementById('gallery-view-grid').classList.add('active');
    document.getElementById('gallery-view-reel').classList.remove('active');
    this.stopAutoPlay();
  }

  showReelView() {
    document.getElementById('image-gallery').classList.add('hidden');
    document.getElementById('slide-reel').classList.remove('hidden');
    document.getElementById('gallery-view-grid').classList.remove('active');
    document.getElementById('gallery-view-reel').classList.add('active');
    this.updateReel();
  }

  updateReel() {
    const images = this.generatedImages;
    if (!images.length) return;

    // Clamp index
    this.currentSlideIndex = Math.max(0, Math.min(this.currentSlideIndex, images.length - 1));
    const img = images[this.currentSlideIndex];

    // Featured image (fade transition)
    const featuredImg = document.getElementById('reel-featured-img');
    if (featuredImg) {
      featuredImg.classList.add('fading');
      setTimeout(() => {
        featuredImg.src = img.src;
        featuredImg.classList.remove('fading');
      }, 140);
    }

    // Prompt + tags
    const promptEl = document.getElementById('reel-featured-prompt');
    if (promptEl) promptEl.textContent = img.prompt.slice(0, 120) + (img.prompt.length > 120 ? '…' : '');

    const tagsEl = document.getElementById('reel-featured-tags');
    if (tagsEl) {
      tagsEl.innerHTML = `
        <span style="color:var(--cyan)">${img.model}</span>
        <span style="color:var(--pink)">${img.style}</span>
        <span style="color:var(--emerald)">${formatSize(img)}</span>
      `;
    }

    // Counter
    const counter = document.getElementById('reel-counter');
    if (counter) counter.textContent = `${this.currentSlideIndex + 1} / ${images.length}`;

    // Nav buttons
    const prevBtn = document.getElementById('reel-prev');
    const nextBtn = document.getElementById('reel-next');
    if (prevBtn) prevBtn.disabled = this.currentSlideIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentSlideIndex === images.length - 1;

    // Filmstrip
    const filmstrip = document.getElementById('reel-filmstrip');
    if (filmstrip) {
      // Rebuild only if count changed, otherwise just update active class
      if (filmstrip.children.length !== images.length) {
        filmstrip.innerHTML = '';
        images.forEach((im, i) => {
          const thumb = document.createElement('div');
          thumb.className = 'filmstrip-thumb' + (i === this.currentSlideIndex ? ' active' : '');
          thumb.innerHTML = `<img src="${im.src}" alt="Thumbnail ${i + 1}">`;
          thumb.addEventListener('click', () => {
            this.currentSlideIndex = i;
            this.updateReel();
          });
          filmstrip.appendChild(thumb);
        });
      } else {
        Array.from(filmstrip.children).forEach((thumb, i) => {
          thumb.classList.toggle('active', i === this.currentSlideIndex);
        });
      }

      // Scroll active thumb into view
      const activeThumb = filmstrip.children[this.currentSlideIndex];
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  nextSlide() {
    if (this.currentSlideIndex < this.generatedImages.length - 1) {
      this.currentSlideIndex++;
      this.updateReel();
    }
  }

  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
      this.updateReel();
    }
  }

  toggleAutoPlay() {
    if (this.reelAutoPlayInterval) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    const btn = document.getElementById('reel-autoplay-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      btn.classList.add('playing');
    }
    this.reelAutoPlayInterval = setInterval(() => {
      if (this.currentSlideIndex < this.generatedImages.length - 1) {
        this.currentSlideIndex++;
      } else {
        this.currentSlideIndex = 0; // loop
      }
      this.updateReel();
    }, 3000);
  }

  stopAutoPlay() {
    if (this.reelAutoPlayInterval) {
      clearInterval(this.reelAutoPlayInterval);
      this.reelAutoPlayInterval = null;
    }
    const btn = document.getElementById('reel-autoplay-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-play"></i> Auto-play';
      btn.classList.remove('playing');
    }
  }

  async handleDownloadAll() {
    const images = this.generatedImages;
    if (!images.length) {
      alert('No images in gallery yet. Save some images first!');
      return;
    }

    const btn = document.getElementById('download-all-btn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Zipping…';
      btn.disabled = true;
    }

    try {
      const zip = new JSZip();
      images.forEach((img, i) => {
        // Strip the data:image/...;base64, prefix
        const base64 = img.src.replace(/^data:image\/\w+;base64,/, '');
        const ext = img.src.startsWith('data:image/png') ? 'png' : 'jpg';
        zip.file(`vgen-image-${String(i + 1).padStart(3, '0')}.${ext}`, base64, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vgen-gallery-${images.length}-images.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download all failed:', err);
      alert('Failed to create zip. Please try downloading images individually.');
    } finally {
      if (btn) {
        btn.innerHTML = '<i class="fas fa-file-archive"></i> Download All';
        btn.disabled = false;
      }
    }
  }
  
  async handleWebSearchGenerate(event) {
    event.preventDefault();

    const model = document.getElementById('websearch-model')?.value;
    const prompt = document.getElementById('websearch-prompt')?.value;
    const negativePrompt = document.getElementById('websearch-negative')?.value || '';
    const style = document.getElementById('websearch-style')?.value;
    const steps = parseInt(document.getElementById('websearch-steps')?.value || '30');
    const aspectRatio = document.getElementById('websearch-aspect')?.value || '16:9';
    const resolution = document.getElementById('websearch-resolution')?.value || 'medium';

    if (!prompt) {
      alert('Please enter a prompt for web-enhanced generation.');
      return;
    }

    const selectedModel = MODELS.find(m => m.id === model);
    if (!selectedModel) {
      alert(`Model "${model}" is not available. Reload to refresh the model list.`);
      return;
    }

    // Get dimensions based on aspect ratio and resolution
    const preset = RESOLUTION_PRESETS[aspectRatio] || RESOLUTION_PRESETS['1:1'];
    const dimensions = preset[resolution] || preset.medium;
    const width = dimensions.width;
    const height = dimensions.height;

    // Show progress
    const progressDiv = document.getElementById('websearch-progress');
    const progressBar = document.getElementById('websearch-progress-bar');
    const timeDisplay = document.getElementById('websearch-time');
    const generateBtn = document.getElementById('websearch-generate-button');

    if (progressDiv) progressDiv.classList.remove('hidden');
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    }

    const startTime = Date.now();
    let progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      if (timeDisplay) timeDisplay.textContent = `${elapsed}s`;
      const estimatedProgress = Math.min(90, (elapsed / 60) * 100);
      if (progressBar) progressBar.style.width = `${estimatedProgress}%`;
    }, 100);

    try {
      const payload = buildImagePayload(selectedModel, {
        prompt: prompt,
        negativePrompt: negativePrompt,
        style: style,
        width: width,
        height: height,
        aspectRatio: aspectRatio,
        resolutionTier: resolution,
        steps: steps,
        cfgScale: 7.5,
        seed: Math.floor(Math.random() * 999999999),
        format: 'webp',
        hideWatermark: false,
        webSearch: true
      });

      if (!payload.enable_web_search) {
        console.warn(`${selectedModel.name} does not advertise web search - generating without it.`);
      }

      console.log('Web Search Generation payload:', payload);

      const result = await veniceFetch('/image/generate', { method: 'POST', body: payload });
      console.log('Web Search API response:', result);

      // Extract image data
      const imageData = extractImages(result)[0] || null;

      if (imageData) {
        // Display the result
        const imageElement = document.getElementById('generated-image');
        if (imageElement) {
          imageElement.src = imageData;

          // Store current image - mirror the payload the model actually got
          this.currentImage = {
            src: imageData,
            prompt: prompt,
            model: model,
            style: payload.style_preset || 'No preset',
            width: payload.width || null,
            height: payload.height || null,
            aspectRatio: payload.aspect_ratio || null,
            resolution: payload.resolution || null,
            steps: payload.steps ?? 'n/a',
            webSearch: Boolean(payload.enable_web_search),
            timestamp: new Date().toISOString()
          };

          // Update image details
          this.updateImageDetails(this.currentImage);

          // Show result
          const placeholder = document.getElementById('placeholder');
          const resultDiv = document.getElementById('result');
          if (placeholder) placeholder.classList.add('hidden');
          if (resultDiv) resultDiv.classList.remove('hidden');
        }

        // Complete progress
        if (progressBar) progressBar.style.width = '100%';

      } else {
        throw new Error('No image data received from API');
      }

    } catch (error) {
      console.error('Error in web search generation:', error);
      alert(`Error: ${error.message}`);
    } finally {
      clearInterval(progressInterval);

      setTimeout(() => {
        if (progressDiv) progressDiv.classList.add('hidden');
        if (progressBar) progressBar.style.width = '0%';
      }, 500);

      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-globe mr-2"></i>Generate with Web Search';
      }
    }
  }

  async handleCompareModels(event) {
    event.preventDefault();
    
    const prompt = document.getElementById('comparison-prompt')?.value;
    const style = document.getElementById('comparison-style')?.value;
    const steps = parseInt(document.getElementById('comparison-steps')?.value) || 25;
    const ageVerification = document.getElementById('age-verification')?.checked;
    
    if (!prompt) {
      alert('Please enter a prompt to compare across models.');
      return;
    }
    
    // Check if prompt contains adult content and age verification is not checked
    const adultKeywords = ['sexy', 'nude', 'nsfw', 'adult', 'naked', 'explicit', 'porn', 'xxx'];
    const hasAdultContent = adultKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword)
    );
    
    if (hasAdultContent && !ageVerification) {
      const confirmAdult = confirm(
        'Your prompt may contain adult content. You must be 18+ to generate such content.\n\n' +
        'Please check the age verification box if you are 18+ and want to proceed.'
      );
      if (!confirmAdult) {
        return;
      }
    }
    
    // Show progress and hide other results
    this.showComparisonProgress();
    this.hideOtherResults();

    // Prepare comparison grid immediately
    this.prepareComparisonGrid();

    try {
      // Initialize progress tracking
      this.comparisonProgress = 0;
      this.totalModels = MODELS.length;
      this.completedModels = [];
      this.allComparisonData = []; // Store data for statistics table

      // Generate images for all models with individual progress tracking
      const promises = MODELS.map((model, index) =>
        this.generateImageForModelWithProgress(model, prompt, style, steps, index, ageVerification)
      );

      const results = await Promise.allSettled(promises);

      // After all complete, show statistics table
      this.displayComparisonStatistics();
      
    } catch (error) {
      console.error('Error in model comparison:', error);
      alert('Error comparing models. Please try again.');
    } finally {
      this.hideComparisonProgress();
    }
  }
  
  async generateImageForModelWithProgress(model, prompt, style, steps, index, ageVerification = false) {
    const startTime = Date.now();

    try {
      const result = await this.generateImageForModel(model, prompt, style, steps, ageVerification);

      // Track completion time
      const endTime = Date.now();
      const generationTime = (endTime - startTime) / 1000; // Convert to seconds

      this.completedModels[index] = {
        model: model.name,
        time: generationTime,
        success: true
      };

      // Update model status to completed
      this.updateModelStatus(model.id, 'completed');

      // Update progress
      this.comparisonProgress++;
      this.updateComparisonProgress();

      // IMMEDIATELY display this image as it's completed
      this.addComparisonCard(model, result, generationTime, true);

      return result;
    } catch (error) {
      // Track completion time even for failures
      const endTime = Date.now();
      const generationTime = (endTime - startTime) / 1000;

      this.completedModels[index] = {
        model: model.name,
        time: generationTime,
        success: false
      };

      // Update model status to failed
      this.updateModelStatus(model.id, 'failed');

      // Update progress
      this.comparisonProgress++;
      this.updateComparisonProgress();

      // Show error card immediately
      this.addComparisonCard(model, null, generationTime, false, error.message);

      throw error;
    }
  }
  
  async generateImageForModel(model, prompt, style, steps, ageVerification = false) {
    const width = 1024;
    const height = 576;
    
    console.log(`Generating image for model: ${model.name} (${model.id})`);

    // Negative prompts steer the diffusion pipeline; only models that take one
    // get it (buildImagePayload drops it otherwise).
    const negativePrompt = ageVerification
      ? "blurred, censored, pixelated, low quality, distorted, bad anatomy"
      : "nude, naked, sexual, explicit, adult content, nsfw, inappropriate";

    const payload = buildImagePayload(model, {
      prompt: prompt,
      negativePrompt: negativePrompt,
      style: style,
      width: width,
      height: height,
      aspectRatio: '16:9',
      resolutionTier: 'medium',
      steps: steps,
      cfgScale: 7.5,
      seed: Math.floor(Math.random() * 999999999),
      format: 'webp',
      hideWatermark: false,
      embedMetadata: false,
      safeMode: !ageVerification,
      loraStrength: 50,
      // Web-search-capable models get it for free here; the rest never see the flag.
      webSearch: supportsWebSearch(model)
    });

    console.log(`Payload for ${model.name}:`, payload);

    try {
      const result = await veniceFetch('/image/generate', { method: 'POST', body: payload });
      console.log(`Response for ${model.name}:`, result);

      // Check if there are any safety/content filter warnings in the response
      if (result.warnings || result.safety_warnings || result.content_filter) {
        console.warn(`Safety warnings for ${model.name}:`, result.warnings || result.safety_warnings || result.content_filter);
      }

      const imageData = extractImages(result)[0] || null;
      if (!imageData) {
        console.error(`No image data for ${model.name}:`, result);
        throw new Error('No image data received from API');
      }

      console.log(`Successfully generated image for ${model.name}`);

      return {
        src: imageData,
        model: model.name,
        prompt: prompt,
        style: payload.style_preset || 'None',
        width: payload.width || null,
        height: payload.height || null,
        aspectRatio: payload.aspect_ratio || null,
        resolution: payload.resolution || null,
        steps: payload.steps ?? 'n/a',
        safeMode: !ageVerification
      };
    } catch (error) {
      console.error(`Error generating image for ${model.name}:`, error);
      throw error;
    }
  }
  
  showComparisonProgress() {
    const progressContainer = document.getElementById('comparison-progress');
    const progressText = document.getElementById('comparison-progress-text');
    const progressBar = document.getElementById('comparison-progress-bar');
    
    if (progressContainer) {
      progressContainer.classList.remove('hidden');
    }
    
    if (progressText) {
      progressText.textContent = `0/${MODELS.length}`;
    }
    
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.style.transition = 'width 0.3s ease';
    }
    
    // Update progress as models complete
    this.comparisonProgress = 0;
    this.totalModels = MODELS.length;
    this.completedModels = [];
    
    // Add detailed progress info
    this.addDetailedProgressInfo();
  }
  
  addDetailedProgressInfo() {
    const progressContainer = document.getElementById('comparison-progress');
    if (!progressContainer) return;
    
    // Create detailed progress info
    const detailedInfo = document.createElement('div');
    detailedInfo.id = 'detailed-progress-info';
    detailedInfo.className = 'mt-3 text-sm text-medium';
    detailedInfo.innerHTML = `
      <div class="flex flex-wrap gap-2 justify-center">
        ${MODELS.map(model => `
          <span id="model-status-${model.id}" class="px-2 py-1 rounded-full bg-darker-bg border border-neon-pink text-xs">
            <i class="fas fa-clock mr-1"></i>${model.name}
          </span>
        `).join('')}
      </div>
    `;
    
    progressContainer.appendChild(detailedInfo);
  }
  
  updateModelStatus(modelId, status) {
    const statusElement = document.getElementById(`model-status-${modelId}`);
    if (!statusElement) return;
    
    const icon = status === 'completed' ? 'fa-check' : 
                 status === 'failed' ? 'fa-times' : 'fa-clock';
    const color = status === 'completed' ? 'neon-green' : 
                  status === 'failed' ? 'neon-pink' : 'neon-blue';
    
    statusElement.innerHTML = `<i class="fas ${icon} mr-1"></i>${MODELS.find(m => m.id === modelId)?.name}`;
    statusElement.className = `px-2 py-1 rounded-full bg-darker-bg border border-${color} text-xs`;
  }
  
  hideComparisonProgress() {
    const progressContainer = document.getElementById('comparison-progress');
    const detailedInfo = document.getElementById('detailed-progress-info');
    
    if (progressContainer) {
      progressContainer.classList.add('hidden');
    }
    
    if (detailedInfo) {
      detailedInfo.remove();
    }
  }
  
  updateComparisonProgress() {
    const progressText = document.getElementById('comparison-progress-text');
    const progressBar = document.getElementById('comparison-progress-bar');
    
    if (progressText) {
      progressText.textContent = `${this.comparisonProgress}/${this.totalModels}`;
    }
    
    if (progressBar) {
      const percentage = Math.min((this.comparisonProgress / this.totalModels) * 100, 100);
      console.log(`Updating progress bar: ${this.comparisonProgress}/${this.totalModels} = ${percentage}%`);
      
      // Use requestAnimationFrame to ensure smooth updates
      requestAnimationFrame(() => {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressBar.setAttribute('aria-valuemin', 0);
        progressBar.setAttribute('aria-valuemax', 100);
      });
    } else {
      console.error('Progress bar element not found!');
    }
  }
  
  displayComparisonResults(results) {
    const comparisonResults = document.getElementById('comparison-results');
    const comparisonGrid = document.getElementById('comparison-grid');
    
    if (!comparisonResults || !comparisonGrid) return;
    
    // Store results globally for modal navigation
    allComparisonResults = results;
    window.allComparisonResults = results;
    
    // Calculate total cost
    let totalCost = 0;
    let successfulGenerations = 0;
    
    // Clear previous results
    comparisonGrid.innerHTML = '';
    
    // Show comparison results
    comparisonResults.classList.remove('hidden');
    
    // Add each result to the grid
    results.forEach((result, index) => {
      const gridItem = document.createElement('div');
      gridItem.className = 'comparison-card';
      
      if (result.success) {
        const generationTime = result.generationTime ? `${result.generationTime.toFixed(1)}s` : 'N/A';
        const safeMode = result.image.safeMode ? 'Safe Mode' : 'Adult Mode';
        const safeModeColor = result.image.safeMode ? 'var(--neon-green)' : 'var(--neon-pink)';
        
        // Cost may be flat or tiered by resolution
        const cost = getModelPrice(result.model, result.image?.resolution);

        // Add to total cost
        totalCost += cost;
        successfulGenerations++;
        
        gridItem.innerHTML = `
          <div class="comparison-image-container">
            <img src="${result.image.src}" alt="${result.model.name}" class="comparison-image"
                 onclick="openImageModal('${result.image.src}', '${result.model.name}', '${result.model.id}', '${result.image.width || ''}', '${result.image.height || ''}', '${result.image.steps}', '${result.image.style}', '${generationTime}', '${safeMode}', '${cost.toFixed(4)}')">
          </div>
          <div class="comparison-card-content">
            <h3 class="comparison-model-name">${result.model.name}</h3>
            <div class="comparison-metadata">
              <span class="comparison-badge" style="background: var(--neon-blue); color: white;">${formatSize(result.image)}</span>
              <span class="comparison-badge" style="background: var(--neon-pink); color: white;">${result.image.steps} steps</span>
              <span class="comparison-badge" style="background: var(--neon-green); color: white;">${result.image.style}</span>
              <span class="comparison-badge" style="background: var(--neon-purple); color: white;">${generationTime}</span>
              <span class="comparison-badge" style="background: ${safeModeColor}; color: white;">${safeMode}</span>
            </div>
            <div class="comparison-cost">Cost: $${cost.toFixed(4)}</div>
            <button onclick="downloadComparisonImage('${result.image.src}', '${result.model.name}')"
                    class="comparison-download-btn">
              <i class="fas fa-download mr-2"></i>Download
            </button>
          </div>
        `;
      } else {
        const generationTime = result.generationTime ? `${result.generationTime.toFixed(1)}s` : 'N/A';
        // Show cost as $0.0000 for failed generations
        gridItem.innerHTML = `
          <div class="comparison-error">
            <i class="fas fa-exclamation-triangle comparison-error-icon"></i>
            <p class="comparison-error-text">Failed to generate</p>
          </div>
          <div class="comparison-card-content">
            <h3 class="comparison-model-name">${result.model.name}</h3>
            <div class="comparison-metadata">
              <span class="comparison-badge" style="background: var(--neon-purple); color: white;">${generationTime}</span>
            </div>
            <div class="comparison-cost">Cost: $0.0000</div>
            <p class="text-xs text-medium">${result.error}</p>
          </div>
        `;
      }
      
      comparisonGrid.appendChild(gridItem);
    });
    
    // Add total cost summary at the top
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'comparison-summary';
    summaryDiv.innerHTML = `
      <div style="background: var(--dark-card); border: 2px solid var(--neon-green); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: center;">
        <h3 style="color: var(--neon-green); margin-bottom: 1rem; font-size: 1.2rem;">
          <i class="fas fa-coins mr-2"></i>Session Summary
        </h3>
        <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 1rem;">
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--neon-blue);">${successfulGenerations}/${results.length}</div>
            <div style="font-size: 0.8rem; color: var(--medium-text);">Successful</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--neon-pink);">$${totalCost.toFixed(4)}</div>
            <div style="font-size: 0.8rem; color: var(--medium-text);">Total Cost</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: bold; color: var(--neon-purple);">${((totalCost / successfulGenerations) || 0).toFixed(4)}</div>
            <div style="font-size: 0.8rem; color: var(--medium-text);">Avg Cost/Image</div>
          </div>
        </div>
      </div>
    `;
    
    // Insert summary at the top of comparison results
    comparisonGrid.parentNode.insertBefore(summaryDiv, comparisonGrid);
  }
  
  hideOtherResults() {
    const result = document.getElementById('result');
    const placeholder = document.getElementById('placeholder');

    if (result) result.classList.add('hidden');
    if (placeholder) placeholder.classList.add('hidden');
  }

  // Prepare comparison grid - show it immediately
  prepareComparisonGrid() {
    const comparisonResults = document.getElementById('comparison-results');
    const comparisonGrid = document.getElementById('comparison-grid');

    if (!comparisonResults || !comparisonGrid) return;

    // Clear previous results
    comparisonGrid.innerHTML = '';

    // Remove any existing summary
    const existingSummary = document.querySelector('.comparison-summary');
    if (existingSummary) existingSummary.remove();

    const existingStatsTable = document.querySelector('.comparison-stats-table');
    if (existingStatsTable) existingStatsTable.remove();

    // Show comparison results container
    comparisonResults.classList.remove('hidden');

    // Initialize global array for modal
    window.allComparisonResults = [];
    this.allComparisonData = [];
  }

  // Add a single comparison card as soon as it's generated
  addComparisonCard(model, imageResult, generationTime, success, errorMessage = '') {
    const comparisonGrid = document.getElementById('comparison-grid');
    if (!comparisonGrid) return;

    const gridItem = document.createElement('div');
    gridItem.className = 'comparison-card';
    gridItem.setAttribute('data-model-id', model.id);

    if (success && imageResult) {
      const safeMode = imageResult.safeMode ? 'Safe Mode' : 'Adult Mode';
      const safeModeColor = imageResult.safeMode ? 'var(--mcm-olive)' : 'var(--mcm-orange)';

      // Cost may be flat or tiered by resolution
      const cost = getModelPrice(model, imageResult.resolution);

      // Ratio-sized models report a ratio instead of pixel dimensions
      const sizeLabel = (imageResult.width && imageResult.height)
        ? `${imageResult.width}×${imageResult.height}`
        : [imageResult.aspectRatio, imageResult.resolution].filter(Boolean).join(' · ') || 'default';

      // Store data for statistics table
      this.allComparisonData.push({
        model: model,
        image: imageResult,
        generationTime: generationTime,
        cost: cost,
        success: true
      });

      // Add to global array for modal
      window.allComparisonResults.push({
        model: model,
        image: imageResult,
        generationTime: generationTime,
        cost: cost,
        success: true
      });

      gridItem.innerHTML = `
        <div class="comparison-image-container">
          <img src="${imageResult.src}" alt="${model.name}" class="comparison-image"
               onclick="openImageModal('${imageResult.src}', '${model.name}', '${model.id}', '${imageResult.width || ''}', '${imageResult.height || ''}', '${imageResult.steps}', '${imageResult.style}', '${generationTime.toFixed(1)}s', '${safeMode}', '${cost.toFixed(4)}')">
        </div>
        <div class="comparison-card-content">
          <h3 class="comparison-model-name">${model.name}</h3>
          <p class="comparison-model-id">${model.id}</p>
          <div class="comparison-metadata">
            <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${sizeLabel}</span>
            <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-orange), #E65100); color: white;"><i class="fas fa-layer-group"></i> ${imageResult.steps}</span>
            <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-olive), #558B2F); color: white;"><i class="fas fa-paint-brush"></i> ${imageResult.style}</span>
            <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-mustard), #FF8F00); color: var(--text-primary);"><i class="fas fa-clock"></i> ${generationTime.toFixed(1)}s</span>
            <span class="comparison-badge" style="background: ${safeModeColor}; color: white;"><i class="fas fa-shield-alt"></i> ${safeMode}</span>
          </div>
          <div class="comparison-cost"><i class="fas fa-coins"></i> $${cost.toFixed(4)}</div>
          <button onclick="downloadComparisonImage('${imageResult.src}', '${model.name}')"
                  class="comparison-download-btn">
            <i class="fas fa-download mr-2"></i>Download
          </button>
        </div>
      `;
    } else {
      // Store error data
      this.allComparisonData.push({
        model: model,
        generationTime: generationTime,
        cost: 0,
        success: false,
        error: errorMessage
      });

      gridItem.innerHTML = `
        <div class="comparison-error">
          <i class="fas fa-exclamation-triangle comparison-error-icon"></i>
          <p class="comparison-error-text">Failed to generate</p>
        </div>
        <div class="comparison-card-content">
          <h3 class="comparison-model-name">${model.name}</h3>
          <p class="comparison-model-id">${model.id}</p>
          <div class="comparison-metadata">
            <span class="comparison-badge" style="background: var(--mcm-warm-gray); color: white;"><i class="fas fa-clock"></i> ${generationTime.toFixed(1)}s</span>
            <span class="comparison-badge" style="background: var(--mcm-rust); color: white;"><i class="fas fa-times-circle"></i> Failed</span>
          </div>
          <div class="comparison-cost"><i class="fas fa-coins"></i> $0.0000</div>
          <p class="text-xs text-medium mt-2" style="color: var(--mcm-orange);">${errorMessage}</p>
        </div>
      `;
    }

    comparisonGrid.appendChild(gridItem);
  }

  // Display statistics table after all images are generated
  displayComparisonStatistics() {
    const comparisonResults = document.getElementById('comparison-results');
    if (!comparisonResults) return;

    // Calculate statistics
    const successfulGens = this.allComparisonData.filter(d => d.success);
    const failedGens = this.allComparisonData.filter(d => !d.success);
    const totalCost = successfulGens.reduce((sum, d) => sum + d.cost, 0);
    const avgCost = successfulGens.length > 0 ? totalCost / successfulGens.length : 0;
    const avgTime = successfulGens.length > 0 ?
      successfulGens.reduce((sum, d) => sum + d.generationTime, 0) / successfulGens.length : 0;
    const fastestTime = successfulGens.length > 0 ?
      Math.min(...successfulGens.map(d => d.generationTime)) : 0;
    const slowestTime = successfulGens.length > 0 ?
      Math.max(...successfulGens.map(d => d.generationTime)) : 0;

    // Create statistics table
    const statsTable = document.createElement('div');
    statsTable.className = 'comparison-stats-table';
    statsTable.style.cssText = 'background: var(--bg-card); border-radius: 4px; padding: 2rem; margin: 2rem auto; max-width: 1200px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);';

    statsTable.innerHTML = `
      <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1.5rem; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
        <i class="fas fa-chart-bar" style="color: var(--mcm-teal); margin-right: 0.5rem;"></i>
        Generation Statistics
      </h3>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 4px;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--mcm-teal);">${successfulGens.length}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5rem;">Successful</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 4px;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--mcm-orange);">${failedGens.length}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5rem;">Failed</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 4px;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--mcm-olive);">$${totalCost.toFixed(4)}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5rem;">Total Cost</div>
        </div>
        <div style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 4px;">
          <div style="font-size: 2rem; font-weight: 700; color: var(--mcm-mustard);">$${avgCost.toFixed(4)}</div>
          <div style="font-size: 0.875rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0.5rem;">Avg Cost</div>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; background: var(--bg-card);">
          <thead>
            <tr style="background: var(--bg-secondary); border-bottom: 2px solid var(--mcm-teal);">
              <th style="padding: 1rem; text-align: left; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Model</th>
              <th style="padding: 1rem; text-align: center; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Status</th>
              <th style="padding: 1rem; text-align: center; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Time</th>
              <th style="padding: 1rem; text-align: center; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Resolution</th>
              <th style="padding: 1rem; text-align: center; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Steps</th>
              <th style="padding: 1rem; text-align: right; font-weight: 700; color: var(--text-primary); text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.5px;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${this.allComparisonData.map((data, index) => {
              const statusBadge = data.success ?
                '<span style="background: var(--mcm-olive); color: white; padding: 0.25rem 0.75rem; border-radius: 2px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Success</span>' :
                '<span style="background: var(--mcm-orange); color: white; padding: 0.25rem 0.75rem; border-radius: 2px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Failed</span>';

              const resolution = data.success ? formatSize(data.image) : '-';
              const steps = data.success ? data.image.steps : '-';

              return `
                <tr style="border-bottom: 1px solid var(--mcm-light-gray); ${index % 2 === 0 ? '' : 'background: var(--bg-secondary);'}">
                  <td style="padding: 1rem; font-weight: 600; color: var(--text-primary);">${data.model.name}</td>
                  <td style="padding: 1rem; text-align: center;">${statusBadge}</td>
                  <td style="padding: 1rem; text-align: center; color: var(--text-secondary); font-weight: 500;">${data.generationTime.toFixed(2)}s</td>
                  <td style="padding: 1rem; text-align: center; color: var(--text-secondary); font-weight: 500;">${resolution}</td>
                  <td style="padding: 1rem; text-align: center; color: var(--text-secondary); font-weight: 500;">${steps}</td>
                  <td style="padding: 1rem; text-align: right; color: var(--mcm-olive); font-weight: 700;">$${data.cost.toFixed(4)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 4px; border-left: 4px solid var(--mcm-teal);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; font-size: 0.875rem;">
          <div>
            <span style="color: var(--text-secondary); font-weight: 600;">Fastest:</span>
            <span style="color: var(--mcm-teal); font-weight: 700; margin-left: 0.5rem;">${fastestTime.toFixed(2)}s</span>
          </div>
          <div>
            <span style="color: var(--text-secondary); font-weight: 600;">Slowest:</span>
            <span style="color: var(--mcm-orange); font-weight: 700; margin-left: 0.5rem;">${slowestTime.toFixed(2)}s</span>
          </div>
          <div>
            <span style="color: var(--text-secondary); font-weight: 600;">Average:</span>
            <span style="color: var(--mcm-olive); font-weight: 700; margin-left: 0.5rem;">${avgTime.toFixed(2)}s</span>
          </div>
        </div>
      </div>
    `;

    // Insert before the grid
    const comparisonGrid = document.getElementById('comparison-grid');
    if (comparisonGrid && comparisonGrid.parentNode) {
      comparisonGrid.parentNode.insertBefore(statsTable, comparisonGrid);
    }
  }

}

// Global function for downloading comparison images
function downloadComparisonImage(src, modelName) {
  try {
    const link = document.createElement('a');
    link.href = src;
    link.download = `comparison-${modelName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
}

// Global variables for modal navigation
let currentImageIndex = 0;
let allComparisonResults = [];

// Global function for opening image modal
function openImageModal(src, modelName, modelId, width, height, steps, style, generationTime, safeMode, cost) {
  const modal = document.getElementById('image-modal');
  const modalImage = document.getElementById('modal-image');
  const modalTitle = document.getElementById('modal-title');
  const modalMetadata = document.getElementById('modal-metadata');
  const modalDownload = document.getElementById('modal-download');

  if (!modal || !modalImage || !modalTitle || !modalMetadata || !modalDownload) return;

  // Set image
  modalImage.src = src;

  // Set title with model ID
  modalTitle.innerHTML = `
    ${modelName}
    <div class="modal-model-id">${modelId}</div>
  `;

  // Set metadata with pill-style badges
  modalMetadata.innerHTML = `
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${(width && height) ? `${width}×${height}` : 'model default'}</span>
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-orange), #E65100); color: white;"><i class="fas fa-layer-group"></i> ${steps}</span>
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-olive), #558B2F); color: white;"><i class="fas fa-paint-brush"></i> ${style}</span>
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-mustard), #FF8F00); color: var(--text-primary);"><i class="fas fa-clock"></i> ${generationTime}</span>
    <span class="comparison-badge" style="background: ${safeMode === 'Safe Mode' ? 'linear-gradient(135deg, var(--mcm-olive), #558B2F)' : 'linear-gradient(135deg, var(--mcm-orange), #E65100)'}; color: white;"><i class="fas fa-shield-alt"></i> ${safeMode}</span>
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-olive), #558B2F); color: white;"><i class="fas fa-coins"></i> $${cost}</span>
  `;

  // Set download handler
  modalDownload.onclick = () => downloadComparisonImage(src, modelName);

  // Find current image index in comparison results
  // Use window.allComparisonResults to ensure we're using the global array
  if (window.allComparisonResults && window.allComparisonResults.length > 0) {
    currentImageIndex = window.allComparisonResults.findIndex(result =>
      result.image && result.image.src === src
    );
    allComparisonResults = window.allComparisonResults;
  } else {
    currentImageIndex = 0;
  }

  // Set up navigation
  setupModalNavigation();

  // Show modal
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Setup modal navigation
function setupModalNavigation() {
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');

  if (!prevBtn || !nextBtn) {
    console.log('Navigation buttons not found');
    return;
  }

  console.log('Setting up modal navigation:', {
    currentIndex: currentImageIndex,
    totalImages: allComparisonResults.length,
    allComparisonResults: allComparisonResults
  });

  // Update button states
  prevBtn.disabled = currentImageIndex <= 0;
  nextBtn.disabled = currentImageIndex >= allComparisonResults.length - 1;

  // Set up click handlers
  prevBtn.onclick = () => navigateImage(-1);
  nextBtn.onclick = () => navigateImage(1);
}

// Navigate to previous/next image
function navigateImage(direction) {
  console.log('Navigate called:', { direction, currentIndex: currentImageIndex, totalImages: allComparisonResults.length });

  const newIndex = currentImageIndex + direction;

  if (newIndex < 0 || newIndex >= allComparisonResults.length) {
    console.log('Navigation blocked - out of bounds');
    return;
  }

  currentImageIndex = newIndex;
  const result = allComparisonResults[currentImageIndex];

  console.log('Navigating to image:', { newIndex, result });

  if (result && result.image) {
    // Update modal with new image data
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalMetadata = document.getElementById('modal-metadata');
    const modalDownload = document.getElementById('modal-download');

    if (modalImage) modalImage.src = result.image.src;
    if (modalTitle) {
      modalTitle.innerHTML = `
        ${result.model.name}
        <div class="modal-model-id">${result.model.id}</div>
      `;
    }
    if (modalMetadata) {
      const safeMode = result.image.safeMode ? 'Safe Mode' : 'Adult Mode';
      const cost = result.cost || '0.0000';
      const generationTime = result.generationTime ? `${result.generationTime.toFixed(1)}s` : 'N/A';

      modalMetadata.innerHTML = `
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${formatSize(result.image)}</span>
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-orange), #E65100); color: white;"><i class="fas fa-layer-group"></i> ${result.image.steps}</span>
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-olive), #558B2F); color: white;"><i class="fas fa-paint-brush"></i> ${result.image.style}</span>
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-mustard), #FF8F00); color: var(--text-primary);"><i class="fas fa-clock"></i> ${generationTime}</span>
        <span class="comparison-badge" style="background: ${safeMode === 'Safe Mode' ? 'linear-gradient(135deg, var(--mcm-olive), #558B2F)' : 'linear-gradient(135deg, var(--mcm-orange), #E65100)'}; color: white;"><i class="fas fa-shield-alt"></i> ${safeMode}</span>
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-olive), #558B2F); color: white;"><i class="fas fa-coins"></i> $${cost}</span>
      `;
    }
    if (modalDownload) {
      modalDownload.onclick = () => downloadComparisonImage(result.image.src, result.model.name);
    }

    // Update navigation button states
    setupModalNavigation();
  }
}

// Close modal function
function closeImageModal() {
  const modal = document.getElementById('image-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scrolling
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window._veniceApp = new VeniceImageGenerator();

  // Wire up the API key modal buttons
  const saveKeyBtn = document.getElementById('save-api-key-btn');
  if (saveKeyBtn) saveKeyBtn.addEventListener('click', saveApiKeyAndInit);

  const apiKeyInput = document.getElementById('api-key-input');
  if (apiKeyInput) {
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveApiKeyAndInit();
    });
  }

  const changeKeyBtn = document.getElementById('change-api-key-btn');
  if (changeKeyBtn) {
    changeKeyBtn.addEventListener('click', () => showApiKeyModal('Update your Venice AI API key below.'));
  }
  
  // Add modal event listeners
  const modal = document.getElementById('image-modal');
  const closeButton = document.getElementById('close-modal');
  
  if (closeButton) {
    closeButton.addEventListener('click', closeImageModal);
  }
  
  if (modal) {
    // Close modal when clicking outside the image
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-overlay')) {
        closeImageModal();
      }
    });
    
    // Close modal with Escape key and navigate with arrow keys
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('hidden')) {
        if (e.key === 'Escape') {
          closeImageModal();
        } else if (e.key === 'ArrowLeft') {
          navigateImage(-1);
        } else if (e.key === 'ArrowRight') {
          navigateImage(1);
        }
      }
    });
  }
}); 