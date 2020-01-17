'use strict';
const inquirer = require('inquirer')


const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .option('action', {
        describe: "The action to execute",
        default: ''
    })
    .option('drytest', {
        alias: 'd',
        type: 'boolean',
        describe: "Show the delete operation but don't execute it",
        default: false
    }).help('h')
    .alias('h', 'help')
    .epilog('copyright 2019')
    .argv;

const axios = require('axios');
const fs = require('fs');


var configs = {
}

var config = "";

var token = "";

try {
    var data = fs.readFileSync("config/configs.json");
    configs = JSON.parse(data);
} catch (error) {
    console.log("Can't read configs.json")
}

orionShell(argv);

async function orionShell(argv) {
    var go = true;
    while (go) {
        var choices = [];
        if (config === "") {
            choices.push("Configure");
        } else {
            console.log("----------------------------------------------------")
            console.log("Configuration \t\t: " + configs[config].name);
            console.log("Orion \t\t\t: " + configs[config].orion);
            console.log("Fiware Service \t\t: " + configs[config].service);
            console.log("Fiware Service Path\t: " + configs[config].servicePath);
            if (configs[config].useAuth) {
                console.log("IdM server\t: " + configs[config].idServer);
                console.log("Client Id\t: " + configs[config].clientId);
                console.log("Client Secret\t: " + configs[config].clientSecret);
            }
            console.log("")
            if (configs[config].useAuth) {
                if (token === "") {
                    choices.push("Authenticate");
                } else {
                    choices.push("Change user");
                }
            }
            choices.push("Orion version");
            choices.push("Entities");
            choices.push("Change configuration");

        }
        choices.push("Exit");

        const getAction = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: 'Action ?',
            choices: choices,
        });
        if ((getAction.action === "Configure") || (getAction.action === "Change configuration")) await choose_configuration();
        if ((getAction.action === "Authenticate") || (getAction.action === "Change user")) await authenticate();
        if (getAction.action === "Orion version") await getVersion();
        if (getAction.action === "Entities") await entities();
        if (getAction.action === "Exit") {
            go = false;
        }
    }
}

async function entities() {
    var questions = [
        {
            type: 'list',
            name: 'action',
            message: 'Manage entities:',
            choices: ["Create", "Search", "Show entity", "Update", "Delete", "Back"]
        }
    ]
    var back = false;
    while (!back) {
        var choose = await inquirer.prompt(questions)
        switch (choose.action) {
            case "Create":
                await create_entity();
                break;
            case "Search":
                await search_entities();
                break;
            case "Show entity":
                await show_entity();
                break;
            case "Update":
                break;
            case "Delete":
                break;
            case "Back":
                back = true;
                break;
        }
    }
}


async function create_search_query() {
    var questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Search name:'
        }, {
            type: 'input',
            name: 'id',
            message: 'id:'
        }, {
            type: 'input',
            name: 'type',
            message: 'type:'
        }, {
            type: 'input',
            name: 'idPattern',
            message: 'idPattern:'
        }, {
            type: 'input',
            name: 'typePattern',
            message: 'typePattern:'
        }, {
            type: 'input',
            name: 'q',
            message: 'q:'
        }, {
            type: 'input',
            name: 'mq',
            message: 'mq:'
        }, {
            type: 'input',
            name: 'limit',
            message: 'limit:'
        }, {
            type: 'input',
            name: 'orderBy',
            message: 'orderBy:'
        }, {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["keyValues", "values", "unique"]
        }
    ]
    var choose = await inquirer.prompt(questions);
    var query = {
        name: choose.name,
        options: "count"
    };
    if (choose.id !== "") query.id = choose.id;
    if (choose.type !== "") query.type = choose.type;
    if (choose.idPattern !== "") query.idPattern = choose.idPattern;
    if (choose.typePattern !== "") query.typePattern = choose.typePattern;
    if (choose.q !== "") query.q = choose.q;
    if (choose.mq !== "") query.mq = choose.mq;
    if (choose.limit !== "") query.limit = choose.limit;
    if (choose.orderBy !== "") query.orderBy = choose.orderBy;
    if (choose.options.length > 0) {
        for (var i = 0; i < choose.options.length; i++) options += "," + choose.option; s[i]
    }
    query.attrs = "dateCreated,dateModified"
    return query;
}

function queryString(query) {
    var str = "";
    var keys = Object.keys(query);
    keys.forEach(key => {
        if (key !== "name") {
            if (str !== "") str += "&";
            str += key + "=" + query[key];
        }
    });
    return str;
}

async function show_entity() {
    var questions = [
        {
            type: 'input',
            name: 'id',
            message: 'Id:'
        }
    ]
    var choose = await inquirer.prompt(questions)
    var request = {
        method: "GET",
        url: configs[config].orion + "/v2/entities/" + choose.id,
        headers: {}
    };
    if (configs[config].service !== "") headers["Fiware-Service"] = configs[config].service;
    if (configs[config].servicePath !== "") headers["Fiware-ServicePath"] = configs[config].servicePath;
    if (configs[config].useAuth) headers["X-Auth-Token"] = token;
    try {
        var response = await axios.request(request);
        if (response.status === 200) {
            console.log(JSON.stringify(response.data, null, 4));
            console.log("")
        }
    } catch (error) {
        console.log("Unknown entity");
    }

}
async function search_entities() {
    var back = false;
    while (!back) {
        var keys = [];
        if (configs[config].hasOwnProperty("search")) {
            keys = Object.keys(configs[config].search);
        }
        keys.push("New search");
        keys.push("Back");
        var questions = [
            {
                type: 'list',
                name: 'action',
                message: 'Search choice:',
                choices: keys
            }
        ]
        var choose = await inquirer.prompt(questions)
        if (choose.action === "Back") {
            back = true;
        } else if (choose.action === "New search") {
            var query = await create_search_query();
            if (!configs[config].hasOwnProperty("search")) {
                configs[config].search = {};
            }
            configs[config].search[query.name] = query;
            try {
                fs.writeFileSync("config/configs.json", JSON.stringify(configs, null, 4));
            } catch (error) {
                console.log("Can't write configs[config].json")
            }
        } else {
            var search=choose.action;
            var end=false;
            var page=0;
            var limit=configs[config].search[choose.action].hasOwnProperty("limit") ? configs[config].search[search].limit: 20;
            while (!end) {
                var offset="";
                if (page>0) offset="&offset="+(page*limit);
                var request = {
                    method: "GET",
                    url: configs[config].orion + "/v2/entities?" + queryString(configs[config].search[search])+offset,
                    headers: {}
                };
                if (configs[config].service !== "") headers["Fiware-Service"] = configs[config].service;
                if (configs[config].servicePath !== "") headers["Fiware-ServicePath"] = configs[config].servicePath;
                if (configs[config].useAuth) headers["X-Auth-Token"] = token;
                try {
                    var response = await axios.request(request);
                    if (response.status === 200) {
                        var length = [0, 0, 0, 0];
                        for (var i = 0; i < response.data.length; i++) {
                            if (response.data[i].id.length > length[0]) length[0] = response.data[i].id.length;
                            if (response.data[i].type.length > length[1]) length[1] = response.data[i].type.length;
                            if (value(response.data[i].dateCreated).length > length[2]) length[2] = value(response.data[i].dateCreated).length;
                            if (value(response.data[i].dateModified).length > length[3]) length[3] = value(response.data[i].dateModified).length;
                        }
                        var line = "";
                        for (var i = 0; i < (length[0] + length[1] + length[2] + length[3] + 13); i++) line += "-";
                        console.log("Nb matching record : " + response.headers["fiware-total-count"]);
                        console.log("");
                        console.log(line);
                        console.log("| " + padding("ID", length[0]) + " | " + padding("TYPE", length[1]) + " | " + padding("DATE CREATED", length[2]) + " | " + padding("DATE MODIFIED", length[3]) + " |")
                        console.log(line);
                        for (var i = 0; i < response.data.length; i++) {
                            console.log("| " + padding(response.data[i].id, length[0]) + " | " + padding(response.data[i].type, length[1]) + " | " + padding(value(response.data[i].dateCreated), length[2]) + " | " + padding(value(response.data[i].dateModified), length[3]) + " |")
                        }
                        console.log(line);
                        console.log("");
                        if (limit<response.headers["fiware-total-count"]) {
                            var choice=[];
                            if (response.headers["fiware-total-count"]>(limit*(page+1))) choice.push("Next");
                            if (page>0) choice.push("Previous");
                            choice.push("Exit");
                            var pages = [
                                {
                                    type: 'list',
                                    name: 'action',
                                    message: 'Page:',
                                    choices: choice
                                }
                            ]
                            var choose = await inquirer.prompt(pages)   
                            switch (choose.action) {
                                case "Next" :
                                    page++;
                                    break;
                                case "Previous":
                                    page--;
                                    break;
                                case "Exit":
                                    end=true;
                                    break;
                            }
                        } else {
                            end=true;
                        }
                    }
                } catch (error) {
                    console.log(JSON.stringify(request, null, 4));
                    end=true;
                }
            }
        }

    }
}

function padding(value, length) {
    var str = value;
    for (var i = 0; i < length - value.length; i++) str += " ";
    return str;
}

function value(ngsi) {
    return ngsi.hasOwnProperty("value") ? ngsi.value : ngsi;
}


async function create_entity() {
    var questions = [
        {
            type: 'editor',
            name: 'entity',
            message: 'Entity to create:'
        },
        {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["upsert", "keyvalue"]

        }
    ]
    var choose = await inquirer.prompt(questions)
    var options = "";
    if (choose.options.length > 0) {
        options = "?options=" + choose.options[0];
        for (var i = 1; i < choose.options.length; i++) options += "," + choose.options[i];
    }
    var request = {
        method: "POST",
        url: configs[config].orion + "/v2/entities" + options,
        data: choose.entity,
        headers: {
            "Content-Type": "application/json"
        }
    };
    if (configs[config].service !== "") headers["Fiware-Service"] = configs[config].service;
    if (configs[config].servicePath !== "") headers["Fiware-ServicePath"] = configs[config].servicePath;
    if (configs[config].useAuth) headers["X-Auth-Token"] = token;
    try {
        var response = await axios.request(request);
        if (response.status === 201) {
            console.log("Entity created");
        }
    } catch (error) {
        console.log(JSON.stringify(request, null, 4));
    }

}





async function choose_configuration() {
    var keys = Object.keys(configs);
    keys.push("New configuration");
    var questions = [
        {
            type: 'list',
            name: 'config',
            message: 'Configuration:',
            choices: keys,
            default: config === "" ? keys[0] : config
        }
    ]
    var choose = await inquirer.prompt(questions)
    if (choose.config === "New configuration") {
        var newconfig = await create_configuration();
        configs[newconfig.name] = newconfig;
        try {
            fs.writeFileSync("config/configs.json", JSON.stringify(configs, null, 4));
        } catch (error) {
            console.log("Can't write configs[config].json")
        }
    } else {
        config = choose.config;
    }
}


async function create_configuration() {
    var questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Configuration name :'
        },
        {
            type: 'input',
            name: 'orion',
            message: 'Orion base URL :',
            default: configs[config].orion
        },
        {
            type: 'input',
            name: 'service',
            message: 'Fiware Service :',
            default: configs[config].service
        },
        {
            type: 'input',
            name: 'servicepath',
            message: 'Fiware Service Path:',
            default: configs[config].servicePath
        },
        {
            type: 'list',
            name: 'useauth',
            message: 'Use authetification:',
            choices: ["yes", "no"],
            default: configs[config].useAuth ? "yes" : "no"
        }
    ]
    var choice = await inquirer.prompt(questions);
    var newconfig = {
        name: choice.name,
        orion: choice.orion,
        service: choice.service,
        servicePath: choice.servicepath,
        useAuth: choice.useauth === "yes"
    };
    if (newconfigs[config].useAuth) {
        var auth = [
            {
                type: 'input',
                name: 'clientid',
                message: 'Application Client Id:',
                default: configs[config].clientId
            },
            {
                type: 'input',
                name: 'clientsecret',
                message: 'Application Client Secret:',
                default: configs[config].clientSecret
            },
            {
                type: 'input',
                name: 'idserver',
                message: 'IdM Server URLt:',
                default: configs[config].idServer
            },
            {
                type: 'list',
                name: 'permanent',
                message: 'Use permanent token:',
                choices: ["yes", "no"],
                default: configs[config].permanent ? "yes" : "no"
            }
        ]
        choice = await inquirer.prompt(auth);
        newconfigs[config].clientId = choice.clientid;
        newconfigs[config].clientSecret = choice.clientsecret;
        newconfigs[config].idServer = choice.idServer;
        newconfigs[config].permanent = choice.permanent === "yes";
        newconfigs[config].user = ""
    }
    return newconfig;
}

async function getVersion() {
    var request = {
        method: "GET",
        url: configs[config].orion + "/version",
        headers: {}
    };
    if (configs[config].service !== "") headers["Fiware-Service"] = configs[config].service;
    if (configs[config].servicePath !== "") headers["Fiware-ServicePath"] = configs[config].servicePath;
    if (configs[config].useAuth) headers["X-Auth-Token"] = token;
    try {
        var response = await axios.request(request);
        if (response.status === 200) {
            console.log(JSON.stringify(response.data, null, 4));
        }
    } catch (error) {
        console.log(JSON.stringify(request, null, 4));
    }
}


async function authenticate() {
    var questions2 = [
        {
            type: 'input',
            name: 'login',
            message: 'Login :',
            default: user.login
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password :'
        },
        {
            type: 'list',
            name: 'permanent',
            message: 'Permanent token:',
            choices: ["permanent", "normal"],
            default: user.permanent
        }
    ]
    var getUser = await inquirer.prompt(questions2);
    user.login = getUser.login;
    user.permanent = getUser.permanent;
    let data = configs[config].clientId + ":" + configs[config].clientSecret;
    let buff = Buffer.from(data);
    let authorization = buff.toString('base64');

    var request = {
        method: "POST",
        url: configs[config].isServer + "/oauth2/token",
        data: user.permanent ? "grant_type=password&username=" + encodeURI(user.login) + "&password=" + encodeURI(getUser.password) + "&scope=permanent" : "grant_type=password&username=" + encodeURI(user.login) + "&password=" + encodeURI(getUser.password),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + authorization
        }
    };
    try {
        var response = await axios.request(request);
    } catch (error) {
        console.log(JSON.stringify(request, null, 4));
    }

    try {
        fs.writeFileSync("user.json", JSON.stringify(user, null, 4));
    } catch (error) {
        console.log("Can't save option in configs[config].json")
    }
}