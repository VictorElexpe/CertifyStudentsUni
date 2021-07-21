const PDFDocument = require('pdfkit');

const Organization = require("../../models/organization");
const Student = require("../../models/student");
const Certification = require("../../models/certification");

exports.getDashboard = async function (req, res, next) {
	const user = req.session.user;

	const allCourses = await Organization.find({}).lean();
	const userInfo = await Student.findOne({email: user.email}).lean();
	
	res.render('dashboard_student', {
		title: 'Panel del estudiante',
		userInfo,
		allCourses,
		helpers: {
            progress: function (org_id, studentTasks) {
				if (studentTasks === 0) {
					return 0
				} else {
					var found = allCourses.filter(function(item) {
						return item._id == org_id;
					})
					var totalTasks = found[0].tasks;
					return (Math.floor(studentTasks / parseFloat(totalTasks)*100));
				}
			}
        }
	})
};

exports.addDisplayName = async function (req, res, next) {
	const displayName = req.body.displayName
	console.log(displayName);

	await Student.updateOne({_id: req.session.user.id}, {displayName: displayName})
	res.redirect('/student')
}

exports.signStudentToCourse = async function(req, res, next) {
	try {
		await Student.updateOne(
			{ _id: req.session.user.id, "courses._id": {$ne: req.params.id } },
			{
				$addToSet: {
					courses: {
						_id: req.params.id,
						org_name: req.params.name 
					}
				}
			}
		)
		await Organization.updateOne(
			{ _id: req.params.id, "students._id": { $ne: req.session.user.id } },
			{
				$addToSet: {
					students: {
						_id: req.session.user.id,
						email: req.session.user.email
					}
				}
			}
		)
		res.redirect('/student')
	} catch (error) {
		if (error) {
			console.log(error);
		}
	}
};

exports.removeCourse = async function(req, res, next) {
	try {
		await Student.findByIdAndUpdate({ _id: req.session.user.id }, { $pull: { courses: { _id: req.params.id } }})
		await Organization.findByIdAndUpdate(req.params.id, { $pull: { students: { _id: req.session.user.id } }})
		res.redirect('/student')
	} catch (error) {
		console.log(error);
	}
}

exports.myCertificates = async function(req, res, next) {
	const myCertificates = await Certification.find({ "studentId": req.session.user.id }).lean()
	res.render('myCertificates', { title: 'Mis certificados', certificates: myCertificates})
}

exports.downloadCertificate = async function(req, res, next) {
	const myCertificate = await Certification.findOne({"_id": req.params.id })
	const course = await Organization.findOne({_id: myCertificate.courseId})
	
	// Conversion from Node Js Date format to Day - Month - Year
	var month = myCertificate.dateOfIssue.getUTCMonth() + 1;
	var day = myCertificate.dateOfIssue.getUTCDate();
	var year = myCertificate.dateOfIssue.getUTCFullYear();
	var newDate = day + "-" + month + "-" + year

	// PDF creation
	const doc = new PDFDocument({
		layout: 'landscape',
		margin: 50
	});
	
	res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': `attachment; filename=${req.session.user.username}-certificate.pdf`
    });

	doc.pipe(res);

	doc
		.font('Helvetica-Bold')
		.fontSize(32)
		.fillColor('#0072CE')
		.text('Certificado de finalización', { align: "center" })
	
	doc.moveDown();
	
	var string1Student = "Otorgado a "
	var string2Student = `${req.session.user.username}`

	doc
		.font('Helvetica')
		.fontSize(18)
		.fillColor('#000000')
		.text(string1Student, {
			underline: false,
		})
	
	doc
		.font('Helvetica-Bold')
		.fillColor('#0466B6')
		.fontSize(24)
		.text(string2Student, {
			underline: false,
			link: `mailto:${req.session.user.email}`,
			continued: false,
		});

	doc.moveDown();
	
	var string1Course = "Por haber finalizado con éxito el curso "
	var string2Course = `${myCertificate.courseName}: ${course.description}`
	
	doc
		.font('Helvetica')
		.fontSize(18)
		.fillColor('#000000')
		.text(string1Course, {
			underline: false,
		});

	doc
		.font('Helvetica-Bold')
		.fillColor('#0466B6')
		.fontSize(24)
		.text(string2Course, {
			underline: false,
			link: `${course.website}`,
			continued: false,
		});
	
	doc.moveDown();

	doc
		.font('Helvetica')
		.fontSize(18)
		.fillColor('#000000')
		.text(`Total de tareas realizadas: ${myCertificate.completedTasks}`)

	doc.text('Universidad Politécnica de Madrid')
	
	doc.text(`Fecha de emisión: ${newDate}`)

	doc.text(`ID: ${myCertificate._id}`, 50, doc.page.height - 50, {
		lineBreak: false
	});

	doc.end();
	   
	res.redirect('/student')
}