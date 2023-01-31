/**
 * CheckMail          asks a mail server if an email exists
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import dns from "/dns";

import CommandClient from "../tcpcommandclient.mjs";

const PORT    = 25;
const TLSPOT = 465;

const relay   = 'abc.de';
const from    = 'john.doe@abc.de';

const isOK = (response) => { if (!response || response.substring(0, 1) !== '2') throw new Error(response || 'unknown') };
const isWaiting = (response) => { if (!response || response.substring(0, 1) !== '3') throw new Error(response || 'unknown') };

/**
 * Check if an email exists
 *
 * SMTP Protocol see:
 * - https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol
 *
 * @author: Bernhard Lukassen
 */
export default class CheckMail {

    /**
     * check a specified email if it exists
     *
     * @param {String} email - email to check
     * @return {Promise<{ exists: <boolean>, email: <String> }>}
     */
    async emailExists(email) {
        let domain = this.domainFrom(email);
        if (!domain) throw new Error(`Can't get domain from email '${email}'`);
        let mxs = await this.getMX(domain);
        if (!mxs || mxs.length === 0) throw new Error(`Can't get any mail server for domain '${domain}'`);
        let exists;
        do {
            let mx = mxs.shift();
            exists = await this.checkUser(mx.exchange, email);
        } while (mxs.length > 0 && !exists);

        return { email, exists } ;
    }

    /**
     * get the domain name from an email
     *
     * @param {String} email
     * @return {String|undefined} domain
     */
    domainFrom(email) {
        let i = email.indexOf('@');
        return (i > -1) ? email.substring(i + 1) : undefined;
    }

    /**
     * resolve the mail servers for a given domain
     *
     * @param {String} domain
     * @return {Promise<MxRecord[]>}
     */
    async getMX(domain) {
        let resolver = new dns.promises.Resolver();
        let mxs      = await resolver.resolveMx(domain);
        return mxs;
    }

    /**
     * lookup if an email (user) is known by the mail server
     *
     * @param {String} mx     - mail server name (or IP)
     * @param {String} email  - email to check
     * @return {Promise<boolean>} if user exists
     */
    async checkUser(mx, email) {
        // first try standard SMTP port 25
        try {
            let client  = new CommandClient(PORT, mx);
            client.crlf();
            let welcome = await client.open();
            return await this.smtpDialog(client, email);
        } catch (e) {
            console.log(e.message);
            // now try with TLS SMTP port
            // client = new tls.TLSSocket();
        }
        return false;
    }

    /**
     * talk SMTP with the mail server
     *
     * @param {CommandClient} client
     * @param {String} email
     * @return {Promise<boolean>} user exists
     */
    async smtpDialog(client, email) {
        isOK(await client.request(`HELO ${relay}`));
        isOK(await client.request(`MAIL FROM: <${from}>`));
        let res    = await client.request(`RCPT TO: <${email}>`);
        let exists = (res.length > 2 && res.substring(0, 3) === '250');
        await client.request(`QUIT`);
        return exists;
    }
}
