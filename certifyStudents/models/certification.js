const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let Certification = new Schema(
	{
        _id: {
            type: String
        },
		studentId: {
			type: String
		},
		courseName: {
			type: String
		},
		courseId: {
			type: String
		},
		completedTasks: {
			type: String
		},
        dateOfIssue: {
            type: Date
        }
	},
	{ collection: "Certification" }
);

module.exports = mongoose.model("Certification", Certification);