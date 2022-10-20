/**
 *
 *  @see: media types https://www.iana.org/assignments/media-types/media-types.xhtml
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import RESTDecorator from "./restdecorator.mjs";

export default class Restfull {

    constructor(target, meta, params) {
        Object.assign(this, { target, meta, params });
        RESTDecorator.add(target, this);

        // defaults
        this._method   = 'get';
        this._path     = '/';
        this._produces = { 'Content-Type': 'text/plain' };
        this._consumes = { 'Content-Type': 'application/json' };
        this._auth     = false;
    }
}

export const Auth = (target, meta, params) => {
};

export const Path = (target, meta, params) => {
};

export const Get = (target, meta, params) => {
};

export const Put = (target, meta, params) => {
};

export const Post = (target, meta, params) => {
};

export const Patch = (target, meta, params) => {
};

export const Head = (target, meta, params) => {
};

export const Delete = (target, meta, params) => {
};

export const Consumes = (target, meta, params) => {
};

export const Produces = (target, meta, params) => {
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
