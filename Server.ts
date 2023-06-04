export class Server {
    url: string;
    type: string;
    cpu: number;
    status: 'GOOD' | 'DOWN' | 'POOR';
    message: string;
    requestInProgress: boolean;

    constructor(url: string, type: string,) {
        this.url = url;
        this.type = type;
        this.cpu = 0;
        this.status = 'DOWN'; // UP | DOWN | POOR
        this.message = '';
        this.requestInProgress = false;

        // The POOR status is set when the request takes more than 5 seconds. We don't know if the server is down or not for the moment.
        // The DOWN status is set when the request returns an error (!= 200).
    }

    async updateCPU(maxWaitTime: number): Promise<void> {
        if (this.requestInProgress) return;

        this.requestInProgress = true;

        const timeoutPromise = new Promise<{ timeout: boolean }>((resolve) => {
            setTimeout(() => {
              resolve({ timeout: true });
            }, maxWaitTime); // Timeout set to 5 seconds
          });

        const fetchPromise = fetch(this.url + '/getCPU')
            .then((response) => {
                if (response.status !== 200) {
                    this.status = 'DOWN';
                    this.message = 'La réponse n\'est pas arrivée (504)';
                } else {
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

            const result = await Promise.race([timeoutPromise, fetchPromise]);

            if (result && typeof result.timeout === 'boolean' && this.status !== 'DOWN') {
              this.status = 'POOR';
            }
    }

    getPrint(): string {
        return `SERVER || URL: ${this.url.split('/')[2]} || TYPE: ${this.type.slice(0, 4)} || CPU: ${this.cpu.toFixed(2)} || REQUEST: ${this.requestInProgress ? '⏳' : '✅'
            } || STATUS: ${this.status
            } ${this.status === 'GOOD' ? '✅' : this.status === 'POOR' ? '⚠️' : '❌'} ${this.message ? ' -> ' + this.message : ''
            } \n`;
    }
}

export default Server;
