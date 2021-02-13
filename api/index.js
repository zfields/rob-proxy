const express = require('express');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');

require('dotenv').config();

// Create Express Server
const app = express();

// Configuration
const PORT = 3000;
const HOST = "localhost";
const BASE_URL = "https://api.notefile.net";
const PRODUCT = process.env.PRODUCT_UID;
const DEVICE = process.env.DEVICE_UID;
const TOKEN = process.env.SESSION_TOKEN;

// Logging
app.use(morgan('dev'));

// Info GET endpoint
app.get('/info', (req, res, next) => {
  res.send('This is a proxy service forwards authorized requests to \
    a Notehub service.');
});

// Proxy endpoints
app.use('/api', createProxyMiddleware({
  target: BASE_URL,
  changeOrigin: true,
  pathRewrite: {
      [`^/api`]: `/req?product=${PRODUCT}&device=${DEVICE}`,
  },
  headers: {
    'X-SESSION-TOKEN': TOKEN
  }
}));

// Start the Proxy
app.listen(PORT, HOST, () => {
  console.log(`Starting Proxy at ${HOST}:${PORT}`);
});

module.exports = app;