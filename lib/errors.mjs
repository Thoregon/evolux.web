/**
 *
 *
 * @author: blukassen
 */



import { EError}    from "/evolux.supervise";

export const ErrNoHttpServiceAvailable      = ()            => new EError(`No HTTP Service available`,              "WWW:00001");
export const ErrRouteOccupied               = (msg)         => new EError(`Route occupied '${msg}`,                 "WWW:00002");

