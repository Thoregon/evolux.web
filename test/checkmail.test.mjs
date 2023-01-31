/**
 *
 *
 * @author: Bernhard Lukassen
 */

// import SimpleSMTPClient from "./sendmail.mjs";
import CheckMail        from "../lib/mail/checkmail.mjs";

(async () => {
    let checkMail = new CheckMail();
    // 'franz.kwapil@bernhard-lukassen.com' 'bl@bernhard-lukassen.com'  'sales@grsolution.eu'
    let email = 'quaxi@bernhard-lukassen.com';
    let exists = await checkMail.emailExists(email);
    console.log(`'${email}' exists: ${exists ? 'Yes' : 'No'}`);

    /*
        let mail = new SimpleSMTPClient();
        await mail.sendMail({
            mailhost   : 'mail.bernhard-lukassen.com',
            from       : 'bl@bernhard-lukassen.com',
            pwd        : 'kqev6d3l',
            to         : 'bernhard.lukassen@lightningleds.com',
            subject    : 'test',
            mailcontent: 'Test mail'
        });
    */
})();
