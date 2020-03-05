/**
 *
 *
 * @author: Bernhard Lukassen
 */

export default class Router {

    constructor(path, router) {
        Object.assign(this, { path });
        this.router = (path && path !== '/') ? router.route(path) : router;
    }

    get(route, fn) {
        this.router.get(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    post(route, fn) {
        this.router.post(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    put(route, fn) {
        this.router.put(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

    delete(route, fn) {
        this.router.delete(route, async (req, res) => {
            let params = req.params;
            let query = req.query;
            let content = await parse.json(req, { limit: '10kb' });
            return await fn(req, res, { params, query, content });
        });
    }

}
