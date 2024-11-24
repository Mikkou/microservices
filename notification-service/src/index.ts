import * as http from 'http'
import * as amqplib from 'amqplib'
const amqpUrl = 'amqp://guest:guest@rabbitmq:5672';

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer(async (req, res) => {
    res.statusCode = 200;
    res.setHeader('content-Type', 'Application/json');
    res.end(JSON.stringify({service: 'notification'}))
})

server.listen(port, hostname, async () => {

    const connection = await amqplib.connect(amqpUrl, "heartbeat=60");
    const channel = await connection.createChannel();
    channel.prefetch(10);
    const queueCreated = 'user.created';
    const queueDeleted = 'user.deleted';

    await channel.assertQueue(queueCreated, {durable: true});
    await channel.consume(queueCreated, async (msg) => {
            console.log('user was created');
            await channel.ack(msg);
    },
    {
        noAck: false,
        consumerTag: 'creation_consumer'
    });

    await channel.assertQueue(queueDeleted, {durable: true});
    await channel.consume(queueDeleted, async (msg) => {
            console.log('user was deleted');
            await channel.ack(msg);
        },
        {
            noAck: false,
            consumerTag: 'deletion_consumer'
        });

    process.once('SIGINT', async () => {
        console.log('got sigint, closing connection');
        await channel.close();
        await connection.close();
        process.exit(0);
    });

    process.on('uncaughtException', function (err) {
        console.error(err.stack);
        console.log("node errors handler");
    });

    console.log(`Server running at http://${hostname}:${port}/`);
});