/**
 * receives requests via websockets
 * request structure
 * - path       ... to a registered handler
 * - headers
 * - data       ... an arbitrary object, may contain references to thoregon entities
 *
 * response structure
 * - ok         ... true or false
 * - error      ... if not ok, contains { errcode, errmsg }
 * - data       ... an arbitrary object, may contain references to thoregon entities
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import e from "express";

export default class ApiRouter {

    constructor(...args) {
        this.handlers = {};
    }

    get home() {
        return app.current.home;
    }

    isAuthorized(req) {
        if (req.apiKey === me?.apiKey) return true;
        if (this.home.isAuthorized(req.apiKey, req.path, req.data)) return true;
        return false;
    }


    async handle(req, ws, opt) {
        let res;
        try {
            // first check authorization
            if (!this.isAuthorized(req)) {
                console.error(">> ApiRouter::handle NOT AUTHORIZED");
                return { ok: false, error: { errcode: 401, message: 'Not authorized' } };
            }
            // proceed
            const { path, headers, data } = req;
            // console.log(">> ApiRouter::handle", path, data);
            const handler                 = this.handlers[path];
            res = await handler?.(data, ws, opt);
        } catch (e) {
            res = { ok: false, error: { errcode: 500, errmsg: e.message, stack: e.stack } };
            console.error(">> ApiRouter::handle ERROR", e.message, e.stack);
        } finally {
            // console.log(">> ApiRouter::handle DONE", req);
        }
        return res;
    }

    path(path, fn, opt) {
        if (this.handlers[path]) {
            console.log(">> ApiRouter::path override already registerd path", path);
        }
        this.handlers[path] = { fn, opt };
    }

    send(ws, res) {
        ws.send(JSON.stringify(res));
    }

    //
    //
    //

    addHandler(name, service) {
        console.log("-- ApiRouter::addHandler", name);
        this.handlers[name] = (req, ws, opt) => service.handleRequest(req, ws);
    }

}