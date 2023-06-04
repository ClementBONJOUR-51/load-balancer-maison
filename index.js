const { Server } = require('./Server');
const { LoadBalancer } = require('./LoadBalancer');

const servers = [
  new Server('https://cesi-eat-app-1-test.glitch.me', 'AUTH'),
  new Server('https://cesi-eat-app-2-test.glitch.me', 'ORDERS'),
  new Server('https://cesi-eat-app-3-test.glitch.me', 'SHIPPING')
];

const typesService = ['AUTH', 'ORDERS', 'SHIPPING'];

const loadBalancer = new LoadBalancer(3000, typesService, 10, 5);

servers.forEach((server) => {
  loadBalancer.addServer(server);
});

loadBalancer.start();