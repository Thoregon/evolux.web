/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { emsg }     from '/evolux.supervise';

export default class ResponseUtils {

    constructor(res) {
        this.res = res;
    }

    send(result, mimetype) {
        if (mimetype && !res.getHeader('content-type')) res.setHeader('Content-Type', mimetype);
        this.res.send(result);
    }

    sendError(errno, msg) {
        this.res.status(errno).send(msg);
    }

    sendServerError(err, msg) {
        let errmsg = universe.DEBUG ? emsg(err) : `Service error`;
        if (msg) errmsg = `${msg}\n${errmsg}`;
        this.res.status(500).send({ error: 500, errmsg });
    }
}
