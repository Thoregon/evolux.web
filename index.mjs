/**
 *
 *
 * @author: Bernhard Lukassen
 */

import WebserviceController from "./lib/webservicecontroller.mjs";

// terminal templates
export { default as Terminal }          from "./lib/terminals/terminal.mjs";
export { default as CommandTerminal }   from "./lib/terminals/commandterminal.mjs";
export { default as EventTerminal }     from "./lib/terminals/eventterminal.mjs";

// implemented terminals
export { default as RestFull }          from "./lib/terminals/http/restfull.mjs";

// publish annotations
export { default as Restfull, Auth, Path, Static, Get, Put, Post, Delete, Patch, Head, Consumes, Produces }  from "./lib/annotations/restfull.mjs"

export const service = new WebserviceController();
