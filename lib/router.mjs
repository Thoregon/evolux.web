/**
 *
 * todo [OPEN]: check if 'HEAD' should be supported
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

    async logError(mth, url, req, body, e) {
        let query   = req.query || '<no query>';
        let params  = req.params || '<no params>';
        universe.logger.error(`[web] POST ${url}\nquery: ${query}\nparams: ${params}\nbody: ${body || '<body empty>'}`, e);
    }


    /**
     * extract data from request including
     *  - auth      ... authorization information, must be a JWT if required
     *  - params    ... params extracted from the URL
     *  - query     ... query string params
     *  - content   ... content from body converted to an Object if it is possible
     * @param req
     * @return {Promise<{auth: (undefined|number|string|string[]), query: *, params: *, content: (*|{})}>}
     */
    async extractData(req) {
        let auth   = req.headers['authorization'];
        let params = req.params;
        let query  = req.query;
        let content    = await this.bodyAsObject(req);
        return { auth, params, query, content };
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
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                return await fn(req, res, { auth, params, query, content}, utils);
            } catch (e) {
                await this.logError('GET', url, req, content, e);
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
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                return await fn(req, res, { auth, params, query, content}, utils);
            } catch (e) {
                await this.logError('POST', url, req, content, e);
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
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                return await fn(req, res, { auth, params, query, content}, utils);
            } catch (e) {
                await this.logError('PUT', url, req, content, e);
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
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                return await fn(req, res, { auth, params, query, content}, utils);
            } catch (e) {
                await this.logError('PATCH', url, req, content, e);
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
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                return await fn(req, res, { auth, params, query, content}, utils);
            } catch (e) {
                await this.logError('DELETE', url, req, content, e);
                utils.sendError(e, `DELETE '${url}'`);
            }
        });
    }

    /**
     * check if body is json
     * if so return parsed object, otherwise the string
     * @param body
     */
    async bodyAsObject(req) {
        switch (req.headers['content-type']) {
            case 'application/x-www-form-urlencoded':
                let content = await parse.form(req);
                return content;
            default:
                let body = await parse.text(req, {limit: '100kb'});
                if (!body) return;
                body = body.trim();
                if (body.startsWith('{') || body.startsWith('[')) {
                    return JSON.parse(body);
                } else if (body.startsWith('------')) {
                    // todo: not urgent
                } else {
                    let content = {};

                    try {
                        let url = new URL('file:/?' + body);
                        [...url.searchParams].forEach(([property, value]) => {
                            if (content[property]) {
                                content[property] = [...content[property], value]
                            }  else {
                                content[property] = value;
                            }
                        })
                        return content;
                    } catch (ignore) {
                        console.log(ignore);
                    }
                }
        }
        return body;
    }

}
