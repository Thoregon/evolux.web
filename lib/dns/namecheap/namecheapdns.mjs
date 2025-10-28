// Import DOMParser from xmldom for XML parsing
import { DOMParser } from 'xmldom';

export default class NamecheapDNS {
    /**
     * @param {{apiUser:string, apiKey:string, userName:string, clientIp:string, sandbox?:boolean}} opts
     */
    constructor({ apiUser, apiKey, userName, clientIp, sandbox = false }) {
        this.apiUser   = apiUser;
        this.apiKey    = apiKey;
        this.userName  = userName;
        this.clientIp  = clientIp;
        this.sandbox   = sandbox;
        this.baseUrl   = sandbox
                         ? 'https://api.sandbox.namecheap.com/xml.response'
                         : 'https://api.namecheap.com/xml.response';
    }

    // helper to split "example.com" → ["example","com"]
    _parseDomain(domain) {
        const parts = domain.split('.');
        const tld   = parts.pop();
        const sld   = parts.pop();
        if (!sld || !tld) throw new Error(`Invalid domain: ${domain}`);
        return { sld, tld };
    }

    /**
     * Fetch current DNS hosts for the domain. Throws if domain not found or API error.
     * @param {string} domain
     * @returns {Promise<Array>}
     */
    async getHosts(domain) {
        const { sld, tld } = this._parseDomain(domain);
        const url = new URL(this.baseUrl);
        url.searchParams.set('ApiUser',  this.apiUser);
        url.searchParams.set('ApiKey',   this.apiKey);
        url.searchParams.set('UserName', this.userName);
        url.searchParams.set('ClientIp', this.clientIp);
        url.searchParams.set('Command',  'namecheap.domains.dns.getHosts');
        url.searchParams.set('SLD',      sld);
        url.searchParams.set('TLD',      tld);

        const res = await fetch(url);
        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const err = doc.getElementsByTagName('Error')?.[0];
        if (err) throw new Error(`API Error: ${err.textContent}`);

        const hosts = Array.from(doc.getElementsByTagName('host')).map(node => ({
            HostId:  node.getAttribute('HostId'),
            Name:    node.getAttribute('Name'),
            Type:    node.getAttribute('Type'),
            Address: node.getAttribute('Address'),
            MXPref:  node.getAttribute('MXPref'),
            TTL:     node.getAttribute('TTL'),
        }));

        if (!hosts.length) {
            throw new Error(`No DNS records found for domain: ${domain}`);
        }
        return hosts;
    }

    /**
     * Replace DNS hosts for the domain. Throws on API error.
     * @param {string} domain
     * @param {Array} hosts
     */
    async setHosts(domain, hosts) {
        const { sld, tld } = this._parseDomain(domain);
        const url = new URL(this.baseUrl);
        url.searchParams.set('ApiUser',  this.apiUser);
        url.searchParams.set('ApiKey',   this.apiKey);
        url.searchParams.set('UserName', this.userName);
        url.searchParams.set('ClientIp', this.clientIp);
        url.searchParams.set('Command',  'namecheap.domains.dns.setHosts');
        url.searchParams.set('SLD',      sld);
        url.searchParams.set('TLD',      tld);

        const params = new URLSearchParams();
        hosts?.forEach((h, i) => {
            const idx = i + 1;
            if (h.HostId) params.set(`HostId${idx}`, h.HostId);
            params.set(`HostName${idx}`,   h.Name);
            params.set(`RecordType${idx}`, h.Type);
            params.set(`Address${idx}`,    h.Address);
            if (h.MXPref) params.set(`MXPref${idx}`, h.MXPref);
            if (h.TTL)    params.set(`TTL${idx}`,    h.TTL);
        });

        const res = await fetch(url.toString(), {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    params.toString(),
        });

        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const err = doc.getElementsByTagName('Error')?.[0];
        if (err) throw new Error(`API Error: ${err.textContent}`);

        return true;
    }

    /**
     * Add a subdomain record. Warns if already exists.
     * @param {string} domain
     * @param {string} subdomain
     * @param {string} address
     * @param {string} [type='A']
     * @param {number} [ttl=1800]
     */
    async addSubdomain(domain, subdomain, type = 'A', address, ttl = 60) {
        const hosts = await this.getHosts(domain);
/*
        const exists = hosts.some(h => h.Name === subdomain && h.Type === type);
        if (exists) {
            console.warn(`Subdomain '${subdomain}' already exists on ${domain}`);
            return false;
        }
*/

        const newHost = { Name: subdomain, Type: type, Address: address, TTL: String(ttl) };
        return this.setHosts(domain, [...hosts, newHost]);
    }

    /**
     * Remove a subdomain record. Warns if not found.
     * @param {string} domain
     * @param {string} subdomain
     */
    async removeSubdomain(domain, subdomain) {
        const hosts = await this.getHosts(domain);
/*
        const exists = hosts.some(h => h.Name === subdomain);
        if (!exists) {
            console.warn(`Subdomain '${subdomain}' not found on ${domain}`);
            return false;
        }
*/

        const filtered = hosts.filter(h => h.Name !== subdomain && h.Type === 'A');
        return this.setHosts(domain, filtered);
    }
}
