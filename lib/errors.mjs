/**
 *
 *
 * @author: blukassen
 */



import { EError}    from "/evolux.supervise";

export const ErrNoHttpServiceAvailable      = ()            => new EError(`No HTTP Service available`,              "WWW:00001");
export const ErrRouteOccupied               = (msg)         => new EError(`Route occupied '${msg}`,                 "WWW:00002");
export const ErrNoSMTPCredentials           = (msg)         => new EError(`No SMTP credentials for '${msg}`,        "WWW:00003");

