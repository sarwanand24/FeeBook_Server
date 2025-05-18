import { Router } from "express";
import { addStudents, filteredStudents, getCurrentTeacher, getStudentById, getStudents, getTeacherRevenueStats, loginTeacher, markStudentAsLeft, register,
     updateFee,
     updateFeeUnPaid,
     updateStudentDetails, 
     updateTeacherDetails} from "../controllers/teacher.controller.js";

const router = Router();

router.route("/register").post(register);

router.route("/login").post(loginTeacher);

router.route("/:id").get(getCurrentTeacher);

router.route("/:id").put(updateTeacherDetails);

router.route("/students").post(addStudents);

router.route("/students/:teacherId").get(getStudents)

router.route("/student/:id").get(getStudentById)

router.route("/student/:id").put(updateStudentDetails)

router.route("/student/:id/leave").put(markStudentAsLeft);

router.route("/student/update-fee").post(updateFee);

router.route("/student/update-fee-unpaid").post(updateFeeUnPaid);

router.route("/student/filter/:teacherId").get(filteredStudents);

router.route("/revenue/:teacherId").get(getTeacherRevenueStats);

export default router