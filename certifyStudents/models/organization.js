const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let Organization = new Schema(
	{
		name: {
			type: String
		},
		description: {
			type: String
		},
		website: {
			type: String
		},
		tasks: {
			type: String
		},
		students: [{
			_id: {
				type: String
			},
			email: {
				type: String
			}
		}]
	},
	{ collection: "Organization" }
);

module.exports = mongoose.model("Organization", Organization);