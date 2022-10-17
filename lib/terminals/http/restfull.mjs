/**
 *
 *
 * @author: Bernhard Lukassen
 */

import CommandTerminal      from "../commandterminal.mjs";

export default class Restfull extends CommandTerminal {

    constructor({
                    id
                } = {}) {
        super();
        Object.assign(this, {id});
    }

    /*
     * REST: implement b subclasses
     */

    async connect(wwwroot, config) {}

    /*
     * implement lifecycle
     */

    async awake(serviceroot, config) {
        if (this.terminal.has(serviceroot)) {
            this.logger.warn(`serviceroot '${serviceroot}' already occupied.`);
            return;     // todo: better throw? check
        }
        let wwwroot = this.terminal.root(serviceroot);
        await this.connect(wwwroot, config);
        return super.awake();
    }

    start() {
        this.establish(universe.www);
        return super.start();
    }

    stop(reason) {
        // todo: remove 'www' routes
        this.emit('exit', { term: this, reason });
    }

}
