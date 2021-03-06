const express = require('express');
const cors = require('cors');
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
app.use(cors());
app.use(bodyParser.json());

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
        [`^/api.*`]: `/req?product=${PRODUCT}&device=${DEVICE}`,
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
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,POST');
        res.setHeader(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
        );

        let body;
        // Handle status query
        if (req.method == 'GET') {
            console.log("GET QUERY:", req.query);
            switch (req.query.status) {
                case "AWAITING_NOTEHUB_IO":
                    // Poll Notehub for command request arrival
                    // curl -L 'https://api.notefile.net/req?product=com.blues.zfields:showcase&device=dev:000000000000000' --header 'X-SESSION-TOKEN: <token>' --data '{"req":"hub.app.data.query","query":{"columns":".when;.file;.body", "where":".file::text = '\''rob.qi'\'' AND .body.guid::text = '\''00000000-0000-0000-0000-000000000000'\''"}}'
                    body = {
                        req: "hub.app.data.query",
                        query: {
                            columns: ".when;.file;.body",
                            where: ".file::text = 'rob.qi' AND .body.guid::text = '" + req.query.guid + "'"
                        }
                    };
                    break;
                case "AWAITING_CELL_TOWER":
                    // Poll Notehub for command request departure
                    // curl -L 'https://api.notefile.net/req?product=com.blues.zfields:showcase&device=dev:000000000000000' --header 'X-SESSION-TOKEN: <token>' --data '{"req":"note.changes","file":"rob.qi","device":"dev:000000000000000"}'
                    body = {
                        req: "note.changes",
                        file: "rob.qi",
                        device: "dev:864475044218237"
                    };
                    break;
                case "AWAITING_ROB":
                    // Poll Notehub for R.O.B.'s response
                    // curl -L 'https://api.notefile.net/req?product=com.blues.zfields:showcase&device=dev:000000000000000' --header 'X-SESSION-TOKEN: <token>' --data '{"req":"hub.app.data.query","query":{"columns":".when;.file;.body", "where":".file::text = '\''rob.qo'\'' AND .body.guid::text = '\''00000000-0000-0000-0000-000000000000'\''"}}'
                    body = {
                        req: "hub.app.data.query",
                        query: {
                            columns: ".when;.file;.body",
                            where: ".file::text = 'rob.qo' AND .body.guid::text = '" + req.query.guid + "'"
                        }
                    };
                    break;
                default:
                    console.log("Unrecognized Status:", req.query.status);
                    body = {};
                    res.status(501).end();
            }

            // Forward API request
        } else if (req.method == 'POST' && req.body) {
            console.log("POST BODY: ", req.body);
            cmdName = req.body["command"] ? req.body["command"] : "none";
            cmdGuid = req.body["guid"] ? req.body["guid"] : "none";

            if (req.body) delete req.body;

            // {"req":"note.add","file":"rob.qi","body":{"cmd":186, "guid":<guid>}}
            body = {
                req: "note.add",
                file: "rob.qi",
                body: { "cmd": cmdMap[cmdName] ? cmdMap[cmdName] : 000, "guid": cmdGuid }
            };
        }

        // Print outbound Note body
        console.log("NOTE: ", body);

        // Update header
        const bodyStr = JSON.stringify(body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', bodyStr.length);
        proxyReq.setHeader('X-SESSION-TOKEN', TOKEN);

        proxyReq.write(bodyStr, () => proxyReq.end());
    },
    onProxyRes(proxyRes, req, res) {
        // https://github.com/chimurai/http-proxy-middleware/issues/97
        proxyRes.on('data', function (data) {
            const dataStr = data.toString('utf-8');
            console.log(req.method, "Notehub.io Response:", dataStr);
            if ("GET" === req.method) {
                let query_results;
                switch (req.query.status) {
                    case "AWAITING_NOTEHUB_IO":
                        query_results = JSON.parse(data);
                        console.log(query_results.length, "row(s) matched the query.");

                        if (query_results.length) {
                            res.status(200);
                        } else {
                            res.status(404);
                        }
                        break;
                    case "AWAITING_CELL_TOWER":
                        if (0 > dataStr.search(req.query.guid)) {
                            res.status(200);
                        } else {
                            res.status(420);
                        }
                        break;
                    case "AWAITING_ROB":
                        query_results = JSON.parse(data);
                        console.log(query_results.length, "row(s) matched the query.");

                        if (query_results.length) {
                            res.status(202);
                        } else {
                            res.status(404);
                        }
                        break;
                };
            }
        });
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
};

const proxyFilter = function (path, req) {
    return req.method === 'GET' || req.method === 'POST';
};

router.all('*', createProxyMiddleware(proxyFilter, proxyOptions));

app.use('/', router);

// Start the Proxy
app.listen(PORT, HOST, () => {
    console.log(`Starting Proxy at ${HOST}:${PORT}`);
});

module.exports = { app, router };
