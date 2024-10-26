/**
 *
 */
import { Service, Attach } from "/thoregon.truCloud";

import DNSManager from "./dnsmanager.mjs";
import NamecheapDNS from "./namecheap/namecheapdns.mjs";

/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

"@Service"
export default class DNSService {

    "@Attach"
    async attach(handle, appinstance, home) {
        this.handle = handle;
        this.instance = appinstance;
        this.home = home;
        this.dnsmanagers = {}
        await handle.settings.asyncForEachEntry(([name, settings]) => {
            this.dnsmanagers[name] = DNSManager.use(name, settings);
        })
        // const namecheap = handle.settings.namecheap;
        // this.dnsmanager = DNSManager.use('namecheap', namecheap);        //{ apiKey: 'c154b631ac6945a591e36458a004d6b1', apiUser: 'MartinKirchner', clientIp: '81.217.87.214' }
        console.log(">> DNSService", appinstance.qualifier);
    }

    async getRecords(name, tld, sld, type = 'A'){
        try {
            const dnsmanager = this.dnsmanagers[name];
            if (!dnsmanager) return null;
            const records = await dnsmanager.listRecords(tld, sld, type);
            return records;
        } catch (e) {
            console.error(">> DNSService", e);
        }
    }

}