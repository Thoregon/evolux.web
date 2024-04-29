/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

export default class DNSPluginInterface {
    constructor(apiKey) {
        if (new.target === PluginInterface) {
            throw new TypeError("Cannot construct PluginInterface instances directly");
        }

        this.apiKey = apiKey;
    }

    async listRecords(tld, sld, type) {
        throw new Error("listRecords method not implemented");
    }

    async getRecord(tld, sld, hostName, recordType) {
        throw new Error("getRecord method not implemented");
    }

    async addRecord(tld, sld, { recordType, hostName, address, ttl } = {}) {
        throw new Error("addRecord method not implemented");
    }

    async removeRecord(tld, sld, recordId) {
        throw new Error("removeRecord method not implemented");
    }

    async modifyRecord(tld, sld, recordId, { recordType, hostName, address, ttl } = {}) {
        throw new Error("modifyRecord method not implemented");
    }
}
