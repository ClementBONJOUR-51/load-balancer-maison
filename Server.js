"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
class Server {
    constructor(url, type) {
        this.url = url;
        this.type = type;
        this.cpu = 0;
        this.status = 'DOWN'; // UP | DOWN | POOR
        this.message = '';
        this.requestInProgress = false;
        // The POOR status is set when the request takes more than 5 seconds. We don't know if the server is down or not for the moment.
        // The DOWN status is set when the request returns an error (!= 200).
    }
    updateCPU(maxWaitTime) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.requestInProgress)
                return;
            this.requestInProgress = true;
            const timeoutPromise = new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ timeout: true });
                }, maxWaitTime); // Timeout set to 5 seconds
            });
            const fetchPromise = fetch(this.url + '/getCPU')
                .then((response) => {
                if (response.status !== 200) {
                    this.status = 'DOWN';
                    this.message = 'La réponse n\'est pas arrivée (504)';
                }
                else {
                    return response.json();
                }
            })
                .then((data) => {
                if (data && data.cpu) {
                    this.cpu = data.cpu;
                    this.status = 'GOOD';
                    this.message = '';
                }
            })
                .catch((error) => {
                this.status = 'DOWN';
                this.message = error.message;
            })
                .finally(() => {
                this.requestInProgress = false;
            });
            const result = yield Promise.race([timeoutPromise, fetchPromise]);
            if (result && typeof result.timeout === 'boolean' && this.status !== 'DOWN') {
                this.status = 'POOR';
            }
        });
    }
    getPrint() {
        return `SERVER || URL: ${this.url.split('/')[2]} || TYPE: ${this.type.slice(0, 4)} || CPU: ${this.cpu.toFixed(2)} || REQUEST: ${this.requestInProgress ? '⏳' : '✅'} || STATUS: ${this.status} ${this.status === 'GOOD' ? '✅' : this.status === 'POOR' ? '⚠️' : '❌'} ${this.message ? ' -> ' + this.message : ''} \n`;
    }
}
exports.Server = Server;
exports.default = Server;
