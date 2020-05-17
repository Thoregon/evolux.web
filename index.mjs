/**
 *
 *
 * @author: Bernhard Lukassen
 */

import WebService                       from "./lib/webservice.mjs";

// terminal templates
export { default as Terminal }          from "./lib/terminals/terminal.mjs";
export { default as CommandTerminal }   from "./lib/terminals/commandterminal.mjs";
export { default as EventTerminal }     from "./lib/terminals/eventterminal.mjs";

// implemented terminals
export { default as RestFull }          from "./lib/terminals/http/restfull.mjs";

export const service = new WebService();
