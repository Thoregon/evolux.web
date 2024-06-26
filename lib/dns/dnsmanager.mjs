/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

const plugins = {};

export const DNSAREC = { tld: null, sld: null, recordType: null, hostName: null, address: null, ttl:null };

export default class DNSManager {
    constructor() {
        this.currentPlugin = null;
    }

    usePlugin(pluginName, credentials) {
        if (!plugins[pluginName]) {
            throw new Error(`Plugin ${pluginName} not found.`);
        }

        this.currentPlugin = new plugins[pluginName](credentials);
    }

    static use(pluginName, credentials) {
        const mgr = new this();
        mgr.usePlugin(pluginName, credentials);
        return mgr;
    }

    static registerPlugin(pluginName, pluginClass) {
        plugins[pluginName] = pluginClass;
    }

    async listRecords(tld, sld, type = 'A') {
        this._ensurePluginSelected();
        try {
            return await this.currentPlugin.listRecords(tld, sld, type);
        } catch (error) {
            // Standardized error handling
            console.error("Error listing DNS records:", error);
            throw error;
        }
    }

    async getRecord(tld, sld, hostName, recordType) {
        this._ensurePluginSelected();
        try {
            return await this.currentPlugin.getRecord(tld, sld, hostName, recordType);
        } catch (error) {
            console.error("Error adding DNS record:", error);
            throw error;
        }
    }

    async addRecord(tld, sld, { recordType, hostName, address, ttl }) {
        this._ensurePluginSelected();
        try {
            return await this.currentPlugin.addRecord(tld, sld, { recordType, hostName, address, ttl });
        } catch (error) {
            console.error("Error adding DNS record:", error);
            throw error;
        }
    }

    async removeRecord(tld, sld, recordId) {
        this._ensurePluginSelected();
        try {
            return await this.currentPlugin.removeRecord(tld, sld, recordId);
        } catch (error) {
            console.error("Error removing DNS record:", error);
            throw error;
        }
    }

    async modifyRecord(tld, sld, recordId, { recordType, hostName, address, ttl } = {}) {
        this._ensurePluginSelected();
        try {
            return await this.currentPlugin.modifyRecord(tld, sld, recordId, { recordType, hostName, address, ttl });
        } catch (error) {
            console.error("Error modifying DNS record:", error);
            throw error;
        }
    }

    _ensurePluginSelected() {
        if (!this.currentPlugin) {
            throw new Error("No DNS provider plugin selected. Use usePlugin() to select a plugin.");
        }
    }
}
