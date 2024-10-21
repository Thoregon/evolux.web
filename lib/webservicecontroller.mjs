/**
 *
 *
 * @author: Bernhard Lukassen
 */

// import request                      from "/request-promise";
import Router              from "./router.mjs";
import process             from "/process";
import express             from '/express';
import { createServer }    from '/http';
import WebSocket        from 'ws';
// import { WebSocketServer } from '/ws';
import bodyParser          from '/body-parser';
import cors                from '/cors';
import path                from '/path';
import nodemailer          from "/nodemailer";
// import greenlock        from '/greenlock-express';

// import RESTDecorator from "./annotations/restdecorator.mjs";

import { ErrNoHttpServiceAvailable, ErrRouteOccupied, ErrNoSMTPCredentials } from "./errors.mjs";
import ApiRouter                                                             from "./api/apirouter.mjs";
import RESTRouter                                                            from "./api/restrouter.mjs";


//
//
//

const debuglog = (...args) => {} // console.log("P2PNetworkPolicy", universe.inow, ":", ...args);  // {}
const debugerr = (...args) => console.error("P2PNetworkPolicy", universe.inow, ":", ...args);


//
// express rest server
//

const service  = express();
const staticfn = express.static;
const cwd      = process.cwd();

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
        // service.use(bodyParser.json());
        service.use(bodyParser.urlencoded({ extended: true }));
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
        // services must declare their static root
        // service.use(express.static(wwwroot));

/*
        if (greenlockcfg) {
            universe.wwwservice = service;
            let wrapper = greenlock.init(greenlockcfg)
            wrapper.serve(service);
            console.log("$$ WWW Controller: greenlock serve");
            // universe.wwwservice = wrapper;
        } else {
            universe.wwwservice = service;
            // now start the service
            service.listen(port, host);
            console.log(`$$ Webservice Controller: express serve: ${host}:${port}`);
        }
*/
        universe.wwwservice = service;
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
            staticdirs.forEach((staticdir) => {
                const staticroot = path.resolve(process.cwd(), staticdir);
                console.log("WWW Static route added", staticroot);
                service.use(express.static(staticroot));
            });
        }

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

        let wss  =   new WebSocket.Server({ server,  path: "/wsapi" /*noServer: true*/, ...options }); // new WebSocket.Server({ server, ...options });
        this.wss = wss;
        universe.wss = wss;
        this.apiRouter = new ApiRouter();
        universe.$apirouter = this.apiRouter;

        const restroot = universe.RESTAPI ?? 'restapi';
        this.restRouter = RESTRouter.withRoute(this.root(restroot));
        universe.$restrouter = this.restRouter;

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

        server.listen(port, () => {
            console.log(`>> WebserviceController WS started: http://localhost:${port}/`);
        });

        console.log("-- WebserviceController middleware:\n", this.listMiddleware(service).join("\n"));
    }

    //
    // ws
    //

    connect(ws, req) {
        console.log("-- WebserviceController connected");
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
