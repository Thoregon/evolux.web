/**
 *
 *
 * @author: Bernhard Lukassen
 */

// import request                      from "/request-promise";
import Router     from "./router.mjs";
import process    from "/process";
import express    from '/express';
import cors       from '/cors';
import path       from '/path';
import nodemailer from "/nodemailer";
import greenlock  from '/greenlock-express';

// import RESTDecorator from "./annotations/restdecorator.mjs";

import { ErrNoHttpServiceAvailable, ErrRouteOccupied, ErrNoSMTPCredentials } from "./errors.mjs";

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
            console.log("$$ WWW Controller: express serve");
        }

        if (config.static) {
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
            const staticroot = path.resolve(process.cwd(), config.static);
            console.log("WWW Static route added", staticroot);
            service.use(express.static(staticroot));
        }

        this.service  = service;
        this.staticfn = staticfn;
        // this.router = service.route('/');
        this.routes['/'] = new Router(null, service, express, cwd);
    }

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
