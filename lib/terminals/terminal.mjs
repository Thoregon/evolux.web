/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { forEach }  from "/evolux.util";
import EventEmitter from "/evolux.util/lib/eventemitter.mjs";
import { Reporter } from "/evolux.supervise";

export default class Terminal extends Reporter(EventEmitter) {

    constructor({
                    id
                } = {}) {
        super();
        Object.assign(this, { id });
        this.terminal = undefined;  // store the underlying terminal service when available
        this.queue = [];            // wait queue for pending requests until the underlying service is available
    }

    /*
     * registry
     */

    addTerminalRoot(serviceroot, config) {
        if (this.isAvailable()) {
            (async () => await this.awake(serviceroot, config))();
        } else {
            this.queue.push({ serviceroot, config });
        }
        return this;
    }

    async establish(terminal) {
        this.terminal = terminal;
        await this.awakeAll();
        this.emit('ready', { terminal: this });
    }

    async awakeAll() {
        await forEach(this.queue, async ({ serviceroot, config }) => {
            await this.awake(serviceroot, config);
        });
        this.queue = [];
    }

    /*
     * underlying terminal service: implement by subclasses
     */

    /**
     *
     * @return {boolean}
     */
    isAvailable() {
        return !!this.terminal;
    }

    /**
     * gets invoked when the underlying terminal service is available
     */
    async awake(serviceroot, config) {
        return this;
    }

    /*
     * lifecycle: implement by subclasses
     *  the param 'reason' is optional
     */

    start() {
        return this;
    }

    stop(reason) {}

    pause(reason) {
        return this;
    }

    resume(reason) {
        return this;
    }

    /*
     * EventEmitter implementation
     */

    get publishes() {
        return {
            ready:          'Terminal ready',
            exit:           'Terminal exit',
            paused:         'Terminal paused',
            resumed:        'Terminal resumed',
            received:       'Terminal received input',
            sent:           'Terminal sent answer',
            emitted:        'Terminal emitted event'
        };
    }

    /*
     *
     */

}
