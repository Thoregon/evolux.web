/**
 * SimpleSMTPClient   send one mail to one recipient
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import CommandClient from "../tcpcommandclient.mjs";

const isOK = (response) => { if (!response || response.substring(0, 1) !== '2') throw new Error(response || 'unknown') };
const isWaiting = (response) => { if (!response || response.substring(0, 1) !== '3') throw new Error(response || 'unknown') };

/**
 * Very simple SMTP client.
 * Send one email to one recipient.
 *
 * SMTP Protocol see:
 * - https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol
 *
 * Caution: Some connections to some mail servers leads to 'wrong SSL version' when using SSL.
 * No fix until now, if you find one please notify.
 */
export default class SimpleSMTPClient {

    /**
     * send an email
     * @param {String}  mailhost
     * @param {String}  from
     * @param {String}  [user]   if omitted 'from' is used
     * @param {String}  pwd
     * @param {String}  to
     * @param {String}  subject
     * @param {String}  mailcontent
     * @param {boolean} tls
     * @return {Promise<boolean>}
     */
    async sendMail({ mailhost, from, user, pwd, to, subject, mailcontent, tls = false } = {}) {
        try {
            if (!user) user = from;
            let client = await this.openConnection(mailhost, tls);
            await this.smtpDialog(client, from, user ? user : from, pwd, to, subject, mailcontent);
            return true;
        } catch (e) {
            console.error(e.message);
            return false;
        }
    }

    /**
     * open the connection to the mail server and wait
     * until the welcome message is received.
     *
     * w/o tls  : port 25, no TLS
     * with tls : port 587, TLS used
     *
     * @throws and connection error
     *
     * @param {String} mailhost
     * @param {boolean} tls
     * @return {Promise<CommandClient>}
     */
    async openConnection(mailhost, tls) {
        let client = new CommandClient(tls ? 587 : 25, mailhost, tls);
        await client
            .crlf()     // SMTP uses <CR><LF>
            .timeout(2000)
            .open();    // waits until connection established and welcome message is received
        return client;
    }

    /**
     * do the SMTP dialog to send an email
     *
     * The dialog to send an email:
     *  > connect
     *  < 220 .....
     *  > EHLO cientdomain
     *  < 250 .....
     *  > AUTH LOGIN
     *  < 334  (waiting for user id)
     *  > user id  (base 64 encoded)
     *  < 334  (waiting for password)
     *  > password (base 64 encoded)
     *  < 235 Authentication successful or 535 Incorrect authentication data
     *  > MAIL FROM: <mail-from>
     *  < 250 OK
     *  > RCPT TO: <mail-to>
     *  < 250 OK
     *  > DATA
     *  < 354 Enter message, ending with "." on a line by itself
     *  > {mailcontent}
     *  < 250 OK
     *  > QUIT
     *  < 221 ... closing connection
     *
     *  the mail content is comprised of a header, a blank line, the mail body followed by the delimiter '.'
     *  (single dot in a line)
     *  --------------------------
     *    header
     *
     *    mail body
     *    .
     *  --------------------------
     *
     * @param {String} client
     * @param {String} from
     * @param {String} user
     * @param {String} pwd
     * @param {String} to
     * @param {String} subject
     * @param {String} mailcontent
     * @return {Promise<void>}
     */
    async smtpDialog(client, from, user, pwd, to, subject, mailcontent) {
        let relay = from.replace('@', '.');
        isOK(await client.request(`EHLO ${relay}`));

        isWaiting(await client.request(`AUTH LOGIN`));
        isWaiting(await client.request(Buffer.from(user).toString('base64')));
        isOK(await client.request(Buffer.from(pwd).toString('base64')));

        isOK(await client.request(`MAIL FROM: <${from}>`));
        isOK(await client.request(`RCPT TO: <${to}>`));

        let mail = `From: <${from}>
To: <${to}>
Subject: ${subject}
Date: ${new Date().toGMTString()}

${mailcontent}
.`;
        isWaiting(await client.request(`DATA`));
        isOK(await client.request(mail));

        await client.request(`QUIT`);
    }

}
