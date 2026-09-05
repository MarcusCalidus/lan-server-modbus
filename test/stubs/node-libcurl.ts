/**
 * Stands in for node-libcurl. The real package is a native binding whose
 * prebuilt binary is not loadable here, so the route's HTTP call is driven
 * through this stub instead. Tests set `Curl.respond` to decide what the
 * 'end' (or 'error') handler receives when perform() is called.
 */
export class Curl {
    static instances: Curl[] = [];
    static respond: (curl: Curl) => void = () => undefined;

    opts: Record<string, any> = {};
    handlers: Record<string, (...args: any[]) => void> = {};
    closed = false;

    constructor() {
        Curl.instances.push(this);
    }

    static reset() {
        Curl.instances = [];
        Curl.respond = () => undefined;
    }

    setOpt(name: string, value: any) {
        this.opts[name] = value;
    }

    on(event: string, handler: (...args: any[]) => void) {
        this.handlers[event] = handler;
    }

    close() {
        this.closed = true;
    }

    perform() {
        Curl.respond(this);
    }
}
