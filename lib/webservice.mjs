/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { ErrNoHttpServiceAvailable }    from "./errors.mjs";
import { myuniverse }                   from "/evolux.universe";
import parse                            from "/co-body";
import Router                           from "./Router.mjs";

export default class WebService {

    constructor({
                    root = '/',
                    service
                } = {}) {
        Object.assign(this, { root, service });
    }

    /*
     * routing
     */

    route(path) {
        return new Router(path, this.router);
    }

    _init(service) {
        this.service = service;
        this.router = service.route(this.root);
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
