/**
 *
 *
 * @author: Bernhard Lukassen
 */

import request                      from "/request-promise";
import Router                       from "./router.mjs";

import nodemailer                   from "/nodemailer";

import { ErrNoHttpServiceAvailable, ErrRouteOccupied, ErrNoSMTPCredentials } from "./errors.mjs";

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
        let router = new Router(path, this.service);
        this.routes[path] = router;
        return router;
    }

    _init(service) {
        this.service = service;
        this.router = service.route(this.root);
        this.routes['/'] = new Router(null, this.service);

        if (universe.smtp) {
            Object.entries(universe.smtp).forEach(([name, smtpcredentials]) => this.addSMTPservice(name, smtpcredentials));
        }

        this.request = request;
        // this.got = got;
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

    /*
     * service implementation
     */

    install() {}
    uninstall() {}
    resolve() {}
    start() {
        // todo [REFACTOR]: since the browserloader is not used anymore, the express with greenlock should be started here
        if (!universe.wwwservice) throw new ErrNoHttpServiceAvailable();
        universe.www = this;
        this._init(universe.wwwservice);
    }
    stop() {
        delete universe.www;
    }
    update() {}

}
