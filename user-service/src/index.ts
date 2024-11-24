import * as http from 'http'
import * as url from 'url'
import {parse} from 'querystring'
import * as mongoose from 'mongoose'
import {validate} from 'validate.js'
import * as amqplib from 'amqplib'
const amqpUrl = 'amqp://guest:guest@rabbitmq:5672';

const hostname = '0.0.0.0';
const port = 3000;
let channel = null;

const exchange = 'user.crud';
const queueCreations = 'user.created';
const keyCreated = 'created';
const queueDeletions = 'user.deleted';
const keyDeleted = 'deleted';

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    createdAt: Date
});
const User = mongoose.model('User', userSchema);

const rulesPOST = {
    name: {
        presence: true
    },
    email: {
        presence: true,
        email: true
    }
};

const rulesPUT = {
    id: {
        presence: true
    },
    name: {
        presence: true
    },
    email: {
        presence: true,
        email: true
    }
};

function getBody(req, res) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const result = parse(body)
            resolve(JSON.parse(Object.keys(result)[0]))
        });
    })
}

const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);
    res.setHeader('content-Type', 'Application/json');

    let body = null
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        body = await getBody(req, res)
    }

    const parsed = url.parse(req.url);
    const query: object = parse(parsed.query);

    if (reqUrl.pathname === '/users' && req.method === 'GET') {
        const users = await User.find({}, {}, {skip: query['offset'], limit: query['limit']})
        const result = users.map((u) => {
            return {
                id: u._id,
                name: u.name,
                email: u.email,
                createdAt: u.createdAt,
            }
        })
        res.statusCode = 200;
        res.end(JSON.stringify({users: result}))
        return
    } else if (reqUrl.pathname === '/users' && req.method === 'POST') {

        const errors = validate(body, rulesPOST)
        if (errors) {
            res.statusCode = 400;
            res.end(JSON.stringify({errors}))
        } else {
            const user = new User({
                name: body.name,
                email: body.email,
                createdAt: new Date()
            })
            await user.save()

            const msg = {'id': Math.floor(Math.random() * 1000), email: body.email, name: body.name};
            await channel.publish(exchange, keyCreated, Buffer.from(JSON.stringify(msg)));


            res.statusCode = 200;
            res.end(JSON.stringify({}))
        }
        return
    } else if (reqUrl.pathname === '/users' && req.method === 'PUT') {
        const errors = validate(body, rulesPUT)
        if (errors) {
            res.statusCode = 400;
            res.end(JSON.stringify({errors}))
        } else {
            await User.updateOne(
                {
                    _id: new mongoose.Types.ObjectId(body.id)
                },
                {
                    $set: {
                        name: body.name,
                        email: body.email
                    }
                }
            )

            res.statusCode = 200;
            res.end(JSON.stringify({}))
        }
        return

    } else if (reqUrl.pathname === '/users' && req.method === 'DELETE') {
        await User.deleteOne(
            {
                _id: new mongoose.Types.ObjectId(query['id'])
            }
        )

        const msg = {'id': Math.floor(Math.random() * 1000), userId: query['id']};
        await channel.publish(exchange, keyDeleted, Buffer.from(JSON.stringify(msg)));

        res.statusCode = 200;
        res.end(JSON.stringify({}))
        return
    }
    res.end(JSON.stringify({service: 'user'}))
})

server.listen(port, hostname, async () => {
    const mongoUrl = "mongodb://mongo:27017/app";
    await mongoose.connect(mongoUrl)
    const connection = await amqplib.connect(amqpUrl, 'heartbeat=60');
    channel = await connection.createChannel();

    await channel.assertExchange(exchange, 'direct', {durable: true});

    await channel.assertQueue(queueCreations, {durable: true});
    await channel.bindQueue(queueCreations, exchange, keyCreated);

    await channel.assertQueue(queueDeletions, {durable: true});
    await channel.bindQueue(queueDeletions, exchange, keyDeleted);

    process.on('uncaughtException', function (err) {
        console.error(err.stack);
        console.log("node errors handler");
    });

    console.log(`Server running at http://${hostname}:${port}/`);
});