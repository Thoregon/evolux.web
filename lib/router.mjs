/**
 *
 *
 * @author: Bernhard Lukassen
 */

import path             from '/path';
import parse            from "/co-body";
import ResponseUtils    from "./responseutils.mjs";

export default class Router {

    constructor(root, service) {
        if (!root) root = '/';
        if (!root.startsWith('/')) root = '/' + root;
        Object.assign(this, { path: root, service });
    }

    get(route, fn) {
        let url = path.join(this.path, route);
        this.service.get(url, async (req, res) => {
            let utils = new ResponseUtils(res);
            try {
                let params = req.params;
                let query = req.query;
                let content = await parse.json(req, {limit: '100kb'});
                return await fn(req, res, {params, query, content}, utils);
            } catch (e) {
                universe.logger.error(`[web] GET ${url}\nquery: ${query}\nparams: ${params}`, e);
                utils.sendError(e, `GET '${url}'`);
            }
        });
    }

    post(route, fn) {
        let url = path.join(this.path, route);
        this.service.post(url, async (req, res) => {
            let utils = new ResponseUtils(res);
            try {
                let params = req.params;
                let query = req.query;
                let content = await parse.json(req, {limit: '100kb'});
                return await fn(req, res, {params, query, content}, utils);
            } catch (e) {
                universe.logger.error(`[web] POST ${url}\nquery: ${req.query}\nparams: ${req.params}\nbody: ${req.body}`, e);
                utils.sendError(e, `POST '${url}'`);
            }
        });
    }

    put(route, fn) {
        let url = path.join(this.path, route);
        this.service.put(url, async (req, res) => {
            let utils = new ResponseUtils(res);
            try {
                let params = req.params;
                let query = req.query;
                let content = await parse.json(req, {limit: '100kb'});
                return await fn(req, res, {params, query, content}, utils);
            } catch (e) {
                universe.logger.error(`[web] PUT ${url}\nquery: ${req.query}\nparams: ${req.params}\nbody: ${req.body}`, e);
                utils.sendError(e, `PUT '${url}'`);
            }
        });
    }

    delete(route, fn) {
        let url = path.join(this.path, route);
        this.service.delete(url, async (req, res) => {
            let utils = new ResponseUtils(res);
            try {
                let params = req.params;
                let query = req.query;
                let content = await parse.json(req, {limit: '100kb'});
                return await fn(req, res, {params, query, content}, utils);
            } catch (e) {
                universe.logger.error(`[web] DELETE ${url}\nquery: ${req.query}\nparams: ${req.params}\nbody: ${req.body}`, e);
                utils.sendError(e, `DELETE '${url}'`);
            }
        });
    }

}
