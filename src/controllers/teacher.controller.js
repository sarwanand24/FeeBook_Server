import { Teacher } from "../models/Teacher.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Student } from "../models/Student.model.js";
import { FeeRecord } from  "../models/FeeRecord.model.js"; 

const generateAccessAndRefreshTokens = async (teacherId) => {
   try {
      const teacher = await Teacher.findById(teacherId)
      const accessToken = teacher.generateAccessToken();
      const refreshToken = teacher.generateRefreshToken();

      teacher.refreshToken = refreshToken;
      await teacher.save({ validateBeforeSave: false })

      return { accessToken, refreshToken }

   } catch (error) {
      throw new ApiError(500, "Something went wrong while generating Refresh and Access Token");
   }
}

const register = asyncHandler(async (req, res) => {
   try {
      const { fullName, email, mobileNo, tutionName } = req.body;
      console.log('checking-->', fullName, email, mobileNo, tutionName)

      // Check if the teacher already exists
      const existingTeacher = await Teacher.findOne({ email });
      if (existingTeacher) {
         console.log('teacherrr check-->', existingTeacher)
         res.status(400).json(new ApiResponse(400, "User already exists, proceed to login"))
         throw new ApiError(400, "teacher already exists, please login")
      }
      // Create new teacher record
      const newTeacher = new Teacher({ fullName, email, mobileNo, tutionName });

      await newTeacher.save();

      const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newTeacher._id);

      const createdTeacher = await Teacher.findById(newTeacher._id).select("-refreshToken")
   
      return res
         .status(200)
         .json(
            new ApiResponse(200, { Teacher: createdTeacher, accessToken }, "Teacher Registered Successfully")
         )

  } catch (error) {
      res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
})

const loginTeacher = asyncHandler(async (req, res) => {
    //get details like mobileNo from frontend
    //validate them
    //Search for teacher in db
    //check for teacher
    //Access and refresh token when teacher is present
    //send cookie
    const { email, otp } = req.body
 
    if (!(email && otp)) {
       throw new ApiError(400, "email is required")
    }
 
    const teacher = await Teacher.find({ email })
     console.log("Teacher", teacher)
    if (!teacher?.length) {
       res.status(400).json(new ApiResponse(400, "teacher doesn't exists, please signup"))
       throw new ApiError(400, "teacher doesn't exists, please signup")
    }
 
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
 
    try {
       const response = await axios.post(
          'https://api.brevo.com/v3/smtp/email',
          {
            sender: { name: "Nikhil Dhamgay", email: "nikhildhamgay200424@gmail.com" },
            to: [{ email: email }],
            subject: "Welcome to Fee Book",
            textContent: `Your OTP code is: ${otp}`,
          },
          {
            headers: {
              'api-key': BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('OTP SENT TO EMAIL SUCCESSFULLY')
    } catch (error) {
       console.log('OTP SENDING ERROR')
    }
 
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(teacher[0]._id);
 
    const loggedInTeacher = await Teacher.findById(teacher[0]._id).select("-refreshToken");
 
    const options = {
       httpOnly: true,
       secure: true
    }
 
    return res.status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", refreshToken, options)
       .json(
          new ApiResponse(
             200,
             {
                teacher: loggedInTeacher, accessToken, refreshToken
             },
             "teacher Logged In Successfully"
          )
       )
 })

 const getStudents = asyncHandler(async (req, res) => {
   const { teacherId } = req.params;
   console.log('teacherId---------->', teacherId)
   const students = await Student.find({ teacher: teacherId, "left.isLeft": false })
   console.log('students-->', students)
   res.json({ success: true, students });
 })

 const addStudents = asyncHandler(async (req, res) => {
  try {
    const { fullName, email, mobileNo, teacher, joinedDate, feeRecords, Class, subjects, fee, board } = req.body;
  
    // Validate required fields
    if (!fullName || !mobileNo || !teacher || !joinedDate || !Class || !subjects || !fee || !board) {
      return res.status(400).json({ success: false, message: "All required fields must be provided." });
    }
  
    // Validate feeRecords as an array
    if (!Array.isArray(feeRecords)) {
      return res.status(400).json({ success: false, message: "Fee records should be an array." });
    }
  
    // Create New Student
    const newStudent = new Student({ fullName, email, mobileNo, teacher, joinedDate, class: Class, subjects, fee, board });
  
    await newStudent.save().catch(err => {
      throw new Error("Failed to save student: " + err.message);
    });
  
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
  
    // Fee Records (Array of Months with Subject-wise Fees)
    const feeRecordsArray = feeRecords.map(({ month, year, feeAmount }) => {
      if (!month || !year || !feeAmount) {
        throw new Error("Invalid fee record data. Month, year, and feeAmount are required.");
      }
  
      return {
        student: newStudent._id,
        teacher,
        class: Class,
        month: monthNames[parseInt(month) - 1] || "Unknown",
        year: parseInt(year),
        amountPaid: feeAmount,
        datePaid: new Date(),
        status: "Paid",
      };
    });
  
    // Save All Fee Records
    await FeeRecord.insertMany(feeRecordsArray).catch(err => {
      throw new Error("Failed to save fee records: " + err.message);
    });
  
    res.status(201).json({ success: true, student: newStudent, feeRecords: feeRecordsArray });
  
  } catch (error) {
    console.error("Error in student registration:", error);
    
    let errorMessage = "An error occurred";
    
    if (error.code === 11000) {
      errorMessage = "Duplicate entry detected";
    } else if (error.name === "ValidationError") {
      errorMessage = "Invalid data format";
    } else {
      errorMessage = error.message;
    }
  
    res.status(500).json({ success: false, message: errorMessage });
  }
  
 });

 const getStudentById = asyncHandler(async (req, res) => {
   try {
      const { id } = req.params;
  
      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ success: false, message: "Invalid Student ID" });
      }
  
      // Find student by ID
      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }
  
      // Fetch fee records for this student
      const feeRecords = await FeeRecord.find({ 
        student: id, 
        status: "Paid" // ✅ Only fetch paid records
      });
  
      res.status(200).json({ 
        success: true, 
        student, 
        feeRecords
      });
  
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    }
 })

 const updateStudentDetails = asyncHandler(async (req, res) => {
   const { id } = req.params;
   const { student } = req.body;
 
   if (!id || !student || Object.keys(student).length === 0) {
     throw new ApiError(400, "No student data or ID received");
   }
 
   try {
     const updatedStudent = await Student.findByIdAndUpdate(
       id,
       { $set: student }, // ✅ Spread student properties correctly
       { new: true, runValidators: true } // ✅ Ensures validation runs on update
     );
 
     if (!updatedStudent) {
       throw new ApiError(404, "Student not found or update failed");
     }
 
     console.log("✅ Updated Student:", updatedStudent);
 
     res.status(200).json({
       success: true,
       message: "Student updated successfully",
       updatedStudent,
     });
   } catch (error) {
     console.error("❌ Error updating student:", error);
     res.status(500).json({
       success: false,
       message: "Internal Server Error",
       error: error.message,
     });
   }
 }); 

 const markStudentAsLeft = asyncHandler(async (req, res) => {
   const { id } = req.params;
 
   try {
     const student = await Student.findById(id);
 
     if (!student) {
       throw new ApiError(404, "Student not found");
     }
 
     student.left.isLeft = true;
     student.left.dateLeft = new Date();
 
     await student.save(); // ✅ Saves updated student info

     console.log('student log-->', student)
 
     res.status(200).json({
       success: true,
       message: "Student marked as left successfully",
       student,
     });
   } catch (error) {
     console.error("Error marking student as left:", error);
     res.status(500).json({
       success: false,
       message: "Internal Server Error",
       error: error.message,
     });
   }
 });
 
 const updateFee = asyncHandler(async (req, res) => {
   try {
      const { studentId, month, year, Class, amountPaid, teacher,  } = req.body;
  
      if (!studentId || !month || !year) {
        return res.status(400).json({ message: "Missing required fields" });
      }
  
      let feeRecord = await FeeRecord.findOne({ student: studentId, month, year });

      if (feeRecord) {
        // If the record exists, mark it as paid
        feeRecord.status = "Paid";
        feeRecord.amountPaid = amountPaid; // Assuming full payment; adjust dynamically if needed
        feeRecord.datePaid = new Date();
        await feeRecord.save();
      } else {
        // If no record exists, create a new paid record
        feeRecord = new FeeRecord({
          student: studentId,
          teacher: teacher, // Replace with actual teacher ID logic
          class: Class, // Replace dynamically
          month,
          year,
          amountPaid, // Set correct amount dynamically
          datePaid: new Date(),
          status: "Paid",
        });
  
        await feeRecord.save();

        console.log('updateFeeRecords--->', feeRecord)
      }
  
      res.status(200).json({ message: "Fee marked as paid", feeRecord });
    } catch (error) {
      console.error("Error updating fee record:", error);
      res.status(500).json({ message: "Server error. Please try again." });
    }
 })

 const updateFeeUnPaid = asyncHandler(async (req, res) => {
  try {
     const { studentId, month, year } = req.body;
 
     if (!studentId || !month || !year) {
       return res.status(400).json({ message: "Missing required fields" });
     }
 
     let feeRecord = await FeeRecord.findOne({ student: studentId, month, year });

     if (feeRecord) {
       // If the record exists, mark it as paid
       feeRecord.status = "Pending";
       feeRecord.datePaid = new Date();
       await feeRecord.save();
     } else {
      res.status(200).json({ message: "Fee Record Not Found" });
     }
 
     res.status(200).json({ message: "Fee marked as paid", feeRecord });
   } catch (error) {
     console.error("Error updating fee record:", error);
     res.status(500).json({ message: "Server error. Please try again." });
   }
})

 const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Function to calculate due months
const calculateDueMonths = (records, monthlyFee) => {
  if (!records || records.length === 0) {
    return { dueMonthsText: "No previous payments found", dueFee: 0, dueMonths: [] };
  }

  // Get the last paid record
  let lastPaidRecord = records.reduce((latest, record) => {
    const latestYear = latest.year;
    const recordYear = record.year;
    const latestMonthIndex = monthNames.indexOf(latest.month);
    const recordMonthIndex = monthNames.indexOf(record.month);

    return (recordYear > latestYear || (recordYear === latestYear && recordMonthIndex > latestMonthIndex))
      ? record
      : latest;
  });

  let lastPaidMonthIndex = monthNames.indexOf(lastPaidRecord.month);
  let lastPaidYear = lastPaidRecord.year;

  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  let dueMonths = [];
  let year = lastPaidYear;
  let monthIndex = lastPaidMonthIndex + 1;

  // Move to next year if last paid month is December
  if (monthIndex === 12) {
    monthIndex = 0;  // January
    year++;
  }

  // Collect due months
  while (year < currentYear || (year === currentYear && monthIndex <= currentMonthIndex)) {
    dueMonths.push(`${monthNames[monthIndex]} ${year}`);

    monthIndex++;
    if (monthIndex === 12) {
      monthIndex = 0;
      year++;
    }
  }

  let dueFee = dueMonths.length * monthlyFee;
  let dueMonthsText = dueMonths.length ? 'Due for ' + dueMonths.join(", ") : "All fees is cleared.";

  return { dueMonthsText, dueFee, dueMonths };
};

const filteredStudents = asyncHandler(async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Fetch all students under this teacher
    const students = await Student.find({ teacher: teacherId, "left.isLeft": false });

    // Fetch fee records for these students
    const feeRecords = await FeeRecord.find({
      student: { $in: students.map((s) => s._id) },
      status: "Paid" 
    });

    // Categorize students
    const studentsWithDues = [];
    const studentsCleared = [];

    for (const student of students) {
      const studentRecords = feeRecords.filter(
        (record) => record.student.toString() === student._id.toString()
      );

      const { dueMonthsText, dueFee, dueMonths } = calculateDueMonths(studentRecords, student.fee);

      if (dueFee > 0) {
        studentsWithDues.push({ student, dueMonthsText, dueFee, dueMonths });
      } else {
        studentsCleared.push(student);
      }
    }

    res.json({ studentsWithDues, studentsCleared });
  } catch (error) {
    console.error("Error fetching due records:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

const getTeacherRevenueStats = async (req, res) => {
  try {
    const { teacherId } = req.params;
    let { month, year } = req.query; // Month (1-12) & Year (YYYY)

    console.log('Query Params - Month:', month, 'Year:', year);

    if (!teacherId) {
      return res.status(400).json({ success: false, message: "Teacher ID is required" });
    }

    // Convert `month` to month name
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const selectedMonth = month ? monthNames[parseInt(month) - 1] : null;

    // Fetch all students under the teacher
    const students = await Student.find({ teacher: teacherId });

    // Fetch all fee records for those students
    const feeRecords = await FeeRecord.find({ student: { $in: students.map(s => s._id) }, status: 'Paid' });

    let totalDueTillDate = 0;

    for (const student of students) {
      const studentRecords = feeRecords.filter(
        (record) => record.student.toString() === student._id.toString()
      );

      // Calculate dues using the same logic as filteredStudents
      const { dueFee } = calculateDueMonths(studentRecords, student.fee);

      totalDueTillDate += dueFee;
    }

    const totalRevenueTillDate = await FeeRecord.aggregate([
      { $match: {teacher: new mongoose.Types.ObjectId(teacherId)} },
      { $group: { _id: null, totalRevenue: { $sum: "$amountPaid" } } }
    ]);

    // **1️⃣ Calculate Total Revenue & Due for Selected Month & Year**
    const revenueQuery = { teacher: new mongoose.Types.ObjectId(teacherId) };
    if (year) revenueQuery.year = parseInt(year);
    if (selectedMonth) revenueQuery.month = selectedMonth;

    console.log('RevenueQuery-->', revenueQuery)

    const totalRevenueForSelectedPeriod = await FeeRecord.aggregate([
      { $match: revenueQuery },
      { $group: { _id: null, totalRevenue: { $sum: "$amountPaid" } } }
    ]);

    console.log('slected periiod revenue-->', totalRevenueForSelectedPeriod)

    const totalDueForSelectedPeriod = students.reduce((sum, student) => {
      // Filter records for this student
      const studentFeeRecords = feeRecords.filter(record =>
        record.student.toString() === student._id.toString()
      );
    
      // If no specific year is given, return null
      if (!year) return null;
    
      const joiningDate = new Date(student.joinedDate);
      const joiningYear = joiningDate.getFullYear();
      const joiningMonth = joiningDate.getMonth() + 1;
      const joiningMonthName = monthNames[joiningMonth - 1];
      const selectedMonthNum = monthNames.indexOf(selectedMonth) + 1; 
    
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
    
      const isStudentStillStudying =
        !student.left.isLeft || new Date(student.left.dateLeft) > currentDate;
    
      let dueFee = 0;
    
      if (selectedMonth) {
        // Ensure selected period is after the student's joining date
        if (parseInt(year) < joiningYear || (year == joiningYear && selectedMonthNum < joiningMonth)) {
          return sum; // No dues for periods before joining
        }
    
        // Look for a fee record in the selected month & year
        const feeRecordForPeriod = studentFeeRecords.find(
          record => record.year === parseInt(year) && record.month === selectedMonth
        );

        console.log('student fee records-->', feeRecordForPeriod, !feeRecordForPeriod, isStudentStillStudying)
    
        if (!feeRecordForPeriod && isStudentStillStudying) {
          // Add due only if selected period is before or equal to current month & year
          console.log('entry----->')
          console.log('year:', year,'currYaer', currentYear, 'selectedMonth:',
             selectedMonthNum, 'currMonth', currentMonth)
          if (year < currentYear || (year == currentYear && selectedMonthNum <= currentMonth)) {
            console.log("entry count------>")
            dueFee += student.fee;
          }
        }
      } else {
        // If only year is given, check all months after joining date
        if (parseInt(year) < joiningYear) return sum; // No dues for years before joining
    
        const startMonth = year == joiningYear ? joiningMonth : 1;
        const endMonth = year == currentYear ? currentMonth : 12;
    
        if (isStudentStillStudying) {
          console.log('still studying students--->')
          for (let month = startMonth; month <= endMonth; month++) {
            const monthName = monthNames[month - 1]; 
            const feeRecordForMonth = studentFeeRecords.find(
              record => record.year === parseInt(year) && record.month == monthName
            );
          console.log('fee record for students there--->', feeRecordForMonth)
            if (!feeRecordForMonth) {
              dueFee += student.fee;
            }
          }
        }
      }
    
      return sum + dueFee;
    }, 0);  
    
    console.log('slected periiod due--->', totalDueForSelectedPeriod)

 // 2️⃣ Count Students Who Joined & Left in Selected Period
const studentJoinQuery = { teacher: teacherId };

// If both year and selectedMonth are provided, filter by both
if (year && month) {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(year, month, 0); // Last day of the selected month
  studentJoinQuery.joinedDate = { $gte: startDate, $lte: endDate };
} else if (year) {
  // If only the year is selected, filter for the whole year
  studentJoinQuery.joinedDate = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
}

const studentsJoined = await Student.countDocuments(studentJoinQuery);

const studentLeftQuery = { 
  teacher: teacherId, 
  "left.isLeft": true 
};

// Apply month filter for students who left
if (year && month) {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(year, month, 0); // Last day of the selected month
  studentLeftQuery["left.dateLeft"] = { $gte: startDate, $lte: endDate };
} else if (year) {
  studentLeftQuery["left.dateLeft"] = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
}

const studentsLeft = await Student.countDocuments(studentLeftQuery);


    console.log('Response Data ->', {
      totalRevenueForSelectedPeriod: totalRevenueForSelectedPeriod[0]?.totalRevenue || 0,
      totalDueForSelectedPeriod,
      totalRevenueTillDate: totalRevenueTillDate[0]?.totalRevenue || 0,
      totalDueTillDate,
      studentsJoined,
      studentsLeft
    });

    // **📊 Send Response**
    res.status(200).json({
      success: true,
      totalRevenueForSelectedPeriod: totalRevenueForSelectedPeriod[0]?.totalRevenue || 0,
      totalDueForSelectedPeriod,
      totalRevenueTillDate: totalRevenueTillDate[0]?.totalRevenue || 0,
      totalDueTillDate,
      studentsJoined,
      studentsLeft,
      availableYears: await FeeRecord.distinct("year", { teacher: teacherId })
    });

  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getCurrentTeacher = asyncHandler(async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
})

const updateTeacherDetails = asyncHandler(async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    console.log('upadted teacher:', updatedTeacher)
    res.json(updatedTeacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

 const updateFeesDetails = asyncHandler(async (req, res) => {
   const { id } = req.params;
   const { student, feeRecords, Class, teacher } = req.body;
 
   if (!id || !student || Object.keys(student).length === 0) {
     throw new ApiError(400, "No student data or ID received");
   }

      // Validate feeRecords as an array
    if (!Array.isArray(feeRecords)) {
      return res.status(400).json({ success: false, message: "Fee records should be an array." });
    }
 
   try {
     const updatedStudent = await Student.findByIdAndUpdate(
       id,
       { $set: student }, // ✅ Spread student properties correctly
       { new: true, runValidators: true } // ✅ Ensures validation runs on update
     );
 
     if (!updatedStudent) {
       throw new ApiError(404, "Student not found or update failed");
     }

       console.log("✅ Updated Student:", updatedStudent);

    const feeRecordDeletion = await FeeRecord.deleteMany({ student: id });

      console.log("✅ Deleted Fees Records:", feeRecordDeletion);

       if (!feeRecordDeletion) {
       throw new ApiError(404, "fee record deletion failed");
     }

      const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
  
    // Fee Records (Array of Months with Subject-wise Fees)
    const feeRecordsArray = feeRecords.map(({ month, year, feeAmount }) => {
      if (!month || !year || !feeAmount) {
        throw new Error("Invalid fee record data. Month, year, and feeAmount are required.");
      }
  
      return {
        student: id,
        teacher,
        class: Class,
        month: monthNames[parseInt(month) - 1] || "Unknown",
        year: parseInt(year),
        amountPaid: feeAmount,
        datePaid: new Date(),
        status: "Paid",
      };
    });
  
    // Save All Fee Records
    await FeeRecord.insertMany(feeRecordsArray).catch(err => {
      throw new Error("Failed to save fee records: " + err.message);
    });
 
     res.status(200).json({
       success: true,
       message: "FeeData updated successfully",
       FeeRecord,
     });
   } catch (error) {
     console.error("❌ Error updating student:", error);
     res.status(500).json({
       success: false,
       message: "Internal Server Error",
       error: error.message,
     });
   }
 }); 


 export {
   register,
   loginTeacher,
   getStudents,
   addStudents,
   getStudentById,
   updateStudentDetails,
   markStudentAsLeft,
   updateFee,
   filteredStudents,
   getTeacherRevenueStats,
   getCurrentTeacher,
   updateTeacherDetails,
   updateFeeUnPaid,
   updateFeesDetails
 }