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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadBalancer = void 0;
const http_proxy_middleware_1 = require("http-proxy-middleware");
const express_1 = __importDefault(require("express"));
class LoadBalancer {
    constructor(port = 3000, typesService, healthCheckingInterval = 10, maxWaitTime = 5) {
        this.chooseServer = (typeServer) => {
            let choosedServer = this._servers[0];
            for (const server of this._servers) {
                if (server.type === typeServer && server.status === 'GOOD' && (!choosedServer || server.cpu < choosedServer.cpu)) {
                    choosedServer = server;
                }
            }
            return choosedServer;
        };
        this.redirectRequest = (req, res, targetServer) => {
            (0, http_proxy_middleware_1.createProxyMiddleware)({
                target: targetServer.url,
                changeOrigin: true
            })(req, res, (error) => {
                console.error('Erreur lors de la redirection vers le serveur:', error);
                targetServer.status = 'DOWN';
                this.getCPU().then(() => {
                    const newNextTarget = this.chooseServer(targetServer.type);
                    this.redirectRequest(req, res, newNextTarget);
                });
            });
        };
        this.getCPU = () => __awaiter(this, void 0, void 0, function* () {
            const promises = this._servers.map((server) => server.updateCPU(this._maxWaitTime));
            yield Promise.allSettled(promises);
        });
        this.printLog = () => {
            process.stdout.moveCursor(0, -3);
            this._servers.forEach((server) => {
                process.stdout.clearLine(0);
                process.stdout.write(server.getPrint());
            });
        };
        this._servers = [];
        this._appExpress = (0, express_1.default)();
        this._port = port;
        this._typesService = typesService;
        this._healthCheckingInterval = healthCheckingInterval * 1000;
        this._maxWaitTime = maxWaitTime * 1000;
    }
    addServer(server) {
        this._servers.push(server);
    }
    removeServer(server) {
        this._servers = this._servers.filter(s => s !== server);
    }
    addTypeService(typeService) {
        this._typesService.push(typeService);
    }
    removeTypeService(typeService) {
        this._typesService = this._typesService.filter(t => t !== typeService);
    }
    get servers() {
        return this._servers;
    }
    start() {
        this._typesService.forEach((typeService) => {
            this._appExpress.use('/' + typeService, (req, res, next) => {
                const nextTarget = this.chooseServer(typeService);
                if (!nextTarget) {
                    console.error('Tous les serveurs ' + typeService + ' sont indisponibles');
                    res.status(500).send('Tous les serveurs ' + typeService + ' sont indisponibles');
                    return;
                }
                this.redirectRequest(req, res, nextTarget);
            });
        });
        this._appExpress.listen(this._port, () => {
            console.log('Server running on port ' + this._port + ' ✅\n\n\n');
        });
        this.getCPU();
        setInterval(() => this.getCPU(), this._healthCheckingInterval);
        setInterval(() => this.printLog(), 1000);
    }
}
exports.LoadBalancer = LoadBalancer;
