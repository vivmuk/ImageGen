# Venice AI Image Generator

A web-based application that allows you to generate custom images using the Venice AI API. This application provides a user-friendly interface to interact with Venice's powerful image generation capabilities.

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

2. **Configure Your Image**:
   - Select a model from the dropdown menu
   - Choose a style preset
   - Enter a prompt describing the image you want to generate
   - Optionally, add a negative prompt to specify what to exclude
   - Optionally, add banner text that will appear on the image
   - Adjust image dimensions and generation steps as needed

3. **Generate**: Click the "Generate Image" button to create your image. The generation process may take a few moments depending on the complexity and parameters selected.

4. **Save or Download**: Once the image is generated, you can:
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

## Important Notes

- The application requires an internet connection to access the Venice AI API
- Please respect Venice AI's terms of service when generating images
- NSFW content generation requires appropriate model selection
- The API key is included in the code for demonstration purposes. In a production environment, it should be properly secured. 