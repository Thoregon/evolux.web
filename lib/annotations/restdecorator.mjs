/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import RestFull from "../terminals/http/restfull.mjs"

const register = new Map();

export default class RESTDecorator {

    static provide() {
        [...register.keys()].forEach((Target) => {
            const Restfull = register.get(Target);
            console.log(">> RESTDecorator");
        })
    }

    static forClass(Cls) {
        const producer = new Cls();
        return this.forProducer(producer);
    }

    static forProducer(producer, spec) {
        const Cls = producer.constructor;
        const restfull = register.get(Cls);
        if (!restfull) return producer;
        const Decorator = class RESTInterface extends RestFull {
            constructor(producer) {

                super();
                const meta     = dorifer.origin4cls(producer.constructor)?.metaClass;
                const restfull = this.getRestfull(meta);
                const base     = restfull?.prefix;
                this.producer  = producer;
                this.meta      = meta;
                this.restfull  = restfull;
                this.base      = base ?? '/';    // todo: can't publish when no base path is defined
            }

            getRestfull(meta) {
                const clsann   = meta.getClassAnnotations();
                const restfull = clsann?.Restfull?.handler;
                return restfull;
            }

            async activate() {
                this.addTerminalRoot(this.base, {}).start();
            }

            connect(wwwroot, config) {
                const restfull = this.restfull;
                restfull.serve(wwwroot, this.producer, config);
            }

        };
        return new Decorator(producer);
    }

    static hasDecoratorFor(Cls) {
        return register.has(Cls);
    }

    static getRegister() {
        return register;
    }

    static add(target, restfull) {
        register.set(target, restfull);
    }
}
