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

    logError(mth, req) {
        let query   = req.query || '<no query>';
        let params  = req.params || '<no params>';
        let body    = req.body || '<no body>';
        universe.logger.error(`[web] POST ${url}\nquery: ${query}\nparams: ${params}\nbody: ${body}`, e);
    }

    /**
     * define a GET method route
     *
     * REST: Use GET to retrieve resource representation/information only
     *
     * @param {String} route
     * @param {Function} fn
     */
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
                this.logError('GET', req);
                utils.sendError(e, `GET '${url}'`);
            }
        });
    }

    /**
     * define a POST method route
     *
     * REST: Use POST to create new subordinate resources
     *
     * @param {String} route
     * @param {Function} fn
     */
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
                this.logError('POST', req);
                utils.sendError(e, `POST '${url}'`);
            }
        });
    }

    /**
     * define a PUT method route
     *
     * REST: Use PUT primarily to update existing resource (if the resource does not exist, then API may decide to create a new resource or not)
     *
     * @param {String} route
     * @param {Function} fn
     */
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
                this.logError('PUT', req);
                utils.sendError(e, `PUT '${url}'`);
            }
        });
    }

    /**
     * define a PATCH method route
     *
     * REST: Use PATCH to make partial update on a resource
     *
     * @param {String} route
     * @param {Function} fn
     */
    patch(route, fn) {
        let url = path.join(this.path, route);
        this.service.patch(url, async (req, res) => {
            let utils = new ResponseUtils(res);
            try {
                let params = req.params;
                let query = req.query;
                let content = await parse.json(req, {limit: '100kb'});
                return await fn(req, res, {params, query, content}, utils);
            } catch (e) {
                this.logError('PUT', req);
                utils.sendError(e, `PUT '${url}'`);
            }
        });
    }

    /**
     * define a DELETE method route
     *
     * REST: Use DELETE to delete resources (identified by the Request-URI)
     *
     * @param {String} route
     * @param {Function} fn
     */
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
                this.logError('DELETE', req);
                utils.sendError(e, `DELETE '${url}'`);
            }
        });
    }

}
