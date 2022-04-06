const { exec } = require('child_process');
const fs = require("fs");

process.send("child process: compute.js executed!");

let outputString;
let command;

process.on("message", message => {

    // detect system for appropriate command
    if (process.platform === "win32") {
        command = `wsl ../app/src/lexunit-exercise-windows-amd64 "$(cat ../app/src/data_IN.json)" ${message.threshold}`;
        // command = 'wsl pwd';
    } else {
        command = `./app/src/lexunit-exercise-linux-amd64 "$(cat ./app/src/data_IN.json)" ${message.threshold}`;
    }

    const linuxBinFile = exec(command, (error, stdout, stderror) => {
        if (error) {
            process.send(error.stack);
            process.send('child process: Error code: ' + error.code);
            process.send('child process: Signal received: ' + error.signal);
        }
        if (stderror) {
            process.send('child process: Child Process STDERR: ' + stderror);
            return;
        }
        console.log(stdout);
        outputString = stdout;
    });

    linuxBinFile.on('close', function(code) {
        process.send(`\nchild process: Output of algorithm:\n\n${outputString}\n`);
        process.send('child process: Child process exited with exit code ' + code);
        process.send('child process: saving results...');

        let jsonFromString = outputString.substring(outputString.indexOf("{"));
        // write result json to file which can be sent back
        fs.writeFile(__dirname + "/data_OUT.json", jsonFromString, (err) => {
            if (err) {
                process.send(err);
            }
            process.send("child process: done! data processed and saved in 'data_OUT.json'!")
        });
    });
});