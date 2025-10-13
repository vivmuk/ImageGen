// Venice AI Image Generator Application

// API Key (as provided)
const API_KEY = "1HuCqCKmjn0F9cV3wh1STZkaTNlfxhTuqdIcdPQaem";

// Model options from Venice AI (will be populated dynamically)
let MODELS = [];

// Function to fetch available models from Venice AI API
async function fetchModels() {
  try {
    const response = await fetch('https://api.venice.ai/api/v1/models?type=image', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

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
        constraints: model.model_spec?.constraints || {}
      }));

    console.log('Fetched models:', MODELS);
    return MODELS;
  } catch (error) {
    console.error('Error fetching models:', error);
    // Fallback to a basic model list if API fails
    MODELS = [
      { id: "flux-dev", name: "FLUX Standard", traits: ["highest_quality"] },
      { id: "venice-sd35", name: "Venice SD35", traits: ["default"] },
      { id: "stable-diffusion-3.5", name: "Stable Diffusion 3.5", traits: [] }
    ];
    return MODELS;
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

// Main application class
class VeniceImageGenerator {
  constructor() {
    this.generatedImages = [];
    this.progressInterval = null;
    this.startTime = null;
    this.initializeApp();
  }

  async initializeApp() {
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
    }
    
    // Populate style dropdown
    const styleSelect = document.getElementById('style');
    if (styleSelect) {
      styleSelect.innerHTML = STYLE_PRESETS.map(style => 
        `<option value="${style}">${style}</option>`
      ).join('');
    }
    
    // Setup aspect ratio and resolution handlers
    this.setupResolutionHandlers();
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
    const generatorPanel = document.getElementById('generator-panel');
    const optimizerPanel = document.getElementById('optimizer-panel');
    
    if (generatorTab && optimizerTab && generatorPanel && optimizerPanel) {
      generatorTab.addEventListener('click', () => {
        generatorTab.classList.add('active');
        optimizerTab.classList.remove('active');
        generatorPanel.classList.remove('hidden');
        optimizerPanel.classList.add('hidden');
      });
      
      optimizerTab.addEventListener('click', () => {
        optimizerTab.classList.add('active');
        generatorTab.classList.remove('active');
        optimizerPanel.classList.remove('hidden');
        generatorPanel.classList.add('hidden');
      });
    }
  }

  addEventListeners() {
    const form = document.getElementById('generate-form');
    const downloadButton = document.getElementById('download-button');
    const saveGalleryButton = document.getElementById('save-gallery-button');
    const optimizeButton = document.getElementById('optimize-button');
    const useOptimizedPromptButton = document.getElementById('use-optimized-prompt');
    
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
      
      const payload = {
        model: model,
        prompt: finalPrompt,
        height: adjustedHeight,
        width: adjustedWidth,
        steps: adjustedSteps,
        return_binary: false,
        hide_watermark: true
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
      
      // Call Venice API
      const response = await fetch('https://api.venice.ai/api/v1/image/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
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
      
      // Call Venice API for prompt optimization
      const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatPayload)
      });
      
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VeniceImageGenerator();
}); 