const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const { performance } = require('perf_hooks');

require('dotenv').config();

// Create Express Server
const app = express();
const router = express.Router();

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if(d > 0){//Use timestamp until depleted
            r = (d + r)%16 | 0;
            d = Math.floor(d/16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r)%16 | 0;
            d2 = Math.floor(d2/16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

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
app.options('*', cors());

const cmdMap = {
  "LEFT": 186,
  "RIGHT": 234,
  "DOWN": 174,
  "UP": 250,
  "CLOSE": 190,
  "OPEN": 238,
  "RECALIBRATE": 171
};

// Info GET endpoint
app.get('/info', (req, res, next) => {
  res.send('This proxy service forwards authorized requests to \
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

    // Change input from {"command":"LEFT"}
    if (req.method == 'POST' && req.body) {
      console.log("BODY: ", req.body);
      cmdName = req.body["command"] ? req.body["command"] : "none";

      if (req.body) delete req.body;

      // {"req":"note.add","file":"rob.qi","id":<unique uint32_t>,"body":{"cmd":186}}
      const body = {
        req: "note.add",
        file: "rob.qi",
        body: {"cmd": cmdMap[cmdName] ? cmdMap[cmdName] : 000, "guid": generateUUID()}
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
