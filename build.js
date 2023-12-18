import path from "path";
import fs from 'fs';

export const insertEnv = (env) => {
    const fileContents = `const homeServer = "${env.HOME_SERVER}";`

    fs.writeFile(path.resolve("./web/constants.js"), fileContents, err => {
        if (err) {
            console.error(err);
        }
    });
}