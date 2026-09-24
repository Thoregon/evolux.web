/**
 *
 *
 * @author: Bernhard Lukassen
 */

// import request                      from "/request-promise";
import Router      from "./router.mjs";
import process     from "process";
import express     from 'express';
import compression from "compression";
import proxy       from "express-http-proxy";
import fs          from 'fs';
import * as http   from 'http';
import WebSocket   from 'ws';
import bodyParser  from 'body-parser';
import cors        from 'cors';
import path        from 'path';
import nodemailer  from "nodemailer";

import { ErrNoHttpServiceAvailable, ErrRouteOccupied, ErrNoSMTPCredentials } from "./errors.mjs";
import ApiRouter                                                             from "./api/apirouter.mjs";
import RESTRouter                                                            from "./api/restrouter.mjs";

import { crawlFlat } from "./info/crawl.mjs";
import serveIndex    from "serve-index";
import http2Express  from "http2-express-bridge";

import {
    requestResponseLogger,
    attachWebSocketLogger,
    createLogger
} from './log/trafficlogger.mjs';
import { logger } from "evolux.util";

const env = process.env;
const createServer = http.createServer; // !Object.hasOwnProperty('HTTP') ? http2.createServer : env.HTTP2 === '1' ? http2.createServer : http.createServer;

const one = '072X2x0woBod3wym';
const two = 'r1ETzE9woE7KEg5PQ2X';

const home = () => app.current.home;

//
//
//

const debuglog = (...args) => {} // console.log("P2PNetworkPolicy", universe.inow, ":", ...args);  // {}
const debugerr = (...args) => console.error("P2PNetworkPolicy", universe.inow, ":", ...args);

const envlocation = path.join(process.cwd(), '../env/etcui');


//
// express rest server
//

const service  = http2Express(express);
const staticfn = express.static;
const cwd      = process.cwd();

//
// proxy
//

const UPSTREAM_URL = thoregon.isDev ? "https://nexus.upay-sandbox.me" : "https://nexus.upay.me";
// Hop-by-hop headers should not be forwarded (RFC 7230)
const HOP_BY_HOP = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
]);

function filterHeaders(reqHeaders) {
    const out = new Headers();
    for (const [k, v] of Object.entries(reqHeaders)) {
        const key = k.toLowerCase();
        if (HOP_BY_HOP.has(key)) continue;
        // You can also exclude/overwrite authorization here if needed
        out.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
    return out;
}

async function proxyToUpstream(req, res) {
    try {
        // Build upstream URL: keep query string for GET
        const url = new URL(UPSTREAM_URL);
        const incomingUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
        // copy query params if any
        incomingUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));

        const headers = filterHeaders(req.headers);

        // Preserve content-type if we’re sending a body
        // Express.json/urlencoded already parsed it; we re-serialize for upstream.
        let body;
        if (req.method !== "GET" && req.method !== "HEAD") {
            if (req.is("application/json")) {
                body = JSON.stringify(req.body ?? {});
                if (!headers.has("content-type")) headers.set("content-type", "application/json");
            } else if (req.is("application/x-www-form-urlencoded")) {
                body = new URLSearchParams(req.body ?? {}).toString();
                if (!headers.has("content-type"))
                    headers.set("content-type", "application/x-www-form-urlencoded");
            } else {
                // If you need raw/binary passthrough, you’d add express.raw(), but that’s optional.
                // For now, best-effort JSON fallback:
                body = JSON.stringify(req.body ?? {});
                if (!headers.has("content-type")) headers.set("content-type", "application/json");
            }
        }

        console.log("Proxy to Nexus: ", url, req.method);
        const upstreamResp = await fetch(url.toString(), {
            method: req.method,
            headers,
            body,
            redirect: "manual",
        });
        console.log("Proxy Nexus response: ", upstreamResp.status, upstreamResp.statusText);

        // Mirror status
        res.status(upstreamResp.status);

        // Mirror response headers (excluding hop-by-hop)
        upstreamResp.headers.forEach((value, key) => {
            if (HOP_BY_HOP.has(key.toLowerCase())) return;
            // Avoid setting content-length since Express will handle it
            if (key.toLowerCase() === "content-length") return;
            res.setHeader(key, value);
        });

        // Stream the body back to the client
        if (upstreamResp.body) {
            // Node 18+ fetch returns a web ReadableStream; Express expects a Node stream.
            // Convert via Response.arrayBuffer() for compatibility without extra libs.
            const buf = Buffer.from(await upstreamResp.arrayBuffer());
            res.send(buf);
        } else {
            res.end();
        }
    } catch (err) {
        console.error("Proxy Nexus response: ", err, err.stack);
        res.status(502).json({
            error: "Bad Gateway",
            message: err instanceof Error ? err.message : String(err),
        });
    }
}

// Basic Authentication
function buildAuth(auser, apwd) {
    return function auth(req, res, next) {
        console.log(req.headers);
        var authHeader = req.headers.authorization;
        if (!authHeader) {
            // try { home().sendStatusEmail('WEB AUTH HEADER MISSING', 'NOAUTHHEADER', `from ${req.ip} url: ${req.originalUrl}`) } catch (err) { console.error('>> WebserviceController::auth -> REJECTED', e) }
            var err = new Error('You are not authenticated!');
            res.setHeader('WWW-Authenticate', 'Basic');
            err.status = 401;
            next(err);
            return;
        }

        var auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
        var user = auth[0];
        var pass = auth[1];
        if (user === universe.everblack.unpack(auser) && pass === universe.everblack.unpack(apwd)) {
            try { home().sendStatusEmail('WEB AUTH', 'GRANTED', `from ${req.ip} url: ${req.originalUrl}`) } catch (err) { console.error('>> WebserviceController::auth -> GRANTED', e) }
            next(); // authorized
        } else {
            try { home().sendStatusEmail('WEB AUTH', 'REJECTED', `from ${req.ip} url: ${req.originalUrl}`) } catch (err) { console.error('>> WebserviceController::auth -> REJECTED', e) }
            var err = new Error('You are not authenticated!');
            res.setHeader('WWW-Authenticate', 'Basic');
            err.status = 401;
            next(err);
        }
    }
}
/**
 * WebserviceController
 */
export default class WebserviceController {

    constructor({
                    service
                } = {}) {
        Object.assign(this, { service });
        this.routes = {};
        this.smtp   = {};
    }

    /*
     * routing
     */

    has(path) {
        return !!this.routes[path];
    }

    root(path) {
        if (!path) path = '/';
        if (this.routes[path]) throw ErrRouteOccupied(path);
        let router = new Router(path, this.service, express, cwd);
        this.routes[path] = router;
        return router;
    }

    _init(service) {
        if (universe.smtp) {
            Object.entries(universe.smtp).forEach(([name, smtpcredentials]) => this.addSMTPservice(name, smtpcredentials));
        }

        if (universe.WWW) {
            this.setupExpress(universe.WWW);
        }

        // this.request = request;
    }

    /**
     * setup the HTTP service
     * ToDo: add WS (websockets)
     */
    setupExpress(config) {
        const { port, host, greenlock:greenlockcfg } = config;

        const LOG_DIR = universe.LOG_DIR;

        /*
                service.use(
                    express.json({
                                     // We need the raw body to verify webhook signatures.
                                     // Let's compute it only when hitting the Stripe webhook endpoint.
                                     verify: function (req, res, buf) {
                                         if (req.originalUrl.startsWith('/stripe')) {
                                             req.rawBody = buf.toString();
                                         }
                                     },
                                 })
                );
        */
/*
        const json = express.json({ limit: '2mb' });
        service.use(
            (req, res, next) => {
                if (req.originalUrl === '/stripe/message') {
                    next();
                } else {
                    json(req, res, next);
                }
            }
        );
*/

        service.set('trust proxy', true);
        service.use(compression());
        service.use(bodyParser.json({ limit: '2mb' }));
        service.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));

        // attach logger
        const httplogger = createLogger(LOG_DIR, 'http_access.log');
        service.use(requestResponseLogger({
            logger: httplogger,
            maxBodyLength: 10_000
        }));

        service.use(cors({
                             // exposedHeaders: ['Content-Length'],
                             // credentials: true,
                             origin: '*',
                             /* function(origin, callback){
                                 // allow requests with no origin
                                 if(!origin) return callback(null, true);

                                 // todo: enable restriction of origin
                                 if(allowedOrigins.indexOf(origin) === -1){
                                     var msg = `The CORS policy for this site does not allow access from origin ${origin}.`;
                                     return callback(new Error(msg), false);
                                 }
                                 return callback(null, true);
                             }
                             */
                         }));
        service.use((req, res, next) => this.http(req, res, next));
        express.static.mime.define({'application/javascript': ['mjs']});

        // forward to nexus
        if (!universe.IS_NEXUS) {
            let nexus = universe.account.nexus;
            // nexus = nexus.substring(nexus.lastIndexOf("/") + 1);
            console.log("Nexus Proxy to:", nexus);

/*
            app.get("/nexusrest", proxyToUpstream);
            app.post("/nexusrest", proxyToUpstream);

            app.get("/xactivity", proxyToUpstream);
            app.post("/xactivity", proxyToUpstream);
*/
            service.use('/nexusrest', proxy(nexus, {
                proxyReqPathResolver: function (req) {
                    // console.log("Nexus Proxy request", req.url);
                    return "/restapi" + req.url;
                }
            }));
/*
                        service.use('/nexusws', proxy(nexus, {
                            proxyReqPathResolver: function (req) {
                                console.log("Nexus Proxy to ", req.url);
                                return "/wsapi" + req.url;
                            }
                        }));
            */
            service.use('/xactivity', proxy(nexus, {
                proxyReqPathResolver: function (req) {
                    // console.log("Nexus Proxy request", req.url);
                    return "/xactivity" + req.url;
                }
            }));
            // todo: proxy for nexus ws api
        }

        universe.wwwservice = service;
        universe.express = express;
        universe.WebSocket = WebSocket;
        // now start the service
        // service.listen(port, host);
        // console.log(`$$ Webservice Controller: express serve: ${host}:${port}`);

        if (config.static) {
            const staticdirs = Array.isArray(config.static) ? config.static : [config.static];
            if (config.rewrite) {
                const rewrites = Array.isArray(config.rewrite) ? config.rewrite : [config.rewrite];
                rewrites.forEach(({ match, to }) => {
                    service.get(match, (req, res, next) => {
                        req.url = to + '/' + req.url.substring(match.length - 1);
                        next();
                    });
                    console.log("WWW Static rewrite added", match, ' -> ', to);
                });
            }
            if (config.mapping) {
                const mapping = Array.isArray(config.mapping) ? config.mapping : [config.mapping];
                mapping.forEach(({ match, to }) => {
                    const etclocation = path.join(envlocation, to.startsWith('/') ? to.substring(1) : to);
                    service.get(match, (req, res, next) => {
                        let url = req.url.substring(5);
                        if (url.endsWith('/')) url = url.slice(0, -1);
                        //url = path.join(etclocation, url);
                        var options = {
                            root: etclocation,
                            dotfiles: 'deny',
                            headers: {
                                'x-timestamp': Date.now(),
                                'x-sent': true
                            }
                        }
                        res.sendFile(url, options, (err) => {
                            if (err) {
                                //console.error(err);
                                next(err);
                            }
                        });
                        // next();
                    });

                });
            }

            service.use('/pub/log/neuland.log', buildAuth(one, two));

            //
            // static dirs for rollup package
            //
            const __dirname = path.resolve(process.cwd(), process.env.UI_PATH ?? './lib/ui');
            service.use('/assets', express.static(path.join(__dirname, 'dist/assets'), {
                maxAge: '1y',   // 1 year in milliseconds
                immutable: true // Key: Prevents the 304 revalidation request entirely
            }));
            service.use(express.static(path.join(__dirname, 'dist'), {
                maxAge: 0,
                lastModified: true,
                etag: true
            }));

            //
            // static dirs from config
            //
            staticdirs.forEach((staticdir) => {
                const parts = Array.isArray(staticdir) ? staticdir[0].split('::') : staticdir.split('::');
                let spath, sdir;
                if (parts.length > 1) {
                    spath = parts[0];
                    sdir = parts[1];
                } else {
                    sdir = parts[0];
                }
                const UI_PATH = process.env.UI_PATH ?? './lib/ui'; // './client';
                const staticroot = path.resolve(process.cwd(), sdir);
                console.log("WWW Static route added", spath ? spath : '', staticroot);
                const staticlogger = httplogger;
                // todo: replace this literal!
                if (staticdir === UI_PATH) {
                    // Disable cache for specific files
                    service.get(['/upayme.html', '/conversiontools.html', '/checkout.html', '/protoapp.mjs', '/evolux.universe/lib/reliant/letThereBeLight.mjs', '/setup/universe.remote.config.js', '/setup/universe.remote.config.mjs', '/thoregonremote.mjs', '/hatch.mjs', '/widgets.mjs'], (req, res) => {
                        staticlogger.log(">> express static UI", req.url);
                        const mimeType = req.path?.endsWith('.html') ? 'text/html' : (req.path?.endsWith('.mjs') || req.path?.endsWith('.js')) ? 'text/javascript' : 'text/plain';
                        res.set({
                            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0',
                            'Surrogate-Control': 'no-store'
                        });
                        const filepath = (req.path === '/hatch.mjs' || req.path === '/widgets.mjs') ? staticroot + '/src' : staticroot;

                        if (mimeType) res.setHeader('Content-Type', mimeType);
                        const file = path.join(filepath, req.path);
                        staticlogger.log("<< express send", file);
                        res.sendFile(file);
                    });
                    service.get(['/etc/universe.remote.config.mjs'], (req, res) => {
                        res.redirect(301, '/setup/universe.remote.config.mjs')
                    })
                }
                const options = Array.isArray(staticdir) ? staticdir[1] : null;
                if (spath) {
                    if (options?.auth === 'basic') {
                        service.use(spath, buildAuth(options.user ?? one, options.pwd ?? two));
                    }
                    service.use(spath, express.static(staticroot));
                    if (options?.index) service.use(spath, serveIndex(staticroot, {
                        icons: true,
                        view: 'details' // or 'tiles'
                    }));
                } else {
                    if (options?.auth === 'basic') {
                        service.use(staticroot, buildAuth(options.user ?? one, options.pwd ?? two));
                    }
                    service.use(express.static(staticroot));
                    if (options?.index) service.use(staticroot, serveIndex(staticroot, {
                        icons: true,
                        view: 'details' // or 'tiles'
                    }));
                }
            });
        }
        service.use((req, res, next) => {
            // logic
            const url = req.url;
            if (url.endsWith('!') || url.endsWith('.ls')) {
                if (this.crawlDir(url.slice(0,-3), res)) return;
            }
            const filepath = `${process.cwd()}/node_modules${url}index.mjs`;
            if (fs.existsSync(filepath)) {
                res.redirect(`${url}index.mjs`);
            }
            next();
        })

        this.service  = service;
        this.staticfn = staticfn;
        // this.router = service.route('/');
        const router = new Router(null, service, express, cwd);
        // const restrouter = new Router('/api', service, express, cwd);
        // router.use(express.json());
        // router.use(bodyParser.urlencoded({ extended: true }));
        this.routes['/'] = router;
        // this.routes['/api'] = restrouter;

        let options = {
            // port: port,
            clientTracking: true,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    // See zlib defaults.
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                // Other options settable:
                clientNoContextTakeover: true, // Defaults to negotiated value.
                serverNoContextTakeover: true, // Defaults to negotiated value.
                serverMaxWindowBits: 10, // Defaults to negotiated value.
                // Below options specified as default values.
                concurrencyLimit: 10, // Limits zlib concurrency for perf.
                threshold: 1024 // Size (in bytes) below which messages
                // should not be compressed.
            },
        };

        const server       = createServer(service);
        this.server        = server;
        universe.wwwserver = server;

        const wsapi = "/wsapi";
        console.log(`-- WS api at: http://localhost:${port}/${wsapi}`);
        let wss  =   new WebSocket.Server({ server,  path: wsapi /*noServer: true*/, ...options }); // new WebSocket.Server({ server, ...options });
        this.wss = wss;
        universe.wss = wss;
        this.apiRouter = new ApiRouter();
        universe.$apirouter = this.apiRouter;

        // attachWebSocketLogger(wss, {
        //     logger: createLogger(LOG_DIR, 'ws_access.log'),
        // });

        const restroot = universe.RESTAPI ?? 'restapi';
        console.log(`-- REST api at: http://localhost:${port}/${restroot}`);
        this.restRouter = RESTRouter.withRoute(this.root(restroot));
        universe.$restrouter = this.restRouter;
        if (universe.IS_NEXUS) {
            this.restRouter.addRoute(this.root('nexusrest'));
            // RESTRouter.withRoute(this.root('nexusrest'));
        }

/*
        service.on("upgrade", (request, socket, head) => {
            wss.handleUpgrade(request, socket, head, (websocket) => {
                wss.emit("connection", websocket, request);
            });
        });
*/

        wss.on('connection', (ws, req)               => this.connect(ws, req));
        wss.on('close',      ()                      => this.close());
        wss.on('error',      (err)                   => this.error(err));
        wss.on('headers',    (headers, req)          => this.headers(headers, req));
        wss.on('upgrade',    (request, socket, head) => this.upgrade(request, socket, head));
        //wss.on('listening',  ()                      => this.listening());

        // const http2server = http2.createServer(service);
        // this.http2server = http2server;

        // http2server.listen(port, () => {
        server.listen(port, () => {
            console.log(`>> WebserviceController WS started: http://localhost:${port}/`);
            universe.atDusk(async () => await this.closeServer())
        });

        // console.log("-- WebserviceController middleware:\n", this.listMiddleware(service).join("\n"));
    }

    handleErrors() {
        this.service.use(function(req, res, next){
            // res.status(404);
            if (res.finished) return;
            const accepts = req.headers['accept'];
            const UI_PATH = process.env.UI_PATH ?? './lib/ui'; // './client';

            switch(accepts) {
                case 'application/json':
                    res.status(404).json({ error: 'Not found' })
                    break;
                case 'text/html':
                case '*/*':
                    res.status(404).sendFile(`${process.cwd()}/${UI_PATH}/upayme-splash.html`);
                    break;
                default:
                    res.status(404).sendFile(`${process.cwd()}/${UI_PATH}/upayme-splash.html`);
                    // res.status(404).type('txt').send('Not found')
                    break;
            }
        });
    }

    //
    // app structure
    //

    crawlDir(url, res) {
        const filepath = `${process.cwd()}/node_modules${url}`;
        if (!fs.existsSync(filepath)) return false;

        const stuct = crawlFlat(filepath, {
            nameMode: "relative",      // to match your sample's "name" field
            ignore: ["node_modules", ".git", ".DS_Store", "._.DS_Store", "doc"],
            followSymlinks: true,
        });

        res.json(stuct);

        return true;
    }

    //
    // ws
    //

    connect(ws, req) {
        // console.log("-- WebserviceController connected");
        ws.on('message', async (message) => this.message(message, ws));
        ws.on('close', () => this.close());
    }

    listening() {}

    quit() {
        debuglog("QUIT");
    }

    error(err) {
        debuglog("ERROR", err);
    }

    headers(headers, req) {}

    upgrade(request, socket, head) {
        debuglog("UPGRADE");
    }

    async message(message, ws) {
        try {
            debuglog("> handle message", message);
            let req = JSON.parse(message);
            let res = await this.apiRouter.handle(req, ws, {});
            debuglog("< handle message");
            if (res) {
                res.id  = req.id;
                ws.send(JSON.stringify(res));
            }
        } catch (e) {
            console.error("-- WebServiceControllr: ERR handle message", e.stack ? e.stack : e.message);
            debuglog("ERR handle message", e.stack ? e.stack : e.message);
            ws.send(JSON.stringify({ ok: false, error: e.message }));
        }
    }

    close() {}

    /*async*/ closeServer() {
        return new Promise((resolve, reject) => {
            const server = this.server;
            if (!server) return resolve();
            try { server.close() } catch (ignore) {}
            console.log(`-- WebServiceController closed server`);
            resolve();
        })
    }

    //
    // http
    //

    http(req, res, next) {
        let result = next();
        return  result;
    }

    get express() {
        return express;
    }

    get cwd() {
        return process.cwd();
    }

    addStatic(dir) {
        const staticRoute = path.resolve(dir);
        console.log("WWW Static route added", staticRoute);
        service.use(express.static(staticRoute));
    }

    listMiddleware(service){
        var appStack = service._router.stack || service.stack || undefined;
        const getFileLocation = (handler) => {
            // force the middleware to produce an error to locate the file.
            try{
                handler(undefined);
            } catch(e){
                return e.stack.split('\n')[1];
            }
        }

        return appStack.map((middleware, index) => {
            const path = middleware.route?.path;
            return index+'. ' + (middleware.handle.name || '<anonymous function>') + (path ? ' [' + path +']' : '') + '  ' +
                getFileLocation(middleware.handle);
        });
    }
    /*
     * SMTP
     */

    addSMTPservice(name, credentials) {
        this.smtp[name] = credentials;
    }

    getSMTPtransport(name) {
        if (!this.smtp[name]) throw ErrNoSMTPCredentials(name);
        let transport = this.smtp[name].transport;
        if (!transport) {
            transport = nodemailer.createTransport(this.smtp[name])
            this.smtp[name].transport = transport;
        }
        return transport;
    }

    /*
     * IMAP
     */

    //
    // services
    //

    startServices() {
        // RESTDecorator.provide();
    }

    /*
     * service implementation
     */

    install() {}
    uninstall() {}
    resolve() {}
    start() {
        universe.www = this;
        this._init();
        this.startServices();
    }
    stop() {
        delete universe.www;
    }
    update() {}

}
