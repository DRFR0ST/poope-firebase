import * as admin from "firebase-admin";

admin.initializeApp();

exports.meals = require('./functions/meals');
exports.users = require('./functions/users');
exports.ActionsOnGoogleFulfillment = require("./functions/actions");
