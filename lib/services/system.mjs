/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */


"@Restfull"
"@Path('system')"
export default class System {

    "@Attach"
    async use(handle, appinstance) {
        this.handle   = handle;
        this.instance = appinstance;
    }

    "@Auth(false)"
    "@Get('now')"
    "@Produces({ 'Content-Type': 'text/html',  'Date' : universe.now })"
    now({ auth, params, query, content } = {}) {
        return `<html><body><p>Universe Now: ${universe.now.toString()}</p></body></html>`
    }

}

System.checkIn(import.meta);
