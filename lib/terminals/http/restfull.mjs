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
        const services              = universe.services;
        const components            = services.components;

        if (components) {
            components.observe({
                observes:   'web',
                forget:     true,           // do just once, forget after execution
                started:  () => this.establish(universe.www)
            });
        }
        return super.start();
    }

    stop(reason) {
        // todo: remove 'www' routes
        this.emit('exit', { term: this, reason });
    }

}
