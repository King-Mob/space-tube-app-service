import 'dotenv/config';
import { AppServiceRegistration } from "matrix-appservice";


// creating registration files
const reg = new AppServiceRegistration();
reg.setAppServiceUrl(`http://${process.env.HOST}:8133`);
reg.setHomeserverToken(AppServiceRegistration.generateToken());
reg.setAppServiceToken(AppServiceRegistration.generateToken());
reg.setSenderLocalpart("example-appservice");
reg.addRegexPattern("users", "@.*", true);
reg.setProtocols(["exampleservice"]); // For 3PID lookups
reg.setId("hello-service");
reg.isUserMatch("@example-appservice");
reg.outputAsYaml("registration.yaml");

