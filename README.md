# 🛸Space Tube🛸

Welcome to Space Tube!

Space Tube is a way to connect chat groups together, so that they can communicate with each other as their group identities. 

You can use the default hosted instance running on spacetu.be or set-up your own. Here are the instructions on how to do that.

## Use The Spacetu.be Instance

There's a default instance hosted on spacetu.be that you can use.

### On Matrix

1. Invite `@space-tube-bot:spacetu.be` to the room you want to open the tube in
2. Send `!space-tube create` in the room
3. Copy the connection code
4. Share the connection with the group you want to connect to
6. Receive their connection code, from the group you want to connect to
5. Send `!space-tube connect <their-connection-code>`
6. The tube is open, get talking

### On Discord

1. Add the Space Tube bot to your server, using this link: https://discord.com/api/oauth2/authorize?client_id=1024778983021215764&permissions=67584&scope=applications.commands%20bot
2. Add Space Tube bot to the channel you want to open the tube in
3. use the /create command to make a new tube opening
4. Copy the connection code Space Tube Bot sent you
5. Share the connection with the group you want to connect to
6. Receive their connection code, from the group you want to connect to
7. Use the /connect command, entering the connection code from the other group
8. Use /send to send messages to the other group 

## Self-Hosting Instructions

You can host space tube yourself! It's an app service on matrix, so you'll need a home server, and to connect your instance to other platforms requires some specific things for each one.

You will need:

* a matrix homeserver. The recommended way to have one is using matrix-ansible-docker
on that server you need:
* git `git --version`
* npm `node --version` recommend later version of node, 18.12.0 works 

1. create your homeserver. this service assumes you have a domain, matrix.example.com that you run matrix on. This is how [matrix-docker-ansible-deploy](https://github.com/spantaleev/matrix-docker-ansible-deploy) gets you to set it up. If you're new to matrix, matrix-docker-ansible-deploy is a straightforward way to start. Note: you need the federation turned on if you want space-tube to work across different homeservers.
2. `git clone https://github.com/King-Mob/space-tube-app-service.git` the appservice to your server. `cd space-tube-app-service` to open the directory
3. `npm install` the app service
4. `cp .env.example .env` creates a .env file by copying the example env into the project folder. Make sure HOST is set to either host.docker.internal or localhost and HOME_SERVER set to the domain you're running matrix on, e.g. example.com
5. `npm run register` to create your registration file. This creates `registration.yaml` in the project folder.
6. Copy the `hs_token` and `as_token` from `registration.yaml` and paste into your `.env` file as `HOME_SERVER_TOKEN` and `APPLICATION_TOKEN` respectively.
7. Add the path to the registration config file to your homeserver. For matrix-ansible-docker that means adding these vars to your vars.yml:
```
matrix_synapse_container_extra_arguments: ['--add-host host.docker.internal:host-gateway --mount type=bind,src=/root/space-tube-app-service,dst=/appservice-spacetube']
matrix_synapse_app_service_config_files: ['/appservice-spacetube/registration.yaml']
```

For a normal synapse instance add the path to `registration.yaml` to the [server config file](https://matrix-org.github.io/synapse/latest/application_services.html), which should be in `configs/homeserver.yaml` within synapse.
`app_service_config_files: - /root/space-tube-app-service/registration.yaml`

8. Set-up and restart your homeserver.
9. Start the app service using `npm start`. To have it run indefinitely, you'll need a process runner like systemd or pm2. [SystemD](https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/) is a standard linux way to run processes. [PM2](https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps) is an easy to use node solution.

10. Start talking to space tube
	invite `@space-tube-bot:<your domain>` to your chat e.g. @space-tube-bot:example.com
	`!space-tube echo <some test text>`

You can interact with it in the same way as the default space-tube instance, and connect to others on different instances.

### Discord Set-up

The discord connection uses a bot created through discord's interface here: https://discord.com/developers/applications

Create a discord application, and a bot.

Copy the  public key, the app id, and the discord token into your .env file, like so:
```
DISCORD_PUBLIC_KEY=something
DISCORD_APP_ID=something
DISCORD_TOKEN=something
```
run `npm run register-discord`

You need an https connection to port 8134 on the server you're running the app service on.

Currently I'm using ngrok.

`install ngrok``

`ngrox http 8134``

You should get a message that contains this:
`https://<string-of-letters-and-numbers>.ngrok-free.app/``

Copy that url, add `/interactions` to the end and paste this into the bot interactions url field on the [discord applications interface](https://discord.com/developers/applications) like so:

`https://<string-of-letters-and-numbers>.ngrok-free.app/interactions``

Click the save button and if it disappears, you are good to go!

## Feedback

Please join me in #space-tube-public:spacetu.be on matrix if you have any feedback or questions at all about the project.

Life is more spacious in tubes!

## Acknowledgements

This project was funded through the NGI0 Entrust Fund, a fund established by NLnet with financial support from the European Commission's Next Generation Internet programme, under the aegis of DG Communications Networks, Content and Technology under grant agreement No 101069594.

![nlnet logo](https://nlnet.nl/logo/banner.png)
![NG10 logo](https://nlnet.nl/image/logos/NGI0Entrust_tag.svg)
