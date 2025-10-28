/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import Router from "../router.mjs";

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

    async handle(req, res, data, utils) {
        let result;
        try {
            const { path, headers, data } = await req.body;
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