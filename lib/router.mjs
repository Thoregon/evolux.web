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

    constructor(root, service, express, cwd) {
        if (!root) root = '/';
        if (!root.startsWith('/')) root = '/' + root;
        Object.assign(this, { path: root, service, express, cwd });
        // service must override if it needs authorization
        // alternatively each endpoint can check for authorization separately
        this.isAuthorized = ({ auth, url, params, query, content }) => true;
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
     * @param {String} route        ... endpoint for the service
     * @param {Function} fn         ... service function itself, handle request
     * @param {Function} authfn     ... if provided will be invoked for authorization
     */
    get(route, fn, authfn) {
        return this.handle(route, 'get', fn, authfn);
    }

    /**
     * define a POST method route
     *
     * REST: Use POST to create new subordinate resources
     *
     * @param {String} route        ... endpoint for the service
     * @param {Function} fn         ... service function itself, handle request
     * @param {Function} authfn     ... if provided will be invoked for authorization
     */
    post(route, fn, authfn) {
        return this.handle(route, 'post', fn, authfn);
    }

    /**
     * define a PUT method route
     *
     * REST: Use PUT primarily to update existing resource (if the resource does not exist, then API may decide to create a new resource or not)
     *
     * @param {String} route        ... endpoint for the service
     * @param {Function} fn         ... service function itself, handle request
     * @param {Function} authfn     ... if provided will be invoked for authorization
     */
    put(route, fn, authfn) {
        return this.handle(route, 'put', fn, authfn);
    }

    /**
     * define a PATCH method route
     *
     * REST: Use PATCH to make partial update on a resource
     *
     * @param {String} route        ... endpoint for the service
     * @param {Function} fn         ... service function itself, handle request
     * @param {Function} authfn     ... if provided will be invoked for authorization
     */
    patch(route, fn, authfn) {
        return this.handle(route, 'patch', fn, authfn);
    }

    /**
     * define a DELETE method route
     *
     * REST: Use DELETE to delete resources (identified by the Request-URI)
     *
     * @param {String} route        ... endpoint for the service
     * @param {Function} fn         ... service function itself, handle request
     * @param {Function} authfn     ... if provided will be invoked for authorization
     */
    delete(route, fn, authfn) {
        return this.handle(route, 'delete', fn, authfn);
    }

    /**
     *  handle method
     */
    handle(route, mth, fn, authfn) {
        let url = path.join(this.path, route);
        this.service[mth](url, async (req, res) => {
            let utils = new ResponseUtils(res);
            let content;
            try {
                const { auth, params, query, content } = await this.extractData(req);
                if ((authfn && !authfn({ auth, url, params, query, content }))
                    || (this.isAuthorized && !this.isAuthorized({ auth, url, params, query, content }))) {
                    utils.sendError(401, 'Not authorized');
                } else {
                    return await fn(req, res, { auth, params, query, content }, utils);
                }
            } catch (e) {
                await this.logError(mth, url, req, content, e);
                utils.sendServerError(e, `${mth} '${url}'`);
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
