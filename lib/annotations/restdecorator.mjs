/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import RestFull from "../terminals/http/restfull.mjs"

const register = new Map();

function commandFrom(annotations) {
    if (annotations.Get)    return { cmd: 'get', path: annotations.Get.params };
    if (annotations.Put)    return { cmd: 'put', path: annotations.Put.params };
    if (annotations.Post)   return { cmd: 'post', path: annotations.Post.params };
    if (annotations.Delete) return { cmd: 'delete', path: annotations.Delete.params };
    if (annotations.Head)   return { cmd: 'head', path: annotations.Head.params };
    if (annotations.Path)   return { cmd: 'Path', path: annotations.Path.params };
    return {};
}

function adjustPathVariables(path) {
    return path.replaceAll('{', ':').replaceAll('}', '');
}

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
                const meta    = dorifer.origin4cls(producer.constructor)?.metaClass;
                const clsann  = meta.getClassAnnotations();
                const restann = clsann?.Restfull;
                const pathann = clsann.Path;
                const base    = pathann?.params;
                this.producer = producer;
                this.meta     = meta;
                this.base     = base ?? '/';    // todo: can't publish when no base path is defined
            }

            async activate() {
                this.addTerminalRoot(this.base, {}).start();
            }

            connect(wwwroot, config) {
                const endpoints = this.meta.getAnnotationsForMethods('Get', 'Put', 'Post', 'Delete', 'Head', 'Patch');
                Object.entries(endpoints).forEach(([mthname, annotations]) => {
                    const { cmd, path } = commandFrom(annotations);
                    const produces = annotations.Produces?.params ?? { 'Content-Type': 'text/plain' };
                    wwwroot[cmd](adjustPathVariables(path), async (req, res, data, utils) => {
                        try {
                            const result = this.producer[mthname](data);
                            Object.entries(produces).forEach(([header, value]) => res.set(header, value));
                            res.status(200).send(result);
                        } catch (e) {
                            console.log(">> RESTInterface", e);
                            res.status(500).send({ error: e.toString() });
                        }
                    });
                })

                console.log(endpoints);
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
