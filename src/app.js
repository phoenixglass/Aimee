const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'Aimee - Wine Sales Voice Assistant API',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes
app.use('/api', routes);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
