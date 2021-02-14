const express = require('express');
const bodyParser = require('body-parser');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');

require('dotenv').config();

// Create Express Server
const app = express();
const router = express.Router();

// Configuration
const PORT = 3000;
const HOST = "localhost";
const BASE_URL = "https://api.notefile.net";
const PRODUCT = process.env.PRODUCT_UID;
const DEVICE = process.env.DEVICE_UID;
const TOKEN = process.env.SESSION_TOKEN;

// Logging
app.use(morgan('dev'));
// parse application/json
app.use(bodyParser.json());

const cmdMap = {
  "left": 186,
  "right": 234,
  "lower": 174,
  "lower_2": 251,
  "raise": 250,
  "raise_2": 187,
  "close": 190,
  "open": 238,
  "recalibrate": 171
};

// Info GET endpoint
app.get('/info', (req, res, next) => {
  res.send('This is a proxy service forwards authorized requests to \
    a Notehub service.');
});

const proxyOptions = {
  target: BASE_URL,
  changeOrigin: true,
  pathRewrite: {
      [`^/api`]: `/req?product=${PRODUCT}&device=${DEVICE}`,
  },
  onError(err, req, res) {
    res.writeHead(500, {
      'Content-Type': 'text/plain',
    });
    res.end('Something went wrong: ' + err);
  },
  onProxyReq(proxyReq, req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Change input from {"command":"left"}
    if (req.method == 'POST' && req.body) {
      cmdName = req.body["command"] ? req.body["command"] : "none";

      console.log("Command: ", cmdName);

      if (req.body) delete req.body;

      // To {"req":"note.add","file":"rob.qi", "body": {"cmd":186}}
      const body = {
        req: "note.add",
        file: "rob.qi",
        body: {"cmd": cmdMap[cmdName] ? cmdMap[cmdName] : 000}
      };
      const bodyStr = JSON.stringify(body);

      console.log("New Body: ", bodyStr);

      // Update header
      proxyReq.setHeader('content-type', 'application/json');
      proxyReq.setHeader('Content-Length', bodyStr.length);
      proxyReq.setHeader('X-SESSION-TOKEN', TOKEN);

      proxyReq.write(bodyStr, () => proxyReq.end());
    }
  }
};

const proxyFilter = function (path, req) {
  return req.method === 'GET' || req.method === 'POST';
};

router.all('/api', createProxyMiddleware(proxyFilter, proxyOptions));

app.use('/', router);

// Start the Proxy
app.listen(PORT, HOST, () => {
  console.log(`Starting Proxy at ${HOST}:${PORT}`);
});

module.exports = { app, router };
