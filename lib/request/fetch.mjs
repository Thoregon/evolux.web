/**
 * rudimentary polyfill for NodeJS
 * is an incomplete implementation for simple 'fetch' scenarios, supports all HTTP methods
 * adds [Browser Fetch API](https://developer.mozilla.org/de/docs/Web/API/Fetch_API) to node
 *
 * todo [OPEN]
 *  - full implementation to work like browser fetch API
 *      - Request/Response
 *      - Headers
 *      - translate 'fetch' options
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import http  from "/http";
import https from "/https";
import url   from '/url';

export class Request {

    constructor(url, { method, mode, referrer, headers } = {}) {
        Object.assign(this, { url, method, mode, referrer, headers });
    }
}

export class Response {

    constructor({ status=200, headers } = {}) {
        const mheaders = new Map();
        Object.entries(headers).forEach(([name, value]) => mheaders.set(name, value));
        Object.assign(this, { status, headers: mheaders });
    }


    with(body) {
        this.body = body;
        return this;
    }

    async text() {
        return '' + this.body;
    }

    async json() {
        return JSON.parse('' + this.body);
    }
}

function fetch(urlOrRequest, options) {
    return new Promise(((resolve, reject) => {
        options = { method: 'GET', headers: {}, ...options };
        if (urlOrRequest instanceof Request) urlOrRequest = urlOrRequest.url;
        let url = (urlOrRequest instanceof URL) ? url : new URL(urlOrRequest);
        const data = options.body;     // new TextEncoder().encode(options.body)
        if (data) {
            // caution: content type must be set by the caller!
            options.headers['Content-Length'] = data.length;
        }
        if (!options.headers.Referrer) {
            options.headers.Referrer = url.protocol+'//'+url.host+(url.port ? ':' + url.port : '');
        }
        const service = url.protocol === 'http:' ? http : https;
        const clientrequest = service.request(url, options, (serverresponse) => {
            let chunks = [];
            // let decoder = new TextDecoder();
            const res = new Response({ headers: serverresponse.headers, status: serverresponse.statusCode });

            // collect body chunks
            serverresponse.on('data', (chunk) => {
                chunks.push(chunk);     //  decoder.decode(chunk);
            });

            // all chunks received
            serverresponse.on('end', () => {
                const body = Buffer.concat(chunks)
                resolve(res.with(body));
            });

        });

        clientrequest.on("error", (err) => {
            reject(err);
        });

        if (data) {
            clientrequest.write(data);
            // clientrequest.end();
        }
        clientrequest.end();
    }));
}

export default fetch;
// make it global available
if (!globalThis.fetch) globalThis.fetch = fetch;
if (!globalThis.Request) globalThis.Request = Request;
if (!globalThis.Response) globalThis.Response = Response;
