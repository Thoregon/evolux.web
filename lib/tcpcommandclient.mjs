import net from "net";
import tls from "tls";

const DEBUG = false;

/**
 * Ein robuster, asynchroner TCP-Command-Client.
 *
 * Diese Klasse kapselt die Komplexität der Socket-Kommunikation,
 * einschließlich des Lesens von zeilenbasierten Antworten, Timeouts und
 * der dynamischen Aufwertung einer Verbindung zu TLS (STARTTLS).
 *
 * usage:
 * const client = new CommandClient({ host: 'smtp.example.com', port: 25 });
 * await client.connect();
 * let welcomeMessage = await client.readLine();
 *
 * await client.write('EHLO mydomain.com');
 * let ehloResponse = await client.readMultiLine();
 * * await client.upgradeToTls(); // Bei Bedarf
 *
 * await client.write('QUIT');
 * await client.readLine();
 * client.close();
 *
 * @author Bernhard Lukassen (überarbeitet)
 */
export default class CommandClient {
    /**
     * @param {object} options
     * @param {string} options.host - Der Host, mit dem verbunden werden soll.
     * @param {number} options.port - Der Port.
     * @param {number} [options.timeout=5000] - Timeout für Verbindungen und Leseoperationen in ms.
     * @param {boolean} [options.useTls=false] - Wenn true, wird von Anfang an eine TLS-Verbindung genutzt (z.B. für Port 465).
     * @param {string} [options.delimiter='\r\n'] - Der Zeilentrenner für das Protokoll.
     */
    constructor(options) {
        this.options = {
            timeout: 5000,
            useTls: false,
            delimiter: '\r\n',
            ...options
        };

        if (!this.options.host || !this.options.port) {
            throw new Error("Host und Port müssen angegeben werden.");
        }

        this.client = null;
        this.buffer = Buffer.alloc(0);
        this.lineResolvers = []; // Eine Warteschlange für Promises, die auf die nächste Zeile warten
        this.isClosed = false;
    }

    /**
     * Stellt die Verbindung zum Server her.
     * @returns {Promise<void>}
     */
    connect() {
        return new Promise((resolve, reject) => {
            const connectHandler = () => {
                DEBUG && console.log(`Verbunden mit ${this.options.host}:${this.options.port}`);
                this.client.removeListener('timeout', timeoutHandler);
                resolve();
            };

            const errorHandler = (err) => {
                DEBUG && console.error("Verbindungsfehler:", err);
                this.isClosed = true;
                this.cleanup();
                reject(err);
            };

            const timeoutHandler = () => {
                const err = new Error(`Verbindungstimeout zu ${this.options.host}:${this.options.port}`);
                this.client.destroy(err); // Dies löst das 'error'-Event aus
            };

            const closeHandler = () => {
                if (!this.isClosed) {
                    DEBUG && console.log("Verbindung unerwartet geschlossen.");
                    this.isClosed = true;
                    // Alle wartenden Leser mit einem Fehler ablehnen
                    this.lineResolvers.forEach(({ reject }) => reject(new Error("Verbindung geschlossen")));
                    this.lineResolvers = [];
                }
                this.cleanup();
            };

            const dataHandler = (data) => {
                this.buffer = Buffer.concat([this.buffer, data]);
                this._processBuffer();
            };

            if (this.options.useTls) {
                this.client = tls.connect(this.options.port, this.options.host, { rejectUnauthorized: false });
                this.client.on('secureConnect', connectHandler);
            } else {
                this.client = net.connect(this.options.port, this.options.host);
                this.client.on('connect', connectHandler);
            }

            this.client.setTimeout(this.options.timeout);
            this.client.on('timeout', timeoutHandler);
            this.client.on('error', errorHandler);
            this.client.on('close', closeHandler);
            this.client.on('data', dataHandler);
        });
    }

    /**
     * Wertet die bestehende Klartext-Verbindung zu einer sicheren TLS-Verbindung auf.
     * Nützlich für STARTTLS.
     * @returns {Promise<void>}
     */
    upgradeToTls() {
        return new Promise((resolve, reject) => {
            if (this.options.useTls || !this.client) {
                return reject(new Error("Kann keine bereits verschlüsselte oder nicht existierende Verbindung aufwerten."));
            }

            DEBUG && console.log("Werte Verbindung zu TLS auf...");
            const plainSocket = this.client;

            // Bestehende Listener entfernen, um sie auf dem neuen TLS-Socket neu zu registrieren
            plainSocket.removeAllListeners('data');
            plainSocket.removeAllListeners('error');
            plainSocket.removeAllListeners('close');
            plainSocket.removeAllListeners('timeout');

            const tlsSocket = tls.connect({
                socket: plainSocket,
                rejectUnauthorized: false
            });

            this.client = tlsSocket; // Ersetze den Client

            // Listener auf dem neuen TLS-Socket wieder anbringen
            this.client.on('secureConnect', () => {
                DEBUG && console.log("TLS-Handshake erfolgreich.");
                resolve();
            });
            this.client.on('data', (data) => {
                this.buffer = Buffer.concat([this.buffer, data]);
                this._processBuffer();
            });
            this.client.on('error', (err) => {
                DEBUG && console.error("TLS-Fehler:", err);
                this.close();
                reject(err);
            });
            this.client.on('close', () => this.close());
        });
    }

    /**
     * Verarbeitet den internen Buffer und löst wartende Promises auf, wenn vollständige Zeilen gefunden werden.
     * @private
     */
    _processBuffer() {
        let delimiterIndex;
        const delimiter = this.options.delimiter;

        while (this.lineResolvers.length > 0 && (delimiterIndex = this.buffer.indexOf(delimiter)) !== -1) {
            const line = this.buffer.slice(0, delimiterIndex).toString();
            this.buffer = this.buffer.slice(delimiterIndex + delimiter.length);

            const resolver = this.lineResolvers.shift();
            if (resolver) {
                DEBUG && console.log("< ", line);
                clearTimeout(resolver.timeoutId);
                resolver.resolve(line);
            }
        }
    }

    /**
     * Wartet auf die nächste einzelne Zeile vom Server.
     * @returns {Promise<string>}
     */
    readLine() {
        return new Promise((resolve, reject) => {
            if (this.isClosed) {
                return reject(new Error("Verbindung ist geschlossen."));
            }

            const timeoutId = setTimeout(() => {
                // Entferne diesen Resolver aus der Warteschlange, falls er noch da ist
                const index = this.lineResolvers.findIndex(r => r.reject === reject);
                if (index > -1) this.lineResolvers.splice(index, 1);
                reject(new Error("Timeout beim Warten auf eine Antwort."));
            }, this.options.timeout);

            this.lineResolvers.push({ resolve, reject, timeoutId });
            this._processBuffer(); // Prüfen, ob bereits eine Zeile im Buffer ist
        });
    }

    /**
     * Liest eine mehrzeilige SMTP-Antwort.
     * Stoppt, wenn eine Zeile nicht mit 'XXX-' beginnt (außer dem Code am Anfang).
     * @returns {Promise<string[]>}
     */
    async readMultiLine() {
        const lines = [];
        while(true) {
            const line = await this.readLine();
            lines.push(line);
            if (line.length < 4 || line.charAt(3) === ' ') {
                break; // Ende der mehrzeiligen Antwort
            }
        }
        return lines;
    }


    /**
     * Schreibt Daten in den Socket.
     * @param {string} data
     * @returns {Promise<void>}
     */
    write(data) {
        return new Promise((resolve, reject) => {
            if (this.isClosed || !this.client) {
                return reject(new Error("Verbindung ist nicht offen."));
            }
            DEBUG && console.log("> ", data);
            this.client.write(data + this.options.delimiter, 'utf-8', (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    /**
     * Schließt die Verbindung und räumt auf.
     */
    close() {
        if (!this.isClosed) {
            DEBUG && console.log("Verbindung wird geschlossen.");
            this.isClosed = true;
            if (this.client) this.client.destroy();
            this.cleanup();
        }
    }

    /**
     * Interne Aufräumfunktion.
     */
    cleanup() {
        this.client = null;
        this.buffer = Buffer.alloc(0);
        // Alle noch wartenden Promises ablehnen
        this.lineResolvers.forEach(({ reject }) => reject(new Error("Verbindung wurde geschlossen.")));
        this.lineResolvers = [];
    }
}
