/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { ErrNoHttpServiceAvailable }    from "./errors.mjs";
import { myuniverse }                   from "/evolux.universe";

export default class WebService {

    constructor({
                    root = '/',
                    service
                } = {}) {
        Object.assign(this, { root, service });
    }

    get(route, fn) {
        this.router.get(route, async (req, res) => {
            let query = req.query;
            let params = req.params;
            // let content = await parse.json(req, { limit: '10kb' });
            return fn(req, res);
        });
    }

    post(route, fn) {

    }

    put(route, fn) {

    }

    delete(route, fn) {

    }

    /*
     * routing
     */
    initRoute(service) {
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
        this.initRoute(universe.wwwservice);
    }
    stop() {
        delete myuniverse().www;
    }
    update() {}

}
