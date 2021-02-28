/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { RestFull } from "./restfull.mjs";

export default class WebService extends RestFull {

    constructor(config) {
        super(config);
        this.config = config;
        (async () => await this.setup())();
    }

    async setup() {
        // create endpoints
        let roots = this.getRoots();
        roots.forEach(root => this.addTerminalRoot(root));
        this.start();
    }

    connect(wwwroot) {
        // setup endpoints
    }

}
