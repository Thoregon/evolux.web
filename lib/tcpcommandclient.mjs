/**
 * CommandClient      connection to a TCP socket,
 *
 * request/response ... await response after sending a request
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */

import dns from "/dns";
import net from "/net";
import tls from "/tls";

const DEBUG = false;

/**
 * a simple command client for TCP connection
 *
 * Sends arbitrary requests and waits for an answer.
 * Gives a 'synchronous feeling'
 *
 *  usage:
 *    let client   = new CommandClient();
 *    await client
 *      .crlf()         // if server uses '\r\n' as delimiter; default '\n'
 *      .timeout(ms)    // set a timeout; default 1800ms
 *      .open();
 *    let response = await client.request('command params');
 *    ...
 *
 * @see SimpleSMTPClient example
 *
 * @author Bernhard Lukassen
 */
export default class CommandClient {

    /**
     * create a CommandClient
     *
     * @param {int}     port    ... select port number to connect, no default
     * @param {String}  host    ... select the host you want to connect to, name of IP
     * @param {boolean} tls     ... set true if the connection should use TLS, default false
     */
    constructor(port, host, tls = false) {
        this.port          = port;
        this.host          = host;
        this.tls           = tls;
        this.closed        = false;
        this.delim         = '\n';
        this._timeoutdelay = 1800;
    }

    /**
     * set delimiter to <CR><LF>
     * call before open!
     */
    crlf() {
        this.delim = '\r\n';
        return this;
    }

    /**
     * specify the timeout delay for connection open and requests
     * default 1800ms
     *
     * @param {int} delay   - delay in milliseconds
     */
    timeout(delay) {
        this._timeoutdelay = delay
        return this;
    }

    /**
     * open the connection.
     * wait until the connection is established and returns the welcome message from the server
     *
     * timeout will be applied
     *
     * throws 'Connection timeout' in case of a timeout (default 1500ms)
     * throws
     *
     * @return {Promise<String>} welcome message from server
     */
    open() {
        return new Promise((resolve, reject) => {
            let client         = this.tls ? new tls.TLSSocket() : new net.Socket();
            this.client        = client;
            this.answer        = '';
            this.closed        = false;
            this.answerresolve = resolve;
            // first set event handlers
            client.on('close', (hadError) => this.onClose());
            client.on('data',  (data) => this.onData(data));
            client.on('error', reject);

            this._settimeout(reject);
            // now connect and wait; timeout is cleared in the onData handler
            client.connect(this.port, this.host, () => {});
        });
    }

    /**
     * send a request to the server and wait
     * for the response
     *
     * timeout will be applied
     *
     * @param {String}           data - request to the server
     * @return {Promise<String>} response from server
     */
    request(data) {
        return new Promise((resolve, reject) => {
            if (this.closed) reject(Error('Connection closed'));
            this.answerresolve = resolve;
            DEBUG && console.log("> ", data);
            this.client.write(`${data}${this.delim}`);
            this._settimeout(reject);
        })
    }

    /**
     * end command client session
     */
    close() {
        this.client.destroy();
    }

    /*
     * event handlers
     */

    /**
     * controlled shutdown of the command client
     * @param {boolean} hadError
     */
    onClose(hadError) {
        this.closed = true;
        this.answer = '';
        delete this.client;
    }

    /**
     * collect answer from server
     * if a delimiter is reached, return as response
     * and start collecting again
     *
     * clears timeout
     *
     * @param {Buffer} data
     */
    onData(data) {
        this._cleartimeout();
        const answer = data.toString();
        this.answer += answer;
        // if there is a delimiter in the answer the response is complete
        // caution: some servers answers multiple lines for a single request.
        //          due to the request/response architecture of this client
        //          the client will lock if we split the lines and respond
        //          each. only for the first one there will be a consumer.
        //          therefore if we take the multiline response at once and
        //          pass all lines to the consumer.
        let i        = this.answer.lastIndexOf(this.delim);
        if (i > -1) {
            let data    = this.answer.substr(0, i);
            this.answer = this.answer.substr(i + this.delim.length);
            let resolve = this.answerresolve;
            delete this.answerresolve;
            DEBUG && console.log("< ", data);
            if (resolve) resolve(data);
        }
    }

    /*
     * Timeout handling
     */

    /**
     * set a timeout for the current request
     * @param {Function} reject
     * @private
     */
    _settimeout(reject) {
        this._connectiontimeout = setTimeout(() => {
            DEBUG && console.log("$$ timeout!");
            try { if (this.client) this.client.destroy();} catch (ignore) { /* ignore any errors, invoke the reject handler anyways */ }
            reject(new Error('Connection timeout'));
        }, this._timeoutdelay);
    }

    /**
     * clear the timeout when an answer is received
     * @private
     */
    _cleartimeout() {
        if (!this._connectiontimeout) return;
        clearTimeout(this._connectiontimeout);
        delete this._connectiontimeout;
    }
}
