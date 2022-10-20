/**
 *
 *  @see: media types https://www.iana.org/assignments/media-types/media-types.xhtml
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import RESTDecorator from "./restdecorator.mjs";

const REST_DEFAULTS = {
    auth    : false,
    method  : 'get',
    path    : '/',
    produces: { 'Content-Type': 'text/plain' },
    consumes: { 'Content-Type': 'application/json' },
};

export default class Restfull {

    constructor(target, mthname, meta, params) {
        Object.assign(this, { target, meta, params });
        RESTDecorator.add(target, this);

        // defaults
        this.prefix     = '';
        this._endpoints = {};
    }

    //
    // build
    //

    getEndpointConfig(name) {
        let mthconfig = this._endpoints[name];
        if (!mthconfig) mthconfig = this._endpoints[name] = { ...REST_DEFAULTS };
        return mthconfig;
    }

    //
    // process
    //

    serve(wwwroot, target, config) {
        const endpoints = this._endpoints;
        Object.entries(endpoints).forEach(([mthname, endpointconfig]) => {
            const mth = endpointconfig.method;
            const path = adjustPathVariables(endpointconfig.path);
            const produces = endpointconfig.produces;
            wwwroot[mth](path, async (req, res, data, utils) => {
                try {
                    data.headers = req.headers;
                    const result = await target[mthname](data);
                    Object.entries(produces).forEach(([header, value]) => res.set(header, value));
                    res.status(200).send(result);
                } catch (e) {
                    console.log(">> RESTInterface", e);
                    res.status(500).send({ error: e.toString() });
                }
            });

        });
    }
}

function adjustPathVariables(path) {
    return path.replaceAll('{', ':').replaceAll('}', '');
}

function getRestfull(meta) {
    const clsann   = meta.getClassAnnotations();
    const restfull = clsann?.Restfull?.handler;
    return restfull;
}

function getMethodEndpointConfig(meta, mthname) {
    const restfull = getRestfull(meta);
    const mth      = restfull?.getEndpointConfig(mthname);
    if (!mth) console.log("@Auth defined for non @Restfull. Method:", mth);
    return mth;
}

export const Auth = (target, mthname, meta, params) => {
    const mth = getMethodEndpointConfig(meta, mthname);
    mth.auth  = params;
};

// @Path on class level
export const Path = (target, mthname, meta, params) => {
    // if (!mthname) {
        const restfull  = getRestfull(meta);
        restfull.prefix = params;
    // } else {
    //     const mth = getMethodEndpointConfig(meta, mthname);
    //     mth.path  = params;
    // }
};

export const Get = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'get';
    mth.path   = params;
};

export const Put = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'put';
    mth.path   = params;
};

export const Post = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'post';
    mth.path   = params;
};

export const Patch = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'patch';
    mth.path   = params;
};

export const Head = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'head';
    mth.path   = params;
};

export const Delete = (target, mthname, meta, params) => {
    const mth  = getMethodEndpointConfig(meta, mthname);
    mth.method = 'delete';
    mth.path   = params;
};

export const Consumes = (target, mthname, meta, params) => {
    const mth    = getMethodEndpointConfig(meta, mthname);
    mth.consumes = params;
};

export const Produces = (target, mthname, meta, params) => {
    const mth    = getMethodEndpointConfig(meta, mthname);
    mth.produces = params;
};

// todo: QueryParam, PathParam, Body

dorifer.checkinAnnotation(import.meta, Restfull);
dorifer.checkinAnnotation(import.meta, Auth);
dorifer.checkinAnnotation(import.meta, Path);
dorifer.checkinAnnotation(import.meta, Get);
dorifer.checkinAnnotation(import.meta, Put);
dorifer.checkinAnnotation(import.meta, Post);
dorifer.checkinAnnotation(import.meta, Patch);
dorifer.checkinAnnotation(import.meta, Head);
dorifer.checkinAnnotation(import.meta, Delete);
dorifer.checkinAnnotation(import.meta, Consumes);
dorifer.checkinAnnotation(import.meta, Produces);
