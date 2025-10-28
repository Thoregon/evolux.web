/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import { mergeObjects } from "/evolux.util";
import DNSManager       from "../dnsmanager.mjs";
import { DOMParser }    from "xmldom";

function splitDomain(domain) {
    return { sld: domain.split('.')[0], tld: domain.split('.')[1] };
}

function parseHostsXML(xml) {
    // Create a new DOMParser instance
    const parser = new DOMParser();

    // Parse the XML string
    const xmlDoc = parser.parseFromString(xml, "application/xml");

    // Get all <host> elements
    const hostElements = xmlDoc.getElementsByTagName("host");

    // Map each <host> element to an object
    const hosts = Array.from(hostElements).map(hostElem => ({
        HostId: hostElem.getAttribute("HostId"),
        Name: hostElem.getAttribute("Name"),
        Type: hostElem.getAttribute("Type"),
        Address: hostElem.getAttribute("Address"),
        MXPref: hostElem.getAttribute("MXPref"),
        TTL: hostElem.getAttribute("TTL"),
        AssociatedAppTitle: hostElem.getAttribute("AssociatedAppTitle"),
        FriendlyName: hostElem.getAttribute("FriendlyName"),
        IsActive: hostElem.getAttribute("IsActive"),
        IsDDNSEnabled: hostElem.getAttribute("IsDDNSEnabled"),
    }));

    // Return the list of host objects
    return hosts;
}

function parseSetHostsResponse(xml) {
    // Create a new DOMParser instance
    const parser = new DOMParser();

    // Parse the XML string
    const xmlDoc = parser.parseFromString(xml, "application/xml");

    // Get all <host> elements
    const hostElements = xmlDoc.getElementsByTagName("DomainDNSSetHostsResult");

    if (!hostElements || hostElements.length < 1) return false;

    const success = hostElements[0].getAttribute("IsSuccess");
    return success;
}

function parseErrorsXML(xml) {
    // Create a new DOMParser instance
    const parser = new DOMParser();

    // Parse the XML string
    const xmlDoc = parser.parseFromString(xml, "application/xml");

    // Get all <host> elements
    const errorElements = xmlDoc.getElementsByTagName("Error");

    // Map each <host> element to an object
    const errors = Array.from(errorElements).map(elem => ({
        number: elem.getAttribute("Number"),
        message: elem.textContent
    }));

    // Return the list of host objects
    return errors;
}

export default class NamecheapDNS {
    constructor({ apiUser, apiKey, clientIp } = {}) {
        this.apiEndpoint = 'https://api.namecheap.com/xml.response';
        this.apiUser = apiUser;
        this.apiKey = apiKey;
        this.clientIp = clientIp;
    }

    async makeRequest(command, params = {}, bodyparams) {
        const url = new URL(this.apiEndpoint);
        if (!bodyparams) {
            url.searchParams.append('ApiUser', this.apiUser);
            url.searchParams.append('ApiKey', this.apiKey);
            url.searchParams.append('UserName', this.apiUser);
            url.searchParams.append('ClientIp', this.clientIp);
            url.searchParams.append('Command', command);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: bodyparams ? JSON.stringify(bodyparams) : undefined,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const xml = await response.text(); // Namecheap API returns XML responses
            if (xml.indexOf('<ApiResponse Status="ERROR"') > -1) {
                const errors = parseErrorsXML(xml);
                throw new Error(`Namecheap Error: ${errors.map((err) => '(' + err.number + ') ' + err.message).join(", ")}`);
            }
            return xml;
        } catch (error) {
            console.error('Error making request to Namecheap API:', error);
            throw error;
        }
    }

    splitDomain(domain) {
        return { sld: domain.split('.')[0], tld: domain.split('.')[1] };
    }

    async listRecords(domain, recordType) {
        const { sld, tld } = splitDomain(domain);
        const currentRecords = await this.listNativeRecords(sld, tld);

        // const mappedRecords = currentRecords.map(({ Type, Name, Address, TTL, HostId, MXPref, IsActive }) => ({ sld, tld,recordType:Type, hostName:Name, address:Address, ttl:TTL, HostId, MXPref, IsActive }));
        const mappedRecords = currentRecords.map((record) => record);
        const filteredRecords = recordType ? mappedRecords.filter(record => record.recordType === recordType) : mappedRecords;
        return filteredRecords;
    }

    async listNativeRecords(sld, tld) {
        const command        = 'namecheap.domains.dns.getHosts';
        const xml            = await this.makeRequest(command, { SLD: sld, TLD: tld });
        const currentRecords = parseHostsXML(xml);
        return currentRecords;
    }

    async getRecord(domain, hostName, recordType = 'A') {
        const currentRecords = await this.listRecords(domain, recordType)
        const record = currentRecords.filter(record => record.HostName === hostName);
        return record;
    }

    async addRecord(domain, { recordType, hostName, data, ttl = 1800, mxpref = 10 } = {}) {
        const { sld, tld } = splitDomain(domain);
        const command = 'namecheap.domains.dns.setHosts';
        const newHost = {
            Name: hostName,
            Type: recordType,
            Address: data,
            TTL: ttl,
            MXPref: mxpref
        };

        const hostRecords = await this.listNativeRecords(sld, tld);

        // Check if the host to add already exists
        if (hostRecords.some((host) => host.Name === newHost.Name)) {
            throw new Error('Host already exists', newHost);
        }

        // Add the new host to existing records
        const allHosts = [...hostRecords, newHost];

        // Build body parameter for setHosts
        const bodyParams = {
            ApiUser: this.apiUser,
            ApiKey: this.apiKey,
            UserName: this.apiUser,
            ClientIp: this.clientIp,
            Command: 'namecheap.domains.dns.setHosts',
            SLD: sld,
            TLD: tld,
        };

        allHosts.forEach((host, index) => {
            bodyParams[`HostName${index + 1}`] = host.Name;
            bodyParams[`RecordType${index + 1}`] = host.Type;
            bodyParams[`Address${index + 1}`] = host.Address;
            bodyParams[`MXPref${index + 1}`] = host.MXPref;
            bodyParams[`TTL${index + 1}`] = host.TTL;
        });

        // Additional logic to construct the payload for adding a DNS record
        // This is simplified and should be expanded to match Namecheap's API requirements
        const xml = await this.makeRequest(command, null, bodyParams);
        const success = parseSetHostsResponse(xml);
        return true;
    }

    async removeRecord(domain, recordId) {
        const { sld, tld } = splitDomain(domain);

    }

    async modifyRecord(domain, recordId, { recordType, hostName, address, ttl = 1800 } = {}) {
        // get record (list records) first and replace only provided params
        const { sld, tld } = splitDomain(domain);
        const records = await this.listRecords(tld, sld, recordType);
        const record = records.filter((rec) => rec.HostId === recordId);
        const { sld:SLD1, tld:TLD1, recordType:RecordType1, hostName:HostName1, address:Address1, ttl:TTL1 } = mergeObjects(record, { tld, sld, recordType, hostName, address, ttl });
        const command = 'namecheap.domains.dns.setHosts';
        return await this.makeRequest(command, {
            SLD1,
            TLD1,
            RecordType1,
            HostName1,
            Address1,
            TTL1,
        });
    }
}

DNSManager.registerPlugin('namecheap', NamecheapDNS);
