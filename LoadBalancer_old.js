const Server = require('./Server');
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

class LoadBalancer {
    constructor(port = 3000, typesService, healthCheckingInterval = 10, maxWaitTime = 5) {
        this._servers = [];
        this._appExpress = express();
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
        setInterval(this.getCPU, this._healthCheckingInterval);
        setInterval(this.printLog, 1000);
    }

    chooseServer = (typeServer) => {
        let choosedServer = this._servers.find((server) => server.type === typeServer && server.status === 'GOOD');
        for (const server of this._servers) {
            if (server.type === typeServer && server.status === 'GOOD' && server.cpu < choosedServer.cpu) {
                choosedServer = server;
            }
        }
        return choosedServer;
    };

    redirectRequest = (req, res, targetServer) => {
        createProxyMiddleware({
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

    getCPU = async () => {
        const promises = this._servers.map((server) => server.updateCPU(this._maxWaitTime));
        await Promise.allSettled(promises);
    };

    printLog = () => {
        process.stdout.moveCursor(0, -3);
        this._servers.forEach((server) => {
            process.stdout.clearLine();
            process.stdout.write(server.getPrint());
        });
    }
}

export default LoadBalancer;