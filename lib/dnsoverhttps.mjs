/**
 * Get the mail server for a given email
 *
 * does not check email syntax. assumes correct email address
 *
 * Uses DNS over HTTPS services. For more information see:
 *  https://developers.google.com/speed/public-dns/docs/doh/json
 *  https://developers.cloudflare.com/1.1.1.1/dns-over-https/json-format
 *
 * switches for requests between google and cloudflare to make tracking more difficult
 * shoud use more DoH services in future
 *
 * @author: blukassen
 * @licence: MIT
 */

const DOH_SERVICES = [
    'https://cloudflare-dns.com/dns-query',
    'https://dns.google/resolve',
]

/**
 *
 */
export class DoH {

    /**
     * retrieve the mail server (name) for an email address
     *
     * @param email
     * @return {Promise<String>}
     */
    async getMXFromEmail(email) {
        let domain = this.domainFrom(email);
        if (!domain) throw new Error("Can't get domain from email");

        let query = `${this.selectDOH()}?name=${domain}&type=MX`;
        try {
            let response = await fetch(query, { headers: { 'accept': 'application/dns-json' } });            // 'https://cloudflare-dns.com/dns-query?name=example.com&type=MX', 'https://dns.google/resolve?name=example.com&type=MX'

            let result = await response.json();
            if (this.isError(result)) throw new Error("Couldn't get MX for email");
            if (!result.Answer || result.Answer.length < 1 ) throw new Error("Couldn't get MX for email");

            let mailserver = this.mailServer(result.Answer[0].data);    // todo [OPEN]: handle multiple answers
            return mailserver;
        } catch (e) {
            throw e;
        }
    }


    /**
     * extract the domain from an email
     *
     * @param email
     * @return {string|undefined}
     */
    domainFrom(email) {
        let i = email.indexOf('@');
        return (i > -1) ? email.substring(i+1) : undefined;

    }

    /**
     * randomly choose one of the available DoH Servers
     * @return {string}
     */
    selectDOH() {
        let i = Math.floor(Math.random() * 10 % DOH_SERVICES.length);
        return DOH_SERVICES[i];
    }

    /**
     * check if request has and error
     * if other status codes need to be checked @see https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-6
     * @param result
     * @return {boolean}
     */
    isError(result) {
        return result.Status !== 0;
    }

    /**
     * extract mailserver from mx record
     * @param mx
     * @return {*}
     */
    mailServer(mx) {
        let i = mx.indexOf(' ');
        if (i > -1) mx = mx.substring(i+1);
        if (mx.endsWith('.')) mx = mx.slice(0, -1);
        return mx;
    }

}

export const mailServer = (email) => {
    let service = new DoH();
    let mx = service.getMXFromEmail(email);
    return mx;
}
