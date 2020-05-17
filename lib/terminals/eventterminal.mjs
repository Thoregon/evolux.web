/**
 *
 *
 * @author: Bernhard Lukassen
 */

import Terminal         from "./terminal.mjs";

export default class EventTerminal extends Terminal {

    constructor({
                    id
                } = {}) {
        super();
        Object.assign(this, {id});
    }

}
