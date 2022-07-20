var cron = require('node-cron');
const { CreatePayment } = require("./zoho/CreatePayments");

cron.schedule('*/3 * * * *', () => {
    console.log("Executing Function...")
    CreatePayment.runNameUpdate();
});
// cron.schedule('*/5 * * * 1-5', () => {
//     console.log("Executing Function...")
//     CreatePayment.runNameUpdate();
// });


