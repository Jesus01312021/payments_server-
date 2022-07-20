const { RecordOperations, GetRecordsParam, SearchRecordsParam } = require("zcrmsdk/core/com/zoho/crm/api/record/record_operations");
const ParameterMap = require("zcrmsdk/routes/parameter_map").ParameterMap;
const HeaderMap = require("zcrmsdk/routes/header_map").HeaderMap;
const ResponseWrapper = require("zcrmsdk/core/com/zoho/crm/api/record/response_wrapper").ResponseWrapper;
const ZCRMRecord = require("zcrmsdk/core/com/zoho/crm/api/record/record").MasterModel;
const BodyWrapper = require("zcrmsdk/core/com/zoho/crm/api/record/body_wrapper").BodyWrapper;
const SuccessResponse = require("zcrmsdk/core/com/zoho/crm/api/record/success_response").SuccessResponse;
const SuccessfulConvert = require("zcrmsdk/core/com/zoho/crm/api/record/successful_convert").SuccessfulConvert;
const ActionWrapper = require("zcrmsdk/core/com/zoho/crm/api/record/action_wrapper").ActionWrapper;
const ConvertActionWrapper = require("zcrmsdk/core/com/zoho/crm/api/record/convert_action_wrapper").ConvertActionWrapper;
const APIException = require("zcrmsdk/core/com/zoho/crm/api/record/api_exception").APIException;
const Choice = require("zcrmsdk/utils/util/choice").Choice;
const User = require("zcrmsdk/core/com/zoho/crm/api/users/user").User;
const { Init } = require("./SDKInitializer");
var pg = require("pg");
const { Record } = require("zcrmsdk/core/com/zoho/crm/api/record/record");

var connectionString = {
    user: "usb@backup-server-restore.",
    database: "USBCrm",
    host: "backup-server-restore.postgres.database.azure.com",
    password: "postgres220-",
    port: 5432,
};

class CreatePayment {


    static delay = time => {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    static loopOverPayments = async (payments) => {
        Init.CRMInitialize();
        for (const element in payments) {
            console.log(element);
            let paymentId = payments[element].id;
            let paymentName = payments[element].Name;
            console.log(paymentId);
            console.log(paymentName);
            console.log("########################")
            await this.updatePaymentStatus(paymentId, paymentName);
            console.log("done");
        }
    }
    static runNameUpdate = async () => {
        Init.CRMInitialize();
        let pgClient = new pg.Client(connectionString);
        pgClient.connect();
        let query = await pgClient.query(
            `select service_number, payment_ref from usb.update_payments where create_status = 'false' and server_status = 'false' order by created_at limit 1;`
        );
        console.log("the end");
        await pgClient.end();
        console.log(query.rows.length)
        if (query.rows.length > 0) {
            console.log(query.rows[0].service_number);
            console.log(query.rows[0].payment_ref);
            let resp = await this.getPayments(query.rows[0].service_number, query.rows[0].payment_ref);
            if (resp.status === 200) {
                let pgClient = new pg.Client(connectionString);
                pgClient.connect();
                let newQuery = await pgClient.query(
                    `update usb.update_payments set create_status = 'true',  server_status = 'true' where payment_ref = '${query.rows[0].payment_ref}' and service_number = '${query.rows[0].service_number}';`
                );
                console.log("the end");
                await pgClient.end();
            } else {
                let pgClient = new pg.Client(connectionString);
                pgClient.connect();
                let newQuery = await pgClient.query(
                    `update usb.update_payments set server_status = 'true' where payment_ref = '${query.rows[0].payment_ref}' and service_number = '${query.rows[0].service_number}';`
                );
                console.log("the end");
                await pgClient.end();
            }
            return "Seccess!!!";

        } else {
            console.log("No more rows to process...");
            return;
        }

    };

    static getPayments = async (Service_Number, payment_reason) => {
        try {
            const engTypes = ["Deposit", "One off works", "No Access Fee", "Call Out Fee", "Install"];
            //Get instance of RecordOperations Class
            let recordOperations = new RecordOperations();

            let paramInstance = new ParameterMap();

            // await paramInstance.add(GetRecordsParam.APPROVED, "both");
            await paramInstance.add(GetRecordsParam.PAGE, 1);

            await paramInstance.add(GetRecordsParam.PER_PAGE, 200);
            if (engTypes.includes(payment_reason)) {
                await paramInstance.add(SearchRecordsParam.CRITERIA, `((Service_Number:equals:${Service_Number}) and (Type:equals:Engineering) and (Engineering_Type:equals:${payment_reason}))`);
            } else {
                await paramInstance.add(SearchRecordsParam.CRITERIA, `((Service_Number:equals:${Service_Number}) and (Type:equals:${payment_reason}))`);
            }

            let headerInstance = new HeaderMap();

            // await headerInstance.add(GetRecordsHeader.IF_MODIFIED_SINCE, new Date("2020-01-01T00:00:00+05:30"));

            //Call getRecords method that takes paramInstance, headerInstance and moduleAPIName as parameters
            let response = await recordOperations.searchRecords("Process_Payments", paramInstance, headerInstance);

            let sortingKeys = [];
            let unsortedMap = {};
            if (response != null) {

                //Get the status code from response
                console.log("Status Code: " + response.statusCode);

                if ([204, 304].includes(response.statusCode)) {
                    console.log(response.statusCode == 204 ? "No Content" : "Not Modified");
                    // await this.updatePaymentStatus(bigInt(payId), `${newName}-1`);
                    return { "status": 204, "desc": "No Content" }
                }
                //Get the object from response
                let responseObject = response.object;
                if (responseObject != null) {

                    //Check if expected ResponseWrapper instance is received
                    if (responseObject instanceof ResponseWrapper) {

                        //Get the array of obtained Record instances
                        let records = responseObject.getData();

                        for (let index = 0; index < records.length; index++) {
                            let record = records[index].getKeyValues();
                            console.log(record)

                            let pDate = new Date(record.get("Date"));
                            // let datePart = pDate.toString().split("T")[0];
                            // console.log(datePart);
                            if (!sortingKeys.includes(pDate)) {
                                sortingKeys.push(pDate);
                                unsortedMap[pDate] = record;
                            } else {
                                let newDate = new Date(pDate.setMinutes(pDate.getMinutes() + Math.random() * 10));
                                sortingKeys.push(newDate);
                                unsortedMap[newDate] = record;
                            }
                        }
                    }
                }
            }

            sortingKeys.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            let count = sortingKeys.length;
            for (const element of sortingKeys) {
                let payment = unsortedMap[element];
                let newName = "";
                if (engTypes.includes(payment_reason)) {
                    newName = payment.get("Engineering_Type").getValue();
                } else {
                    newName = payment.get("Type").getValue();
                }
                console.log(`${newName}-${count}`);
                await this.updatePaymentStatus(payment.get("id"), `${newName}-${count}`);
                count--;

            }
            await this.getPaymentsByServiceNumber(Service_Number);
            return { "status": 200, "desc": "Success!!!" }

        } catch (error) {
            console.log(error);
        }
    };

    static updatePaymentStatus = async (recordId, name) => {
        try {

            //Get instance of RecordOperations Class
            let recordOperations = new RecordOperations();

            let headerInstance = new HeaderMap();
            //Get instance of BodyWrapper Class that will contain the request body
            let request = new BodyWrapper();

            //Array to hold Record instances
            let recordsArray = [];

            //Get instance of Record Class
            let record = new ZCRMRecord();
            /*
            * Call addKeyValue method that takes two arguments
            * 1 -> A string that is the Field's API Name
            * 2 -> Value
            */
            record.addKeyValue("Name", name);

            //Add Record instance to the array
            recordsArray.push(record);

            //Set the array to Records in BodyWrapper instance
            request.setData(recordsArray);
            let response = await recordOperations.updateRecord(BigInt(recordId), "Process_Payments", request, headerInstance);

            if (response != null) {

                //Get the status code from response
                console.log(response)
                console.log("Status Code: " + response.statusCode);

                //Get object from response
                let responseObject = response.object;

                if (responseObject != null) {

                    //Check if expected ActionWrapper instance is received
                    if (responseObject instanceof ActionWrapper) {

                        //Get the array of obtained ActionResponse instances
                        let actionResponses = responseObject.getData();

                        actionResponses.forEach(actionResponse => {

                            //Check if the request is successful
                            if (actionResponse instanceof SuccessResponse) {

                                //Get the Status
                                console.log("Status: " + actionResponse.getStatus().getValue());

                                //Get the Code
                                console.log("Code: " + actionResponse.getCode().getValue());

                                console.log("Details");

                                //Get the details map
                                let details = actionResponse.getDetails();

                                if (details != null) {
                                    Array.from(details.keys()).forEach(key => {
                                        console.log(key + ": " + details.get(key));
                                    });
                                }

                                console.log("Message: " + actionResponse.getMessage().getValue());
                            }
                            //Check if the request returned an exception
                            else if (actionResponse instanceof APIException) {

                                //Get the Status
                                console.log("Status: " + actionResponse.getStatus().getValue());

                                //Get the Code
                                console.log("Code: " + actionResponse.getCode().getValue());

                                console.log("Details");

                                //Get the details map
                                let details = actionResponse.getDetails();

                                if (details != null) {
                                    Array.from(details.keys()).forEach(key => {
                                        console.log(key + ": " + details.get(key));
                                    });
                                }

                                //Get the Message
                                console.log("Message: " + actionResponse.getMessage().getValue());
                            }
                        });
                    }
                    //Check if the request returned an exception
                    else if (responseObject instanceof APIException) {

                        //Get the Status
                        console.log("Status: " + responseObject.getStatus().getValue());

                        //Get the Code
                        console.log("Code: " + responseObject.getCode().getValue());

                        console.log("Details");

                        //Get the details map
                        let details = responseObject.getDetails();

                        if (details != null) {
                            Array.from(details.keys()).forEach(key => {
                                console.log(key + ": " + details.get(key));
                            });
                        }

                        //Get the Message
                        console.log("Message: " + responseObject.getMessage().getValue());
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    static getPaymentsByServiceNumber = async (service_number) => {
        try {
            //Get instance of RecordOperations Class
            let recordOperations = new RecordOperations();

            let paramInstance = new ParameterMap();

            // await paramInstance.add(GetRecordsParam.APPROVED, "both");
            await paramInstance.add(GetRecordsParam.PAGE, 1);

            await paramInstance.add(GetRecordsParam.PER_PAGE, 200);
            await paramInstance.add(SearchRecordsParam.CRITERIA, `(Service_Number:equals:${service_number})`);

            let headerInstance = new HeaderMap();

            // await headerInstance.add(GetRecordsHeader.IF_MODIFIED_SINCE, new Date("2020-01-01T00:00:00+05:30"));

            //Call getRecords method that takes paramInstance, headerInstance and moduleAPIName as parameters
            let response = await recordOperations.searchRecords("Process_Payments", paramInstance, headerInstance);

            let sortingKeys = [];
            let unsortedMap = {};
            if (response != null) {

                //Get the status code from response
                console.log("Status Code: " + response.statusCode);

                if ([204, 304].includes(response.statusCode)) {
                    console.log(response.statusCode == 204 ? "No Content" : "Not Modified");
                    // await this.updatePaymentStatus(bigInt(payId), `${newName}-1`);
                    return { "status": 204, "desc": "No Content" }
                }
                //Get the object from response
                let responseObject = response.object;
                if (responseObject != null) {

                    //Check if expected ResponseWrapper instance is received
                    if (responseObject instanceof ResponseWrapper) {

                        //Get the array of obtained Record instances
                        let records = responseObject.getData();

                        for (let index = 0; index < records.length; index++) {
                            let record = records[index].getKeyValues();
                            console.log(record)

                            let pDate = new Date(record.get("Date"));
                            // let datePart = pDate.toString().split("T")[0];
                            // console.log(datePart);
                            if (!sortingKeys.includes(pDate)) {
                                sortingKeys.push(pDate);
                                unsortedMap[pDate] = record;
                            } else {
                                let newDate = new Date(pDate.setMinutes(pDate.getMinutes() + Math.random() * 10));
                                sortingKeys.push(newDate);
                                unsortedMap[newDate] = record;
                            }
                        }
                    }
                }
            }

            sortingKeys.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            let count = sortingKeys.length;
            let payment_subform = [];
            for (let i = 0; i < count && i < 25; i++) {
                const key = sortingKeys[i];
                let newRecord = new Record();
                let paymentRecord = unsortedMap[key];
                let discount = paymentRecord.get("Discount");
                if (discount == null) {
                    discount = 0;
                }
                let amt = paymentRecord.get("Amount");
                let owner = paymentRecord["Owner"];
                console.log(owner)
                let agent = paymentRecord.get("Owner").getKeyValues().get("name");
                let payId = paymentRecord.get("id");
                let amount = amt - discount;
                let paymentDate = paymentRecord.get("Date");
                let stat = paymentRecord.get("Outcome");
                let source = paymentRecord.get("Method");
                let cnt = i + 1;
                newRecord.addKeyValue("Agent", agent);
                let payRecord = new Record();
                payRecord.setId(BigInt(payId));
                newRecord.addKeyValue("Payment", payRecord);
                newRecord.addKeyValue("Amount1", amount.toString());
                newRecord.addKeyValue("Payment_Date", paymentDate);
                newRecord.addKeyValue("No", cnt.toString());
                let payStatus = new Choice(stat);
                newRecord.addKeyValue("Payment_Status", payStatus);
                newRecord.addKeyValue("Payment_Source", source);
                payment_subform.push(newRecord);

            }

            this.updateSubformLog(service_number, payment_subform);
            return { "status": 200, "desc": "Success!!!" }

        } catch (error) {
            console.log(error);
        }
    }

    static updateSubformLog = async (service_number, subform_list) => {
        try {
            let recordId = await this.getAccountId(service_number);
            console.log(recordId);
            //Get instance of RecordOperations Class
            let recordOperations = new RecordOperations();

            let headerInstance = new HeaderMap();
            //Get instance of BodyWrapper Class that will contain the request body
            let request = new BodyWrapper();

            //Array to hold Record instances
            let recordsArray = [];

            //Get instance of Record Class
            let record = new ZCRMRecord();
            /*
            * Call addKeyValue method that takes two arguments
            * 1 -> A string that is the Field's API Name
            * 2 -> Value
            */
            record.addKeyValue("Payments_Subform", subform_list);

            //Add Record instance to the array
            recordsArray.push(record);

            //Set the array to Records in BodyWrapper instance
            request.setData(recordsArray);
            let response = await recordOperations.updateRecord(BigInt(recordId), "Payments_Information", request, headerInstance);

            if (response != null) {

                //Get the status code from response
                console.log(response)
                console.log("Status Code: " + response.statusCode);

                //Get object from response
                let responseObject = response.object;

                if (responseObject != null) {

                    //Check if expected ActionWrapper instance is received
                    if (responseObject instanceof ActionWrapper) {

                        //Get the array of obtained ActionResponse instances
                        let actionResponses = responseObject.getData();

                        actionResponses.forEach(actionResponse => {

                            //Check if the request is successful
                            if (actionResponse instanceof SuccessResponse) {

                                //Get the Status
                                console.log("Status: " + actionResponse.getStatus().getValue());

                                //Get the Code
                                console.log("Code: " + actionResponse.getCode().getValue());

                                console.log("Details");

                                //Get the details map
                                let details = actionResponse.getDetails();

                                if (details != null) {
                                    Array.from(details.keys()).forEach(key => {
                                        console.log(key + ": " + details.get(key));
                                    });
                                }

                                console.log("Message: " + actionResponse.getMessage().getValue());
                            }
                            //Check if the request returned an exception
                            else if (actionResponse instanceof APIException) {

                                //Get the Status
                                console.log("Status: " + actionResponse.getStatus().getValue());

                                //Get the Code
                                console.log("Code: " + actionResponse.getCode().getValue());

                                console.log("Details");

                                //Get the details map
                                let details = actionResponse.getDetails();

                                if (details != null) {
                                    Array.from(details.keys()).forEach(key => {
                                        console.log(key + ": " + details.get(key));
                                    });
                                }

                                //Get the Message
                                console.log("Message: " + actionResponse.getMessage().getValue());
                            }
                        });
                    }
                    //Check if the request returned an exception
                    else if (responseObject instanceof APIException) {

                        //Get the Status
                        console.log("Status: " + responseObject.getStatus().getValue());

                        //Get the Code
                        console.log("Code: " + responseObject.getCode().getValue());

                        console.log("Details");

                        //Get the details map
                        let details = responseObject.getDetails();

                        if (details != null) {
                            Array.from(details.keys()).forEach(key => {
                                console.log(key + ": " + details.get(key));
                            });
                        }

                        //Get the Message
                        console.log("Message: " + responseObject.getMessage().getValue());
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    static getAccountId = async (service_number) => {
        try {
            //Get instance of RecordOperations Class
            let recordOperations = new RecordOperations();

            let paramInstance = new ParameterMap();

            // await paramInstance.add(GetRecordsParam.APPROVED, "both");
            await paramInstance.add(GetRecordsParam.PAGE, 1);

            await paramInstance.add(GetRecordsParam.PER_PAGE, 200);
            await paramInstance.add(SearchRecordsParam.CRITERIA, `(Service_Number:equals:${service_number})`);

            let headerInstance = new HeaderMap();

            // await headerInstance.add(GetRecordsHeader.IF_MODIFIED_SINCE, new Date("2020-01-01T00:00:00+05:30"));

            //Call getRecords method that takes paramInstance, headerInstance and moduleAPIName as parameters
            let response = await recordOperations.searchRecords("Payments_Information", paramInstance, headerInstance);

            let sortingKeys = [];
            let unsortedMap = {};
            if (response != null) {

                //Get the status code from response
                console.log("Status Code: " + response.statusCode);

                if ([204, 304].includes(response.statusCode)) {
                    console.log(response.statusCode == 204 ? "No Content" : "Not Modified");
                    // await this.updatePaymentStatus(bigInt(payId), `${newName}-1`);
                    return { "status": 204, "desc": "No Content" }
                }
                //Get the object from response
                let responseObject = response.object;
                if (responseObject != null) {

                    //Check if expected ResponseWrapper instance is received
                    if (responseObject instanceof ResponseWrapper) {

                        //Get the array of obtained Record instances
                        let records = responseObject.getData();

                        for (let index = 0; index < records.length; index++) {
                            let record = records[index];
                            return record.getId();

                        }
                    }
                }
            }

        } catch (error) {
            console.log(error);
        }
    }

}
module.exports = { CreatePayment };

// if (Init.CRMInitialize()) {
//     console.log("initialize!!!")
//     CreatePayment.deleteRecord(BigInt(256952000010364714));
// CreatePayment.getPayments("Direct Debit", "TBC-99999", "none", 256952000010288057);
// }

// // // let dates = ["2022-07-06T08:00:00.000Z", "2022-07-06T08:03:00.000Z", "2022-05-06T05:017:00.000Z"];

// // // dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
// // // console.log(dates);
// CreatePayment.getPayments("Direct Debit", "TBC-99999", "none", 256952000010288057);
// Init.CRMInitialize()
// CreatePayment.getPaymentsByServiceNumber("TBC-99999");