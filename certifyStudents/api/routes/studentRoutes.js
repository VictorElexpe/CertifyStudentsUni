var express = require('express');
var router = express.Router();

var studentController = require('../controllers/studentController')

router.get('/', studentController.getDashboard)
router.get('/addname', studentController.addDisplayName)
router.get('/courses/:id/:name/signup', studentController.signStudentToCourse)
router.get('/courses/delete/:id', studentController.removeCourse)
router.get('/mycertificates', studentController.myCertificates)
router.get('/downloadCertificate/:id', studentController.downloadCertificate)

module.exports = router;