import CommandClient from "../tcpcommandclient.mjs"; // Stelle sicher, dass der Pfad korrekt ist

import dns from "dns";
import os from "os";

const DEBUG = false;

/**
 * Überprüft, ob eine E-Mail-Adresse potenziell existiert, indem es den SMTP-Dialog mit den Mailservern der Domain führt.
 * Verwendet den robusten CommandClient für eine saubere asynchrone Kommunikation.
 *
 * @author: Bernhard Lukassen (überarbeitet)
 */
export default class CheckMail {
    /**
     * @param {object} [options]
     * @param {string} [options.fromEmail] - Die Absender-E-Mail. Muss eine gültige Adresse sein.
     * @param {string} [options.heloDomain] - Die Domain, die im HELO/EHLO-Befehl verwendet wird. Standardmäßig der Hostname des Systems.
     * @param {number} [options.timeout] - Timeout in Millisekunden für die Socket-Verbindung.
     */
    constructor(options = {}) {
        this.fromEmail = options.fromEmail || 'test@example.com';
        this.heloDomain = options.heloDomain || os.hostname() || 'localhost';
        this.timeout = options.timeout || 5000;
    }

    /**
     * Führt die Überprüfung für eine E-Mail-Adresse durch.
     *
     * @param {string} email - Die zu überprüfende E-Mail-Adresse.
     * @returns {Promise<{email: string, exists: boolean|null, reason: string}>} `exists` ist null bei nicht-definitiven Antworten.
     */
    async emailExists(email) {
        const domain = this.domainFrom(email);
        if (!domain) {
            return { email, exists: false, reason: "Ungültiges E-Mail-Format" };
        }

        let mxs;
        try {
            mxs = await this.getMX(domain);
            if (!mxs || mxs.length === 0) {
                return { email, exists: false, reason: "Keine MX-Records für die Domain gefunden" };
            }
        } catch (err) {
            DEBUG && console.error(`DNS-Fehler für ${domain}:`, err);
            return { email, exists: false, reason: "DNS-Auflösung für MX-Records fehlgeschlagen" };
        }

        for (const mx of mxs) {
            const result = await this.checkOnMx(mx.exchange, email);
            if (result.definitive) {
                return { email, exists: result.exists, reason: result.response };
            }
        }

        return { email, exists: null, reason: "Konnte den Status nicht definitiv verifizieren (alle Server antworteten temporär oder nicht)" };
    }

    /**
     * Extrahiert die Domain aus einer E-Mail-Adresse.
     * @param {string} email
     * @returns {string|null}
     */
    domainFrom(email) {
        const i = email.lastIndexOf('@');
        return (i > -1) ? email.substring(i + 1) : null;
    }

    /**
     * Löst die MX-Records für eine Domain auf und sortiert sie.
     * @param {string} domain
     * @returns {Promise<dns.MxRecord[]>}
     */
    async getMX(domain) {
        const resolver = new dns.promises.Resolver();
        const mxs = await resolver.resolveMx(domain);
        mxs.sort((a, b) => a.priority - b.priority);
        return mxs;
    }

    /**
     * Führt den SMTP-Dialog mit einem bestimmten Mailserver durch.
     * @param {string} mxHost
     * @param {string} email
     * @returns {Promise<{exists: boolean, definitive: boolean, response: string}>}
     */
    async checkOnMx(mxHost, email) {
        const connectionOptions = [
            { port: 25, host: mxHost, starttls: true },
            { port: 465, host: mxHost, tls: true },
            { port: 25, host: mxHost, starttls: false }
        ];

        for (const options of connectionOptions) {
            const client = new CommandClient({
                host: options.host,
                port: options.port,
                useTls: options.tls || false,
                timeout: this.timeout
            });

            try {
                await client.connect();
                const welcome = await client.readLine();
                if (!welcome.startsWith('220')) {
                    throw new Error(`Ungültige Begrüßung: ${welcome}`);
                }

                await client.write(`EHLO ${this.heloDomain}`);
                const ehloResponse = await client.readMultiLine();
                const ehloResponseString = ehloResponse.join('\n');
                if (!ehloResponseString.startsWith('250')) {
                    throw new Error(`EHLO abgelehnt: ${ehloResponseString}`);
                }

                // STARTTLS-Logik
                if (options.starttls && ehloResponseString.includes('STARTTLS')) {
                    await client.write('STARTTLS');
                    const starttlsResponse = await client.readLine();
                    if (!starttlsResponse.startsWith('220')) {
                        throw new Error(`STARTTLS fehlgeschlagen: ${starttlsResponse}`);
                    }
                    await client.upgradeToTls();
                    // Nach STARTTLS muss EHLO erneut gesendet werden
                    await client.write(`EHLO ${this.heloDomain}`);
                    const ehloResponseAfterTls = await client.readMultiLine();
                    const ehloResponseAfterTlsString = ehloResponseAfterTls.join('\n');
                    if (!ehloResponseAfterTlsString.startsWith('250')) {
                        throw new Error(`EHLO nach STARTTLS abgelehnt: ${ehloResponseAfterTlsString}`);
                    }
                }

                await client.write(`MAIL FROM:<${this.fromEmail}>`);
                const mailFromResponse = await client.readLine();
                if (!mailFromResponse.startsWith('250')) {
                    throw new Error(`MAIL FROM abgelehnt: ${mailFromResponse}`);
                }

                await client.write(`RCPT TO:<${email}>`);
                const rcptToResponse = await client.readLine();

                await client.write('QUIT');
                await client.readLine();
                client.close();

                if (rcptToResponse.startsWith('250')) {
                    return { exists: true, definitive: true, response: rcptToResponse };
                }
                if (rcptToResponse.startsWith('5')) {
                    return { exists: false, definitive: true, response: rcptToResponse };
                }
                // Jeder andere Code (z.B. 4xx) ist nicht definitiv
                return { exists: false, definitive: false, response: rcptToResponse };

            } catch (error) {
                DEBUG && console.warn(`Fehler mit ${mxHost}:${options.port} (${options.tls ? 'TLS' : 'plain'}): ${error.message}`);
                client.close(); // Stelle sicher, dass der Client geschlossen wird
            }
        }
        return { exists: false, definitive: false, response: "Alle Verbindungsmethoden fehlgeschlagen" };
    }
}

