R.O.B. Proxy Service
====================

A proxy service for the Nintendo R.O.B. Showcase application.

Local Development
-----------------

```none
$ docker run --interactive --net=host --rm --tty --volume $(pwd):/node-app/ node:lts-alpine sh
# cd node-app/
# npm install

added 73 packages, and audited 74 packages in 2s

found 0 vulnerabilities
npm notice
npm notice New minor version of npm available! 7.4.3 -> 7.6.0
npm notice Changelog: https://github.com/npm/cli/releases/tag/v7.6.0
npm notice Run npm install -g npm@7.6.0 to update!
npm notice

# . .example.setenv.sh
# npm start

> rob-proxy@0.1.0 start
> node api/index.js

[HPM] Proxy created: function (path, req) {
  return req.method === 'GET' || req.method === 'POST';
}  -> https://api.notefile.net
[HPM] Proxy rewrite rule created: "^/api.*" ~> "/req?product=com.blues.zfields:showcase&device=dev:0209f00c8251c4f4620139"
Starting Proxy at localhost:3000
```

The service will be reachable at http://localhost:3000.
