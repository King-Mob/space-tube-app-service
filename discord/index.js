import express from 'express';
import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

function VerifyDiscordRequest(clientKey) {
    return function (req, res, buf, encoding) {
        console.log("verifying")
        const signature = req.get('X-Signature-Ed25519');
        const timestamp = req.get('X-Signature-Timestamp');

        const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
        if (!isValidRequest) {
            res.status(401).send('Bad request signature');
            throw new Error('Bad request signature');
        }
        console.log("valid request", isValidRequest)
    };
}

export const startDiscord = () => {
    const app = express();
    app.use(express.json({ verify: VerifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY) }));

    app.get('/', (req, res) => {
        console.log(req);
        res.send("yo how's it going on 8134!");
    });

    app.post('/interactions', async function (req, res) {
        // Interaction type and data
        const { type, data } = req.body;

        console.log(req.body)
        /**
         * Handle verification requests
         */
        if (type === InteractionType.PING) {
            console.log("ping")
            return res.send({ type: InteractionResponseType.PONG });
        }

        if (data.name === "echo") {
            const message = data.options[0].value;

            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `you said: ${message}`,
                },
            });
        }

        if (data.name === "create") {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `creating a new tube`,
                },
            });
        }

        if (data.name === "connect") {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `connecting you to the tube`,
                },
            });
        }

        if (data.name === "send") {
            return res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: `sending to the tube`,
                },
            });
        }
    });

    app.listen(8134);
}