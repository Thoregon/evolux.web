/**
 *
 *
 * @author: Bernhard Lukassen
 */

import path         from '/path';
import parse        from "/co-body";

export default class Router {

    constructor(root, service) {
        if (!root) root = '/';
        if (!root.startsWith('/')) root = '/' + root;
        Object.assign(this, { path: root, service });
    }

    get(route, fn) {
        let url = path.join(this.path, route);
        this.service.get(url, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    post(route, fn) {
        let url = path.join(this.path, route);
        this.service.post(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    put(route, fn) {
        let url = path.join(this.path, route);
        this.service.put(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    delete(route, fn) {
        let url = path.join(this.path, route);
        this.service.delete(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

}
