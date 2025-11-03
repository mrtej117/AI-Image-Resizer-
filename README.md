# 🎯 AI Image Resizer - Setup Guide

Complete setup instructions for running the full-stack application locally.

---

## 📁 Project Structure


ai-image-resizer/
├── backend/
│   ├── index.js          # Main server file
│   ├── package.json      # Backend dependencies
│   └── uploads/          # Auto-created for temp files
│
└── frontend/
    ├── src/
    │   ├── App.jsx       # Main React component
    │   └── main.jsx      # Entry point
    ├── package.json
    └── index.html


---

## 🚀 Backend Setup

### Step 1: Create Backend Directory
bash
mkdir -p ai-image-resizer/backend
cd ai-image-resizer/backend


### Step 2: Create Files
Create package.json and index.js files with the code provided.

### Step 3: Install Dependencies
bash
npm install


This installs:
- *express* - Web server framework
- *cors* - Enable cross-origin requests
- *multer* - Handle file uploads
- *sharp* - High-performance image processing

### Step 4: Start Backend Server
bash
npm start


Or for development with auto-reload:
bash
npm run dev


Server runs on: http://localhost:3001

---

## 💻 Frontend Setup

### Step 1: Create React App
bash
cd ..
npm create vite@latest frontend -- --template react
cd frontend


### Step 2: Install Dependencies
bash
npm install
npm install lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


### Step 3: Configure Tailwind

*tailwind.config.js:*
js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


*src/index.css:*
css
@tailwind base;
@tailwind components;
@tailwind utilities;


### Step 4: Replace App.jsx
Replace src/App.jsx with the provided code.

### Step 5: Start Frontend
bash
npm run dev


Frontend runs on: http://localhost:5173

---

## ✅ Testing

1. *Start Backend:* Run backend server first
2. *Start Frontend:* Then start React app
3. *Upload Image:* Select preset or custom rules
4. *Process:* Click "Process Image"
5. *Download:* Get your resized image!

---

## 🔧 Configuration

### Change Backend Port
Edit backend/index.js:
js
const PORT = 3001; // Change this


Update frontend API URL in frontend/src/App.jsx:
js
const API_URL = 'http://localhost:3001/api';


### Add More Presets
Edit the PRESETS object in both files:
js
mypreset: { 
  label: "My Custom Preset",
  width: 300, 
  height: 400, 
  minKb: 30, 
  maxKb: 60, 
  format: "jpg" 
}


---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Ensure all dependencies are installed: npm install

### CORS errors
- Make sure backend is running
- Check backend CORS configuration in index.js

### Sharp installation issues
- On Windows: Install windows-build-tools
- On Linux: Install libvips: sudo apt-get install libvips-dev
- On Mac: Should work out of the box

### Client-side fallback
- If backend fails, app automatically uses browser processing
- Toggle "Use Backend API" checkbox to test both modes

---

## 📦 Production Deployment

### Backend
Deploy to:
- *Render* (recommended)
- *Railway*
- *Heroku*
- *AWS EC2*

### Frontend
Deploy to:
- *Vercel* (recommended)
- *Netlify*
- *GitHub Pages*

Update API_URL in frontend to your deployed backend URL.

---

## 🎉 Features

✅ Drag & drop file upload
✅ Multiple preset configurations
✅ Custom rule parsing
✅ Real-time validation
✅ Before/after preview
✅ Client-side fallback
✅ Smart compression algorithm
✅ Download processed images

---

## 📝 Notes

- Max upload size: 10MB
- Supported formats: JPG, PNG
- Processing happens server-side (Sharp) or client-side (Canvas)
- Temporary files auto-deleted after processing
- No data stored permanently

---

## 🚧 Future Enhancements

- [ ] PDF to image conversion
- [ ] Batch processing multiple files
- [ ] Auto-crop whitespace
- [ ] Cloud storage integration
- [ ] User authentication
- [ ] Processing history

---

Happy Resizing! 🎯
