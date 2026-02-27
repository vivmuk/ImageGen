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

// Model options from Venice AI (will be populated dynamically)
let MODELS = [];

// Fallback models when API fails
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
  {
    id: "gpt-image-1-5",
    name: "GPT Image 1.5",
    traits: [],
    constraints: {
      promptCharacterLimit: 32768,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 1
    },
    pricing: {
      generation: { usd: 0.23 }
    }
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    traits: [],
    constraints: {
      promptCharacterLimit: 32768,
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 1
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
      steps: { default: 20, max: 50 },
      widthHeightDivisor: 1
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

// Function to fetch available models from Venice AI API
async function fetchModels() {
  try {
    // Try direct API call first
    let response;
    try {
      response = await fetch('https://api.venice.ai/api/v1/models?type=image', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (directError) {
      console.log('Direct API failed, trying CORS proxy');
      // Use CORS proxy as fallback
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = encodeURIComponent('https://api.venice.ai/api/v1/models?type=image');
      response = await fetch(proxyUrl + targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getApiKey()}`,
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter out offline models and transform the API response to our format
    MODELS = data.data
      .filter(model => !model.model_spec?.offline)
      .map(model => ({
        id: model.id,
        name: model.model_spec?.name || model.id,
        traits: model.model_spec?.traits || [],
        constraints: model.model_spec?.constraints || {},
        pricing: model.model_spec?.pricing || {}
      }));

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
    this.initializeApp();
  }

  async initializeApp() {
    // Check for API key before doing anything else
    if (!hasApiKey()) {
      showApiKeyModal();
      return;
    }
    // Fetch models first, then setup DOM
    await fetchModels();
    this.setupDOM();
    this.setupTabs();
    this.addEventListeners();
  }

  setupDOM() {
    // Populate model dropdown
    const modelSelect = document.getElementById('model');
    if (modelSelect) {
      modelSelect.innerHTML = MODELS.map(model =>
        `<option value="${model.id}" ${model.id === "flux-dev" ? "selected" : ""}>${model.name}</option>`
      ).join('');

      // Add change listener for model capabilities
      modelSelect.addEventListener('change', () => {
        this.updateModelCapabilities(modelSelect.value);
      });

      // Show initial model capabilities
      setTimeout(() => this.updateModelCapabilities(modelSelect.value), 100);
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
    document.getElementById('cap-max-steps').textContent =
      model.constraints?.steps?.max || 'N/A';
    document.getElementById('cap-divisor').textContent =
      model.constraints?.widthHeightDivisor || 'N/A';
    document.getElementById('cap-cost').textContent =
      model.pricing?.generation?.usd ? `$${model.pricing.generation.usd.toFixed(4)}` : 'N/A';

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
      });
    }
  }
  
  updateDimensions(aspectRatio, resolution) {
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    
    if (widthInput && heightInput) {
      const dimensions = RESOLUTION_PRESETS[aspectRatio][resolution];
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
      
      // Find the selected model to check its constraints
      const selectedModel = MODELS.find(m => m.id === model);
      const widthHeightDivisor = selectedModel?.constraints?.widthHeightDivisor || 8;
      
      // Ensure dimensions are divisible by the model's required divisor
      const adjustedWidth = Math.round(width / widthHeightDivisor) * widthHeightDivisor;
      const adjustedHeight = Math.round(height / widthHeightDivisor) * widthHeightDivisor;
      
      if (adjustedWidth !== width || adjustedHeight !== height) {
        console.log(`Adjusted dimensions from ${width}x${height} to ${adjustedWidth}x${adjustedHeight} (divisible by ${widthHeightDivisor})`);
      }
      
      // Clamp steps to the model's constraints
      let adjustedSteps = steps;
      if (selectedModel?.constraints?.steps) {
        const minSteps = 1;
        const maxSteps = selectedModel.constraints.steps.max || 50;
        adjustedSteps = Math.max(minSteps, Math.min(steps, maxSteps));
        if (adjustedSteps !== steps) {
          console.log(`Adjusted steps from ${steps} to ${adjustedSteps} (max: ${maxSteps})`);
        }
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

      const payload = {
        model: model,
        prompt: finalPrompt,
        height: adjustedHeight,
        width: adjustedWidth,
        steps: adjustedSteps,
        return_binary: false,
        hide_watermark: hideWatermark,
        format: format,
        cfg_scale: cfgScale,
        seed: seed,
        embed_exif_metadata: embedMetadata,
        variants: variants,
        lora_strength: loraStrength
      };

      // Add style_preset only if a style is selected (not "None")
      if (style && style !== "None") {
        payload.style_preset = style;
      }

      // Add negative prompt if provided
      if (negativePrompt) {
        payload.negative_prompt = negativePrompt;
      }
      
      console.log('Sending request with payload:', payload);
      
      // Try direct API call first, then fallback to proxy
      let response;
      try {
        response = await fetch('https://api.venice.ai/api/v1/image/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (directError) {
        console.log('Direct API failed, trying CORS proxy');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent('https://api.venice.ai/api/v1/image/generate');
        response = await fetch(proxyUrl + targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload)
        });
      }
      
      // Handle API response
      const result = await response.json();
      console.log('API response:', result);
      
      if (!response.ok) {
        const errorMsg = result.error?.message || result.error || result.message || 'Failed to generate image';
        console.error('API Error Details:', result);
        throw new Error(errorMsg);
      }
      
      // Update progress indicator to complete
      this.stopProgressIndicator(true);
      
      // Extract the image data from the response
      let imageData = null;
      
      // Check all possible response formats
      if (result.images && Array.isArray(result.images) && result.images.length > 0) {
        imageData = result.images[0];
      } else if (result.image) {
        imageData = result.image;
      } else if (result.objectid) {
        console.log('Image generated with objectid:', result.objectid);
        // Try to find the image in the response structure
        if (result.images) {
          if (typeof result.images === 'string') {
            imageData = result.images;
          } else if (Array.isArray(result.images) && result.images.length > 0) {
            imageData = result.images[0];
          }
        }
      }
      
      if (imageData) {
        // Ensure the image data is properly formed for rendering
        if (!imageData.startsWith('data:image')) {
          imageData = 'data:image/png;base64,' + imageData;
        }
        
        const imageElement = document.getElementById('generated-image');
        if (imageElement) {
          imageElement.src = imageData;
          
          // Store current image
          this.currentImage = {
            src: imageData,
            prompt: prompt,
            model: model,
            style: style === "None" ? "No preset" : style,
            width: width,
            height: height,
            steps: steps,
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
          const result = document.getElementById('result');
          if (placeholder) placeholder.classList.add('hidden');
          if (result) result.classList.remove('hidden');
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
      sizeElem.textContent = `${imageData.width}×${imageData.height}px`;
    }
    
    if (stepsElem) {
      stepsElem.textContent = `${imageData.steps}`;
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
      // Prepare request body for chat API
      const chatPayload = {
        model: "llama-3.3-70b", // Using Llama model for text generation
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
        max_tokens: 500,
        temperature: 0.7
      };
      
      // Try direct API call first, then fallback to proxy
      let response;
      try {
        response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chatPayload)
        });
      } catch (directError) {
        console.log('Direct API failed, trying CORS proxy');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent('https://api.venice.ai/api/v1/chat/completions');
        response = await fetch(proxyUrl + targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(chatPayload)
        });
      }
      
      // Handle API response
      const result = await response.json();
      console.log('Prompt optimization response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to optimize prompt');
      }
      
      if (result.choices && result.choices.length > 0) {
        const optimizedPrompt = result.choices[0].message.content.trim();
        
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
    
    // Clear current gallery
    galleryContainer.innerHTML = '';
    
    // Add each image to gallery
    this.generatedImages.forEach((image, index) => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';
      
      galleryItem.innerHTML = `
        <div class="gallery-image-container">
          <img src="${image.src}" alt="Generated image ${index + 1}" class="gallery-img">
        </div>
        <div class="p-3">
          <p class="text-sm text-light font-medium">${image.prompt.slice(0, 80)}${image.prompt.length > 80 ? '...' : ''}</p>
          <div class="mt-2 flex gap-2 flex-wrap">
            <span class="text-xs bg-darker-bg text-neon-blue px-2 py-1 rounded-full">${image.model}</span>
            <span class="text-xs bg-darker-bg text-neon-pink px-2 py-1 rounded-full">${image.style}</span>
            <span class="text-xs bg-darker-bg text-neon-green px-2 py-1 rounded-full">${image.width}×${image.height}</span>
          </div>
        </div>
      `;
      
      galleryContainer.appendChild(galleryItem);
    });
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

    // Get dimensions based on aspect ratio and resolution
    const dimensions = RESOLUTION_PRESETS[aspectRatio][resolution];
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
      const payload = {
        model: model,
        prompt: prompt,
        height: height,
        width: width,
        steps: steps,
        return_binary: false,
        hide_watermark: false,
        format: 'webp',
        cfg_scale: 7.5,
        seed: Math.floor(Math.random() * 999999999),
        enable_web_search: true // Key feature for web search models
      };

      if (style && style !== "None") {
        payload.style_preset = style;
      }

      if (negativePrompt) {
        payload.negative_prompt = negativePrompt;
      }

      console.log('Web Search Generation payload:', payload);

      let response;
      try {
        response = await fetch('https://api.venice.ai/api/v1/image/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (directError) {
        console.log('Direct API failed, trying CORS proxy');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent('https://api.venice.ai/api/v1/image/generate');
        response = await fetch(proxyUrl + targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();
      console.log('Web Search API response:', result);

      if (!response.ok) {
        const errorMsg = result.error?.message || result.error || result.message || 'Failed to generate image';
        throw new Error(errorMsg);
      }

      // Extract image data
      let imageData = null;
      if (result.images && Array.isArray(result.images) && result.images.length > 0) {
        imageData = result.images[0];
      } else if (result.image) {
        imageData = result.image;
      }

      if (imageData) {
        if (!imageData.startsWith('data:image')) {
          imageData = 'data:image/png;base64,' + imageData;
        }

        // Display the result
        const imageElement = document.getElementById('generated-image');
        if (imageElement) {
          imageElement.src = imageData;

          // Store current image
          const modelObj = MODELS.find(m => m.id === model);
          this.currentImage = {
            src: imageData,
            prompt: prompt,
            model: model,
            style: style === "None" ? "No preset" : style,
            width: width,
            height: height,
            steps: steps,
            webSearch: true,
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
    
    // Adjust dimensions based on model constraints
    const widthHeightDivisor = model.constraints?.widthHeightDivisor || 8;
    const adjustedWidth = Math.round(width / widthHeightDivisor) * widthHeightDivisor;
    const adjustedHeight = Math.round(height / widthHeightDivisor) * widthHeightDivisor;
    
    // Adjust steps based on model constraints
    let adjustedSteps = steps;
    if (model.constraints?.steps) {
      const maxSteps = model.constraints.steps.max || 50;
      adjustedSteps = Math.min(steps, maxSteps);
    }
    
    console.log(`Model ${model.name} - Adjusted dimensions: ${adjustedWidth}x${adjustedHeight}, steps: ${adjustedSteps}`);
    
    // Enable web search for specific models that benefit from it
    const webSearchModels = ['nano-banana-pro', 'gpt-image-1-5'];
    const enableWebSearch = webSearchModels.includes(model.id);

    const payload = {
      model: model.id,
      prompt: prompt,
      height: adjustedHeight,
      width: adjustedWidth,
      steps: adjustedSteps,
      return_binary: false,
      hide_watermark: false, // Changed to false as per API docs
      safe_mode: !ageVerification, // Use age verification to control safe mode
      format: "webp", // Use webp format for better quality/compression
      cfg_scale: 7.5, // CFG scale for better prompt adherence (0-20)
      seed: Math.floor(Math.random() * 999999999), // Random seed for variety
      embed_exif_metadata: false, // Don't embed generation metadata in EXIF
      variants: 1, // Generate single variant (1-4)
      lora_strength: 50, // Lora strength if model uses additional Loras (0-100)
      enable_web_search: enableWebSearch // Enable web search for Nano Banana Pro and GPT Image 1.5
    };

    if (enableWebSearch) {
      console.log(`Web search enabled for ${model.name}`);
    }
    
    // Add style if not "None"
    if (style && style !== "None") {
      payload.style_preset = style;
    }
    
    // Add negative prompt for better control based on age verification
    if (!ageVerification) {
      // Safe mode - add negative prompts to avoid adult content
      payload.negative_prompt = "nude, naked, sexual, explicit, adult content, nsfw, inappropriate";
    } else {
      // Adult mode - add negative prompts to improve quality
      payload.negative_prompt = "blurred, censored, pixelated, low quality, distorted, bad anatomy";
    }
    
    console.log(`Payload for ${model.name}:`, payload);
    
    try {
      // Try direct API call first, then fallback to proxy
      let response;
      try {
        response = await fetch('https://api.venice.ai/api/v1/image/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (directError) {
        console.log('Direct API failed, trying CORS proxy');
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl = encodeURIComponent('https://api.venice.ai/api/v1/image/generate');
        response = await fetch(proxyUrl + targetUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify(payload)
        });
      }
      
      const result = await response.json();
      console.log(`Response for ${model.name}:`, result);
      
      // Check if there are any safety/content filter warnings in the response
      if (result.warnings || result.safety_warnings || result.content_filter) {
        console.warn(`Safety warnings for ${model.name}:`, result.warnings || result.safety_warnings || result.content_filter);
      }
      
      if (!response.ok) {
        const errorMsg = result.error?.message || result.error || result.message || `HTTP ${response.status}`;
        console.error(`Model ${model.name} failed:`, errorMsg);
        throw new Error(`${errorMsg} (Status: ${response.status})`);
      }
      
      // Extract image data
      let imageData = null;
      if (result.images && Array.isArray(result.images) && result.images.length > 0) {
        imageData = result.images[0];
      } else if (result.image) {
        imageData = result.image;
      }
      
      if (!imageData) {
        console.error(`No image data for ${model.name}:`, result);
        throw new Error('No image data received from API');
      }
      
      console.log(`Successfully generated image for ${model.name}`);
      
      return {
        src: `data:image/png;base64,${imageData}`,
        model: model.name,
        prompt: prompt,
        style: style || 'None',
        width: adjustedWidth,
        height: adjustedHeight,
        steps: adjustedSteps,
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
        
        // Calculate cost based on model pricing and image dimensions
        let cost = 0;
        if (result.model.pricing && result.model.pricing.generation) {
          cost = result.model.pricing.generation.usd || 0;
        }
        
        // Add to total cost
        totalCost += cost;
        successfulGenerations++;
        
        gridItem.innerHTML = `
          <div class="comparison-image-container">
            <img src="${result.image.src}" alt="${result.model.name}" class="comparison-image"
                 onclick="openImageModal('${result.image.src}', '${result.model.name}', '${result.image.width}', '${result.image.height}', '${result.image.steps}', '${result.image.style}', '${generationTime}', '${safeMode}', '${cost.toFixed(4)}')">
          </div>
          <div class="comparison-card-content">
            <h3 class="comparison-model-name">${result.model.name}</h3>
            <div class="comparison-metadata">
              <span class="comparison-badge" style="background: var(--neon-blue); color: white;">${result.image.width}×${result.image.height}</span>
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

      // Calculate cost based on model pricing
      let cost = 0;
      if (model.pricing && model.pricing.generation) {
        cost = model.pricing.generation.usd || 0;
      }

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
               onclick="openImageModal('${imageResult.src}', '${model.name}', '${model.id}', '${imageResult.width}', '${imageResult.height}', '${imageResult.steps}', '${imageResult.style}', '${generationTime.toFixed(1)}s', '${safeMode}', '${cost.toFixed(4)}')">
        </div>
        <div class="comparison-card-content">
          <h3 class="comparison-model-name">${model.name}</h3>
          <p class="comparison-model-id">${model.id}</p>
          <div class="comparison-metadata">
            <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${imageResult.width}×${imageResult.height}</span>
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

              const resolution = data.success ? `${data.image.width}×${data.image.height}` : '-';
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
    <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${width}×${height}</span>
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
        <span class="comparison-badge" style="background: linear-gradient(135deg, var(--mcm-teal), #0097A7); color: white;"><i class="fas fa-expand-alt"></i> ${result.image.width}×${result.image.height}</span>
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