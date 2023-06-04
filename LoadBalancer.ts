import Server from './Server';
import { createProxyMiddleware } from 'http-proxy-middleware';
import express, { Express, Request, Response, NextFunction } from 'express';

export class LoadBalancer {
    private _servers: Server[];
    private _appExpress: Express;
    private _port: number;
    private _typesService: string[];
    private _healthCheckingInterval: number;
    private _maxWaitTime: number;

    constructor(port: number = 3000, typesService: string[], healthCheckingInterval: number = 10, maxWaitTime: number = 5) {
        this._servers = [];
        this._appExpress = express();
        this._port = port;
        this._typesService = typesService;
        this._healthCheckingInterval = healthCheckingInterval * 1000;
        this._maxWaitTime = maxWaitTime * 1000;
    }

    public addServer(server: Server): void {
        this._servers.push(server);
    }

    public removeServer(server: Server): void {
        this._servers = this._servers.filter(s => s !== server);
    }

    public addTypeService(typeService: string): void {
        this._typesService.push(typeService);
    }

    public removeTypeService(typeService: string): void {
        this._typesService = this._typesService.filter(t => t !== typeService);
    }

    public get servers(): Server[] {
        return this._servers;
    }

    public start(): void {
        this._typesService.forEach((typeService) => {
            this._appExpress.use('/' + typeService, (req: Request, res: Response, next: NextFunction) => {
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

    private chooseServer = (typeServer: string): Server => {
        let choosedServer: Server = this._servers[0]
        for (const server of this._servers) {
            if (server.type === typeServer && server.status === 'GOOD' && (!choosedServer || server.cpu < choosedServer.cpu)) {
                choosedServer = server;
            }
        }
        return choosedServer;
    };

    private redirectRequest = (req: Request, res: Response, targetServer: Server): void => {
        createProxyMiddleware({
            target: targetServer.url,
            changeOrigin: true
        })(req, res, (error) => {
            console.error('Erreur lors de la redirection vers le serveur:', error);
            targetServer.status = 'DOWN';
            this.getCPU().then(() => {
                const newNextTarget: Server = this.chooseServer(targetServer.type);
                this.redirectRequest(req, res, newNextTarget);
            });
        });
    };

    private getCPU = async (): Promise<void> => {
        const promises = this._servers.map((server) => server.updateCPU(this._maxWaitTime));
        await Promise.allSettled(promises);
    };

    private printLog = (): void => {
        process.stdout.moveCursor(0, -3);
        this._servers.forEach((server) => {
            process.stdout.clearLine(0);
            process.stdout.write(server.getPrint());
        });
    };
}