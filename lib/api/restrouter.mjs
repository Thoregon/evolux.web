/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import Router from "../router.mjs";
import e      from "express";

export default class RESTRouter {

    constructor(wwwrouter) {
        this.wwwrouter = wwwrouter;
        this.handlers = {};
    }

    static withRoute(wwwrouter) {
        const restrouter = new this(wwwrouter);
        restrouter.awake();
        return restrouter;
    }

    awake() {
        const wwwroot = this.wwwrouter;
        wwwroot['post']('' /*wwwroot.path*/, async (req, res, data, utils) => {
            await this.handle(req, res, data, utils);
        });
    }

    get home() {
        return app.current.home;
    }

    getAuthHeader(req) {
        return req.get('authorization') || req.get('Authorization');
    }

    isAuthorized(req, data) {
        const apiKey = this.getAuthHeader(req);
        if (apiKey === me?.apiKey) return true;
        if (this.home.isAuthorized(apiKey, req.path, data)) return true;
        return false;
    }

    async handle(req, res, pdata, utils) {
        let result;
        try {
            const { path, headers, data } = await req.body;
            // first check authorization
            if (!this.isAuthorized(req, data)) {
                console.error(">> RESTRouter::handle NOT AUTHORIZED");
                return res.status(401).send({ error: 401, message: 'Not authorized' });
            }
            // proceed
            // console.log(">> RESTRouter::handle", path, data);
            const handler                 = this.handlers[path];
            if (!handler) {
                result = { ok: false, error: { errcode: 500, errmsg: "wrong request" } };
                return res.status(500).send(result);
            }
            result = await handler(data);
            res.status(200).send(result);
        } catch (e) {
            result = { ok: false, error: { errcode: 500, errmsg: e.message, stack: e.stack } };
            console.error(">> RESTRouter::handle ERROR", e.message, e.stack);
            res.status(500).send(result);
        } finally {
            // console.log(">> RESTRouter::handle DONE", req);
        }
    }

    addHandler(name, service) {
        console.log("-- RESTRouter::addHandler", name);
        this.handlers[name] = (req, ws, opt) => service.handleRequest(req, ws);
   }

}