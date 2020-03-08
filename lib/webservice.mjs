/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { myuniverse }                   from "/evolux.universe";
import Router                           from "./router.mjs";

import { ErrNoHttpServiceAvailable, ErrRouteOccupied } from "./errors.mjs";

export default class WebService {

    constructor({
                    service
                } = {}) {
        Object.assign(this, { service });
        this.routes = {};
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
    }

    /*
     * service implementation
     */

    install() {}
    uninstall() {}
    resolve() {}
    start() {
        if (!universe.wwwservice) throw new ErrNoHttpServiceAvailable();
        myuniverse().www = this;
        this._init(universe.wwwservice);
    }
    stop() {
        delete myuniverse().www;
    }
    update() {}

}
