# Venice AI Image Generator

A web-based application that allows you to generate custom images using the Venice AI API. This application provides a user-friendly interface to interact with Venice's powerful image generation capabilities.

## Getting Started — API Key Setup

> **You need a Venice AI API key to use this app.** Your key is stored only in your browser and is never shared.

### How to get your Venice AI API key

1. Go to **[venice.ai](https://venice.ai)** and create a free account
2. In your account dashboard, navigate to **Settings → API**
3. Click **Generate API Key** and copy it
4. Open the app (`index.html`) — you will be prompted to enter your key on first launch
5. Paste your key into the dialog and click **Save & Start**

To change your key at any time, click the **Set API Key** button at the top of the app.

> **Privacy:** Your API key is stored only in your browser's `localStorage`. It is never sent to any server other than Venice AI's official API endpoint (`api.venice.ai`).

---

## Features

- Select from multiple Venice AI models
- Choose from 80+ style presets
- Customize image dimensions and generation parameters
- Add optional negative prompts
- Add custom text banners to your images
- Save generated images to a local gallery
- Download images to your device

## How to Use

1. **Open the Application**: Simply open the `index.html` file in your web browser. No server or installation required!

2. **Enter your API Key**: On first launch, a setup dialog will appear. Follow the instructions above to get your Venice AI API key and paste it in.

3. **Configure Your Image**:
   - Select a model from the dropdown menu
   - Choose a style preset
   - Enter a prompt describing the image you want to generate
   - Optionally, add a negative prompt to specify what to exclude
   - Optionally, add banner text that will appear on the image
   - Adjust image dimensions and generation steps as needed

4. **Generate**: Click the "Generate Image" button to create your image. The generation process may take a few moments depending on the complexity and parameters selected.

5. **Save or Download**: Once the image is generated, you can:
   - Download it directly to your device
   - Save it to your gallery to keep track of your creations

## Models Available

- Fluently-XL-Final
- FLUX.1-dev
- FLUX.1-dev (uncensored)
- Pony-Realism
- Stable-Diffusion-3.5-Large
- Lustify-SDXL-NSFW-Checkpoint

## Technical Details

- Built with vanilla JavaScript (no frameworks required)
- Styled with Tailwind CSS
- Uses the Venice AI API for image generation
- Stores images locally (no server-side storage)
- Responsive design works on desktop and mobile devices
- API key stored securely in browser `localStorage`

## Important Notes

- The application requires an internet connection to access the Venice AI API
- Please respect Venice AI's terms of service when generating images
- NSFW content generation requires appropriate model selection
