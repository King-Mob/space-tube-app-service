import { AppServiceRegistration } from "matrix-appservice";

// creating registration files
const reg = new AppServiceRegistration();
reg.setAppServiceUrl("http://0.0.0.0:8133");
reg.setHomeserverToken(AppServiceRegistration.generateToken());
reg.setAppServiceToken(AppServiceRegistration.generateToken());
reg.setSenderLocalpart("example-appservice");
reg.addRegexPattern("users", "@.*", true);
reg.setProtocols(["exampleservice"]); // For 3PID lookups
reg.setId("hello-service");
reg.outputAsYaml("registration.yaml");
