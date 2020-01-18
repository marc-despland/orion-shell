'use strict';

const axios = require('axios');
const fs = require('fs');

module.exports = class Engine {
    constructor() {
        this.default_limit=20;
        this.show_curl=false;
        this.token="";
        this.configname = "";
        try {
            var data = fs.readFileSync("config/configs.json");
            this.configs = JSON.parse(data);
        } catch (error) {
            this.configs={};
            console.log(JSON.stringify(error,null,4))
            console.log("Can't read configs.json")
        }
    }
    connected() {
        return (this.token!=="")
    }
    configured() {
        return (this.configname!=="");
    }
    config() {
        return this.configs[this.configname];
    }

    chooseConfig(name) {
        if (this.configs.hasOwnProperty(name)) this.configname = name;
    }

    createConfig(config) {
        this.configs[config.name] = config;
        this.configname = config.name;
        try {
            fs.writeFileSync("config/configs.json", JSON.stringify(this.configs, null, 4));
        } catch (error) {
            console.log("Can't write configs[config].json")
        }
    }
    async sendOrionRequest(method, url, data, headers) {
        var request = {
            method: method,
            url: this.config().orion+ url,
            headers: headers
        };
        if (data !== null) request.data = data;
        if (this.config().service !== "") request.headers["Fiware-Service"] = this.config().service;
        if (this.config().servicePath !== "") request.headers["Fiware-ServicePath"] = this.config().servicePath;
        if (this.config().useAuth) request.headers["X-Auth-Token"] = this.token;
        if (this.show_curl) this.curl(request);
        try {
            return await axios.request(request);
        } catch (error) {
            if (error.hasOwnProperty("response") && (error.response.hasOwnProperty("status"))) {
                if ((error.response.status===401) || (error.response.status===403)) {
                    this.token="";
                }
                return error.response;
            } else {
                var answer={
                    status: 666
                }
                return answer;
            }
        }
    }

    async requestAuthToken(user, password) {
        this.configs[this.configname].user=user;
        let data = this.config().clientId + ":" + this.config().clientSecret;
        let buff = Buffer.from(data);
        let authorization = buff.toString('base64');
    
        var request = {
            method: "POST",
            url: this.config().idServer + "/oauth2/token",
            data: this.config().permanent ? "grant_type=password&username=" + encodeURI(user) + "&password=" + encodeURI(password) + "&scope=permanent" : "grant_type=password&username=" + encodeURI(user) + "&password=" + encodeURI(password),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + authorization
            }
        };
        if (this.show_curl) this.curl(request);
        try {
            var response=await axios.request(request);
            if (response.hasOwnProperty("data") && response.data.hasOwnProperty("access_token")) this.token=response.data.access_token;
        } catch(exception) {

        }
    }


    curl(request) {
        var cmd="curl -X "+request.method+" ";
        var headers = Object.keys(request.headers);
        for (var i=0; i<headers.length; i++) cmd+="-H \""+headers[i]+": "+request.headers[headers[i]]+"\" ";
        cmd += "\""+request.url+"\" ";
        if (request.hasOwnProperty("data")) {
            cmd += "-d @- <<EOF\n"+request.data+"\nEOF";
        }
        console.log("\x1b[32m",cmd);
        console.log("\x1b[0m","")
    }

    printConfig() {
        console.log("----------------------------------------------------")
        console.log("Configuration \t\t: " + this.config().name);
        console.log("Orion \t\t\t: " + this.config().orion);
        console.log("Fiware Service \t\t: " + this.config().service);
        console.log("Fiware Service Path\t: " + this.config().servicePath);
        if (this.config().useAuth) {
            console.log("IdM server\t\t: " + this.config().idServer);
            console.log("Client Id\t\t: " + this.config().clientId);
            console.log("Client Secret\t\t: " + this.config().clientSecret);
            console.log("X-Auth-Token\t\t: " + this.token);
            console.log("User\t\t\t: " + this.config().user);
        }
        console.log("")
    }

    useAuth() {
        return this.config().useAuth;
    }
    getConfigList() {
        var keys = Object.keys(this.configs);
        return keys;
    }
    getSearchQueries() {
        var keys = [];
        if (this.config().hasOwnProperty("search")) {
            keys = Object.keys(this.config().search);
        }
        return keys;
    }
    addSearchQuery(query) {
        if (!this.configs[this.configname].hasOwnProperty("search")) {
            this.configs[this.configname].search = {};
        }
        this.configs[this.configname].search[query.name] = query;
        try {
            fs.writeFileSync("config/configs.json", JSON.stringify(configs, null, 4));
        } catch (error) {
            console.log("Can't write configs[config].json")
        }
    }

    getSearchLimit(queryname) {
        return this.config().search[queryname].hasOwnProperty("limit") ? this.config().search[queryname].limit : 20;
    }

    getSearchQueryString(queryname) {
        var str = "";
        var keys = Object.keys(this.config().search[queryname]);
        keys.forEach(key => {
            if (key !== "name") {
                if (str !== "") str += "&";
                str += key + "=" + this.config().search[queryname][key];
            }
        });
        return str;
    }
    
}
