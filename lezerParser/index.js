const parser = require("lezer-python");
exports.handler = async function (event) {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    return parser.parse(event.program)
}