var express = require('express');
var router = express.Router();

var professorController = require('../controllers/professorController')

router.get('/', professorController.getDashboard)
router.get('/courses', professorController.getCourses)
router.get('/courses/:id', professorController.getCourseById)
router.get('/editStudent/:org_id/:student_id', professorController.getStudentFromOrg)
router.post('/addCourse', professorController.addCourse)
router.post('/setAmountOfTasks', professorController.setAmountOfTasks)
router.post('/addCompletedTask', professorController.addCompletedTask)

module.exports = router;