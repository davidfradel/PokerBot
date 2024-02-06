const axios = require('axios');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const chokidar = require('chokidar');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const apiKey = process.env.OPENAI_API_KEY;
const monitoredFolder = process.env.MONITORED_FOLDER;
const pseudo = process.env.PSEUDO;

if (!apiKey) {
  throw new Error('Please set the OPENAI_API_KEY environment variable');
}

if (!monitoredFolder) {
  throw new Error('Please set the MONITORED_FOLDER environment variable');
}

async function analyzeImage(imagePath) {
  function encodeImage(fullImagePath) {
    const image = fs.readFileSync(fullImagePath);
    return Buffer.from(image).toString('base64');
  }

  const base64Image = encodeImage(imagePath);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const payload = {
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Voici un screenshot de ma partie de poker en ligne. En fonction de cette image et des informations précédentes de la conversation si elles excistent, tu dois simplement me répondre si je dois me coucher ou relancer.Mon style de jeu sera basé sur le bluff. Donne moi une réponse en 5 mots maximum pour que je sois rapide. Mon pseudo est ${pseudo} dans l'image. Merci !`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  };

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, { headers });
    const message = response?.data.choices[0];
    console.log('Analysis result:', message);

    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error(`Error deleting image: ${err}`);
        return;
      }
      console.log(`Image deleted successfully: ${imagePath}`);

      process.exit();
    });
  } catch (error) {
    throw new Error(`Error in image analysis: ${error}`);
  }
}

const watcher = chokidar.watch(monitoredFolder, {
  ignored: /(^|[/\\])\../, // ignore hidden files
  persistent: true,
});

watcher.on('add', (imagePath) => {
  console.log(`File added: ${imagePath}`);
  analyzeImage(imagePath);
});

function takeScreenshot() {
  const uniqueName = uuidv4();
  const screenshotName = `myScreenshot_${uniqueName}.png`;
  const screenshotPath = path.join(monitoredFolder, screenshotName);

  exec(`screencapture -x "${screenshotPath}"`, (error) => {
    if (error) {
      throw new Error(`Error during screenshot: ${error}`);
    }
    console.log(`Screenshot saved in ${monitoredFolder}`);
  });
}

takeScreenshot();
