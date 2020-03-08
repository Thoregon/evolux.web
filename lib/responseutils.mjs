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

    sendError(err, msg) {
        let errmsg = universe.DEBUG ? emsg(err) : `Service error`;
        if (msg) errmsg = `${msg}\n${errmsg}`;
        this.res.status(500).send({ error: 500, errmsg });
    }
}
