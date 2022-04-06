const express = require("express");
const fs = require("fs");
const { fork } = require("child_process");
const app = express();
const connectionString = "mongodb+srv://Rafi:flatout2@cluster0.okuhf.mongodb.net/lexunit?retryWrites=true&w=majority";
var MongoClient = require('mongodb').MongoClient;
var db;
let error_msg = "";

app.use(express.json());

// Connect to the MongoDB cluster
// mongoose.connect(connectionString).then(() => console.log("Connected to MongoDB")).catch((error) => console.error(error));
MongoClient.connect(connectionString, function(err, client) {
    if (err)
        throw err;
    else {
        db = client.db();
        console.log('Connected to MongoDB');
        //Start app only after connection is ready
        app.listen(process.env.PORT || 3000, () => console.log("Server listening on port 3000"));
    }
});

app.get("/", (req, res) => {

    // res.sendFile('/public/index.html', { root: '../app' }); // local
    res.sendFile('./public/index.html', { root: './app' }); // dockercontainer

});

app.post('/data', (req, res) => {

    console.log(req.body.groups);
    let data = req.body;
    if (validateIncomingJSON(data.groups)) {
        let json = JSON.stringify(data.groups);
        //save data to file
        // fs.writeFile("../app/src/data_IN.json", json, (err) => { // local
        fs.writeFile("./app/src/data_IN.json", json, (err) => { // dockercontainer
            if (err) {
                console.log(err);
            }
            console.log("parent process: incoming json data saved in 'data_IN.json' for processing, calling compute.js!");

            // const childProcess = fork('../app/src/compute.js'); // local
            const childProcess = fork('./app/src/compute.js'); // dockercontiner
            childProcess.send({ threshold: data.threshold });
            childProcess.on('error', (err) => console.log(err));
            childProcess.on('message', (message) => {
                console.log(message);
                if (message.includes("done")) {
                    console.log("\nserver is listeing on port 3000 again");
                }
            });
        });

        // save incoming data to mongoDB
        db.collection('data_IN').insertOne(data, function(err, inserted) {
            if (err) {
                res.send('Adatok elfogadva, de hiba a mongoDB-be mentésnél!' + err);
                console.log(err);
            } else {
                res.send('Adatok elfogadva, és mentve mongoDB-be! id: ' + inserted.insertedId);
                console.log("Data saved! id: " + inserted.insertedId);
            }
        });
    } else {
        res.send(error_msg);
    }
});

app.get('/data', (req, res) => {

    // fs.readFile('../app/src/data_OUT.json', (err, data) => { // local
    fs.readFile('./app/src/data_OUT.json', (err, data) => { // dockercontainer
        if (err) {
            console.log("The file does not exist.");
            res.send({ hiba: "Nincs eredmény!" })
        } else {
            let dataToSave = {};
            dataToSave["groups"] = JSON.parse(data);
            dataToSave["timestamp"] = Date(Date.now());
            // console.log(dataToSave["groups"]);
            // save result data to mongoDB
            db.collection('data_OUT').insertOne(dataToSave, function(err, inserted) {
                if (err) {
                    res.send({ "errormessage": "Hiba az eredmény mongoDB-be mentésnél!", "error": err });
                    console.log(err);
                } else {
                    res.send({ "message": "Eredmény mentve mongoDB-be!", "data": JSON.parse(data) });
                    console.log("Data saved! id: " + inserted.insertedId);
                }
            });
            console.log("The file exists, client served!");
        }
    });
});

function validateIncomingJSON(json) {

    let keys = Object.keys(json);
    let length;
    if (json[keys[0]][0] != undefined) {
        length = json[keys[0]][0].length;
    } else {
        console.log("ERROR: empty group");
        error_msg = "ERROR: empty group";
        return false;
    }
    //check name
    for (let i = 0; i < keys.length; i++) {
        if (!(keys[i] === `group_${i+1}`)) {
            console.log("ERROR: invalid group name -> " + keys[i]);
            error_msg = "ERROR: invalid group name";
            return false;
        }
    }
    // check for empty
    for (let i = 0; i < keys.length; i++) {
        if (json[keys[i]].length == 0) {
            console.log("ERROR: empty group");
            error_msg = "ERROR: empty group";
            return false;
        }
    }
    // check length
    for (let i = 0; i < keys.length; i++) {
        json[keys[i]].forEach(element => {
            if (element.length != length) {
                console.log("ERROR: lenght of data does not match");
                error_msg = "ERROR: lenght of data does not match";
                return false;
            }
        });
    }
    return true;
}