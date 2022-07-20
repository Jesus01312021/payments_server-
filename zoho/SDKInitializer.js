const Initializer = require("zcrmsdk/routes/initializer").Initializer;
const { OAuthToken, TokenType } = require("zcrmsdk/models/authenticator/oauth_token");
const UserSignature = require("zcrmsdk/routes/user_signature").UserSignature;
const { Logger, Levels } = require("zcrmsdk/routes/logger/logger");
const EUDataCenter = require("zcrmsdk/routes/dc/eu_data_center").EUDataCenter;
const DBStore = require("zcrmsdk/models/authenticator/store/db_store").DBStore;
const FileStore = require("zcrmsdk/models/authenticator/store/file_store").FileStore;
const SDKConfigBuilder = require("zcrmsdk/routes/sdk_config_builder").MasterModel;

class Init {

    static async CRMInitialize() {

        /*
         * Create an instance of Logger Class that takes two parameters
         * 1 -> Level of the log messages to be logged. Can be configured by typing Levels "." and choose any level from the list displayed.
         * 2 -> Absolute file path, where messages need to be logged.
         */
        let logger = Logger.getInstance(Levels.INFO, "/home/usb-admin/boilerComp/payments_server/zoho/Files/node_sdk_log.log");

        /*
         * Create an UserSignature instance that takes user Email as parameter
         */
        let user = new UserSignature("elliot.waterhouse@smart-plan.com");

        /*
         * Configure the environment
         * which is of the pattern Domain.Environment
         * Available Domains: USDataCenter, EUDataCenter, INDataCenter, CNDataCenter, AUDataCenter
         * Available Environments: PRODUCTION(), DEVELOPER(), SANDBOX()
         */
        let environment = EUDataCenter.PRODUCTION();

        /*
         * Create a Token instance
         * 1 -> OAuth client id.
         * 2 -> OAuth client secret.
         * 3 -> REFRESH/GRANT token.
         * 4 -> token type.
         * 5 -> OAuth redirect URL. Default value is null
         */
        let token = new OAuthToken("1000.HAAD82BRZY9BJTTNEFZXLICAQ2XURX", "da75a833526ee10b96850069fe6f4a063fe1500ee0", "1000.11081c62828247cc98c1e554f6ad5dcc.b323812c1b1b2ee9ec8a3dbe0c2ce358", TokenType.GRANT);

        /*
         * Create an instance of FileStore that takes absolute file path as parameter
         */
        let tokenstore = new FileStore("/home/usb-admin/boilerComp/payments_server/zoho/Files/nodejs_sdk_tokens.txt");

        /*
        * autoRefreshFields
        * if true - all the modules' fields will be auto-refreshed in the background, every hour.
        * if false - the fields will not be auto-refreshed in the background. The user can manually delete the file(s) or refresh the fields using methods from ModuleFieldsHandler(utils/util/module_fields_handler.js)
        * 
        * pickListValidation
        * A boolean field that validates user input for a pick list field and allows or disallows the addition of a new value to the list.
        * True - the SDK validates the input. If the value does not exist in the pick list, the SDK throws an error.
        * False - the SDK does not validate the input and makes the API request with the user’s input to the pick list
        */
        let sdkConfig = new SDKConfigBuilder().setPickListValidation(false).setAutoRefreshFields(true).build();

        /*
         * The path containing the absolute directory path to store user specific JSON files containing module fields information. 
         */
        let resourcePath = "./";

        /*
         * Call the static initialize method of Initializer class that takes the following arguments
         * 1 -> UserSignature instance
         * 2 -> Environment instance
         * 3 -> Token instance
         * 4 -> TokenStore instance
         * 5 -> sdkConfig instance
         * 6 -> resourcePath   
         * 7 -> Logger instance
         */
        await Initializer.initialize(user, environment, token, tokenstore, sdkConfig, resourcePath, logger);
    }
}

module.exports = { Init }