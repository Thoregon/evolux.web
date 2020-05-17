/**
 *
 *
 * @author: Bernhard Lukassen
 */

import Terminal from "./terminal.mjs";

export default class CommandTerminal extends Terminal{

    constructor({
                    id
                } = {}) {
        super();
        Object.assign(this, {id});
    }



}
