/**
 *
 *
 * @author: Bernhard Lukassen
 */

import { forEach }              from "/evolux.util";

import { EventEmitter}          from "/evolux.pubsub";
import { Reporter }             from "/evolux.supervise";

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

    async addTerminalRoot(serviceroot, config) {
        if (this.isAvailable()) {
            await this.awake(serviceroot, config);
        } else {
            this.queue.push({ serviceroot, config });
        }
    }

    async establish(terminal) {
        this.terminal = terminal;
        await this.awakeAll();
        this.emit('ready', { terminal: this });
    }

    async awakeAll() {
        await forEach(this.queue, async ({ serviceroot, config }) => {
            await this.awake(serviceroot, config);
        })
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
    async awake(serviceroot, config) {}

    /*
     * lifecycle: implement by subclasses
     *  the param 'reason' is optional
     */

    start() {}

    stop(reason) {}

    pause(reason) {}

    resume(reason) {}

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
