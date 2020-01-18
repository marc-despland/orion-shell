'use strict';
const inquirer = require('inquirer')
const Engine = require('./engine.js')

const axios = require('axios');
const fs = require('fs');

var engine = new Engine();

orionShell();

async function orionShell() {
    var go = true;
    while (go) {
        var choices = [];
        if (engine.configured()) {
            choices.push("Configure");
        } else {
            engine.printConfig();
            if (engine.useAuth()) {
                if (!engine.connected()) {
                    choices.push("Authenticate");
                } else {
                    choices.push("Change user");
                }
            }
            choices.push("Orion version");
            choices.push("Entities");
            choices.push("Change configuration");
            choices.push("Parameters");
        }
        choices.push("Exit");

        const choose = await inquirer.prompt({
            type: 'list',
            name: 'action',
            message: 'Action ?',
            choices: choices,
        });
        switch (choose.action) {
            case "Configure":
            case "Change configuration":
                await choose_configuration();
                break;
            case "Authenticate":
            case "Change user":
                await authenticate();
                break;
            case "Orion version":
                await getVersion();
                break;
            case "Entities":
                await entities();
                break;
            case "Parameters":
                await parameters();
                break;
            case "Exit":
                go = false;
                break;
        }
    }
}

async function parameters() {
    var questions = [
        {
            type: 'input',
            name: 'limit',
            message: 'default limit:',
            default: engine.default_limit
        }, {
            type: 'list',
            name: 'show_curl',
            message: 'show curl request:',
            choices: ["yes", "no"],
            default: engine.show_curl ? "yes" : "no"
        }
    ]
    var choose = await inquirer.prompt(questions)
    engine.default_limit=choose.default_limit;
    engine.show_curl=choose.show_curl==="yes";
}


async function entities() {
    var questions = [
        {
            type: 'list',
            name: 'action',
            message: 'Manage entities:',
            choices: ["Create", "Search", "Select entity", "Delete", "Back"]
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
            case "Select entity":
                await select_entity();
                break;
            case "Delete":
                await delete_entity();
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


async function select_entity() {
    var questions = [
        {
            type: 'input',
            name: 'id',
            message: 'Entity Id:'
        }
    ]
    var choose = await inquirer.prompt(questions)
    var response = await engine.sendOrionRequest("GET", "/v2/entities/" + choose.id, null, {});
    if (response.status === 200) {
        console.log(JSON.stringify(response.data, null, 4));
        console.log("")
        var back=false;
        var entityid=choose.id;
        while (!back) {
            var menu = [
                {
                    type: "list",
                    name: "action",
                    message: "Entity Id : "+entityid+" : ",
                    choices: ["Retrieve entity","Retrieve attributes", "Update or Append entity attribues","Update existing entity attributes","Replace all entities attributes","Remove entity", "Back"]
                }
            ]
            choose = await inquirer.prompt(menu)
            switch(choose.action) {
                case "Retrieve entity":
                    await retrieve_entity(entityid);
                    break;
                case "Retrieve attributes":
                    await retrieve_attributes(entityid);
                    break;
                case "Update or Append entity attribues":
                    await update_append_entity_attributes(entityid);
                    break;
                case "Update existing entity attributes":
                    await update_existing_entity_attributes(entityid);
                    break;
                case "Replace all entities attributes":
                    break;
                case "Remove entity":
                    await delete_entity(entityid);
                    break;
                case "Back":
                    back=true;
                    break;
            }
        }

    } else {
        console.log("Unknown entity status: "+response.status);
    }
}

async function update_append_entity_attributes(entityid) {
    var questions = [
        {
            type: 'editor',
            name: 'attributes',
            message: 'Attributes:'
        },
        {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["append", "keyValues"]

        }
    ]
    var choose = await inquirer.prompt(questions)
    var options = "";
    if (choose.options.length > 0) {
        options = "?options=" + choose.options[0];
        for (var i = 1; i < choose.options.length; i++) options += "," + choose.options[i];
    }
    var headers = {
        "Content-Type": "application/json"
    }
    var response = await engine.sendOrionRequest("POST", "/v2/entities/" + entityid+"/attrs"+ options, choose.attributes, headers);

    if (response.status === 204) {
        console.log("Entity created");
    } else {
        console.log("Can't create entity " + response.status);
    }
}

async function update_existing_entity_attributes(entityid) {
    var questions = [
        {
            type: 'editor',
            name: 'attributes',
            message: 'Attributes:'
        },
        {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["keyValues"]

        }
    ]
    var choose = await inquirer.prompt(questions)
    var options = "";
    if (choose.options.length > 0) {
        options = "?options=" + choose.options[0];
        for (var i = 1; i < choose.options.length; i++) options += "," + choose.options[i];
    }
    var headers = {
        "Content-Type": "application/json"
    }
    var response = await engine.sendOrionRequest("PATCH", "/v2/entities/" + entityid+"/attrs"+ options, choose.attributes, headers);

    if (response.status === 204) {
        console.log("Entity patched");
    } else {
        console.log("Can't patch entity " + response.status);
    }
}



async function retrieve_attributes(entityid) {
    var questions = [
        {
            type: 'input',
            name: 'attrs',
            message: 'attrs:'
        }, {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["keyValues", "values", "unique"]
        }
    ]
    var query="";
    var choose = await inquirer.prompt(questions)
    if (choose.attrs!=="") query+="?attrs="+choose.attrs;
    if (choose.options.length>0) {
        if (query==="") {
            query="?options=";
        } else {
            query+="&options=";
        }
        for (var i=0;i<choose.options.length; i++) {
            if (i>0) query+=",";
            query+=choose.options[i];
        }
    }
    var response = await engine.sendOrionRequest("GET", "/v2/entities/" + entityid+"/attrs"+query, null, {});
    if (response.status === 200) {
        console.log(JSON.stringify(response.data, null, 4));
        console.log("")
    } else {
        console.log("Unknown entity status: "+response.status);
    }
}



async function retrieve_entity(entityid) {
    var questions = [
        {
            type: 'input',
            name: 'attrs',
            message: 'attrs:'
        }, {
            type: 'checkbox',
            name: 'options',
            message: 'options:',
            choices: ["keyValues", "values", "unique"]
        }
    ]
    var query="";
    var choose = await inquirer.prompt(questions)
    if (choose.attrs!=="") query+="?attrs="+choose.attrs;
    if (choose.options.length>0) {
        if (query==="") {
            query="?options=";
        } else {
            query+="&options=";
        }
        for (var i=0;i<choose.options.length; i++) {
            if (i>0) query+=",";
            query+=choose.options[i];
        }
    }
    var response = await engine.sendOrionRequest("GET", "/v2/entities/" + entityid+query, null, {});
    if (response.status === 200) {
        console.log(JSON.stringify(response.data, null, 4));
        console.log("")
    } else {
        console.log("Unknown entity status: "+response.status);
    }
}


async function delete_entity(entityid) {
    var questions = [
        {
            type: 'confirm',
            name: 'delete',
            message: 'Are you sure ? (Y/n):',
            default: true
        }
    ]
    var choose = await inquirer.prompt(questions)
    if (choose.delete) {
        var response = await engine.sendOrionRequest("DELETE", "/v2/entities/" + entityid, null, {});
        if (response.status === 204) {
            console.log("Entity deleted");
            console.log("")
        } else {
            console.log("Unknown entity " +response.status);
        }
    }
}





async function search_entities() {
    var back = false;
    while (!back) {
        var keys=engine.getSearchQueries();
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
            engine.addSearchQuery(query);
        } else {
            var search = choose.action;
            var end = false;
            var page = 0;
            var limit = engine.getSearchLimit(search);
            while (!end) {
                var offset = "";
                if (page > 0) offset = "&offset=" + (page * limit);
                var response = await engine.sendOrionRequest("GET", "/v2/entities?" + engine.getSearchQueryString(search) + offset, null, {});
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
                    if (limit < response.headers["fiware-total-count"]) {
                        var choice = [];
                        if (response.headers["fiware-total-count"] > (limit * (page + 1))) choice.push("Next");
                        if (page > 0) choice.push("Previous");
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
                            case "Next":
                                page++;
                                break;
                            case "Previous":
                                page--;
                                break;
                            case "Exit":
                                end = true;
                                break;
                        }
                    } else {
                        end = true;
                    }
                } else {
                    console.log("Can't execute search request : " + request.status);
                    end = true;
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
    var headers = {
        "Content-Type": "application/json"
    }
    var response = await engine.sendOrionRequest("POST", "/v2/entities" + options, choose.entity, headers);

    if (response.status === 201) {
        console.log("Entity created");
    } else {
        console.log("Can't create entity " + response.status);
    }

}





async function choose_configuration() {
    var keys = engine.getConfigList();
    keys.push("New configuration");
    var questions = [
        {
            type: 'list',
            name: 'config',
            message: 'Configuration:',
            choices: keys,
            default: engine.configname === "" ? keys[0] : engine.configname
        }
    ]
    var choose = await inquirer.prompt(questions)
    if (choose.config === "New configuration") {
        var newconfig = await create_configuration();
        engine.createConfig(newconfig);
    } else {
        engine.chooseConfig(choose.config);
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
            default: engine.config().orion
        },
        {
            type: 'input',
            name: 'service',
            message: 'Fiware Service :',
            default: engine.config().service
        },
        {
            type: 'input',
            name: 'servicepath',
            message: 'Fiware Service Path:',
            default: engine.config().servicePath
        },
        {
            type: 'list',
            name: 'useauth',
            message: 'Use authetification:',
            choices: ["yes", "no"],
            default: engine.config().useAuth ? "yes" : "no"
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
                default: engine.config().clientId
            },
            {
                type: 'input',
                name: 'clientsecret',
                message: 'Application Client Secret:',
                default: engine.config().clientSecret
            },
            {
                type: 'input',
                name: 'idserver',
                message: 'IdM Server URLt:',
                default: engine.config().idServer
            },
            {
                type: 'list',
                name: 'permanent',
                message: 'Use permanent token:',
                choices: ["yes", "no"],
                default: engine.config().permanent ? "yes" : "no"
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
    var response = await engine.sendOrionRequest("GET", "/version", null, {});
    if (response.status === 200) {
        console.log(JSON.stringify(response.data, null, 4));
    } else {
        console.log(JSON.stringify(request, null, 4));
    }
}


async function authenticate() {
/*    var questions2 = [
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
    }*/
}