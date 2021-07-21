var request = require('request');

const Organizations = require("../../models/organization");
const Student = require("../../models/student");
const Certification = require('../../models/certification');
const fabricController = require('../controllers/fabricController');
const { v4: uuidv4 } = require('uuid');

exports.getDashboard = async function(req, res, next) {
	const access_token = req.session.access_token
	const x_subject_token = req.session.x_subject_token
	const user = req.session.user;

	const organizations = await Organizations.find({}).lean();

	request({
		method: 'GET',
		url: 'http://localhost:3000/v1/users',
		headers: {
			'X-Auth-token': req.session.x_subject_token
		}}, function (error, response, body) {
				const users = JSON.parse(body)
				req.session.users = users;
				res.render('dashboard_professor', { title: 'Panel del profesor', user, access_token, x_subject_token, users, organizations })
		}
	);
};

exports.getCourses = function(req, res, next) {
	request({
		method: 'GET',
		url: 'http://localhost:3000/v1/organizations',
		headers: {
			'X-Auth-token': req.session.x_subject_token
		}}, function (error, response, body) {
				const organizations = JSON.parse(body)
				console.log(organizations);

		}
	);
};
exports.getCourseById = async function(req, res, next) {
	const organization = await Organizations.find({ _id: `${req.params.id}`}).lean();
	res.render('course', { title: 'Curso', organization })
};

exports.getStudentFromOrg = async function(req, res, next) {
	const organization = await Organizations.find({ _id: `${req.params.org_id}`}).lean();
	const student = await Student.find({ _id: `${req.params.student_id}`}).lean();

	var found = student[0].courses.filter(function(item) {
		return item._id == organization[0]._id;
	})
	
	const completedTasks = found[0].completedTasks
	const totalTasks = organization[0].tasks
	const progress = Math.floor(completedTasks / parseFloat(totalTasks)*100)

	const info = {
		totalTasks: totalTasks,
		completedTasks: completedTasks,
		progress: progress,
		student_id: student[0]._id,
		student_name: student[0].name,
		student_email: student[0].email,
		course_id: organization[0]._id,
		course_name: organization[0].name
	}

	res.render('editStudent', { 
		title: 'Editar alumno',
		info,
		helpers: {
            check: function (progress, options) {
				if (progress === 100) {
					return options.fn(this);
				}
				return options.inverse(this);
			}
        } 
	})
};

exports.addCourse = async function(req, res, next) {
	const newOrg = new Organizations({
		name: req.body.name,
		description: req.body.description,
		website: req.body.website,
		tasks: req.body.tasks,
	})
	await newOrg.save()
	res.redirect('/')
};

exports.setAmountOfTasks = async function(req, res, next) {
	const filter = { _id: req.body._id }
	const update = { tasks: req.body.tasks }
	await Organizations.findOneAndUpdate(filter, update)
	res.redirect(`/professor/courses/${req.body._id}`)
};

exports.addCompletedTask = async function(req, res, next) {
	const filter = { _id: req.body._id, "courses._id": req.body.org_id }
	const update = { $inc: { "courses.$.completedTasks": 1 } }
	const options = { new: true }
	
	const filterOrg = { _id: req.body.org_id }
	const organization = await Organizations.findById(filterOrg)
	const student = await Student.findOneAndUpdate(filter, update, options)

	for(let course of student.courses) {
		if(course._id === req.body.org_id) {
			if(course.completedTasks == organization.tasks) {

				const newCertification = new Certification({
					_id: uuidv4(),
					studentId: student._id,
					courseName: course.org_name,
					courseId: course._id,
					completedTasks: course.completedTasks,
					dateOfIssue: new Date()
				})
				await newCertification.save()

				const filter2 = { _id: req.body._id, "courses._id": req.body.org_id }
				const update2 = { $set: { "courses.$.finished": true } }
				const options2 = { new: true }

				await Student.findOneAndUpdate(filter2, update2, options2)

				//await fabricController.CreateAsset(newCertification._id, student._id, organization._id, course.completedTasks, "Universidad Politécnica de Madrid", dateOfIssue)
			}
		}
	}

	// Once a task is completed we check if the course if also completed

	res.redirect(`/professor/editStudent/${req.body.org_id}/${req.body._id}`)
};