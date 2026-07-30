/**
 *
 *
 * @author: Bernhard Lukassen
 * @licence: MIT
 * @see: {@link https://github.com/Thoregon}
 */
import crypto from 'node:crypto';
import fs     from "fs";

const DEFAULT_MAX_BODY_LENGTH = 10_000;

function formatPayload(data, {
    isBinary = false,
    maxLength = DEFAULT_MAX_BODY_LENGTH
} = {}) {
    if (data === undefined) {
        return undefined;
    }

    if (data === null) {
        return null;
    }

    if (isBinary || Buffer.isBuffer(data)) {
        const buffer = Buffer.isBuffer(data)
                       ? data
                       : Buffer.from(data);

        return {
            type: 'binary',
            length: buffer.length,
            preview: buffer
                .subarray(0, Math.min(buffer.length, 100))
                .toString('base64')
        };
    }

    let value;

    if (typeof data === 'string') {
        value = redactAnyApiKey(data);
    } else {
        try {
            const cleandata = { ...data }
            if (cleandata.apiKey) cleandata.apiKey = '[REDACTED]';
            if (cleandata.apikey) cleandata.apikey = '[REDACTED]';
            value = JSON.stringify(cleandata);
        } catch {
            value = redactAnyApiKey(String(data));
        }
    }

    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength)}… [truncated, ${value.length} chars]`;
}

function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

function normalizeWhitespace(str) {
    return isString(str) ? str.trim().replace(/\s+/g, ' ') : str;
}

function redactAnyApiKey(str) {
    return str.replace(/("apiKey"\s*:\s*")([^"]*)(")/g, '$1[REDACTED]$3');
}

function formatLog(message) {
    let formatted = [];
    Object.entries(message).forEach(([key, value]) => {
        if (key === 'body') {
            formatted.push(key + ': ' + normalizeWhitespace(isString(value) ? value?.substring(0, 50) : value));
        } else if (key === 'apiKey' | key === 'apikey') {
            formatted.push(key + ': [REDACTED]');
        } else if (key === 'headers') {
            formatted.push(key + ': ' + JSON.stringify(value));
        } else {
            formatted.push(key + ': ' + normalizeWhitespace(value));
        }
    })
    return formatted.join(' | ');
}

function sanitizeHeaders(headers) {
    if (!headers) {
        return headers;
    }

    const sanitized = { ...headers };

    for (const name of [
        'authorization',
        'cookie',
        'set-cookie',
        'proxy-authorization',
        'x-api-key'
    ]) {
        if (sanitized[name] !== undefined) {
            sanitized[name] = '[REDACTED]';
        }
    }

    return sanitized;
}

function getRemoteAddress(req) {
    const forwardedFor = req.headers?.['x-forwarded-for'];

    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    return (
        req.ip ||
        req.socket?.remoteAddress ||
        req.stream?.session?.socket?.remoteAddress ||
        null
    );
}

function addResponseChunk(chunks, chunk, encoding, maxLength) {
    const currentLength = chunks.reduce(
        (total, item) => total + item.length,
        0
    );

    if (currentLength >= maxLength) {
        return;
    }

    const buffer = Buffer.isBuffer(chunk)
                   ? chunk
                   : Buffer.from(chunk, encoding);

    chunks.push(
        buffer.subarray(0, maxLength - currentLength)
    );
}

/**
 * Must be registered after express.json(), express.urlencoded(), etc.
 * when you want req.body to be available.
 */
export function requestResponseLogger({
    logger = console,
    maxBodyLength = DEFAULT_MAX_BODY_LENGTH,
    logHeaders = true,
    logRequestBody = true,
    logResponseBody = true
} = {}) {
    return function trafficLoggerMiddleware(req, res, next) {
        const requestId =
                  req.headers['x-request-id'] ||
                  crypto.randomUUID();

        const startedAt = process.hrtime.bigint();
        const responseChunks = [];

        req.requestId = requestId;
        res.setHeader('x-request-id', requestId);

        logger.info(formatLog({
            type: 'http.request',
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            protocol: req.httpVersion,
            remoteAddress: getRemoteAddress(req),

            ...(logHeaders && {
                headers: sanitizeHeaders(req.headers)
            }),

            ...(logRequestBody &&
                req.body !== undefined && {
                    body: formatPayload(req.body, {
                        maxLength: maxBodyLength
                    })
                })
        }));

        const originalWrite = res.write;
        const originalEnd = res.end;

        res.write = function patchedWrite(chunk, encoding, callback) {
            if (logResponseBody && chunk !== undefined && chunk !== null) {
                addResponseChunk(
                    responseChunks,
                    chunk,
                    encoding,
                    maxBodyLength
                );
                // responseChunks.push(
                //     Buffer.isBuffer(chunk)
                //     ? chunk
                //     : Buffer.from(chunk, encoding)
                // );
            }

            return originalWrite.call(this, chunk, encoding, callback);
        };

        res.end = function patchedEnd(chunk, encoding, callback) {
            if (logResponseBody && chunk !== undefined && chunk !== null) {
                addResponseChunk(
                    responseChunks,
                    chunk,
                    encoding,
                    maxBodyLength
                );
                // responseChunks.push(
                //     Buffer.isBuffer(chunk)
                //     ? chunk
                //     : Buffer.from(chunk, encoding)
                // );
            }

            return originalEnd.call(this, chunk, encoding, callback);
        };

        let completed = false;

        function logResponse(completionType) {
            if (completed) {
                return;
            }

            completed = true;

            const durationMs =
                      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

            let responseBody;

            if (logResponseBody && responseChunks.length > 0) {
                const buffer = Buffer.concat(responseChunks);
                const contentType = String(
                    res.getHeader('content-type') || ''
                );

                const isText =
                          contentType.startsWith('text/') ||
                          contentType.includes('json') ||
                          contentType.includes('xml') ||
                          contentType.includes('javascript') ||
                          contentType.includes('form-urlencoded');

                responseBody = isText
                               ? formatPayload(buffer.toString('utf8'), {
                        maxLength: maxBodyLength
                    })
                               : formatPayload(buffer, {
                        isBinary: true,
                        maxLength: maxBodyLength
                    });
            }

            logger.info(formatLog({
                type: 'http.response',
                requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                completionType,
                durationMs: Number(durationMs.toFixed(2)),

                ...(logHeaders && {
                    headers: sanitizeHeaders(res.getHeaders())
                }),

                ...(responseBody !== undefined && {
                    body: responseBody
                })
            }));
        }

        res.once('finish', () => logResponse('finished'));
        res.once('close', () => logResponse('closed'));

        next();
    };
}

export function attachWebSocketLogger(wss, {
    logger = console,
    maxBodyLength = DEFAULT_MAX_BODY_LENGTH,
    logHeaders = true
} = {}) {
    wss.on('connection', (socket, req) => {
        const connectionId = crypto.randomUUID();

        socket.connectionId = connectionId;

        logger.info(formatLog({
            type: 'websocket.connected',
            connectionId,
            url: req.url,
            remoteAddress: getRemoteAddress(req),

            ...(logHeaders && {
                headers: sanitizeHeaders(req.headers)
            })
        }));

        /*
         * Register this listener before your application message listeners
         * if you want logging to happen first.
         */
        socket.on('message', (data, isBinary) => {
            logger.info(formatLog({
                type: 'websocket.receive',
                connectionId,
                data: formatPayload(data, {
                    isBinary,
                    maxLength: maxBodyLength
                })
            }));
        });

        const originalSend = socket.send;

        socket.send = function patchedSend(
            data,
            optionsOrCallback,
            callback
        ) {
            let isBinary = Buffer.isBuffer(data);

            if (
                optionsOrCallback &&
                typeof optionsOrCallback === 'object' &&
                optionsOrCallback.binary !== undefined
            ) {
                isBinary = optionsOrCallback.binary;
            }

            logger.info(formatLog({
                type: 'websocket.send',
                connectionId,
                data: formatPayload(data, {
                    isBinary,
                    maxLength: maxBodyLength
                })
            }));

            return originalSend.call(
                this,
                data,
                optionsOrCallback,
                callback
            );
        };

        socket.on('close', (code, reason) => {
            logger.info(formatLog({
                type: 'websocket.disconnected',
                connectionId,
                code,
                reason: reason?.toString() || ''
            }));
        });

        socket.on('error', error => {
            logger.error(formatLog({
                type: 'websocket.error',
                connectionId,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            }));
        });
    });
}

const dttm = () => {
    let d = new Date();
    return `[${d.getYear() + 1900}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(4, '0')}]`;
}

export function createLogger(logdir, filename) {
    let logger              = {};
    const logsink        = `${logdir}/${filename}`;
    let logstream        = fs.createWriteStream(logsink, { flags: 'a' });

    logger.log = (...args) => {
        // const message = util.format(...args);
        let msg       = args.join(' ');
        logstream.write(`${dttm()} ${msg?.startsWith('┌') ? '\n' : ''}${msg}\n`);
    }

    logger.info = function (...args) {
        logger.log('I:', ...args);
    }

    logger.warn = function (...args) {
        logger.log('W:', ...args);
    }

    logger.error = function (...args) {
        logger.log('E:', ...args);
    }

    logger.debug = function (...args) {
    }

    logger.$flush = function () {
        logstream.end(`**** END ${dttm()} ***********************************\n\n`);
    }

    return logger;
}