import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // <-- fixed typo (_dirname → __dirname)

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
await fs.mkdir(uploadsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // <-- fixed missing backticks
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG and PNG allowed.'));
    }
  }
});

// Parse rule text to extract specs
function parseRuleText(ruleText) {
  const widthMatch =
    ruleText.match(/(\d+)\s*x\s*(\d+)/i) ||
    ruleText.match(/width[:\s]+(\d+).*height[:\s]+(\d+)/i);
  const sizeMatch =
    ruleText.match(/(\d+)\s*[-–]\s*(\d+)\s*kb/i) ||
    ruleText.match(/size[:\s]+(\d+).*?(\d+)\s*kb/i);
  const formatMatch = ruleText.match(/\b(jpg|jpeg|png)\b/i);

  return {
    width: widthMatch ? parseInt(widthMatch[1]) : 200,
    height: widthMatch ? parseInt(widthMatch[2]) : 230,
    minKb: sizeMatch ? parseInt(sizeMatch[1]) : 20,
    maxKb: sizeMatch ? parseInt(sizeMatch[2]) : 50,
    format: formatMatch ? formatMatch[1].toLowerCase() : 'jpg'
  };
}

// Process image with Sharp
async function processImage(inputPath, width, height, minKb, maxKb, format = 'jpeg') {
  let quality = 92;
  let output = null;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    output = await sharp(inputPath)
      .resize(width, height, { fit: 'fill' })
      [format === 'jpg' ? 'jpeg' : format]({ quality })
      .toBuffer();

    const sizeKb = output.length / 1024;

    // If within range, we're done
    if (sizeKb <= maxKb && sizeKb >= minKb) break;

    // Adjust quality
    if (sizeKb > maxKb) {
      quality -= 5;
    } else if (sizeKb < minKb) {
      quality += 3;
    }

    // Ensure quality stays within bounds
    quality = Math.max(10, Math.min(100, quality));
    attempts++;
  }

  return output;
}

// Main processing endpoint
app.post('/api/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { ruleText, preset } = req.body;

    // Parse rules
    let rules;
    if (preset && preset !== 'custom') {
      const presets = {
        photo: { width: 200, height: 230, minKb: 20, maxKb: 50, format: 'jpg' },
        signature: { width: 140, height: 60, minKb: 10, maxKb: 20, format: 'jpg' },
        thumb: { width: 140, height: 60, minKb: 20, maxKb: 50, format: 'jpg' },
        declaration: { width: 800, height: 300, minKb: 50, maxKb: 100, format: 'jpg' }
      };
      rules = presets[preset];
    } else {
      rules = parseRuleText(
        ruleText || 'Dimensions 200x230 pixels, size 20-50KB, JPG format'
      );
    }

    // Process the image
    const processedBuffer = await processImage(
      req.file.path,
      rules.width,
      rules.height,
      rules.minKb,
      rules.maxKb,
      rules.format
    );

    // Get image metadata
    const metadata = await sharp(processedBuffer).metadata();
    const sizeKb = (processedBuffer.length / 1024).toFixed(2);

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    // Send response
    res.json({
      status: 'success',
      width: metadata.width,
      height: metadata.height,
      fileSizeKb: parseFloat(sizeKb),
      format: rules.format.toUpperCase(),
      valid:
        parseFloat(sizeKb) <= rules.maxKb && parseFloat(sizeKb) >= rules.minKb,
      imageBase64: `data:image/${rules.format === 'jpg' ? 'jpeg' : rules.format};base64,${processedBuffer.toString('base64')}`
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Clean up file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});

