import 'dotenv/config';
import { AppServiceRegistration } from "matrix-appservice";


// creating registration files
console.log("Creating the registration yaml to be linked in your homeserver.")
const reg = new AppServiceRegistration();
reg.setAppServiceUrl(`http://${process.env.HOST}:8133`);
reg.setHomeserverToken(AppServiceRegistration.generateToken());
reg.setAppServiceToken(AppServiceRegistration.generateToken());
reg.setSenderLocalpart("space-tube-bot");
reg.addRegexPattern("rooms", "!.*", false);
reg.addRegexPattern("users", "@_space-tube.*", true);
reg.addRegexPattern("aliases", "#_space-tube.*", true);
reg.setProtocols(["spacetubeservice"]); // For 3PID lookups
reg.setId("space-tube-service");
reg.outputAsYaml("registration.yaml");
console.log("Done: registration.yaml exists and can be reference in your homeserver.")