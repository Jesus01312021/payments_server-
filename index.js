var http = require("http");
const { CreatePayment } = require("./zoho/CreatePayments");
const { Init } = require("./zoho/SDKInitializer");

var pg = require("pg");
const axios = require("axios");

var connectionString = {
    user: "usb@backup-server-restore.",
    database: "USBCrm",
    host: "backup-server-restore.postgres.database.azure.com",
    password: "postgres220-",
    port: 5432,
};

var server = http.createServer(async function (req, res) {
    let reqUrl = req.url.split("?", 1);
    console.log(reqUrl[0]);
    const headers = {
        "Access-Control-Allow-Headers": "*",
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Max-Age": 2592000, // 30 days
        /** add other headers as per requirement */
    };

    if (req.method == "OPTIONS") {
        res.writeHead(200, headers);
        res.end();
    } else if (req.method == "POST") {
        if (reqUrl[0] == "/updatePaymentReference") {
            var body = [];
            req
                .on("data", (chunk) => {
                    body.push(chunk);
                })
                .on("end", async () => {
                    body = Buffer.concat(body).toString();
                    let resp = JSON.parse(body);
                    updatePaymentReference(resp.obj);
                    res.writeHead(200, headers);
                    res.write(JSON.stringify({ status: 200, "Desc": "Success!!!" }), "utf-8");
                    res.end();
                });
        } else if (reqUrl[0] == "/PaymentReference") {
            var body = [];
            req
                .on("data", (chunk) => {
                    body.push(chunk);
                })
                .on("end", async () => {
                    body = Buffer.concat(body).toString();
                    let resp = JSON.parse(body);
                    PaymentReference(resp);
                    res.writeHead(200, headers);
                    res.write(JSON.stringify({ status: 200, "Desc": "Success!!!" }), "utf-8");
                    res.end();
                });
        } else if (reqUrl[0] == "/DeletePayment") {
            var body = [];
            req
                .on("data", (chunk) => {
                    body.push(chunk);
                })
                .on("end", async () => {
                    body = Buffer.concat(body).toString();
                    let resp = JSON.parse(body);
                    DeletePayment(resp);
                    res.writeHead(200, headers);
                    res.write(JSON.stringify({ status: 200, "Desc": "Success!!!" }), "utf-8");
                    res.end();
                });
        }
    }
});
server.listen(6003);

const updatePaymentReference = (payObj) => {
    console.log(payObj);
    CreatePayment.loopOverPayments(payObj);
};

const PaymentReference = async (payObj) => {

    console.log(payObj);
    for (const elem of payObj.obj) {
        console.log(elem);

        var pgClient = new pg.Client(connectionString);
        pgClient.connect();
        var query = await pgClient.query(
            `select * from usb.update_payments where payment_ref ='${elem}' and service_number = '${payObj.service_number}' and create_status = 'false' and server_status = 'false';`
        );
        console.log("the end");
        await pgClient.end();
        console.log(query.rows.length)
        if (query.rows.length > 0) {
            console.log("Ref already on table!!!");
        } else {
            var pgClient = new pg.Client(connectionString);
            pgClient.connect();
            var query = await pgClient.query(
                `insert into usb.update_payments(service_number, payment_ref) values('${payObj.service_number}', '${elem}');`
            );
            console.log("the end");
            await pgClient.end();
        }
    }
};
