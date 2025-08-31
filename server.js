require('dotenv').config();
const express = require('express');
const path = require('path');
const dpu = require('./DPU.js');
const fc = require('./FC.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Store logs in memory (for demo; in production, use a database or file)
let logs = [];

// Override console.log to capture logs
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  const timestamp = new Date().toISOString();
  logs.push({ timestamp, message, level: 'info' });
  // Keep only last 1000 logs
  if (logs.length > 1000) logs = logs.slice(-1000);
  originalConsoleLog.apply(console, args);
};

// Routes
app.get('/api/logs', (req, res) => {
  res.json(logs.slice(-100)); // Return last 100 logs
});

app.post('/api/run/:script/:func', async (req, res) => {
  const { script, func } = req.params;
  try {
    let result;
    if (script === 'dpu') {
      switch (func) {
        case 'post':
          result = await dpu.postImagesToInstagramDPU_Supabase();
          break;
        case 'count':
          result = await dpu.countReadyConfessionsDPU_Supabase();
          break;
        case 'test':
          result = await dpu.testInstagramContentPublishingLimitDPU_Supabase();
          break;
        default:
          throw new Error('Unknown function');
      }
    } else if (script === 'fc') {
      switch (func) {
        case 'post':
          result = await fc.postImagesToInstagramFC_Supabase();
          break;
        case 'count':
          result = await fc.countReadyConfessionsFC_Supabase();
          break;
        case 'test':
          result = await fc.testInstagramContentPublishingLimitFC_Supabase();
          break;
        default:
          throw new Error('Unknown function');
      }
    } else {
      throw new Error('Unknown script');
    }
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error running function:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
