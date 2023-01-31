/**
 * use SimpleSMTPClient to send emails
 *
 * change params to your credentials to run the example
 *
 * Only dependencies:
 * - smtpclient.mjs
 * - sendmail.mjs
 *
 * Node min version 12.x: start support of  ECMAScript modules ('import' for JS modules *.mjs)
 *
 * Usage node v 12.x - v 13.1.x:
 * $ node --experimental-modules test.mjs
 *
 * Since v 13.2.x the --experimental-modules flag can be omitted
 * $ node test.mjs
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: https://github.com/Thoregon
 */

import SimpleSMTPClient from "../lib/mail/sendmail.mjs";

(async () => {
    let mail = new SimpleSMTPClient();
    await mail.sendMail({
                            mailhost   : 'mail.example.com',
                            from       : 'jon.doe@example.com',
                            pwd        : '.....',
                            to         : 'jane.doe@example.com',
                            subject    : 'test',
                            mailcontent: 'Test mail'
                        });
})();
