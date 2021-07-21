const mongoose = require("mongoose");

const Schema = mongoose.Schema;

let Student = new Schema(
	{
		_id: {
			type: String
		},
		name: {
			type: String
		},
		displayName: {
			type: String
		},
        email: {
			type: String
		},
		courses: [{
			_id: {
				type: String
			},
			org_name: {
				type: String
			},
			completedTasks: {
				type: Number,
				default: 0
			},
			finished: {
				type: Boolean,
				default: false
			}
		}]
	},
	{ collection: "Student" }
);

module.exports = mongoose.model("Student", Student);